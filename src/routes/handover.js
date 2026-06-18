/**
 * 交接报告 API
 *
 * POST /api/handover
 * 自动生成交接报告：包含系统概览、Key 统计、变量统计、账号信息、近期活动、风险项等。
 * 仅有 admin 权限可调用。
 */
const { Router } = require('express');
const router = Router();
const db = require('../db');
const { authMiddleware, requireRole } = require('../auth');
const { audit } = require('../audit');

function ok(res, data) { return res.json({ ok: true, ...data }); }
function err(res, status, code, message) {
  return res.status(status).json({ ok: false, code, error: message });
}

router.post('/', authMiddleware, requireRole('admin'), (req, res) => {
  const now = new Date().toISOString();
  const report = {
    generatedAt: now,
    generatedBy: req.user?.username || 'unknown',
    title: 'KeyMgr 交接报告',
  };

  // 1) 系统概览
  const userCount = db.prepare('SELECT COUNT(*) AS c FROM users WHERE deleted_at IS NULL').get()?.c || 0;
  const keyCount = db.prepare('SELECT COUNT(*) AS c FROM api_keys WHERE deleted_at IS NULL AND is_default = 0').get()?.c || 0;
  const mainKeyCount = db.prepare('SELECT COUNT(*) AS c FROM api_keys WHERE deleted_at IS NULL AND is_default = 1').get()?.c || 0;
  const varCount = db.prepare('SELECT COUNT(*) AS c FROM variables').get()?.c || 0;
  const disabledKeys = db.prepare('SELECT COUNT(*) AS c FROM api_keys WHERE deleted_at IS NULL AND enabled = 0 AND is_default = 0').get()?.c || 0;

  report.overview = {
    totalUsers: userCount,
    totalKeys: keyCount,
    totalMainKeys: mainKeyCount,
    totalVariables: varCount,
    disabledKeys,
  };

  // 2) 即将过期的 Key（7 天内）
  const soonExpire = db.prepare(`
    SELECT k.id, k.name, k.prefix, k.expires_at, k.owner, u.username AS owner_username
    FROM api_keys k LEFT JOIN users u ON u.id = k.owner_user_id
    WHERE k.deleted_at IS NULL AND k.enabled = 1 AND k.expires_at IS NOT NULL
      AND k.is_default = 0
      AND datetime(k.expires_at) <= datetime('now', '+7 days')
    ORDER BY k.expires_at ASC
  `).all();
  report.expiringKeys = soonExpire;

  // 3) 已过期的 Key
  const expired = db.prepare(`
    SELECT k.id, k.name, k.prefix, k.expires_at, k.owner, u.username AS owner_username
    FROM api_keys k LEFT JOIN users u ON u.id = k.owner_user_id
    WHERE k.deleted_at IS NULL AND k.expires_at IS NOT NULL
      AND datetime(k.expires_at) <= datetime('now')
      AND k.is_default = 0
    ORDER BY k.expires_at DESC
  `).all();
  report.expiredKeys = expired;

  // 4) 账号清单
  const users = db.prepare(`
    SELECT u.id, u.username, u.role, u.disabled,
           (SELECT COUNT(*) FROM api_keys k WHERE k.owner_user_id = u.id AND k.deleted_at IS NULL AND k.is_default = 0) AS key_count
    FROM users u WHERE u.deleted_at IS NULL
    ORDER BY u.role, u.username
  `).all();
  report.users = users;

  // 5) Key 按 owner 分布
  const keyByOwner = db.prepare(`
    SELECT k.owner, u.username, COUNT(*) AS count
    FROM api_keys k LEFT JOIN users u ON u.id = k.owner_user_id
    WHERE k.deleted_at IS NULL AND k.is_default = 0
    GROUP BY k.owner_user_id
    ORDER BY count DESC
  `).all();
  report.keysByOwner = keyByOwner;

  // 6) Key 按 tag 分布
  const keyByTag = db.prepare(`
    SELECT tags FROM api_keys WHERE deleted_at IS NULL AND is_default = 0 AND tags IS NOT NULL
  `).all();
  const tagMap = {};
  for (const r of keyByTag) {
    try {
      const tags = JSON.parse(r.tags);
      for (const t of tags) tagMap[t] = (tagMap[t] || 0) + 1;
    } catch (_) {}
  }
  report.keysByTag = Object.entries(tagMap).map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count);

  // 7) 变量按分组分布
  const varByGroup = db.prepare(`
    SELECT COALESCE(group_name, '(未分组)') AS group_name, COUNT(*) AS count
    FROM variables GROUP BY group_name ORDER BY count DESC
  `).all();
  report.variablesByGroup = varByGroup;

  // 8) 近期验证统计（7 天）
  const since7 = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().replace('T', ' ').replace(/\..+/, '');
  let verify7 = { total: 0, ok: 0, fail: 0 };
  try {
    const vr = db.prepare(`
      SELECT COUNT(*) AS total,
             SUM(CASE WHEN result = 'ok' THEN 1 ELSE 0 END) AS ok,
             SUM(CASE WHEN result != 'ok' THEN 1 ELSE 0 END) AS fail
      FROM verify_logs WHERE created_at >= ?
    `).get(since7);
    if (vr) verify7 = vr;
  } catch (_) {}
  report.verifyStats7d = verify7;

  // 9) 近期审计日志（最近 20 条）
  let recentAudit = [];
  try {
    recentAudit = db.prepare(`
      SELECT action, target_type, target_id, target_name, ip, created_at
      FROM audit_logs ORDER BY id DESC LIMIT 20
    `).all();
  } catch (_) {}
  report.recentAudit = recentAudit;

  // 10) 风险项汇总
  const risks = [];
  if (expired.length) risks.push({ level: 'high', message: `${expired.length} 个 Key 已过期但仍未删除` });
  if (soonExpire.length) risks.push({ level: 'warn', message: `${soonExpire.length} 个 Key 即将在 7 天内过期` });
  if (disabledKeys) risks.push({ level: 'info', message: `${disabledKeys} 个 Key 已停用` });
  if (verify7.fail > 0 && verify7.total > 0) {
    const failRate = (verify7.fail / verify7.total * 100).toFixed(1);
    if (failRate > 20) risks.push({ level: 'high', message: `近 7 天验证失败率 ${failRate}%` });
    else if (failRate > 5) risks.push({ level: 'warn', message: `近 7 天验证失败率 ${failRate}%` });
  }
  // 无 owner 的 key
  const noOwnerKeys = db.prepare(`
    SELECT COUNT(*) AS c FROM api_keys WHERE deleted_at IS NULL AND is_default = 0 AND owner_user_id IS NULL
  `).get()?.c || 0;
  if (noOwnerKeys) risks.push({ level: 'warn', message: `${noOwnerKeys} 个 Key 未归属到任何账号` });

  report.risks = risks;

  // 审计
  audit({ req, action: 'GENERATE_HANDOVER', targetType: 'system', targetId: 0, targetName: 'handover-report' });

  return ok(res, report);
});

module.exports = router;
