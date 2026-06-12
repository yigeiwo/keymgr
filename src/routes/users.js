const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../db');
const { generateKey } = require('../keys');
const { authMiddleware, requireRole } = require('../auth');
const { audit } = require('../audit');

const ROLES = ['admin', 'operator', 'viewer'];
const USERNAME_RE = /^[a-z0-9_.\-]{2,32}$/i;

function ok(res, data) { return res.json({ ok: true, ...data }); }
function err(res, status, code, message, field) {
  return res.status(status).json({ ok: false, code, error: message, ...(field ? { field } : {}) });
}

function validateUsername(s) {
  if (!s) return 'username 必填';
  if (!USERNAME_RE.test(s)) return 'username 只能包含字母数字 _.-，2~32 字符';
  return null;
}
function validatePassword(s) {
  if (!s) return 'password 必填';
  if (String(s).length < 8) return 'password 至少 8 字符';
  if (String(s).length > 128) return 'password 最多 128 字符';
  return null;
}
function validateRole(s) {
  if (!ROLES.includes(s)) return `role 必须是 ${ROLES.join(' | ')}`;
  return null;
}

// 列表 —— admin 才能看
router.get('/', authMiddleware, requireRole('admin'), (req, res) => {
  const includeDeleted = req.query.includeDeleted === '1';
  const rows = db.prepare(`
    SELECT id, username, display_name, role, disabled, created_at, deleted_at
    FROM users
    ${includeDeleted ? '' : 'WHERE deleted_at IS NULL'}
    ORDER BY id
  `).all();
  return ok(res, { items: rows.map(u => ({ ...u, disabled: !!u.disabled, deleted: !!u.deleted_at })) });
});

// 创建 —— admin
// 自动为该用户生成 1 个「主 Key」（is_default=1，partial unique 约束保证每用户 1 个）
router.post('/', authMiddleware, requireRole('admin'), (req, res) => {
  const { username, password, role, displayName } = req.body || {};
  const ue = validateUsername(username); if (ue) return err(res, 400, 'INVALID_USERNAME', ue, 'username');
  const pe = validatePassword(password); if (pe) return err(res, 400, 'INVALID_PASSWORD', pe, 'password');
  const re = validateRole(role || 'viewer'); if (re) return err(res, 400, 'INVALID_ROLE', re, 'role');

  const exists = db.prepare('SELECT id, deleted_at FROM users WHERE username = ?').get(username);
  if (exists) {
    return err(res, 409, 'NAME_TAKEN', exists.deleted_at ? 'username 已被删除' : 'username 已存在', 'username');
  }

  const hash = bcrypt.hashSync(String(password), 10);
  let userId, mainKey;
  try {
    const tr = db.transaction(() => {
      const info = db.prepare(`
        INSERT INTO users (username, password_hash, role, display_name) VALUES (?, ?, ?, ?)
      `).run(username, hash, role || 'viewer', displayName || null);
      userId = info.lastInsertRowid;
      // 自动生成主 Key（is_default=1）
      mainKey = generateKey({
        name: `${username}-main`,
        prefix: 'sk_acc',
        ownerUserId: userId,
        isDefault: true,
        owner: 'system',
      });
    });
    tr();
  } catch (e) {
    if (/UNIQUE|uniq_api_keys_default_per_account/i.test(e.message)) {
      return err(res, 409, 'MAIN_KEY_EXISTS', '该账号已存在主 Key');
    }
    throw e;
  }

  audit({ req, action: 'CREATE_USER', targetType: 'user', targetId: userId, targetName: username, details: { role: role || 'viewer' } });
  return ok(res, {
    id: userId,
    username,
    role: role || 'viewer',
    displayName: displayName || null,
    mainKey: {
      id: mainKey.id,
      prefix: mainKey.prefix,
      plain: mainKey.plain,
      warning: '请妥善保存主 Key 明文，关闭后将无法再查看。',
    },
    message: '已创建用户并自动生成主 Key',
  });
});

// 更新（改密码 / 改 role / 改 displayName）—— admin
router.patch('/:id', authMiddleware, requireRole('admin'), (req, res) => {
  const id = parseInt(req.params.id, 10);
  // 软删用户不允许再修改（避免误用已注销账号）
  const cur = db.prepare('SELECT id, username, role, deleted_at FROM users WHERE id = ?').get(id);
  if (!cur || cur.deleted_at) return err(res, 404, 'NOT_FOUND', '用户不存在或已被软删');

  const { role, password, displayName, disabled } = req.body || {};
  const sets = []; const args = [];

  if (role !== undefined) {
    const re = validateRole(role); if (re) return err(res, 400, 'INVALID_ROLE', re, 'role');
    // 防止最后一个 admin 被降级
    if (cur.role === 'admin' && role !== 'admin') {
      const adminCount = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'admin' AND disabled = 0").get().c;
      if (adminCount <= 1) return err(res, 409, 'LAST_ADMIN', '系统中最后一个 admin，不能降级', 'role');
    }
    sets.push('role = ?'); args.push(role);
  }
  if (password !== undefined) {
    const pe = validatePassword(password); if (pe) return err(res, 400, 'INVALID_PASSWORD', pe, 'password');
    sets.push('password_hash = ?'); args.push(bcrypt.hashSync(String(password), 10));
  }
  if (displayName !== undefined) {
    sets.push('display_name = ?'); args.push(displayName == null ? null : String(displayName).slice(0, 64));
  }
  if (disabled !== undefined) {
    const b = disabled ? 1 : 0;
    // 防止把自己禁了
    if (req.user.id === id && b === 1) {
      return err(res, 409, 'CANNOT_DISABLE_SELF', '不能禁用自己的账号', 'disabled');
    }
    if (cur.role === 'admin' && b === 1) {
      const adminCount = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'admin' AND disabled = 0").get().c;
      if (adminCount <= 1) return err(res, 409, 'LAST_ADMIN', '系统中最后一个 admin，不能禁用', 'disabled');
    }
    sets.push('disabled = ?'); args.push(b);
  }
  if (!sets.length) return ok(res, { message: '无改动' });
  args.push(id);
  db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...args);
  audit({ req, action: 'PATCH_USER', targetType: 'user', targetId: id, targetName: cur.username, details: { changedFields: Object.keys(req.body) } });
  return ok(res, { message: '已更新' });
});

// 删除 —— admin，软删（与 /api/accounts/:id DELETE 行为一致）
//   - 自己不能删（403 CANNOT_DELETE_SELF）
//   - 主 admin 不能删（403 CANNOT_DELETE_MAIN_ADMIN）
//   - 软删用户 + 该用户所有 keys + 清掉该用户的 sessions
router.delete('/:id', authMiddleware, requireRole('admin'), (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (id === req.user.id) return err(res, 403, 'CANNOT_DELETE_SELF', '不能删除自己');
  const cur = db.prepare('SELECT id, username, role, deleted_at FROM users WHERE id = ?').get(id);
  if (!cur || cur.deleted_at) return err(res, 404, 'NOT_FOUND', '用户不存在');
  if (cur.role === 'admin') {
    const mainAdmin = db.prepare("SELECT id FROM users WHERE role='admin' AND disabled=0 AND deleted_at IS NULL ORDER BY id ASC LIMIT 1").get();
    if (mainAdmin && mainAdmin.id === id) {
      return err(res, 403, 'CANNOT_DELETE_MAIN_ADMIN', '主 admin 账号不可删除');
    }
  }
  // 统计
  const keyCount = db.prepare('SELECT COUNT(*) AS c FROM api_keys WHERE owner_user_id = ? AND deleted_at IS NULL').get(id).c;
  const sessionCount = db.prepare('SELECT COUNT(*) AS c FROM sessions WHERE user_id = ?').get(id).c;
  const tr = db.transaction(() => {
    const now = new Date().toISOString();
    db.prepare('UPDATE users SET deleted_at = ? WHERE id = ?').run(now, id);
    db.prepare('UPDATE api_keys SET deleted_at = ? WHERE owner_user_id = ? AND deleted_at IS NULL').run(now, id);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
  });
  tr();
  audit({
    req, action: 'DELETE_USER', targetType: 'user', targetId: id, targetName: cur.username,
    details: { keysSoftDeleted: keyCount, sessionsRevoked: sessionCount },
  });
  return ok(res, { softDeleted: true, keysSoftDeleted: keyCount, sessionsRevoked: sessionCount, message: '已软删' });
});

// 当前用户资料
router.get('/me/info', authMiddleware, (req, res) => {
  res.json({ ok: true, user: req.user });
});

module.exports = router;
