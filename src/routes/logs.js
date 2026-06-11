const express = require('express');
const db = require('../db');
const { requireRole } = require('../auth');

const router = express.Router();

// verify 日志：admin/operator 才能看（含业务方 IP/UA，viewer 不应看到）
// server.js 上已挂 authMiddleware，这里只用 requireRole 收紧权限
router.get('/', requireRole('operator'), (req, res) => {
  const { limit = 100, offset = 0, keyId, result } = req.query;
  const conds = [];
  const args = [];
  if (keyId) { conds.push('key_id = ?'); args.push(keyId); }
  if (result) { conds.push('result = ?'); args.push(result); }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const items = db.prepare(`
    SELECT id, key_id, key_prefix, key_masked, ip, user_agent, result, reason, duration_ms, created_at
    FROM verify_logs
    ${where}
    ORDER BY id DESC
    LIMIT ? OFFSET ?
  `).all(...args, parseInt(limit, 10), parseInt(offset, 10));
  const total = db.prepare(`SELECT COUNT(1) AS c FROM verify_logs ${where}`).get(...args).c;
  res.json({ items, total });
});

module.exports = router;
