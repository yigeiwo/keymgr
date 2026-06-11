const express = require('express');
const db = require('../db');
const { generateKey, importKey, rerollKey, readPlain } = require('../keys');
const { audit } = require('../audit');

const router = express.Router();

function err(res, status, code, message, extra = {}) {
  return res.status(status).json({ ok: false, error: message, code, ...extra });
}
function ok(res, body) {
  return res.json({ ok: true, ...body });
}

const PREFIX_RE = /^[A-Za-z0-9_.\-]{2,24}$/;
function validatePrefix(prefix) {
  if (prefix === undefined || prefix === null || prefix === '') return null;
  if (typeof prefix !== 'string') return 'prefix 必须是字符串';
  if (!PREFIX_RE.test(prefix)) return 'prefix 仅允许字母/数字/下划线/中划线/点，长度 2~24';
  return null;
}
function validateName(name) {
  if (!name || typeof name !== 'string') return 'name 必填';
  if (name.length < 1 || name.length > 64) return 'name 长度 1~64';
  return null;
}
function validateExpiresAt(v) {
  if (v === undefined || v === null || v === '') return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) return 'expiresAt 时间格式不合法';
  if (d.getTime() < Date.now() - 60_000) return 'expiresAt 不能是过去时间';
  return null;
}

/**
 * 解析「目标账号」：把 account / ownerUserId / ownerUsername 转成 user_id。
 *   - admin 角色：可以传任意账号；不传则返回 null（不限）
 *   - operator/viewer：只能传自己，否则 403
 *   - 没传：操作者自己（admin 除外，admin 不传就是 null=全部）
 */
function resolveAccountScope(req, { allowAll = true } = {}) {
  const me = req.user;
  const isAdmin = me && me.role === 'admin';
  const rawAcct = req.query.account ?? req.body?.account;
  const rawId   = req.query.ownerUserId ?? req.body?.ownerUserId;
  const rawName = req.query.ownerUsername ?? req.body?.ownerUsername;

  // 显式传了
  if (rawAcct !== undefined || rawId !== undefined || rawName !== undefined) {
    if (!isAdmin) {
      return { error: err(req.res, 403, 'FORBIDDEN', '只有 admin 可以指定其他账号') };
    }
    let uid = null;
    if (rawId !== undefined && rawId !== null && rawId !== '') {
      uid = parseInt(rawId, 10);
      if (!uid || isNaN(uid)) return { error: err(req.res, 400, 'INVALID_OWNER_USER_ID', 'ownerUserId 必须是整数') };
    } else if (rawAcct !== undefined && rawAcct !== null && rawAcct !== '') {
      const u = db.prepare('SELECT id, username, disabled, deleted_at FROM users WHERE username = ?').get(String(rawAcct));
      if (!u || u.deleted_at) return { error: err(req.res, 404, 'ACCOUNT_NOT_FOUND', '账号不存在或已被软删') };
      if (u.disabled) return { error: err(req.res, 409, 'ACCOUNT_DISABLED', '账号已停用') };
      uid = u.id;
    } else if (rawName !== undefined && rawName !== null && rawName !== '') {
      const u = db.prepare('SELECT id, username, disabled, deleted_at FROM users WHERE username = ?').get(String(rawName));
      if (!u || u.deleted_at) return { error: err(req.res, 404, 'ACCOUNT_NOT_FOUND', '账号不存在或已被软删') };
      if (u.disabled) return { error: err(req.res, 409, 'ACCOUNT_DISABLED', '账号已停用') };
      uid = u.id;
    }
    return { userId: uid };  // uid === null 表示不限制
  }

  // 没传：操作者自己
  if (!isAdmin && allowAll) {
    return { userId: me ? me.id : null };
  }
  return { userId: null };
}

/**
 * 校验「是否能操作某条 key」：
 *   - admin：任意
 *   - 其他：必须是 key 的 owner_user_id
 * 老 key（owner_user_id IS NULL）只允许 admin 操作。
 */
function canActOnKey(req, row) {
  const me = req.user;
  if (!me) return false;
  if (me.role === 'admin') return true;
  if (row.owner_user_id == null) return false;
  return row.owner_user_id === me.id;
}

// 列表 —— 默认只列未删除的；?includeDeleted=1 列出全部
// 隔间规则：operator / viewer 只能看到自己 owner_user_id 的 key；admin 看全部
//
// 主 Key 隔离：
//   - 默认 `is_default = 0`（只看普通 key）
//   - admin 可加 `?includeMain=1` 同时列出主 Key（通常不需要）
//   - 跟某条 key 相关的所有操作（detail / plain / patch / delete）仍可对主 Key 生效，
//     只要有权限（admin 或 owner）。主 Key 本身不归 Keys 列表管，主 Key 的管理走 /api/accounts。
router.get('/', (req, res) => {
  const scope = resolveAccountScope(req, { allowAll: false });
  if (scope.error) return;

  const q = (req.query.q || '').toString().trim();
  const tag = (req.query.tag || '').toString().trim();
  const includeDeleted = req.query.includeDeleted === '1';
  const isAdmin = req.user && req.user.role === 'admin';
  const includeMain = isAdmin && req.query.includeMain === '1';
  const conds = []; const args = [];
  if (!includeDeleted) conds.push('k.deleted_at IS NULL');
  if (scope.userId !== null) { conds.push('k.owner_user_id = ?'); args.push(scope.userId); }
  // 隔离：主 Key（is_default=1）只在显式 includeMain=1 时才进列表
  if (!includeMain) { conds.push('k.is_default = 0'); }
  if (q) { conds.push('(k.name LIKE ? OR k.prefix LIKE ? OR k.owner LIKE ?)'); const k = `%${q}%`; args.push(k, k, k); }
  if (tag) {
    // 精确匹配某个 tag：tags 是 JSON 数组字符串 '["prod","billing"]'
    // 找 "tag" 但不匹配 "myprod"：先按 JSON 边界匹配 ', "tag"' 或 '["tag"'
    const escaped = String(tag).replace(/"/g, '\\"');
    conds.push('(k.tags LIKE ? OR k.tags LIKE ? OR k.tags LIKE ? OR k.tags = ?)');
    args.push(`%"${escaped}"%`, `[%"${escaped}"%,%`, `%,%"${escaped}"]%`, `["${escaped}"]`);
  }
  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
  const rows = db.prepare(`
    SELECT k.id, k.name, k.prefix, k.meta, k.owner, k.tags, k.enabled, k.expires_at, k.created_at, k.last_used_at, k.deleted_at,
           k.owner_user_id, k.is_default, u.username AS owner_username
    FROM api_keys k LEFT JOIN users u ON u.id = k.owner_user_id
    ${where}
    ORDER BY k.id DESC
  `).all(...args);
  res.json({
    ok: true,
    items: rows.map(r => ({
      ...r,
      enabled: !!r.enabled,
      meta: r.meta ? JSON.parse(r.meta) : null,
      tags: r.tags ? JSON.parse(r.tags) : [],
      ownerUserId: r.owner_user_id,
      ownerUsername: r.owner_username,
      isDefault: !!r.is_default,
    })),
  });
});

router.get('/:id', (req, res) => {
  const row = db.prepare(`
    SELECT k.id, k.name, k.prefix, k.meta, k.owner, k.tags, k.enabled, k.expires_at, k.created_at, k.last_used_at, k.deleted_at,
           k.owner_user_id, k.is_default, u.username AS owner_username
    FROM api_keys k LEFT JOIN users u ON u.id = k.owner_user_id
    WHERE k.id = ?
  `).get(req.params.id);
  if (!row) return err(res, 404, 'NOT_FOUND', 'key 不存在');
  if (!canActOnKey(req, row)) return err(res, 403, 'FORBIDDEN', '无权查看此 key');
  res.json({
    ok: true,
    ...row,
    enabled: !!row.enabled,
    meta: row.meta ? JSON.parse(row.meta) : null,
    tags: row.tags ? JSON.parse(row.tags) : [],
    ownerUserId: row.owner_user_id,
    ownerUsername: row.owner_username,
    isDefault: !!row.is_default,
  });
});

router.get('/:id/plain', (req, res) => {
  const row = db.prepare(`
    SELECT k.id, k.name, k.current_plain, k.original_plain, k.owner_user_id
    FROM api_keys k WHERE k.id = ?
  `).get(req.params.id);
  if (!row) return err(res, 404, 'NOT_FOUND', 'key 不存在');
  if (!canActOnKey(req, row)) return err(res, 403, 'FORBIDDEN', '无权查看此 key');
  const { currentPlain, originalPlain } = readPlain(row);
  return ok(res, {
    id: row.id,
    name: row.name,
    currentPlain,
    originalPlain,
    isOriginal: currentPlain === originalPlain,
  });
});

// 新建 / 导入 —— owner_user_id 默认 = 当前用户；admin 才能显式指定
// 这里创建的是「普通 key」（is_default=0）；主 Key 走 /api/accounts 单独建/刷
router.post('/', (req, res) => {
  const { name, prefix, meta, expiresAt, mode, plain, owner, tags, ownerUserId } = req.body || {};
  const me = req.user;
  const isAdmin = me && me.role === 'admin';

  // isDefault 不允许从 /api/keys 这里改（主 Key 走 /api/accounts）
  if (req.body && (req.body.isDefault !== undefined || req.body.is_default !== undefined)) {
    return err(res, 400, 'IS_DEFAULT_NOT_ALLOWED', '主 Key 请用 /api/accounts 接口创建/刷新');
  }

  // 校验
  const nameErr = validateName(name);
  if (nameErr) return err(res, 400, 'MISSING_NAME', nameErr, { field: 'name' });
  const prefixErr = validatePrefix(prefix);
  if (prefixErr) return err(res, 400, 'INVALID_PREFIX', prefixErr, { field: 'prefix' });
  const expErr = validateExpiresAt(expiresAt);
  if (expErr) return err(res, 400, 'INVALID_EXPIRES_AT', expErr, { field: 'expiresAt' });

  let metaObj = null;
  if (meta !== undefined && meta !== null) {
    if (typeof meta !== 'object' || Array.isArray(meta)) {
      return err(res, 400, 'INVALID_META', 'meta 必须是 JSON 对象', { field: 'meta' });
    }
    metaObj = meta;
  }
  if (owner !== undefined && owner !== null && (typeof owner !== 'string' || owner.length > 64)) {
    return err(res, 400, 'INVALID_OWNER', 'owner 必须是字符串，长度 ≤ 64', { field: 'owner' });
  }
  let tagsArr = null;
  if (tags !== undefined && tags !== null) {
    if (!Array.isArray(tags)) return err(res, 400, 'INVALID_TAGS', 'tags 必须是字符串数组', { field: 'tags' });
    if (tags.length > 20) return err(res, 400, 'TOO_MANY_TAGS', 'tags 最多 20 项', { field: 'tags' });
    for (const t of tags) {
      if (typeof t !== 'string' || !t.length || t.length > 32) {
        return err(res, 400, 'INVALID_TAG', 'tag 必须是 1~32 字符的字符串', { field: 'tags' });
      }
    }
    tagsArr = tags;
  }

  // 解析 owner_user_id
  let resolvedOwnerUid;
  if (ownerUserId !== undefined && ownerUserId !== null) {
    if (!isAdmin) return err(res, 403, 'FORBIDDEN', '只有 admin 可以指定其他账号');
    const uid = parseInt(ownerUserId, 10);
    if (!uid || isNaN(uid)) return err(res, 400, 'INVALID_OWNER_USER_ID', 'ownerUserId 必须是整数');
    // 软删用户不允许作为 owner（避免孤儿 key / 误用已注销账号）
    const u = db.prepare('SELECT id, disabled, deleted_at FROM users WHERE id = ?').get(uid);
    if (!u || u.deleted_at) return err(res, 404, 'ACCOUNT_NOT_FOUND', '账号不存在或已被软删');
    if (u.disabled) return err(res, 409, 'ACCOUNT_DISABLED', '账号已停用');
    resolvedOwnerUid = uid;
  } else {
    // 默认：当前用户
    resolvedOwnerUid = me ? me.id : null;
  }

  // 名称查重
  const dup = db.prepare('SELECT id FROM api_keys WHERE name = ?').get(name);
  if (dup) return err(res, 409, 'NAME_TAKEN', 'name 已存在', { field: 'name' });

  if (mode === 'import') {
    if (!plain || typeof plain !== 'string' || !plain.trim()) {
      return err(res, 400, 'MISSING_PLAIN', '导入模式必须提供完整 key (plain)', { field: 'plain' });
    }
    if (plain.trim().length < 8) {
      return err(res, 422, 'PLAIN_TOO_SHORT', 'key 长度过短，至少 8 字符', { field: 'plain' });
    }
    try {
      const r = importKey({ name, plain: plain.trim(), meta: metaObj, expiresAt, prefix, owner, tags: tagsArr, ownerUserId: resolvedOwnerUid });
      if (r.duplicate) {
        return err(res, 409, 'KEY_DUPLICATE', '该 key 已被导入过', { id: r.id });
      }
      audit({ req, action: 'IMPORT_KEY', targetType: 'key', targetId: r.id, targetName: name, details: { prefix: r.prefix, owner, tags: tagsArr, ownerUserId: resolvedOwnerUid } });
      return res.json({
        ok: true,
        id: r.id,
        name,
        prefix: r.prefix,
        meta: metaObj,
        owner: owner || null,
        ownerUserId: resolvedOwnerUid,
        tags: tagsArr || [],
        expiresAt: expiresAt || null,
        imported: true,
        message: '已导入 key',
      });
    } catch (e) {
      return err(res, 400, 'IMPORT_FAILED', e.message);
    }
  }

  const key = generateKey({
    name,
    meta: metaObj,
    expiresAt: expiresAt || null,
    prefix: prefix || 'sk_live',
    owner,
    tags: tagsArr,
    ownerUserId: resolvedOwnerUid,
  });
  audit({ req, action: 'CREATE_KEY', targetType: 'key', targetId: key.id, targetName: name, details: { prefix: key.prefix, owner, tags: tagsArr, ownerUserId: resolvedOwnerUid } });
  res.json({
    ok: true,
    id: key.id,
    name: key.name,
    prefix: key.prefix,
    meta: key.meta,
    owner: key.owner,
    ownerUserId: key.ownerUserId,
    tags: key.tags,
    expiresAt: key.expiresAt,
    key: key.plain,
    warning: '请妥善保存明文 key，此处之后将无法再次查看。',
    message: '已创建 key',
  });
});

router.post('/:id/toggle', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const row = db.prepare('SELECT id, name, enabled, deleted_at, owner_user_id FROM api_keys WHERE id = ?').get(id);
  if (!row) return err(res, 404, 'NOT_FOUND', 'key 不存在');
  if (!canActOnKey(req, row)) return err(res, 403, 'FORBIDDEN', '无权操作此 key');
  if (row.deleted_at) return err(res, 409, 'DELETED', 'key 已被删除', { deletedAt: row.deleted_at });
  const next = row.enabled ? 0 : 1;
  db.prepare('UPDATE api_keys SET enabled = ? WHERE id = ?').run(next, id);
  audit({ req, action: 'TOGGLE_KEY', targetType: 'key', targetId: id, targetName: row.name, details: { enabled: !!next } });
  return ok(res, { id, enabled: !!next });
});

router.post('/:id/reroll', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const row = db.prepare('SELECT name, deleted_at, owner_user_id FROM api_keys WHERE id = ?').get(id);
  if (!row) return err(res, 404, 'NOT_FOUND', 'key 不存在');
  if (!canActOnKey(req, row)) return err(res, 403, 'FORBIDDEN', '无权操作此 key');
  if (row.deleted_at) return err(res, 409, 'DELETED', 'key 已被删除', { deletedAt: row.deleted_at });
  const r = rerollKey(id);
  if (!r) return err(res, 404, 'NOT_FOUND', 'key 不存在');
  audit({ req, action: 'REROLL_KEY', targetType: 'key', targetId: id, targetName: row.name });
  return res.json({
    ok: true,
    id: r.id,
    prefix: r.prefix,
    key: r.plain,
    warning: '旧 key 已失效，请立即保存新 key。',
    message: '已重新生成 key',
  });
});

router.patch('/:id', (req, res) => {
  const { name, meta, expiresAt, owner, tags, ownerUserId } = req.body || {};
  const cur = db.prepare('SELECT id, deleted_at, owner_user_id FROM api_keys WHERE id = ?').get(req.params.id);
  if (!cur) return err(res, 404, 'NOT_FOUND', 'key 不存在');
  if (!canActOnKey(req, cur)) return err(res, 403, 'FORBIDDEN', '无权操作此 key');
  if (cur.deleted_at) return err(res, 409, 'DELETED', 'key 已被删除', { deletedAt: cur.deleted_at });

  const fields = []; const values = []; const changed = [];

  if (name !== undefined) {
    const e = validateName(name);
    if (e) return err(res, 400, 'MISSING_NAME', e, { field: 'name' });
    const dup = db.prepare('SELECT id FROM api_keys WHERE name = ? AND id != ?').get(name, req.params.id);
    if (dup) return err(res, 409, 'NAME_TAKEN', 'name 已存在', { field: 'name' });
    fields.push('name = ?'); values.push(name); changed.push('name');
  }
  if (meta !== undefined) {
    if (meta !== null && (typeof meta !== 'object' || Array.isArray(meta))) {
      return err(res, 400, 'INVALID_META', 'meta 必须是 JSON 对象', { field: 'meta' });
    }
    fields.push('meta = ?'); values.push(meta ? JSON.stringify(meta) : null); changed.push('meta');
  }
  if (expiresAt !== undefined) {
    const e = validateExpiresAt(expiresAt);
    if (e) return err(res, 400, 'INVALID_EXPIRES_AT', e, { field: 'expiresAt' });
    fields.push('expires_at = ?'); values.push(expiresAt ? new Date(expiresAt).toISOString() : null); changed.push('expiresAt');
  }
  if (owner !== undefined) {
    if (owner === null) { fields.push('owner = ?'); values.push(null); changed.push('owner'); }
    else if (typeof owner !== 'string' || owner.length > 64) return err(res, 400, 'INVALID_OWNER', 'owner 必须是字符串，长度 ≤ 64', { field: 'owner' });
    else { fields.push('owner = ?'); values.push(owner); changed.push('owner'); }
  }
  if (tags !== undefined) {
    if (tags === null) { fields.push('tags = ?'); values.push(null); changed.push('tags'); }
    else if (!Array.isArray(tags)) return err(res, 400, 'INVALID_TAGS', 'tags 必须是字符串数组', { field: 'tags' });
    else if (tags.length > 20) return err(res, 400, 'TOO_MANY_TAGS', 'tags 最多 20 项', { field: 'tags' });
    else {
      for (const t of tags) {
        if (typeof t !== 'string' || !t.length || t.length > 32) {
          return err(res, 400, 'INVALID_TAG', 'tag 必须是 1~32 字符的字符串', { field: 'tags' });
        }
      }
      fields.push('tags = ?'); values.push(JSON.stringify(tags)); changed.push('tags');
    }
  }
  if (ownerUserId !== undefined) {
    // 切账号：只有 admin 可以
    if (req.user.role !== 'admin') return err(res, 403, 'FORBIDDEN', '只有 admin 可以改账号');
    const uid = ownerUserId === null ? null : parseInt(ownerUserId, 10);
    if (uid !== null && (!uid || isNaN(uid))) return err(res, 400, 'INVALID_OWNER_USER_ID', 'ownerUserId 必须是整数或 null');
    if (uid !== null) {
      // 软删用户不允许作为 owner
      const u = db.prepare('SELECT id, disabled, deleted_at FROM users WHERE id = ?').get(uid);
      if (!u || u.deleted_at) return err(res, 404, 'ACCOUNT_NOT_FOUND', '账号不存在或已被软删');
      if (u.disabled) return err(res, 409, 'ACCOUNT_DISABLED', '账号已停用');
    }
    fields.push('owner_user_id = ?'); values.push(uid); changed.push('ownerUserId');
  }
  if (!fields.length) return ok(res, { message: '无改动' });
  values.push(req.params.id);
  db.prepare(`UPDATE api_keys SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  audit({ req, action: 'PATCH_KEY', targetType: 'key', targetId: parseInt(req.params.id, 10), details: { changes: changed } });
  return ok(res, { message: '已更新' });
});

router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const row = db.prepare('SELECT id, name, deleted_at, owner_user_id FROM api_keys WHERE id = ?').get(id);
  if (!row) return err(res, 404, 'NOT_FOUND', 'key 不存在');
  if (!canActOnKey(req, row)) return err(res, 403, 'FORBIDDEN', '无权操作此 key');
  if (row.deleted_at) return err(res, 409, 'ALREADY_DELETED', 'key 已被删除，可在 30 天内恢复', { deletedAt: row.deleted_at });
  db.prepare('UPDATE api_keys SET deleted_at = datetime(\'now\'), deleted_by = ? WHERE id = ?')
    .run(req.user?.id || null, id);
  audit({ req, action: 'DELETE_KEY', targetType: 'key', targetId: id, targetName: row.name, details: { soft: true } });
  return ok(res, { message: '已删除（30 天内可恢复）', recoverableUntil: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString() });
});

router.post('/:id/restore', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const row = db.prepare('SELECT id, name, deleted_at, deleted_by, owner_user_id FROM api_keys WHERE id = ?').get(id);
  if (!row) return err(res, 404, 'NOT_FOUND', 'key 不存在');
  if (!canActOnKey(req, row)) return err(res, 403, 'FORBIDDEN', '无权操作此 key');
  if (!row.deleted_at) return err(res, 409, 'NOT_DELETED', '该 key 未被删除');
  const deletedAt = new Date(row.deleted_at + 'Z').getTime();
  if (Date.now() - deletedAt > 30 * 24 * 3600 * 1000) {
    return err(res, 409, 'TOO_LATE', '超过 30 天恢复窗口，请重新创建', { deletedAt: row.deleted_at });
  }
  db.prepare('UPDATE api_keys SET deleted_at = NULL, deleted_by = NULL WHERE id = ?').run(id);
  audit({ req, action: 'RESTORE_KEY', targetType: 'key', targetId: id, targetName: row.name, details: { previousDeletedAt: row.deleted_at } });
  return ok(res, { message: '已恢复' });
});

router.delete('/:id/purge', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (req.user?.role !== 'admin') return err(res, 403, 'FORBIDDEN', '只有 admin 可以硬删除');
  const row = db.prepare('SELECT name FROM api_keys WHERE id = ?').get(id);
  const r = db.prepare('DELETE FROM api_keys WHERE id = ?').run(id);
  if (!r.changes) return err(res, 404, 'NOT_FOUND', 'key 不存在');
  audit({ req, action: 'PURGE_KEY', targetType: 'key', targetId: id, targetName: row?.name });
  return ok(res, { message: '已永久删除' });
});

module.exports = router;
