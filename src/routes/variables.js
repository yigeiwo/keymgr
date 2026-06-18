const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, requireRole } = require('../auth');
const { audit } = require('../audit');

function ok(res, data) { return res.json({ ok: true, ...data }); }
function err(res, status, code, message, field) {
  return res.status(status).json({ ok: false, code, error: message, ...(field ? { field } : {}) });
}

// 名称：2~64 字符，字母数字下划线点中划线（避免注入风险 + 业务侧好引用）
const NAME_RE = /^[A-Za-z0-9_.\-]{2,64}$/;
function validateName(name) {
  if (typeof name !== 'string' || !name) return 'name 必填';
  if (!NAME_RE.test(name)) return 'name 只能包含字母数字 _.-，长度 2~64';
  return null;
}
function validateValue(value) {
  if (typeof value !== 'string') return 'value 必填且必须是字符串';
  if (value.length > 8192) return 'value 长度不能超过 8192';
  return null;
}
// 分组名：可空；非空时与 username 同样的字符集，2~64 字符
function validateGroup(g) {
  if (g === null || g === undefined || g === '') return null;
  if (typeof g !== 'string') return 'group 必须是字符串';
  if (!/^[A-Za-z0-9_.\-]{2,64}$/.test(g)) return 'group 只能包含字母数字 _.-，长度 2~64';
  return null;
}

// 列表 —— 200  支持 group 过滤
router.get('/', authMiddleware, (req, res) => {
  const group = req.query.group;
  const gn = (group === null || group === undefined) ? null : String(group).trim();
  let rows;
  if (gn === '__null__') {
    // 只看未分组
    rows = db.prepare(`
      SELECT id, name, value, description, group_name, created_at, updated_at
      FROM variables WHERE group_name IS NULL OR group_name = '' ORDER BY id DESC
    `).all();
  } else if (gn) {
    rows = db.prepare(`
      SELECT id, name, value, description, group_name, created_at, updated_at
      FROM variables WHERE group_name = ? ORDER BY id DESC
    `).all(gn);
  } else {
    rows = db.prepare(`
      SELECT id, name, value, description, group_name, created_at, updated_at
      FROM variables ORDER BY id DESC
    `).all();
  }
  const items = rows.map(r => ({
    id: r.id,
    name: r.name,
    value: r.value,
    description: r.description,
    group: r.group_name || null,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
  return ok(res, { items });
});

// 列出所有分组名 —— 200（管理 UI 用）
router.get('/groups', authMiddleware, (_req, res) => {
  const rows = db.prepare(`
    SELECT group_name AS name, COUNT(*) AS count
    FROM variables
    WHERE group_name IS NOT NULL AND group_name <> ''
    GROUP BY group_name
    ORDER BY group_name ASC
  `).all();
  return ok(res, { items: rows.map(r => ({ name: r.name, count: r.count })) });
});

// 按分组批量取 —— 200  返回该分组下所有 name/value
router.get('/group/:name', authMiddleware, (req, res) => {
  const name = String(req.params.name || '').trim();
  const ge = validateGroup(name);
  if (ge) return err(res, 400, 'INVALID_GROUP', ge, 'group');

  const rows = db.prepare(`
    SELECT name, value, description, group_name, updated_at
    FROM variables
    WHERE group_name = ?
    ORDER BY name ASC
  `).all(name);

  if (!rows.length) {
    return err(res, 404, 'GROUP_NOT_FOUND', `分组 ${name} 不存在或为空`);
  }
  return ok(res, {
    group: name,
    count: rows.length,
    items: rows.map(r => ({ name: r.name, value: r.value, description: r.description || null })),
  });
});

// ====== 变量热度统计 ======
// GET /api/variables/stats?days=30
// 注意：必须在 /:id 之前注册，否则 "stats" 会被当作 id
router.get('/stats', authMiddleware, requireRole('admin'), (req, res) => {
  const days = Math.max(1, Math.min(90, parseInt(req.query.days, 10) || 30));
  const sinceStr = new Date(Date.now() - days * 24 * 3600 * 1000)
    .toISOString().replace('T', ' ').replace(/\..+/, '');

  // 检查表是否存在（兼容未迁移的老库）
  let rows;
  try {
    rows = db.prepare(`
      SELECT var_name, result, COUNT(*) AS count,
             MAX(created_at) AS last_access
      FROM variable_access_logs
      WHERE created_at >= ?
      GROUP BY var_name, result
    `).all(sinceStr);
  } catch (e) {
    return ok(res, { days, items: [], message: '变量访问日志表尚未创建，请重启服务以应用迁移' });
  }

  // 聚合
  const map = new Map();
  for (const r of rows) {
    let item = map.get(r.var_name);
    if (!item) {
      item = { name: r.var_name, total: 0, ok: 0, fail: 0, lastAccess: null };
      map.set(r.var_name, item);
    }
    item.total += r.count;
    if (r.result === 'ok') item.ok += r.count; else item.fail += r.count;
    if (r.last_access && (!item.lastAccess || r.last_access > item.lastAccess)) item.lastAccess = r.last_access;
  }

  // 补变量的描述信息
  const varNames = [...map.keys()];
  const varInfo = new Map();
  if (varNames.length) {
    const ph = varNames.map(() => '?').join(',');
    const varRows = db.prepare(`SELECT name, description, group_name FROM variables WHERE name IN (${ph})`).all(...varNames);
    for (const v of varRows) varInfo.set(v.name, v);
  }

  const items = [...map.values()]
    .sort((a, b) => b.total - a.total)
    .map(item => ({
      ...item,
      description: varInfo.get(item.name)?.description || null,
      group: varInfo.get(item.name)?.group_name || null,
      heat: item.total > 1000 ? 'hot' : item.total > 100 ? 'warm' : item.total > 0 ? 'cool' : 'idle',
    }));

  // 找出从未被调用过的变量（冷变量）
  const allVars = db.prepare('SELECT name, description, group_name FROM variables').all();
  const calledNames = new Set(varNames);
  const idle = allVars.filter(v => !calledNames.has(v.name)).map(v => ({
    name: v.name, total: 0, ok: 0, fail: 0, lastAccess: null,
    description: v.description, group: v.group_name || null, heat: 'idle',
  }));

  return ok(res, { days, items: [...items, ...idle], total: items.length + idle.length });
});

// 详情 —— 200 / 404
router.get('/:id', authMiddleware, (req, res) => {
  const row = db.prepare(`
    SELECT id, name, value, description, group_name, created_at, updated_at
    FROM variables WHERE id = ?
  `).get(req.params.id);
  if (!row) return err(res, 404, 'NOT_FOUND', '变量不存在');
  return ok(res, {
    id: row.id,
    name: row.name,
    value: row.value,
    description: row.description,
    group: row.group_name || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });
});

// 新建 —— 200 / 400 / 409
router.post('/', authMiddleware, (req, res) => {
  const name = (req.body?.name || '').trim();
  const value = req.body?.value;
  const description = req.body?.description ?? null;
  const groupRaw = req.body?.group;
  const group = (groupRaw === null || groupRaw === undefined || groupRaw === '') ? null : String(groupRaw).trim();

  const ne = validateName(name); if (ne) return err(res, 400, 'INVALID_NAME', ne, 'name');
  const ve = validateValue(value); if (ve) return err(res, 400, 'INVALID_VALUE', ve, 'value');
  const ge = validateGroup(group); if (ge) return err(res, 400, 'INVALID_GROUP', ge, 'group');

  const exists = db.prepare('SELECT id FROM variables WHERE name = ?').get(name);
  if (exists) return err(res, 409, 'NAME_TAKEN', 'name 已存在', 'name');

  const info = db.prepare(`
    INSERT INTO variables (name, value, description, group_name) VALUES (?, ?, ?, ?)
  `).run(name, value, description || null, group);
  const row = db.prepare(`
    SELECT id, name, value, description, group_name, created_at, updated_at
    FROM variables WHERE id = ?
  `).get(info.lastInsertRowid);
  audit({
    req,
    action: 'CREATE_VAR',
    targetType: 'variable',
    targetId: info.lastInsertRowid,
    targetName: name,
    details: { group: group || null },
  });
  return ok(res, {
    id: row.id,
    name: row.name,
    value: row.value,
    description: row.description,
    group: row.group_name || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    message: '已创建变量',
  });
});

// 更新 —— 200 / 400 / 404 / 409
router.patch('/:id', authMiddleware, (req, res) => {
  const row = db.prepare('SELECT id, name, group_name FROM variables WHERE id = ?').get(req.params.id);
  if (!row) return err(res, 404, 'NOT_FOUND', '变量不存在');

  const body = req.body || {};
  const update = { name: row.name, value: undefined, description: undefined, group: row.group_name || null };

  if (body.name !== undefined) {
    const name = (body.name || '').trim();
    const ne = validateName(name); if (ne) return err(res, 400, 'INVALID_NAME', ne, 'name');
    if (name !== row.name) {
      const clash = db.prepare('SELECT id FROM variables WHERE name = ? AND id <> ?').get(name, row.id);
      if (clash) return err(res, 409, 'NAME_TAKEN', 'name 已存在', 'name');
    }
    update.name = name;
  }
  if (body.value !== undefined) {
    const ve = validateValue(body.value); if (ve) return err(res, 400, 'INVALID_VALUE', ve, 'value');
    update.value = body.value;
  }
  if (body.description !== undefined) {
    update.description = body.description == null ? null : String(body.description).slice(0, 500);
  }
  if (body.group !== undefined) {
    const g = (body.group === null || body.group === '') ? null : String(body.group).trim();
    const ge = validateGroup(g);
    if (ge) return err(res, 400, 'INVALID_GROUP', ge, 'group');
    update.group = g;
  }

  // 动态构造 UPDATE：避免向 sql.js 传 undefined
  const sets = ['name = ?', "updated_at = datetime('now')"];
  const args = [update.name];
  if (update.value !== undefined) { sets.push('value = ?'); args.push(update.value); }
  if (update.description !== undefined) { sets.push('description = ?'); args.push(update.description); }
  if (body.group !== undefined) { sets.push('group_name = ?'); args.push(update.group); }
  args.push(row.id);
  db.prepare(`UPDATE variables SET ${sets.join(', ')} WHERE id = ?`).run(...args);

  const fresh = db.prepare(`
    SELECT id, name, value, description, group_name, created_at, updated_at
    FROM variables WHERE id = ?
  `).get(row.id);
  audit({
    req,
    action: 'PATCH_VAR',
    targetType: 'variable',
    targetId: row.id,
    targetName: fresh.name,
    details: { changedFields: Object.keys(body) },
  });
  return ok(res, {
    id: fresh.id,
    name: fresh.name,
    value: fresh.value,
    description: fresh.description,
    group: fresh.group_name || null,
    created_at: fresh.created_at,
    updated_at: fresh.updated_at,
    message: '已更新变量',
  });
});

// 删除 —— 200 / 404
router.delete('/:id', authMiddleware, (req, res) => {
  const info = db.prepare('DELETE FROM variables WHERE id = ?').run(req.params.id);
  if (!info.changes) return err(res, 404, 'NOT_FOUND', '变量不存在');
  return ok(res, { message: '已删除' });
});

module.exports = router;
