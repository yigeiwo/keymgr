const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const config = require('./config');
const log = require('./logger');
const { authMiddleware, requireRole } = require('./auth');
const metrics = require('./metrics');
const alerts = require('./alerts');
const db = require('./db');

const authRoute = require('./routes/auth');
const keysRoute = require('./routes/keys');
const logsRoute = require('./routes/logs');
const variablesRoute = require('./routes/variables');
const verifyRoute = require('./routes/verify');
const auditRoute = require('./routes/audit');
const usersRoute = require('./routes/users');
const accountsRoute = require('./routes/accounts');
const handoverRoute = require('./routes/handover');

const app = express();

app.set('trust proxy', true);
app.use(express.json({ limit: '128kb' }));
app.use(cookieParser());
// 响应时间埋点（仅记录到内存指标，不影响响应体）
app.use(metrics.timingMiddleware);

// 静态
app.use('/static', express.static(path.join(__dirname, '..', 'public'), { maxAge: 0, etag: true, lastModified: true }));

// 公共：登录页
app.get('/login', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});

// 公共：验证接口（其他服务调用）
app.use('/v1', verifyRoute);

// 受保护：API
app.use('/api/auth', authRoute);
// 写操作需要 operator 及以上；读操作 viewer 即可
const writerOnly = requireRole('operator');
app.use('/api/keys',   authMiddleware, (req, res, next) => req.method === 'GET' ? next() : writerOnly(req, res, next), keysRoute);
app.use('/api/logs',   authMiddleware, logsRoute);
app.use('/api/variables', authMiddleware, (req, res, next) => req.method === 'GET' ? next() : writerOnly(req, res, next), variablesRoute);
app.use('/api/audit',  authMiddleware, auditRoute);
app.use('/api/users',  authMiddleware, usersRoute);
app.use('/api/accounts', authMiddleware, accountsRoute);
app.use('/api/handover', handoverRoute);

// 受保护：首页
app.get('/', authMiddleware, (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// 健康检查：db 状态 / 活跃会话 / 内存 / 版本
app.get('/healthz', (_req, res) => {
  const start = Date.now();
  let dbOk = false; let dbErr = null;
  try { db.prepare('SELECT 1').get(); dbOk = true; } catch (e) { dbErr = e.message; }
  let activeSessions = 0;
  try { activeSessions = db.prepare("SELECT COUNT(*) AS c FROM sessions WHERE expires_at > datetime('now')").get().c; } catch (_) {}
  const mem = process.memoryUsage();
  const pkg = require('../package.json');
  const body = {
    ok: dbOk,
    time: new Date().toISOString(),
    version: pkg.version,
    uptimeSec: Math.floor(process.uptime()),
    db: { ok: dbOk, err: dbErr, queryMs: Date.now() - start },
    sessions: { active: activeSessions },
    memory: {
      rss: mem.rss, heapUsed: mem.heapUsed, heapTotal: mem.heapTotal, external: mem.external,
    },
    metrics: metrics.snapshot(),
    alerts: alerts.status(),
  };
  res.status(dbOk ? 200 : 503).json(body);
});

// 仅内部使用的指标快照（可挂在保护路径下，admin 才能看）
app.get('/api/metrics', authMiddleware, requireRole('admin'), (_req, res) => {
  res.json({ ok: true, ...metrics.snapshot(), alerts: alerts.status() });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'not found', path: req.path });
});

// 错误处理
app.use((err, _req, res, _next) => {
  log.error('未捕获错误', { err: err.message, stack: err.stack });
  res.status(500).json({ error: 'internal error' });
});

(async () => {
  await require('./db').init();
  app.listen(config.port, () => {
    log.info(`KeyMgr 已启动，监听 http://0.0.0.0:${config.port}`);
    log.info(`- 后台:        ${config.siteUrl}/`);
    log.info(`- 验证接口:    POST ${config.siteUrl}/v1/verify`);
    log.info(`- 健康检查:    GET  ${config.siteUrl}/healthz`);
    if (alerts.status().enabled) {
      log.info(`- 告警 webhook: 已启用 (阈值 ${alerts.status().threshold}/${alerts.status().windowMs}ms)`);
      alerts.startExpiryCheck();
    }
  });
})();
