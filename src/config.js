const path = require('path');
const fs = require('fs');

// 加载 .env（轻量实现，不引依赖）
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim();
    if (!(k in process.env)) process.env[k] = v;
  }
}

const DEFAULT_SESSION_SECRET = 'please-change-this-session-secret';

function intEnv(name, fallback, { min = 0 } = {}) {
  const n = parseInt(process.env[name] || '', 10);
  if (!Number.isInteger(n) || n < min) return fallback;
  return n;
}

const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: intEnv('PORT', 3000, { min: 1 }),
  siteUrl: process.env.SITE_URL || 'http://localhost:3000',
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || '',
  sessionSecret: process.env.SESSION_SECRET || DEFAULT_SESSION_SECRET,
  defaultSessionSecret: DEFAULT_SESSION_SECRET,
  logRetentionDays: intEnv('LOG_RETENTION_DAYS', 30, { min: 1 }),
  loginFailWindowMs: intEnv('LOGIN_FAIL_WINDOW_MS', 10 * 60 * 1000, { min: 1000 }),
  loginFailMax: intEnv('LOGIN_FAIL_MAX', 5, { min: 1 }),
  loginLockMs: intEnv('LOGIN_LOCK_MS', 15 * 60 * 1000, { min: 1000 }),
  verifyRateLimitPerMin: intEnv('VERIFY_RATE_LIMIT_PER_MIN', 600, { min: 1 }),
  variableRateLimitPerMin: intEnv('VARIABLE_RATE_LIMIT_PER_MIN', 1200, { min: 1 }),
  dataDir: path.join(__dirname, '..', 'data'),
  logsDir: path.join(__dirname, '..', 'logs'),
};

if (config.sessionSecret === DEFAULT_SESSION_SECRET) {
  const msg = 'SESSION_SECRET 仍为默认值，请在 .env 中设置高熵随机值';
  if (config.nodeEnv === 'production') throw new Error(msg);
  console.warn('[config] ' + msg);
}

for (const dir of [config.dataDir, config.logsDir]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

module.exports = config;
