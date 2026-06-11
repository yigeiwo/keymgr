const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireRole } = require('../auth');

// GET /api/audit?action=CREATE_KEY&user_id=1&limit=50&offset=0
// 审计日志：admin 才能看（viewer 不应看到其他账号的 IP/UA / 操作记录）
// server.js 上已挂 authMiddleware，这里只用 requireRole 收紧权限
router.get('/', requireRole('admin'), (req, res) => {
  const { action, user_id, target_type, limit, offset } = req.query;
  const conds = [];
  const args = [];
  if (action) { conds.push('action = ?'); args.push(action); }
  if (user_id) { conds.push('user_id = ?'); args.push(parseInt(user_id, 10)); }
  if (target_type) { conds.push('target_type = ?'); args.push(target_type); }
  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
  const lim = Math.min(parseInt(limit, 10) || 50, 500);
  const off = parseInt(offset, 10) || 0;
  const items = db.prepare(`
    SELECT id, user_id, username, action, target_type, target_id, target_name, details, ip, user_agent, created_at
    FROM audit_logs ${where} ORDER BY id DESC LIMIT ? OFFSET ?
  `).all(...args, lim, off);
  const total = db.prepare(`SELECT COUNT(*) AS c FROM audit_logs ${where}`).get(...args).c;
  // details 可能是损坏的 JSON；try/catch 容错，避免一条脏数据让整个接口 500
  res.json({
    ok: true,
    total,
    items: items.map(x => {
      let details = null;
      if (x.details) { try { details = JSON.parse(x.details); } catch (_) { details = { _parseError: true, raw: x.details }; }
      }
      return { ...x, details };
    }),
  });
});

module.exports = router;
