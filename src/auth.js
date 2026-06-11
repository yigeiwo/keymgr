const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('./db');
const config = require('./config');

const SESSION_COOKIE = 'km_sid';
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000; // 7 天

function makeToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function sign(token) {
  return crypto.createHmac('sha256', config.sessionSecret).update(token).digest('base64url');
}

function pack(token) {
  return `${token}.${sign(token)}`;
}

function unpack(packed) {
  if (!packed || typeof packed !== 'string') return null;
  const idx = packed.lastIndexOf('.');
  if (idx === -1) return null;
  const token = packed.slice(0, idx);
  const sig = packed.slice(idx + 1);
  const expected = sign(token);
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  return token;
}

function createSession(userId) {
  const token = makeToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL).toISOString();
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(pack(token), userId, expiresAt);
  return { token: pack(token), expiresAt };
}

function destroySession(packed) {
  if (!packed) return;
  db.prepare('DELETE FROM sessions WHERE token = ?').run(packed);
}

function getUserBySession(packed) {
  if (!packed) return null;
  const row = db.prepare(`
    SELECT u.id, u.username, u.role, u.display_name, u.disabled, u.deleted_at, s.expires_at
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token = ?
  `).get(packed);
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    destroySession(packed);
    return null;
  }
  if (row.disabled || row.deleted_at) {
    // 账号被禁或被软删 → 立刻吊销该 session
    destroySession(packed);
    return null;
  }
  return { id: row.id, username: row.username, role: row.role || 'admin', displayName: row.display_name || row.username };
}

function authMiddleware(req, res, next) {
  const packed = req.cookies && req.cookies[SESSION_COOKIE];
  const user = getUserBySession(packed);
  if (!user) {
    if (req.path.startsWith('/api/') && !req.path.startsWith('/api/auth/')) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    if (req.method === 'GET' && !req.path.startsWith('/api/')) {
      return res.redirect('/login');
    }
    return res.status(401).json({ error: 'unauthorized' });
  }
  req.user = user;
  next();
}

/**
 * 角色检查中间件。
 * 角色定义：
 *   - admin    ：所有权限，包括用户管理
 *   - operator ：Key/变量增删改、查看日志，不可管用户
 *   - viewer   ：只读
 */
const ROLE_RANK = { viewer: 1, operator: 2, admin: 3 };
function requireRole(minRole) {
  const min = ROLE_RANK[minRole] || 0;
  return (req, res, next) => {
    const cur = ROLE_RANK[req.user?.role] || 0;
    if (cur < min) return res.status(403).json({ ok: false, code: 'FORBIDDEN', error: '权限不足' });
    next();
  };
}

function verifyCredentials(username, password) {
  const row = db.prepare('SELECT id, password_hash, role, display_name, disabled, deleted_at FROM users WHERE username = ?').get(username);
  if (!row) return null;
  if (row.disabled || row.deleted_at) return null;
  if (!bcrypt.compareSync(password, row.password_hash)) return null;
  return { id: row.id, username, role: row.role || 'admin', displayName: row.display_name || username };
}

module.exports = {
  SESSION_COOKIE,
  createSession,
  destroySession,
  getUserBySession,
  authMiddleware,
  requireRole,
  verifyCredentials,
  pack,
  unpack,
};
