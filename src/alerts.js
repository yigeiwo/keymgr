/**
 * 告警 Webhook：监控 /v1/verify 的失败率与突发
 *
 * 配置（.env）：
 *   ALERT_WEBHOOK_URL              接收端 URL（不配则禁用）
 *   ALERT_WEBHOOK_THRESHOLD        失败次数阈值（默认 30）
 *   ALERT_WEBHOOK_WINDOW_MS        滑动窗口（默认 60_000 ms）
 *   ALERT_COOLDOWN_MS              同一告警冷却（默认 5 分钟）
 *
 * 触发条件：在 ALERT_WEBHOOK_WINDOW_MS 内累计失败 ≥ ALERT_WEBHOOK_THRESHOLD 次
 *  → POST 到 ALERT_WEBHOOK_URL，body 为 JSON { event, count, windowMs, topReasons, ts, host }
 *
 * 失败处理：网络/HTTP 错误仅打日志，不抛。
 */
const log = require('./logger');

const config = {
  url: (process.env.ALERT_WEBHOOK_URL || '').trim(),
  threshold: parseInt(process.env.ALERT_WEBHOOK_THRESHOLD || '30', 10),
  windowMs: parseInt(process.env.ALERT_WEBHOOK_WINDOW_MS || '60000', 10),
  cooldownMs: parseInt(process.env.ALERT_COOLDOWN_MS || '300000', 10),
};

// 滑动窗口：失败时间戳数组
let fails = [];
let lastAlertAt = 0;
let pending = false; // 防止重入
const MAX_FAILS = 5000;

function recordFail(reason) {
  if (!config.url) return; // 未启用
  const now = Date.now();
  fails.push({ t: now, reason });
  // 截断过老的
  const cutoff = now - config.windowMs;
  while (fails.length && fails[0].t < cutoff) fails.shift();
  if (fails.length > MAX_FAILS) fails = fails.slice(-MAX_FAILS);

  if (fails.length >= config.threshold && !pending) {
    if (now - lastAlertAt < config.cooldownMs) return;
    pending = true;
    const top = topReasons();
    sendAlert({ count: fails.length, windowMs: config.windowMs, topReasons: top })
      .catch((e) => log.warn('告警 webhook 调用失败', { err: e.message }))
      .finally(() => {
        lastAlertAt = Date.now();
        pending = false;
        // 重置窗口，避免刚告警完就又触发
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

async function sendAlert({ count, windowMs, topReasons }) {
  const payload = {
    event: 'verify_fail_spike',
    severity: 'high',
    count,
    windowMs,
    topReasons,
    ts: new Date().toISOString(),
    host: require('os').hostname(),
    service: 'keymgr',
  };
  const body = JSON.stringify(payload);
  // 5 秒超时
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
    log.warn('告警 webhook 已发送', { count, topReasons });
  } finally {
    clearTimeout(timer);
  }
}

function status() {
  return {
    enabled: !!config.url,
    url: config.url ? config.url.replace(/\/\/[^@/]*@/, '//***@') : null, // 隐藏 basic auth
    threshold: config.threshold,
    windowMs: config.windowMs,
    cooldownMs: config.cooldownMs,
    currentWindow: fails.length,
    lastAlertAt: lastAlertAt || null,
  };
}

module.exports = { recordFail, status };
