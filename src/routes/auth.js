const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { SESSION_COOKIE, createSession, destroySession, verifyCredentials, authMiddleware } = require('../auth');
const { audit } = require('../audit');
const config = require('../config');

const router = express.Router();

// ===== 登录失败限流（防爆破）=====
// 同 IP 在窗口内失败 N 次 → 锁定 T 分钟
const FAIL_WINDOW_MS = config.loginFailWindowMs;
const FAIL_MAX = config.loginFailMax;
const LOCK_MS = config.loginLockMs;
const failMap = new Map();             // ip -> { fails, firstAt, lockedUntil }
function clientIp(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
}
function checkLock(ip) {
  const r = failMap.get(ip);
  if (!r) return null;
  if (r.lockedUntil && r.lockedUntil > Date.now()) {
    return { remainingMs: r.lockedUntil - Date.now() };
  }
  return null;
}
function recordFail(ip) {
  const now = Date.now();
  let r = failMap.get(ip);
  if (!r || now - r.firstAt > FAIL_WINDOW_MS) {
    r = { fails: 0, firstAt: now, lockedUntil: 0 };
    failMap.set(ip, r);
  }
  r.fails++;
  if (r.fails >= FAIL_MAX) r.lockedUntil = now + LOCK_MS;
  return r;
}
function recordSuccess(ip) { failMap.delete(ip); }
// 定时清理过期条目
setInterval(() => {
  const now = Date.now();
  for (const [ip, r] of failMap) {
    if ((r.lockedUntil && r.lockedUntil < now) || now - r.firstAt > FAIL_WINDOW_MS * 2) {
      failMap.delete(ip);
    }
  }
}, 60 * 1000).unref();

router.post('/login', (req, res) => {
  const ip = clientIp(req);

  // 1. 锁中？
  const lock = checkLock(ip);
  if (lock) {
    const min = Math.ceil(lock.remainingMs / 60000);
    return res.status(429).json({
      ok: false,
      code: 'TOO_MANY_LOGIN_FAILURES',
      error: `失败次数过多，已被临时锁定，请 ${min} 分钟后重试`,
      retryAfterMs: lock.remainingMs,
    });
  }

  // 2. 校验参数
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ ok: false, code: 'MISSING_CREDENTIALS', error: '用户名和密码必填' });
  }

  // 3. 校验凭据
  const user = verifyCredentials(username, password);
  if (!user) {
    const r = recordFail(ip);
    const remaining = Math.max(FAIL_MAX - r.fails, 0);
    const status = r.lockedUntil ? 429 : 401;
    audit({ req, action: 'LOGIN_FAILED', targetType: 'user', targetName: username, details: { reason: 'invalid_credentials', fails: r.fails } });
    return res.status(status).json({
      ok: false,
      code: r.lockedUntil ? 'TOO_MANY_LOGIN_FAILURES' : 'INVALID_CREDENTIALS',
      error: r.lockedUntil
        ? `失败次数过多，已被临时锁定 ${Math.ceil(LOCK_MS / 60000)} 分钟`
        : `用户名或密码错误，还剩 ${remaining} 次机会`,
      fails: r.fails,
      remaining,
      lockedUntil: r.lockedUntil || null,
    });
  }

  // 4. 成功 → 清记录 + 签发会话
  recordSuccess(ip);
  const { token } = createSession(user.id);
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    secure: process.env.COOKIE_SECURE === '1', // HTTPS 时设环境变量开启
  });
  audit({ req, userId: user.id, username: user.username, action: 'LOGIN_SUCCESS' });
  res.json({ ok: true, username: user.username, role: user.role, displayName: user.displayName });
});

router.post('/logout', (req, res) => {
  const packed = req.cookies && req.cookies[SESSION_COOKIE];
  destroySession(packed);
  res.clearCookie(SESSION_COOKIE);
  res.json({ ok: true });
});

/**
 * 用户改自己的密码（需要先输旧密码验证）
 *   - 任何登录用户都能改自己的
 *   - 需要 currentPassword 防 CSRF / 撞库后用户立即锁门
 *   - 改完后撤销该用户的所有 session（除当前会话外）
 *   - 主 admin 的密码改了不会锁自己（保留当前 session）
 */
router.post('/change-password', authMiddleware, (req, res) => {
  if (!req.user) return res.status(401).json({ ok: false, code: 'UNAUTHORIZED', error: '未登录' });
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ ok: false, code: 'MISSING_FIELDS', error: '旧密码和新密码都必填' });
  }
  if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) {
    return res.status(400).json({ ok: false, code: 'INVALID_PASSWORD', error: '新密码长度需在 8~128 之间' });
  }

  // 1. 校验旧密码
  const userOk = verifyCredentials(req.user.username, currentPassword);
  if (!userOk) {
    return res.status(401).json({ ok: false, code: 'INVALID_CURRENT_PASSWORD', error: '旧密码错误' });
  }

  // 2. 写新 hash + 撤销其它 session（保留当前会话，避免用户改完密码立刻被锁出）
  const hash = bcrypt.hashSync(newPassword, 10);
  const currentPacked = req.cookies && req.cookies[SESSION_COOKIE];
  const tr = db.transaction(() => {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.user.id);
    const r = db.prepare('DELETE FROM sessions WHERE user_id = ? AND token <> ?').run(req.user.id, currentPacked || '');
    return r.changes;
  });
  const sessionsRevoked = tr();
  audit({ req, action: 'CHANGE_PASSWORD', targetType: 'user', targetId: req.user.id, targetName: req.user.username, details: { sessionsRevoked } });
  return res.json({
    ok: true,
    sessionsRevoked,
    message: `密码已更新，已撤销该账号的 ${sessionsRevoked} 个其它 session。当前会话保留。`,
  });
});

module.exports = router;
