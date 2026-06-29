const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const log = require('../logger');
const metrics = require('../metrics');
const alerts = require('../alerts');
const config = require('../config');
const { getDefaultAdminId } = require('../users');

const router = express.Router();

const verifyLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: config.verifyRateLimitPerMin,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

function extractKey(req) {
  // 1. 显式 body.key
  if (req.body && typeof req.body.key === 'string' && req.body.key.trim()) {
    return req.body.key.trim();
  }
  // 2. Authorization: Bearer sk_live_xxx
  const auth = req.headers['authorization'];
  if (auth && typeof auth === 'string') {
    if (auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
    return auth.trim();
  }
  // 3. x-api-key
  const x = req.headers['x-api-key'];
  if (x && typeof x === 'string') return x.trim();
  return null;
}

/**
 * 解析 verify 调用的「目标账号」。
 *   - body.account / ownerUserId / ownerUsername：可选；不传则取「默认账号」
 *   - 默认账号：admin 角色中的最早一个
 *
 * 老 key（owner_user_id IS NULL）会被当作 admin 账号的 key（兼容老库）。
 *
 * 不缓存：users 表变动后下一次 verify 立即生效（避免手动失效）。
 *
 * getDefaultAdminId 收口在 ../users.js
 */

function resolveVerifyAccount(req) {
  const body = req.body || {};
  const accountName = body.account !== undefined && body.account !== null && body.account !== ''
    ? body.account
    : body.ownerUsername;
  // 错误一律返 400；用 code 字段区分类型
  if (accountName !== undefined && accountName !== null && accountName !== '') {
    const u = db.prepare('SELECT id, username, disabled FROM users WHERE username = ? AND deleted_at IS NULL').get(String(accountName));
    if (!u) return { error: 'ACCOUNT_NOT_FOUND', msg: '账号不存在' };
    if (u.disabled) return { error: 'ACCOUNT_DISABLED', msg: '账号已停用' };
    return { userId: u.id, username: u.username };
  }
  if (body.ownerUserId !== undefined && body.ownerUserId !== null && body.ownerUserId !== '') {
    const uid = parseInt(body.ownerUserId, 10);
    if (!uid || isNaN(uid)) return { error: 'INVALID_OWNER_USER_ID', msg: 'ownerUserId 必须是整数' };
    const u = db.prepare('SELECT id, username, disabled FROM users WHERE id = ? AND deleted_at IS NULL').get(uid);
    if (!u) return { error: 'ACCOUNT_NOT_FOUND', msg: '账号不存在' };
    if (u.disabled) return { error: 'ACCOUNT_DISABLED', msg: '账号已停用' };
    return { userId: u.id, username: u.username };
  }
  const aid = getDefaultAdminId();
  if (!aid) return { error: 'NO_ADMIN', msg: '系统中没有可用管理员账号' };
  // 默认账号的 username 也回查一下（方便响应里带上）
  const u = db.prepare('SELECT username FROM users WHERE id = ?').get(aid);
  return { userId: aid, username: u ? u.username : 'admin' };
}

function maskPlain(plain) {
  if (!plain || plain.length < 8) return '****';
  return plain.slice(0, 8) + '…' + plain.slice(-4);
}

// ====== last_used_at 异步批写 ======
// 高频 verify 时，每次同步 UPDATE 会成为瓶颈。这里把同 key 的多次写合并，
// 30 秒内最多刷一次。代价：last_used_at 最多落后 30 秒——对业务无影响。
const lastUsedPending = new Map(); // keyId -> 最新命中时间戳
let lastUsedFlushTimer = null;
const LAST_USED_FLUSH_MS = 30 * 1000;

function touchLastUsed(keyId) {
  if (!keyId) return;
  const now = Date.now();
  // 保留最新一次时间戳（多次命中取最晚的）
  const cur = lastUsedPending.get(keyId);
  if (!cur || cur < now) lastUsedPending.set(keyId, now);
  if (lastUsedFlushTimer) return;
  lastUsedFlushTimer = setTimeout(flushLastUsed, LAST_USED_FLUSH_MS);
  lastUsedFlushTimer.unref();
}
function flushLastUsed() {
  lastUsedFlushTimer = null;
  if (!lastUsedPending.size) return;
  // 一次写一个 key 的 last_used_at；N 个 key 用单条 UPDATE 拼 OR 不划算（sql.js 参数限制），
  // 改为循环，每条都很快，DB 写入压力大幅低于逐次 verify 同步写。
  const ids = Array.from(lastUsedPending.entries());
  lastUsedPending.clear();
  for (const [id, ts] of ids) {
    const iso = new Date(ts).toISOString().replace('T', ' ').replace(/\..+/, '');
    try {
      db.prepare("UPDATE api_keys SET last_used_at = ? WHERE id = ? AND (last_used_at IS NULL OR last_used_at < ?)").run(iso, id, iso);
    } catch (_) { /* ignore */ }
  }
}
// 进程退出时尽量刷一次
process.once('beforeExit', flushLastUsed);
process.once('SIGINT',  () => { flushLastUsed(); });
process.once('SIGTERM', () => { flushLastUsed(); });

function authenticateKeyForAccount(plain, acct) {
  if (!plain) return { ok: false, code: 'MISSING_KEY' };
  const hash = crypto.createHash('sha256').update(plain).digest('hex');
  // 注意：兼容老库——owner_user_id IS NULL 也算「admin 的 key」
  const row = db.prepare(
    `SELECT id, name, prefix, meta, enabled, expires_at, owner_user_id, is_default
     FROM api_keys
     WHERE hash = ?
       AND deleted_at IS NULL
       AND (owner_user_id = ? OR owner_user_id IS NULL)`
  ).get(hash, acct.userId);

  // 主 Key 通杀逻辑：找不到时，尝试「admin 账号的主 Key」作为超级钥匙
  //   - 如果请求中传入了非 admin 账号的 scope，则 admin 主 Key 不开此权限（保持作用域）
  //   - 如果请求中未指定账号 / 指定 admin，则 admin 主 Key 可命中任意账号下的 key
  //   - 同时：直接找到的 row 如果本身就是 admin 账号的主 Key，也算 superKey
  let superKeyRow = null;
  let isSuperKey = false;
  const defaultAdminId = getDefaultAdminId();
  if (!row && acct.userId === defaultAdminId) {
    superKeyRow = db.prepare(
      `SELECT k.id, k.name, k.prefix, k.meta, k.enabled, k.expires_at, k.owner_user_id, k.is_default
       FROM api_keys k
       JOIN users u ON u.id = k.owner_user_id
       WHERE k.hash = ? AND k.deleted_at IS NULL
         AND k.is_default = 1 AND u.role = 'admin' AND u.disabled = 0`
    ).get(hash);
    if (superKeyRow) isSuperKey = true;
  } else if (row && row.is_default === 1 && row.owner_user_id === defaultAdminId) {
    isSuperKey = true;
  }

  const effectiveRow = row || superKeyRow;
  if (!effectiveRow) return { ok: false, code: 'NOT_FOUND' };
  if (!effectiveRow.enabled) return { ok: false, code: 'DISABLED', row: effectiveRow, superKey: isSuperKey };
  if (effectiveRow.expires_at && new Date(effectiveRow.expires_at).getTime() < Date.now()) {
    return { ok: false, code: 'EXPIRED', row: effectiveRow, superKey: isSuperKey };
  }
  let meta = null;
  try { if (effectiveRow.meta) meta = JSON.parse(effectiveRow.meta); } catch (_) {}
  return { ok: true, row: effectiveRow, meta, superKey: isSuperKey };
}

/**
 * POST /v1/verify
 *
 * 行为：
 *   - 鉴权 Key
 *   - 业务侧可以传 account=xxx 来限定「这个 key 必须属于哪个账号」
 *     默认 = admin 账号（最早创建的 admin）
 *     这样如果一个 service 拿到的 key 被另一个账号 import 了，verify 会失败
 *   - 主 Key（is_default=1）：
 *       - admin 账号的主 Key = 「超级钥匙」，verify 时跨账号通杀（无视 account 限制）
 *       - 其他账号的主 Key = 仅匹配自己账号下的 key
 *   - 老 key（owner_user_id IS NULL）等同于 admin 所有，兼容历史数据
 */
router.post('/verify', verifyLimiter, (req, res) => {
  const start = process.hrtime.bigint();
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '';
  const ua = req.headers['user-agent'] || '';
  const plain = extractKey(req);

  // 解析目标账号
  const acct = resolveVerifyAccount(req);
  if (acct.error) {
    const dur = Number(process.hrtime.bigint() - start) / 1e6;
    metrics.recordDuration(dur);
    metrics.recordVerify('fail', acct.error);
    log.logVerify({ keyPrefix: null, keyMasked: null, ip, userAgent: ua, result: 'fail', reason: acct.error, durationMs: dur });
    return res.status(400).json({ valid: false, code: acct.error, reason: acct.msg });
  }

  if (!plain) {
    const dur = Number(process.hrtime.bigint() - start) / 1e6;
    metrics.recordDuration(dur);
    metrics.recordVerify('fail', 'MISSING_KEY');
    alerts.recordFail('MISSING_KEY');
    log.logVerify({ keyPrefix: null, keyMasked: null, ip, userAgent: ua, result: 'fail', reason: 'MISSING_KEY', durationMs: dur });
    return res.status(400).json({ valid: false, code: 'MISSING_KEY', reason: '未提供 key' });
  }

  const authResult = authenticateKeyForAccount(plain, acct);

  let result = 'fail';
  let reason = 'INVALID';
  let body;
  let httpStatus = 400;
  const effectiveRow = authResult.row || null;
  const isSuperKey = !!authResult.superKey;

  if (!effectiveRow) {
    reason = 'NOT_FOUND';
    body = { valid: false, code: 'NOT_FOUND', reason: 'key 不存在或不属于此账号' };
    httpStatus = 400;
  } else if (!effectiveRow.enabled) {
    reason = 'DISABLED';
    body = { valid: false, code: 'DISABLED', reason: 'key 已停用' };
    httpStatus = 400;
  } else if (effectiveRow.expires_at && new Date(effectiveRow.expires_at).getTime() < Date.now()) {
    reason = 'EXPIRED';
    body = { valid: false, code: 'EXPIRED', reason: 'key 已过期' };
    httpStatus = 400;
  } else {
    result = 'ok';
    reason = null;
    body = {
      valid: true,
      keyId: effectiveRow.id,
      name: effectiveRow.name,
      account: acct.username,
      ownerUserId: effectiveRow.owner_user_id,
      isDefault: !!effectiveRow.is_default || isSuperKey,
      superKey: isSuperKey,
      meta: authResult.meta,
    };
    httpStatus = 200;
    touchLastUsed(effectiveRow.id);
  }

  const dur = Number(process.hrtime.bigint() - start) / 1e6;
  metrics.recordDuration(dur);
  metrics.recordVerify(result, reason);
  if (result === 'fail') alerts.recordFail(reason);
  log.logVerify({
    keyId: effectiveRow ? effectiveRow.id : null,
    keyPrefix: effectiveRow ? effectiveRow.prefix : plain.slice(0, 12),
    keyMasked: maskPlain(plain),
    ip,
    userAgent: ua,
    result,
    reason,
    durationMs: dur,
  });
  log.debug(`verify ${result} ${reason || ''} ip=${ip} acct=${acct.username} super=${isSuperKey}`, { keyId: effectiveRow && effectiveRow.id });

  res.status(httpStatus).json(body);
});

router.get('/verify', (_req, res) => {
  res.json({ ok: true, hint: '请使用 POST /v1/verify' });
});

// ====== 变量取值（鉴权逻辑：复用 verify 的 key 校验）======
function checkKey(plain, acct) {
  const authResult = authenticateKeyForAccount(plain, acct);
  if (!authResult.ok) return { ok: false, code: authResult.code };
  touchLastUsed(authResult.row.id);
  return {
    ok: true,
    keyId: authResult.row.id,
    name: authResult.row.name,
    meta: authResult.meta,
    account: authResult.row.owner_user_id,
    superKey: authResult.superKey,
  };
}

/**
 * 检查 key 的 scopes 是否允许访问某个变量。
 *   meta.scopes 格式：
 *     - 缺省 / null / []：允许访问所有变量
 *     - ["VAR1","VAR2"]：只允许访问这些
 *     - ["*"]：等同于缺省
 */
function keyAllowsScope(keyMeta, varName) {
  if (!keyMeta || typeof keyMeta !== 'object') return true;
  const s = keyMeta.scopes;
  if (!s) return true;
  if (!Array.isArray(s) || !s.length || s.includes('*')) return true;
  return s.includes(varName);
}
function keyAllowsAnyScope(keyMeta, names) {
  if (!keyMeta || typeof keyMeta !== 'object') return names.slice();
  const s = keyMeta.scopes;
  if (!s) return names.slice();
  if (!Array.isArray(s) || !s.length || s.includes('*')) return names.slice();
  const set = new Set(s);
  return names.filter(n => set.has(n));
}

// ====== 变量访问日志（异步批写） ======
const varAccessPending = [];
let varAccessFlushTimer = null;
const VAR_ACCESS_FLUSH_MS = 5000;

function logVarAccess(varName, keyId, req, result) {
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '';
  varAccessPending.push({ varName, keyId, ip, result });
  if (!varAccessFlushTimer) {
    varAccessFlushTimer = setTimeout(flushVarAccess, VAR_ACCESS_FLUSH_MS);
    if (varAccessFlushTimer.unref) varAccessFlushTimer.unref();
  }
}
function flushVarAccess() {
  varAccessFlushTimer = null;
  if (!varAccessPending.length) return;
  const batch = varAccessPending.splice(0);
  const stmt = db.prepare('INSERT INTO variable_access_logs (var_name, key_id, ip, result) VALUES (?, ?, ?, ?)');
  for (const r of batch) {
    try { stmt.run(r.varName, r.keyId || null, r.ip, r.result); } catch (_) {}
  }
}
process.once('beforeExit', flushVarAccess);
process.once('SIGINT', () => { flushVarAccess(); });
process.once('SIGTERM', () => { flushVarAccess(); });

const varLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: config.variableRateLimitPerMin,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

const VAR_NAME_RE = /^[A-Za-z0-9_.\-]{2,64}$/;

/**
 * 把 /v1/verify 的 key 错误 code 映射成 HTTP 状态码。
 * 用于 /v1/variables/* 在 key 鉴权失败时复用一致的语义。
 *
 * 设计原则：对外 API 所有失败统一返 400，错误类型用响应体 code 区分。
 *   业务侧写 if (r.status === 200) ok; else 用 r.body.code 判断具体失败原因。
 */
function keyErrorStatus(_code) {
  return 400;
}

/**
 * POST /v1/variables/get
 * body: { name: "DB_URL" }  +  任意能通过 verify 的传 key 方式
 * → 200 { ok:true,  name, value, description }
 * → 失败统一返 400，错误类型用响应体 code 区分：
 *     MISSING_NAME / INVALID_NAME / NOT_FOUND / SCOPE_FORBIDDEN
 *     MISSING_KEY / DISABLED / EXPIRED / ACCOUNT_NOT_FOUND ...
 */
router.post('/variables/get', varLimiter, (req, res) => {
  const acct = resolveVerifyAccount(req);
  if (acct.error) return res.status(400).json({ ok: false, code: acct.error, reason: acct.msg });
  const plain = extractKey(req);
  const kc = checkKey(plain, acct);
  if (!kc.ok) {
    return res.status(keyErrorStatus(kc.code)).json({ ok: false, code: kc.code, reason: 'key 鉴权失败：' + kc.code });
  }
  const name = (req.body?.name || '').trim();
  if (!name) return res.status(400).json({ ok: false, code: 'MISSING_NAME', reason: 'name 必填' });
  if (!VAR_NAME_RE.test(name)) return res.status(400).json({ ok: false, code: 'INVALID_NAME', reason: 'name 格式错' });
  if (!keyAllowsScope(kc.meta, name)) {
    logVarAccess(name, kc.keyId, req, 'scope_forbidden');
    return res.status(400).json({ ok: false, code: 'SCOPE_FORBIDDEN', reason: '该 key 无权访问此变量' });
  }

  const row = db.prepare('SELECT name, value, description FROM variables WHERE name = ?').get(name);
  if (!row) {
    logVarAccess(name, kc.keyId, req, 'not_found');
    return res.status(400).json({ ok: false, code: 'NOT_FOUND', reason: '变量不存在' });
  }

  logVarAccess(name, kc.keyId, req, 'ok');
  res.json({ ok: true, name: row.name, value: row.value, description: row.description || null });
});

/**
 * POST /v1/variables/multi
 * 失败统一返 400，错误类型用响应体 code 区分：
 *   MISSING_NAMES / TOO_MANY / INVALID_NAME / SCOPE_FORBIDDEN
 *   MISSING_KEY / NOT_FOUND / DISABLED / EXPIRED ...
 */
router.post('/variables/multi', varLimiter, (req, res) => {
  const acct = resolveVerifyAccount(req);
  if (acct.error) return res.status(400).json({ ok: false, code: acct.error, reason: acct.msg });
  const plain = extractKey(req);
  const kc = checkKey(plain, acct);
  if (!kc.ok) {
    return res.status(keyErrorStatus(kc.code)).json({ ok: false, code: kc.code, reason: 'key 鉴权失败：' + kc.code });
  }
  const names = Array.isArray(req.body?.names) ? req.body.names.map(x => String(x).trim()).filter(Boolean) : null;
  if (!names || !names.length) return res.status(400).json({ ok: false, code: 'MISSING_NAMES', reason: 'names 必填（数组）' });
  if (names.length > 100) return res.status(400).json({ ok: false, code: 'TOO_MANY', reason: '一次最多 100 个' });
  for (const n of names) {
    if (!VAR_NAME_RE.test(n)) return res.status(400).json({ ok: false, code: 'INVALID_NAME', reason: `非法 name: ${n}` });
  }
  const allowedNames = keyAllowsAnyScope(kc.meta, names);
  if (!allowedNames.length) {
    return res.status(400).json({ ok: false, code: 'SCOPE_FORBIDDEN', reason: '该 key 无权访问任何请求的变量' });
  }
  const placeholders = allowedNames.map(() => '?').join(',');
  const rows = db.prepare(`SELECT name, value, description FROM variables WHERE name IN (${placeholders})`).all(...allowedNames);
  const foundNames = new Set(rows.map(r => r.name));
  const missing = names.filter(n => !foundNames.has(n));
  const forbidden = names.filter(n => !allowedNames.includes(n));
  res.json({
    ok: true,
    items: rows.map(r => ({ name: r.name, value: r.value, description: r.description || null })),
    missing,
    forbidden,
  });
});

// 分组名同变量名字符集
const VAR_GROUP_RE = /^[A-Za-z0-9_.\-]{2,64}$/;

/**
 * POST /v1/variables/group
 * body: { group: "DB" }   +  任意能通过 verify 的传 key 方式
 * → 200 { ok:true, group, count, items: [{name, value, description}, ...] }
 * → 失败统一返 400，错误类型用 code 区分：
 *     MISSING_GROUP / INVALID_GROUP / GROUP_NOT_FOUND
 *     MISSING_KEY / NOT_FOUND / DISABLED / EXPIRED ...
 *
 * 一次拿一个分组下的所有 name/value 集合。业务侧用来做"按主题批量加载配置"。
 */
router.post('/variables/group', varLimiter, (req, res) => {
  const acct = resolveVerifyAccount(req);
  if (acct.error) return res.status(400).json({ ok: false, code: acct.error, reason: acct.msg });
  const plain = extractKey(req);
  const kc = checkKey(plain, acct);
  if (!kc.ok) {
    return res.status(keyErrorStatus(kc.code)).json({ ok: false, code: kc.code, reason: 'key 鉴权失败：' + kc.code });
  }
  const group = (req.body?.group || '').trim();
  if (!group) return res.status(400).json({ ok: false, code: 'MISSING_GROUP', reason: 'group 必填' });
  if (!VAR_GROUP_RE.test(group)) return res.status(400).json({ ok: false, code: 'INVALID_GROUP', reason: 'group 格式错' });

  const rows = db.prepare(`
    SELECT name, value, description FROM variables
    WHERE group_name = ? ORDER BY name ASC
  `).all(group);

  if (!rows.length) {
    return res.status(400).json({ ok: false, code: 'GROUP_NOT_FOUND', reason: `分组 ${group} 不存在或为空` });
  }

  // scope 过滤：若 key 上声明了 scopes，仅返回其中包含的
  // 同时记录被 scope 过滤掉的变量名（forbidden），方便业务方知道自己的 key 缺权限
  const allowedNames = keyAllowsAnyScope(kc.meta, rows.map(r => r.name));
  const allowedSet = new Set(allowedNames);
  const items = rows
    .filter(r => allowedSet.has(r.name))
    .map(r => ({ name: r.name, value: r.value, description: r.description || null }));
  const forbidden = rows.map(r => r.name).filter(n => !allowedSet.has(n));

  return res.json({
    ok: true,
    group,
    count: items.length,
    items,
    forbidden,
  });
});

/**
 * POST /v1/variables/list
 * 失败按业务态分状态码：400 参数错
 */
router.post('/variables/list', varLimiter, (req, res) => {
  const acct = resolveVerifyAccount(req);
  if (acct.error) return res.status(400).json({ ok: false, code: acct.error, reason: acct.msg });
  const plain = extractKey(req);
  const kc = checkKey(plain, acct);
  if (!kc.ok) {
    return res.status(keyErrorStatus(kc.code)).json({ ok: false, code: kc.code, reason: 'key 鉴权失败：' + kc.code });
  }
  const rows = db.prepare('SELECT name, description FROM variables ORDER BY id ASC').all();
  const allowedNames = keyAllowsAnyScope(kc.meta, rows.map(r => r.name));
  const allowedSet = new Set(allowedNames);
  const items = rows.filter(r => allowedSet.has(r.name));
  const forbidden = rows.map(r => r.name).filter(n => !allowedSet.has(n));
  res.json({ ok: true, items, forbidden });
});

module.exports = router;
