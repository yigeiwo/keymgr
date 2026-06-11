const db = require('./db');

/**
 * 写一条审计日志（异步，不阻塞主流程）。
 * 失败时只 console.error，不抛。
 */
function audit({ userId, username, action, targetType, targetId, targetName, details, req }) {
  const ip = req ? (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress : null;
  const ua = req ? req.headers['user-agent'] : null;
  const payload = {
    userId: userId ?? null,
    username: username ?? null,
    action,
    targetType: targetType ?? null,
    targetId: targetId ?? null,
    targetName: targetName ?? null,
    details: details ? JSON.stringify(details) : null,
    ip: ip ?? null,
    ua: ua ?? null,
  };
  // 推到下一 tick，调用方立即返回
  setImmediate(() => {
    try {
      db.prepare(`
        INSERT INTO audit_logs (user_id, username, action, target_type, target_id, target_name, details, ip, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(payload.userId, payload.username, payload.action, payload.targetType, payload.targetId, payload.targetName, payload.details, payload.ip, payload.ua);
    } catch (e) {
      console.error('[audit] failed:', e.message);
    }
  });
}

module.exports = { audit };
