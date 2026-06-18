/**
 * 告警 Webhook：监控 /v1/verify 的失败率与突发 + Key 过期主动预警
 *
 * 配置（.env）：
 *   ALERT_WEBHOOK_URL              接收端 URL（不配则禁用）
 *   ALERT_WEBHOOK_THRESHOLD        失败次数阈值（默认 30）
 *   ALERT_WEBHOOK_WINDOW_MS        滑动窗口（默认 60_000 ms）
 *   ALERT_COOLDOWN_MS              同一告警冷却（默认 5 分钟）
 *   ALERT_EXPIRY_CHECK_INTERVAL_MS 过期检查间隔（默认 1 小时）
 *
 * 触发条件：
 *   1) verify 失败率突发
 *   2) Key 即将过期（7/3/1 天阈值）
 */
const log = require('./logger');

const config = {
  url: (process.env.ALERT_WEBHOOK_URL || '').trim(),
  threshold: parseInt(process.env.ALERT_WEBHOOK_THRESHOLD || '30', 10),
  windowMs: parseInt(process.env.ALERT_WEBHOOK_WINDOW_MS || '60000', 10),
  cooldownMs: parseInt(process.env.ALERT_COOLDOWN_MS || '300000', 10),
  expiryCheckIntervalMs: parseInt(process.env.ALERT_EXPIRY_CHECK_INTERVAL_MS || '3600000', 10),
};

// ====== verify 失败率告警 ======
let fails = [];
let lastAlertAt = 0;
let pending = false;
const MAX_FAILS = 5000;

function recordFail(reason) {
  if (!config.url) return;
  const now = Date.now();
  fails.push({ t: now, reason });
  const cutoff = now - config.windowMs;
  while (fails.length && fails[0].t < cutoff) fails.shift();
  if (fails.length > MAX_FAILS) fails = fails.slice(-MAX_FAILS);

  if (fails.length >= config.threshold && !pending) {
    if (now - lastAlertAt < config.cooldownMs) return;
    pending = true;
    const top = topReasons();
    sendAlert({ event: 'verify_fail_spike', severity: 'high', payload: { count: fails.length, windowMs: config.windowMs, topReasons: top } })
      .catch((e) => log.warn('告警 webhook 调用失败', { err: e.message }))
      .finally(() => {
        lastAlertAt = Date.now();
        pending = false;
        fails = [];
      });
  }
}

function topReasons() {
  const m = {};
  for (const f of fails) m[f.reason] = (m[f.reason] || 0) + 1;
  return Object.entries(m)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([reason, n]) => ({ reason, count: n }));
}

// ====== Key 过期主动预警 ======
// 记录已告警的 key+阈值对，避免重复告警
const expiryAlerted = new Map(); // `${keyId}_${thresholdDays}` -> timestamp
const EXPIRY_ALERT_COOLDOWN_MS = 24 * 3600 * 1000; // 同一个 key 同一阈值 24 小时内不重复告警

/**
 * 启动定时检查 Key 过期状态。
 * 每小时检查一次，对即将在 7/3/1 天内过期的 Key 发送预警。
 */
let expiryCheckTimer = null;

function startExpiryCheck() {
  if (!config.url || expiryCheckTimer) return;
  // 首次延迟 30 秒执行（等 DB 初始化完）
  setTimeout(() => {
    checkExpiringKeys();
    expiryCheckTimer = setInterval(checkExpiringKeys, config.expiryCheckIntervalMs);
    if (expiryCheckTimer.unref) expiryCheckTimer.unref();
  }, 30000);
}

function checkExpiringKeys() {
  const db = require('./db');
  const now = Date.now();
  const thresholds = [7, 3, 1]; // 天

  // 查询所有启用的、有过期时间的、未删除的 key
  let rows;
  try {
    rows = db.prepare(`
      SELECT k.id, k.name, k.prefix, k.expires_at, k.owner, k.owner_user_id,
             u.username AS owner_username
      FROM api_keys k
      LEFT JOIN users u ON u.id = k.owner_user_id
      WHERE k.enabled = 1 AND k.deleted_at IS NULL AND k.expires_at IS NOT NULL
        AND k.is_default = 0
    `).all();
  } catch (e) {
    log.warn('Key 过期检查查询失败', { err: e.message });
    return;
  }

  const alerts = [];

  for (const row of rows) {
    const exp = new Date(row.expires_at + (row.expires_at.endsWith('Z') ? '' : 'Z')).getTime();
    if (isNaN(exp)) continue;
    const daysLeft = (exp - now) / (24 * 3600 * 1000);
    if (daysLeft < 0) continue; // 已过期的不管

    for (const t of thresholds) {
      if (daysLeft <= t) {
        const key = `${row.id}_${t}`;
        const lastAlert = expiryAlerted.get(key);
        if (lastAlert && now - lastAlert < EXPIRY_ALERT_COOLDOWN_MS) continue;

        const severity = t <= 1 ? 'critical' : t <= 3 ? 'high' : 'medium';
        alerts.push({
          keyId: row.id,
          name: row.name,
          prefix: row.prefix,
          owner: row.owner || null,
          ownerUsername: row.owner_username || null,
          expiresAt: row.expires_at,
          daysLeft: +daysLeft.toFixed(1),
          threshold: t,
          severity,
        });
        expiryAlerted.set(key, now);
        break; // 只取最低阈值（最紧急的）
      }
    }
  }

  // 清理过期的告警记录（超过 30 天的）
  for (const [k, v] of expiryAlerted) {
    if (now - v > 30 * 24 * 3600 * 1000) expiryAlerted.delete(k);
  }

  if (alerts.length) {
    sendAlert({
      event: 'key_expiry_warning',
      severity: alerts.some(a => a.severity === 'critical') ? 'critical' : 'high',
      payload: {
        count: alerts.length,
        keys: alerts.map(a => ({
          keyId: a.keyId,
          name: a.name,
          prefix: a.prefix,
          owner: a.owner,
          ownerUsername: a.ownerUsername,
          expiresAt: a.expiresAt,
          daysLeft: a.daysLeft,
          threshold: a.threshold,
        })),
      },
    }).catch((e) => log.warn('过期预警 webhook 调用失败', { err: e.message }));
  }
}

// ====== 通用发送 ======
async function sendAlert({ event, severity, payload }) {
  const body = JSON.stringify({
    event,
    severity,
    ...payload,
    ts: new Date().toISOString(),
    host: require('os').hostname(),
    service: 'keymgr',
  });
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 5000);
  try {
    const r = await fetch(config.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'keymgr-alert/1' },
      body,
      signal: ac.signal,
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    log.warn(`告警 webhook 已发送: ${event}`, { event, severity });
  } finally {
    clearTimeout(timer);
  }
}

function status() {
  return {
    enabled: !!config.url,
    url: config.url ? config.url.replace(/\/\/[^@/]*@/, '//***@') : null,
    threshold: config.threshold,
    windowMs: config.windowMs,
    cooldownMs: config.cooldownMs,
    currentWindow: fails.length,
    lastAlertAt: lastAlertAt || null,
    expiryCheck: {
      intervalMs: config.expiryCheckIntervalMs,
      nextCheck: expiryCheckTimer ? 'running' : 'stopped',
    },
  };
}

module.exports = { recordFail, startExpiryCheck, status };
