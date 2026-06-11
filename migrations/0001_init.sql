-- 0001 · 初始 schema
-- 包含 users / api_keys / verify_logs / sessions 四张基础表
-- （variables 与 audit_logs 在 0002 / 0003 补齐，以兼容老库）

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  prefix TEXT NOT NULL,
  hash TEXT UNIQUE NOT NULL,
  meta TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_used_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_enabled ON api_keys(enabled);

CREATE TABLE IF NOT EXISTS verify_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key_id INTEGER,
  key_prefix TEXT,
  key_masked TEXT,
  ip TEXT,
  user_agent TEXT,
  result TEXT NOT NULL,
  reason TEXT,
  duration_ms REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_verify_logs_created_at ON verify_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_verify_logs_key_id ON verify_logs(key_id);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
