const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const config = require('./config');

const dbFile = path.join(config.dataDir, 'keymgr.db');
let SQL = null;
let _db = null;             // SQL.js 原生 Database
let saveTimer = null;
let shuttingDown = false;

async function init() {
  if (_db) return _db;
  if (!SQL) {
    SQL = await initSqlJs({
      locateFile: (file) => path.join(path.dirname(require.resolve('sql.js')), file),
    });
  }
  if (fs.existsSync(dbFile)) {
    _db = new SQL.Database(fs.readFileSync(dbFile));
  } else {
    _db = new SQL.Database();
  }
  runMigrations();
  ensureDefaultAdmin();
  backfillMainKeys();
  purgeHistoricalOriginals();
  installShutdownHooks();
  return _db;
}

function ensureDefaultAdmin() {
  const row = _db.exec('SELECT COUNT(1) AS c FROM users');
  const c = row[0] ? row[0].values[0][0] : 0;
  if (c !== 0) return;
  const username = config.adminUsername || 'admin';
  const password = config.adminPassword || crypto.randomBytes(9).toString('base64url');
  const hash = bcrypt.hashSync(password, 10);
  _db.run('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, hash]);
  if (!config.adminPassword) {
    // eslint-disable-next-line no-console
    console.log('\n========================================');
    console.log('  默认管理员已创建');
    console.log(`  用户名: ${username}`);
    console.log(`  密  码: ${password}  (仅显示一次，请保存)`);
    console.log(`  主 Key: 在「账号管理」页面查看明文 / 刷新`);
    console.log('========================================\n');
  } else {
    console.log(`[init] 默认管理员已创建：${username}`);
  }
  scheduleSave();
}

/**
 * 为没有主 Key 的账号补建 1 个（迁移后回填 + 极端场景兜底）。
 *  - 老用户升级到 0007 后立刻生效
 *  - 新建用户由 routes/users.js 在创建时同步建（无需回填）
 *  - 运行时也兜底：routes/accounts.js 的 ensureMainKey 会按需补建
 */
function backfillMainKeys() {
  // 检查 api_keys 是否有 is_default 列（迁移前/后差异）
  let hasIsDefault = false;
  try {
    const info = _db.exec("PRAGMA table_info(api_keys)");
    if (info[0]) hasIsDefault = info[0].values.some(c => c[1] === 'is_default');
  } catch (_) { return; }
  if (!hasIsDefault) return;

  // 注意：这里不过滤 disabled —— 即便被禁用的账号也要补主 Key，
  // 方便 admin 后续「启用」时立即可用，不用再多走一次自愈
  const missing = _db.exec(`
    SELECT u.id, u.username FROM users u
    WHERE u.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM api_keys k WHERE k.owner_user_id = u.id AND k.is_default = 1 AND k.deleted_at IS NULL
      )
  `);
  if (!missing[0] || !missing[0].values.length) return;

  // 延迟 require 避免循环依赖（crypto、keys 都依赖 db）
  const { encrypt } = require('./crypto');
  const usersToFix = missing[0].values;
  for (const [uid, uname] of usersToFix) {
    const tag = crypto.randomBytes(3).toString('hex');
    const random = crypto.randomBytes(24).toString('base64url');
    const plain = `sk_acc_${tag}_${random}`;
    const keyPrefix = plain.slice(0, 12);
    const sha = crypto.createHash('sha256').update(plain).digest('hex');
    const enc = encrypt(plain);
    try {
      _db.run(`
        INSERT INTO api_keys (name, prefix, hash, original_plain, current_plain, owner_user_id, is_default, owner)
        VALUES (?, ?, ?, ?, ?, ?, 1, 'system')
      `, [`${uname}-main`, keyPrefix, sha, enc, enc, uid]);
      console.log(`[init] 已为账号 ${uname} 补建主 Key（prefix=${keyPrefix}…）`);
    } catch (e) {
      // 并发 / 唯一约束冲突 —— 静默忽略，运行时自愈会兜底
      if (!/UNIQUE|uniq_api_keys_default_per_account/i.test(e.message)) {
        console.log(`[init] 为账号 ${uname} 补建主 Key 失败：${e.message}`);
      }
    }
  }
}

/**
 * 清空历史 Key 残留。
 * 业务变更：刷新后旧 key 不再保留（原来 original_plain 会被覆盖为 current_plain）。
 * 对仍在使用原 original_plain 值的行做一次清理，让语义和新策略一致。
 * 注意：只能从 encrypted 密文层面比对 —— original_plain 已被 AES 加密，每次都不同密文；
 *       所以直接走"凡是 original_plain != current_plain 的都覆盖"的策略，统一刷一遍。
 *       这步不可逆 —— 重置过的 key 的"创建时"明文会被永久擦除。
 */
function purgeHistoricalOriginals() {
  try {
    const info = _db.exec("PRAGMA table_info(api_keys)");
    if (!info[0]) return;
    const cols = info[0].values.map(r => r[1]);
    if (!cols.includes('original_plain') || !cols.includes('current_plain')) return;
    const res = _db.run(`UPDATE api_keys SET original_plain = current_plain WHERE original_plain != current_plain`);
    if (res.changes) console.log(`[init] 已清空 ${res.changes} 行历史 original_plain（统一覆盖为 current_plain）`);
  } catch (e) {
    console.log('[init] 清空历史 original_plain 失败：' + e.message);
  }
}

/**
 * 迁移系统：
 *   - migrations/NNNN_*.sql 按文件名顺序应用
 *   - schema_version(version, name, applied_at) 记录已应用版本
 *   - 老库（已有 users/api_keys 表但没有 schema_version）自动 baseline 到当前最高版本
 *
 * 写新迁移：直接在 migrations/ 目录新增 NNNN_xxx.sql 即可，启动时自动应用。
 */
function runMigrations() {
  // 1) 先确保 schema_version 表存在
  _db.run(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // 2) 列出迁移文件
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  let files = [];
  if (fs.existsSync(migrationsDir)) {
    files = fs.readdirSync(migrationsDir)
      .filter(f => /^\d{4}_.*\.sql$/.test(f))
      .sort();
  }

  // 3) 老库 baseline
  const hasUsers = _db.exec("SELECT 1 FROM sqlite_master WHERE type='table' AND name='users'")[0];
  const hasVersionRow = _db.exec('SELECT 1 FROM schema_version LIMIT 1')[0];
  if (hasUsers && !hasVersionRow && files.length) {
    const latest = parseInt(files[files.length - 1].slice(0, 4), 10);
    _db.run('INSERT INTO schema_version (version, name) VALUES (?, ?)', [latest, '__baseline__']);
    // eslint-disable-next-line no-console
    console.log(`[migrate] 检测到老库，baseline 到 ${latest}`);
  }

  // 4) 取已应用版本
  const stmt = _db.prepare('SELECT version FROM schema_version');
  const applied = new Set();
  try {
    while (stmt.step()) {
      const row = stmt.getAsObject();
      applied.add(row.version);
    }
  } finally {
    stmt.free();
  }

  // 5) 逐个应用未运行的迁移
  for (const f of files) {
    const ver = parseInt(f.slice(0, 4), 10);
    if (applied.has(ver)) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, f), 'utf8');
    const stmts = splitSql(sql);
    try {
      for (const s of stmts) {
        const trimmed = s.trim();
        if (!trimmed) continue;
        try { _db.exec(trimmed); } catch (e) {
          // 已存在的列 / 索引，忽略
          if (!/already exists|duplicate column/i.test(e.message)) throw e;
        }
      }
      _db.run('INSERT INTO schema_version (version, name) VALUES (?, ?)', [ver, f]);
      // eslint-disable-next-line no-console
      console.log(`[migrate] 应用 ${f}`);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(`[migrate] 失败 ${f}: ${e.message}`);
      throw e;
    }
  }
}

// 极简 SQL 拆分：按 ; 分行，过滤空行和 -- 注释
function splitSql(sql) {
  const out = [];
  let buf = '';
  for (const line of sql.split(/\r?\n/)) {
    const t = line.trim();
    if (t.startsWith('--') || !t) continue;
    buf += line + '\n';
    if (t.endsWith(';')) { out.push(buf); buf = ''; }
  }
  if (buf.trim()) out.push(buf);
  return out;
}

function scheduleSave() {
  if (saveTimer || shuttingDown) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    flushNow();
  }, 200);
}

/**
 * 立即把内存数据库刷到磁盘。
 *  - 进程退出时调用一次，保证最近 200ms 的写入不丢
 *  - 用 tmp + rename，避免半写状态破坏 db
 */
function flushNow() {
  if (!_db) return;
  try {
    const data = _db.export();
    const tmp = dbFile + '.tmp';
    fs.writeFileSync(tmp, Buffer.from(data));
    fs.renameSync(tmp, dbFile);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('保存数据库失败', e.message);
  }
}

function installShutdownHooks() {
  const onExit = (sig) => {
    if (shuttingDown) return;
    shuttingDown = true;
    try { flushNow(); } catch (_) {}
    // eslint-disable-next-line no-console
    console.log(`[db] 收到 ${sig}，已刷盘，进程退出`);
    process.exit(0);
  };
  process.once('SIGINT',  onExit);
  process.once('SIGTERM', onExit);
  process.once('exit', () => { try { flushNow(); } catch (_) {} });
}

/**
 * better-sqlite3 兼容层：返回 { run, get, all }
 * 实现简单直白，无 statement 缓存。
 *  - run(...params): insert/update/delete
 *  - get(...params): SELECT 第一行
 *  - all(...params): SELECT 所有行
 */
function prepare(sql) {
  return {
    run: (...params) => {
      _db.run(sql, params);
      scheduleSave();
      const r = _db.exec('SELECT last_insert_rowid() AS id');
      const id = r[0] ? Number(r[0].values[0][0]) : 0;
      return { lastInsertRowid: id, changes: _db.getRowsModified() };
    },
    get: (...params) => {
      const stmt = _db.prepare(sql);
      try {
        if (params.length) stmt.bind(params);
        if (stmt.step()) return stmt.getAsObject();
        return undefined;
      } finally {
        stmt.free();
      }
    },
    all: (...params) => {
      const stmt = _db.prepare(sql);
      const out = [];
      try {
        if (params.length) stmt.bind(params);
        while (stmt.step()) out.push(stmt.getAsObject());
        return out;
      } finally {
        stmt.free();
      }
    },
  };
}

function exec(sql) {
  _db.exec(sql);
  scheduleSave();
}

function transaction(fn) {
  return (...args) => {
    _db.run('BEGIN');
    try {
      const r = fn(...args);
      _db.run('COMMIT');
      scheduleSave();
      return r;
    } catch (e) {
      _db.run('ROLLBACK');
      throw e;
    }
  };
}

module.exports = { init, prepare, exec, transaction, flushNow };
