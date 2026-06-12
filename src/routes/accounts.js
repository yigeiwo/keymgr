/**
 * 账号管理（含「主 Key」概念）
 *
 * 设计：
 *   - 每个账号固定 1 个「主 Key」（api_keys.is_default=1，partial unique 保证）
 *   - admin 账号的主 Key = 跨账号通杀（/v1/verify 时可匹配任意账号的 key）
 *   - 非 admin 账号的主 Key = 仅匹配自己账号下的 key
 *   - 主 Key 在本路由下可查明文、可刷新（重置明文、保留 is_default=1）
 *   - 创建账号（POST /api/accounts）时自动生成 1 个主 Key
 *
 * 权限：
 *   - admin：可见 / 可管所有账号
 *   - operator / viewer：只能看管自己的账号（即 /me 视角）
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../db');
const { generateKey, rerollKey, readPlain } = require('../keys');
const { authMiddleware, requireRole } = require('../auth');
const { getDefaultAdminId } = require('../users');
const { audit } = require('../audit');

const router = express.Router();

const ROLES = ['admin', 'operator', 'viewer'];
const USERNAME_RE = /^[a-z0-9_.\-]{2,32}$/i;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;

/**
 * 生成一个对用户友好、但强度足够的随机密码：
 *   - 16 字符
 *   - 字符集：去掉易混的 0/O/1/l/I 等
 *   - 不含全角 / 非 ASCII，避免被某些客户端错误编码
 */
function generateReadablePassword(len = 16) {
  // 64 个字符：去掉 0/O/1/l/I/|/` 容易混淆的
  const ALPHA = 'abcdefghijkmnpqrstuvwxyz';
  const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const DIGIT = '23456789';
  const SYM   = '!@#$%^&*-+_?';
  const all = ALPHA + UPPER + DIGIT + SYM;
  // 保证至少包含 4 类
  const out = [
    ALPHA[crypto.randomInt(0, ALPHA.length)],
    UPPER[crypto.randomInt(0, UPPER.length)],
    DIGIT[crypto.randomInt(0, DIGIT.length)],
    SYM[crypto.randomInt(0, SYM.length)],
  ];
  while (out.length < len) out.push(all[crypto.randomInt(0, all.length)]);
  // Fisher-Yates 洗牌
  for (let i = out.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.join('');
}

function ok(res, data) { return res.json({ ok: true, ...data }); }
function err(res, status, code, message, extra = {}) {
  return res.status(status).json({ ok: false, error: message, code, ...extra });
}

/** 把账号的「主 Key」摘要查出来（含 prefix、创建时间、最近使用） */
function fetchMainKeySummary(userId) {
  // 没主 Key 就立刻补一个（极旧数据/历史 bug；用户体验上不应该看到「未配置」）
  ensureMainKey(userId);
  const row = db.prepare(`
    SELECT id, prefix, created_at, last_used_at, enabled, expires_at
    FROM api_keys
    WHERE owner_user_id = ? AND is_default = 1 AND deleted_at IS NULL
  `).get(userId);
  if (!row) return null;
  return {
    id: row.id,
    prefix: row.prefix,
    enabled: !!row.enabled,
    expiresAt: row.expires_at || null,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at || null,
  };
}

/**
 * 确保某账号有 1 个主 Key（is_default=1），没有就当场补建。
 *  - 用于「账号列表」「查看主 Key 明文」「刷新主 Key」等场景的自愈
 *  - 历史原因：v0.7 之前创建的账号没有主 Key，且没有补建机制
 *  - 也兜底一些极端场景（如软删/恢复后没回补）
 *  - 不会重复创建：插入走 partial unique 约束冲突时直接 return
 */
function ensureMainKey(userId) {
  if (!userId) return null;
  const exist = db.prepare(`
    SELECT id, prefix FROM api_keys
    WHERE owner_user_id = ? AND is_default = 1 AND deleted_at IS NULL
  `).get(userId);
  if (exist) return exist;
  const u = db.prepare('SELECT id, username FROM users WHERE id = ?').get(userId);
  if (!u || u.id == null) return null;
  // 主 Key 软删了但账号还在 → 复活（恢复成未删状态，避免一直拿不到明文）
  const tomb = db.prepare(`
    SELECT id FROM api_keys
    WHERE owner_user_id = ? AND is_default = 1 AND deleted_at IS NOT NULL
    ORDER BY id ASC LIMIT 1
  `).get(userId);
  if (tomb) {
    db.prepare('UPDATE api_keys SET deleted_at = NULL WHERE id = ?').run(tomb.id);
    return { id: tomb.id, restored: true };
  }
  // 完全没有 → 新建
  try {
    const mk = generateKey({
      name: `${u.username}-main`,
      prefix: 'sk_acc',
      ownerUserId: userId,
      isDefault: true,
      owner: 'system',
    });
    console.log(`[accounts] 已为账号 ${u.username} 补建主 Key（prefix=${mk.prefix}…）`);
    return { id: mk.id, created: true };
  } catch (e) {
    // 极端并发场景：刚好另一个请求先建了；忽略冲突即可
    if (/UNIQUE|uniq_api_keys_default_per_account/i.test(e.message)) {
      return db.prepare(`
        SELECT id FROM api_keys
        WHERE owner_user_id = ? AND is_default = 1 AND deleted_at IS NULL
      `).get(userId) || null;
    }
    throw e;
  }
}

/** 主 admin 判定已在 ../users.js 收口，本文件直接 import */

/** 返回账号 + 是否主 admin */
function getAccountOrNotFound(id) {
  return db.prepare(`
    SELECT id, username, display_name, role, disabled, deleted_at, created_at
    FROM users WHERE id = ?
  `).get(id);
}

/**
 * 当前用户是否有权访问/操作某个账号：
 *   - admin：所有账号
 *   - 其他：仅自己
 */
function canAccessAccount(req, userId) {
  const me = req.user;
  if (!me) return false;
  if (me.role === 'admin') return true;
  return me.id === userId;
}

// ====== 列表账号（admin 看全部；其他只看自己）—— 默认不展示已软删账号 ======
router.get('/', authMiddleware, (req, res) => {
  const me = req.user;
  const includeDeleted = req.query.includeDeleted === '1';
  const base = `
    SELECT id, username, display_name, role, disabled, created_at, deleted_at
    FROM users
    ${includeDeleted ? '' : 'WHERE deleted_at IS NULL'}
  `;
  const rows = (me.role === 'admin')
    ? db.prepare(base + ' ORDER BY id ASC').all()
    : db.prepare(base + ' AND id = ? ORDER BY id ASC').all(me.id);

  const items = rows.map(u => ({
    id: u.id,
    username: u.username,
    displayName: u.display_name || null,
    role: u.role,
    disabled: !!u.disabled,
    deleted: !!u.deleted_at,
    deletedAt: u.deleted_at || null,
    createdAt: u.created_at,
    mainKey: fetchMainKeySummary(u.id),
  }));
  return ok(res, { items });
});

// ====== 单个账号详情 ======
router.get('/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const u = getAccountOrNotFound(id);
  if (!u || u.deleted_at) return err(res, 404, 'NOT_FOUND', '账号不存在');
  if (!canAccessAccount(req, u.id)) return err(res, 403, 'FORBIDDEN', '无权查看此账号');

  return ok(res, {
    id: u.id,
    username: u.username,
    displayName: u.display_name || null,
    role: u.role,
    disabled: !!u.disabled,
    createdAt: u.created_at,
    mainKey: fetchMainKeySummary(u.id),
  });
});

// ====== 拿账号的主 Key 明文 ======
router.get('/:id/main-key', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const u = getAccountOrNotFound(id);
  if (!u || u.deleted_at) return err(res, 404, 'NOT_FOUND', '账号不存在');
  if (!canAccessAccount(req, u.id)) return err(res, 403, 'FORBIDDEN', '无权查看此账号的主 Key');
  if (u.disabled) return err(res, 409, 'ACCOUNT_DISABLED', '账号已停用，无法查看主 Key');

  // 自愈：账号没主 Key 就当场补一个（v0.7 之前的老账号 / 异常数据）
  const ensured = ensureMainKey(id);
  const wasJustCreated = !!(ensured && ensured.created);

  const row = db.prepare(`
    SELECT id, name, prefix, current_plain, enabled, expires_at, last_used_at, created_at
    FROM api_keys
    WHERE owner_user_id = ? AND is_default = 1 AND deleted_at IS NULL
  `).get(id);
  if (!row) return err(res, 404, 'NO_MAIN_KEY', '该账号尚未配置主 Key');

  const { currentPlain } = readPlain(row);
  if (wasJustCreated) {
    audit({ req, action: 'AUTO_CREATE_MAIN_KEY', targetType: 'account', targetId: u.id, targetName: u.username, details: { keyId: row.id, prefix: row.prefix, reason: 'no_main_key' } });
  }
  return ok(res, {
    accountId: u.id,
    username: u.username,
    role: u.role,
    keyId: row.id,
    name: row.name,
    prefix: row.prefix,
    currentPlain,
    enabled: !!row.enabled,
    expiresAt: row.expires_at || null,
    lastUsedAt: row.last_used_at || null,
    createdAt: row.created_at,
    autoCreated: wasJustCreated || undefined,   // 让前端知道这是「补建的」新 Key
    warning: wasJustCreated
      ? '检测到该账号未配置主 Key，已自动补建。以下明文仅此刻显示，请立即复制保存！'
      : '主 Key 是该账号的「凭证钥匙」。请妥善保存明文，关闭后将无法再查看。',
  });
});

// ====== 刷新主 Key（生成新明文，旧立即失效） ======
router.post('/:id/main-key/reroll', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const u = getAccountOrNotFound(id);
  if (!u || u.deleted_at) return err(res, 404, 'NOT_FOUND', '账号不存在');
  if (!canAccessAccount(req, u.id)) return err(res, 403, 'FORBIDDEN', '无权刷新此账号的主 Key');
  if (u.disabled) return err(res, 409, 'ACCOUNT_DISABLED', '账号已停用，请先启用再刷新主 Key');

  // 自愈：账号没主 Key 就直接补一个并当作「首次生成」返回
  const ensured = ensureMainKey(id);
  let row = db.prepare(`
    SELECT id, name FROM api_keys
    WHERE owner_user_id = ? AND is_default = 1 AND deleted_at IS NULL
  `).get(id);
  if (!row) return err(res, 404, 'NO_MAIN_KEY', '该账号尚未配置主 Key');

  let r;
  if (ensured && (ensured.created || ensured.restored)) {
    // 补建的：直接读出现有明文返回（避免重复生成导致 original_plain 也被覆盖）
    const full = db.prepare(`
      SELECT current_plain FROM api_keys WHERE id = ?
    `).get(row.id);
    const { currentPlain } = readPlain(full);
    r = { id: row.id, prefix: ensured.created ? (db.prepare('SELECT prefix FROM api_keys WHERE id = ?').get(row.id) || {}).prefix : null, plain: currentPlain, autoCreated: true };
    if (!r.prefix) r.prefix = (db.prepare('SELECT prefix FROM api_keys WHERE id = ?').get(row.id) || {}).prefix;
    audit({ req, action: 'AUTO_CREATE_MAIN_KEY', targetType: 'account', targetId: u.id, targetName: u.username, details: { keyId: row.id, prefix: r.prefix, reason: ensured.created ? 'no_main_key' : 'restored_from_soft_deleted' } });
  } else {
    r = rerollKey(row.id);
    if (!r) return err(res, 500, 'REROLL_FAILED', '刷新失败');
    audit({
      req,
      action: 'REROLL_MAIN_KEY',
      targetType: 'account',
      targetId: u.id,
      targetName: u.username,
      details: { keyId: r.id, prefix: r.prefix },
    });
  }
  return ok(res, {
    accountId: u.id,
    username: u.username,
    keyId: r.id,
    prefix: r.prefix,
    key: r.plain,
    autoCreated: r.autoCreated || undefined,
    warning: r.autoCreated
      ? '检测到该账号未配置主 Key，已自动补建并返回明文。旧 Key 不存在，无需担心失效问题。'
      : '旧主 Key 已立即失效；新 Key 仅在此刻返回，请立即保存。',
  });
});

// ====== 重置账号密码（仅 admin） ======
//
// 业务背景：
//   admin 看不到子账号的原密码（bcrypt 不可逆）。
//   改为"重置密码"流程：系统生成新明文，admin 复制给子账号。
//
// 行为：
//   - 仅 admin 可调用
//   - 生成 16 字符的高强度新密码
//   - 写入新 bcrypt 哈希
//   - 撤销该账号的全部 session（强制下次登录用新密码）
//   - 主 Key 不受影响
//   - 不允许重置自己（防止 admin 复制失误后立即被锁出）—— 改自己密码走 /api/auth/change-password
//   - 不允许重置已被软删的账号
//   - 主 admin 账号可重置（解锁场景需要）
router.post('/:id/reset-password', authMiddleware, requireRole('admin'), (req, res) => {
  const id = parseInt(req.params.id, 10);
  const u = getAccountOrNotFound(id);
  if (!u || u.deleted_at) return err(res, 404, 'NOT_FOUND', '账号不存在');

  if (req.user.id === u.id) {
    return err(res, 403, 'CANNOT_RESET_SELF', '请改用「修改自己的密码」入口（重置自己将立刻锁出当前会话）');
  }
  if (u.disabled) {
    return err(res, 409, 'ACCOUNT_DISABLED', '账号已停用，请先启用再重置密码');
  }

  const newPlain = generateReadablePassword(16);
  const hash = bcrypt.hashSync(newPlain, 10);

  const tr = db.transaction(() => {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, id);
    const revoked = db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id).changes;
    return revoked;
  });
  const sessionsRevoked = tr();

  audit({
    req,
    action: 'RESET_PASSWORD',
    targetType: 'account',
    targetId: u.id,
    targetName: u.username,
    details: { sessionsRevoked, generatedLength: newPlain.length },
  });

  return ok(res, {
    accountId: u.id,
    username: u.username,
    password: newPlain,
    sessionsRevoked,
    warning: '新密码仅此刻返回，请立即复制并通过安全渠道告知子账号。该账号的所有 session 已被撤销，需要用新密码重新登录。',
    message: `已重置 ${u.username} 的密码（${sessionsRevoked} 个 session 已撤销）`,
  });
});

// ====== 创建账号（仅 admin；同时自动生成主 Key） ======
router.post('/', authMiddleware, requireRole('admin'), (req, res) => {
  const { username, password, role, displayName } = req.body || {};
  if (!username || !USERNAME_RE.test(username)) {
    return err(res, 400, 'INVALID_USERNAME', 'username 只能包含字母数字 _.-，2~32 字符', { field: 'username' });
  }
  if (!password || String(password).length < PASSWORD_MIN || String(password).length > PASSWORD_MAX) {
    return err(res, 400, 'INVALID_PASSWORD', `password 长度 ${PASSWORD_MIN}~${PASSWORD_MAX}`, { field: 'password' });
  }
  if (!ROLES.includes(role || 'viewer')) {
    return err(res, 400, 'INVALID_ROLE', `role 必须是 ${ROLES.join(' | ')}`, { field: 'role' });
  }
  // 包含已软删的 username：不可重建同名账号（避免误覆盖历史数据）
  const exists = db.prepare('SELECT id, deleted_at FROM users WHERE username = ?').get(username);
  if (exists) {
    return err(res, 409, 'NAME_TAKEN', exists.deleted_at ? 'username 已被删除' : 'username 已存在', { field: 'username' });
  }

  const hash = bcrypt.hashSync(String(password), 10);
  let userId, mainKey;
  try {
    const tr = db.transaction(() => {
      const info = db.prepare(`
        INSERT INTO users (username, password_hash, role, display_name) VALUES (?, ?, ?, ?)
      `).run(username, hash, role, displayName || null);
      userId = info.lastInsertRowid;
      // 自动生成主 Key（is_default=1），partial unique 约束保护
      // 捕获返回的明文（仅此刻返回给 admin，admin 必须立即复制保存）
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
    // 唯一索引冲突：账号已存在主 Key（不会发生在新用户上，防御）
    if (/UNIQUE|uniq_api_keys_default_per_account/i.test(e.message)) {
      return err(res, 409, 'MAIN_KEY_EXISTS', '该账号已存在主 Key');
    }
    throw e;
  }

  audit({
    req,
    action: 'CREATE_ACCOUNT',
    targetType: 'account',
    targetId: userId,
    targetName: username,
    details: { role },
  });

  return ok(res, {
    id: userId,
    username,
    role,
    displayName: displayName || null,
    mainKey: {
      id: mainKey.id,
      prefix: mainKey.prefix,
      enabled: true,
      expiresAt: null,
      createdAt: mainKey.meta ? null : null, // summary 不含 createdAt；下面用单独字段
      lastUsedAt: null,
      plain: mainKey.plain,                  // 主 Key 明文：仅此刻返回，请立即保存
      warning: '主 Key 明文仅在创建瞬间返回一次，请立即复制并安全交付给该账号；之后只能刷新（旧的会失效）。',
    },
    message: '账号已创建并自动生成主 Key，请立即复制保存主 Key 明文。',
  });
});

// ====== 删除账号（仅 admin）—— 软删用户 + 该账号名下所有 key；踢出该用户的所有 session ======
//
// 规则：
//   - 主 admin（getDefaultAdminId() 选出的那个）禁止删除（403 CANNOT_DELETE_MAIN_ADMIN）
//   - 自己不能删除自己（403 CANNOT_DELETE_SELF）
//   - 软删用户（设 deleted_at）
//   - 软删该用户的全部 keys（主 Key + 普通 keys）
//   - 删掉该用户的所有 sessions（强制下线）
//   - 该用户创建后无法登录，无法被任何 verify 命中
router.delete('/:id', authMiddleware, requireRole('admin'), (req, res) => {
  const id = parseInt(req.params.id, 10);
  const u = getAccountOrNotFound(id);
  if (!u || u.deleted_at) return err(res, 404, 'NOT_FOUND', '账号不存在');

  if (req.user.id === u.id) {
    return err(res, 403, 'CANNOT_DELETE_SELF', '不能删除自己');
  }

  const mainAdminId = getDefaultAdminId();
  if (u.id === mainAdminId) {
    return err(res, 403, 'CANNOT_DELETE_MAIN_ADMIN', '主 admin 账号不可删除（系统的「超级钥匙」账号）');
  }

  // 统计影响范围（用于响应和审计）
  const keyCount = db.prepare('SELECT COUNT(*) AS c FROM api_keys WHERE owner_user_id = ? AND deleted_at IS NULL').get(id).c;
  const sessionCount = db.prepare('SELECT COUNT(*) AS c FROM sessions WHERE user_id = ?').get(id).c;

  const tr = db.transaction(() => {
    const now = new Date().toISOString();
    // 1. 软删用户
    db.prepare('UPDATE users SET deleted_at = ? WHERE id = ?').run(now, id);
    // 2. 软删该用户的所有 key（含主 Key）
    db.prepare('UPDATE api_keys SET deleted_at = ? WHERE owner_user_id = ? AND deleted_at IS NULL').run(now, id);
    // 3. 踢下线
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
  });
  tr();

  audit({
    req,
    action: 'DELETE_ACCOUNT',
    targetType: 'account',
    targetId: u.id,
    targetName: u.username,
    details: { keysSoftDeleted: keyCount, sessionsRevoked: sessionCount },
  });

  return ok(res, {
    id: u.id,
    username: u.username,
    softDeleted: true,
    keysSoftDeleted: keyCount,
    sessionsRevoked: sessionCount,
    message: `已软删账号 ${u.username}（主 Key + ${keyCount} 个普通 key 一起软删，${sessionCount} 个 session 已撤销）`,
  });
});

module.exports = router;
