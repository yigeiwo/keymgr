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

const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  siteUrl: process.env.SITE_URL || 'http://localhost:3000',
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || '',
  sessionSecret: process.env.SESSION_SECRET || 'please-change-this-session-secret',
  logRetentionDays: parseInt(process.env.LOG_RETENTION_DAYS || '30', 10),
  dataDir: path.join(__dirname, '..', 'data'),
  logsDir: path.join(__dirname, '..', 'logs'),
};

for (const dir of [config.dataDir, config.logsDir]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

module.exports = config;
