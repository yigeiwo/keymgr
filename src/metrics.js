/**
 * 简单的滑动窗口指标收集
 *  - 累计计数：verify ok / fail / 各 reason
 *  - 响应时间：保留最近 1024 个样本用于 P50/P95/P99
 *
 * 内存占用约：1024 * 8B = 8KB；够用。
 */
const SAMPLES = 1024;
const durations = [];   // 最近 duration_ms 样本
let cursor = 0;
let filled = false;

const counters = {
  verifyTotal: 0,
  verifyOk: 0,
  verifyFail: 0,
  // 各种 reason 的失败次数
  verifyFailByReason: {
    NOT_FOUND: 0, DISABLED: 0, EXPIRED: 0, MISSING_KEY: 0,
  },
  // 全局 HTTP 状态码计数
  http2xx: 0,
  http4xx: 0,
  http5xx: 0,
};

function recordDuration(ms) {
  if (typeof ms !== 'number' || !isFinite(ms) || ms < 0) return;
  if (filled) {
    durations[cursor] = ms;
  } else {
    durations.push(ms);
  }
  cursor = (cursor + 1) % SAMPLES;
  if (cursor === 0) filled = true;
}

function recordVerify(result, reason) {
  counters.verifyTotal++;
  if (result === 'ok') counters.verifyOk++;
  else {
    counters.verifyFail++;
    if (reason && counters.verifyFailByReason[reason] !== undefined) {
      counters.verifyFailByReason[reason]++;
    }
  }
}

function recordHttpStatus(status) {
  if (status >= 200 && status < 300) counters.http2xx++;
  else if (status >= 400 && status < 500) counters.http4xx++;
  else if (status >= 500) counters.http5xx++;
}

function percentiles() {
  if (!durations.length) return { count: 0, p50: 0, p95: 0, p99: 0, max: 0 };
  const arr = filled ? durations.slice() : durations.slice();
  arr.sort((a, b) => a - b);
  const n = arr.length;
  const pick = (p) => arr[Math.min(n - 1, Math.floor(n * p))];
  return {
    count: n,
    p50: +pick(0.50).toFixed(2),
    p95: +pick(0.95).toFixed(2),
    p99: +pick(0.99).toFixed(2),
    max: +arr[n - 1].toFixed(2),
  };
}

function snapshot() {
  return {
    counters: { ...counters, verifyFailByReason: { ...counters.verifyFailByReason } },
    duration: percentiles(),
    memory: process.memoryUsage(),
    uptimeSec: Math.floor(process.uptime()),
  };
}

// 简易响应时间中间件
function timingMiddleware(req, res, next) {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const dur = Number(process.hrtime.bigint() - start) / 1e6;
    recordDuration(dur);
    recordHttpStatus(res.statusCode);
  });
  next();
}

module.exports = {
  recordDuration,
  recordVerify,
  recordHttpStatus,
  percentiles,
  snapshot,
  timingMiddleware,
};
