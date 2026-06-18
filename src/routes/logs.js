const express = require('express');
const db = require('../db');
const { requireRole } = require('../auth');
const { annotateReasonCounts } = require('../diagnostics');

const router = express.Router();

function err(res, status, code, message, extra = {}) {
  return res.status(status).json({ ok: false, error: message, code, ...extra });
}

function parsePositiveInt(value, fallback, { min = 1, max = 1000 } = {}) {
  if (value === undefined || value === null || value === '') return fallback;
  const n = parseInt(value, 10);
  if (!Number.isInteger(n) || n < min) return null;
  return Math.min(n, max);
}

function parseOptionalId(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = parseInt(value, 10);
  return Number.isInteger(n) && n > 0 ? n : false;
}

// verify 日志：admin/operator 才能看（含业务方 IP/UA，viewer 不应看到）
// server.js 上已挂 authMiddleware，这里只用 requireRole 收紧权限
router.get('/', requireRole('operator'), (req, res) => {
  const limit = parsePositiveInt(req.query.limit, 100, { min: 1, max: 500 });
  const offset = parsePositiveInt(req.query.offset, 0, { min: 0, max: 100000 });
  const keyId = parseOptionalId(req.query.keyId);
  const result = req.query.result ? String(req.query.result).trim() : '';

  if (limit === null) return err(res, 400, 'INVALID_LIMIT', 'limit 必须是 1~500 的整数', { field: 'limit' });
  if (offset === null) return err(res, 400, 'INVALID_OFFSET', 'offset 必须是非负整数', { field: 'offset' });
  if (keyId === false) return err(res, 400, 'INVALID_KEY_ID', 'keyId 必须是正整数', { field: 'keyId' });
  if (result && !['ok', 'fail'].includes(result)) return err(res, 400, 'INVALID_RESULT', 'result 只能是 ok 或 fail', { field: 'result' });

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
  `).all(...args, limit, offset);
  const total = db.prepare(`SELECT COUNT(1) AS c FROM verify_logs ${where}`).get(...args).c;
  res.json({ items, total, limit, offset });
});

/**
 * GET /api/logs/stats
 *
 * 验证日志聚合统计。给前端「验证日志」页顶部画一张统计面板用。
 *
 * Query:
 *   days   默认 7，统计窗口（按天分桶 + 时间范围过滤都用它）
 *   keyId  可选，限定某个 key
 *
 * 返回结构：
 *   {
 *     range: { days, since, until },
 *     totals: { ok, fail, total, successRate },
 *     byResult: [{ result, count }],          // ok/fail 分布
 *     topReasons: [{ reason, count, label, severity, fixes }],  // 失败原因 Top，带原因库标注
 *     byDay: [{ date, ok, fail, total }],     // 按天分桶（供前端画趋势）
 *     topKeys: [{ keyId, name, prefix, total, ok, fail }],      // 最活跃 Key Top 10
 *     topIps: [{ ip, total, ok, fail }]        // 调用来源 Top 10（异常 IP 识别）
 *   }
 *
 * 注意：sql.js 不支持 GROUP BY ... ORDER BY COUNT 的全部子句组合时，这里走 JS 端聚合，
 *       保证 sql.js（SQLite WASM）下也能跑（数据量在 30 天保留窗口内，性能可接受）。
 */
router.get('/stats', requireRole('operator'), (req, res) => {
  const days = parsePositiveInt(req.query.days, 7, { min: 1, max: 90 });
  const keyId = parseOptionalId(req.query.keyId);
  if (days === null) return err(res, 400, 'INVALID_DAYS', 'days 必须是 1~90 的整数', { field: 'days' });
  if (keyId === false) return err(res, 400, 'INVALID_KEY_ID', 'keyId 必须是正整数', { field: 'keyId' });

  // since = N 天前的当前时刻（UTC 字符串，跟 created_at 默认 datetime('now') 对齐）
  const since = new Date(Date.now() - days * 24 * 3600 * 1000);
  const sinceStr = since.toISOString().replace('T', ' ').replace(/\..+/, '');

  const conds = ["created_at >= ?"];
  const args = [sinceStr];
  if (keyId) { conds.push('key_id = ?'); args.push(keyId); }
  const where = 'WHERE ' + conds.join(' AND ');

  // 一次拉全量（窗口内），JS 端聚合 —— 避免 sql.js 下多 GROUP BY 查询的兼容性问题
  const rows = db.prepare(`
    SELECT id, key_id, key_prefix, result, reason, ip, created_at
    FROM verify_logs
    ${where}
    ORDER BY id DESC
  `).all(...args);

  // 聚合
  let okTotal = 0, failTotal = 0;
  const reasonCounter = new Map();   // reason -> count
  const dayMap = new Map();          // 'YYYY-MM-DD' -> { ok, fail }
  const keyMap = new Map();          // keyId -> { keyId, prefix, total, ok, fail }
  const ipMap = new Map();           // ip -> { ip, total, ok, fail }

  for (const r of rows) {
    if (r.result === 'ok') okTotal++; else failTotal++;
    const isFail = r.result !== 'ok';

    // 失败原因
    if (isFail && r.reason) {
      reasonCounter.set(r.reason, (reasonCounter.get(r.reason) || 0) + 1);
    }

    // 按天
    const day = (r.created_at || '').slice(0, 10); // 'YYYY-MM-DD'
    if (day) {
      const d = dayMap.get(day) || { date: day, ok: 0, fail: 0 };
      if (isFail) d.fail++; else d.ok++;
      dayMap.set(day, d);
    }

    // 按 key（聚合时补一个 name 占位，下面再用 api_keys 回查）
    if (r.key_id) {
      const k = keyMap.get(r.key_id) || { keyId: r.key_id, prefix: r.key_prefix || '', total: 0, ok: 0, fail: 0 };
      k.total++;
      if (isFail) k.fail++; else k.ok++;
      keyMap.set(r.key_id, k);
    }

    // 按 IP
    const ip = r.ip || '(unknown)';
    const ipStat = ipMap.get(ip) || { ip, total: 0, ok: 0, fail: 0 };
    ipStat.total++;
    if (isFail) ipStat.fail++; else ipStat.ok++;
    ipMap.set(ip, ipStat);
  }

  const total = okTotal + failTotal;

  // 按天补齐缺失的日期（让前端折线/柱图连续）
  const byDay = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 3600 * 1000);
    const key = d.toISOString().slice(0, 10);
    byDay.push(dayMap.get(key) || { date: key, ok: 0, fail: 0, total: 0 });
  }
  // 给 byDay 补 total
  for (const d of byDay) d.total = d.ok + d.fail;

  // topKeys 补 name（从 api_keys 回查，避免每个 row 都 JOIN）
  const topKeys = [...keyMap.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);
  if (topKeys.length) {
    const idToName = new Map();
    const idToDeleted = new Map();
    const idRows = db.prepare(
      `SELECT id, name, deleted_at FROM api_keys WHERE id IN (${topKeys.map(() => '?').join(',')})`
    ).all(...topKeys.map(k => k.keyId));
    for (const r of idRows) { idToName.set(r.id, r.name); idToDeleted.set(r.id, !!r.deleted_at); }
    for (const k of topKeys) {
      k.name = idToName.get(k.keyId) || '(已删除)';
      k.deleted = !!idToDeleted.get(k.keyId);
    }
  }

  const topIps = [...ipMap.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  res.json({
    ok: true,
    range: { days, since: sinceStr, until: new Date().toISOString().replace('T', ' ').replace(/\..+/, '') },
    totals: {
      ok: okTotal,
      fail: failTotal,
      total,
      successRate: total === 0 ? null : +(okTotal / total * 100).toFixed(2),
    },
    byResult: [
      { result: 'ok', count: okTotal },
      { result: 'fail', count: failTotal },
    ],
    topReasons: annotateReasonCounts([...reasonCounter.entries()]),
    byDay,
    topKeys,
    topIps,
  });
});

module.exports = router;
