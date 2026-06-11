-- 0002 · 变量库
-- 业务服务按 name 拉取值；变量库与 key 鉴权解耦。

CREATE TABLE IF NOT EXISTS variables (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_variables_name ON variables(name);
