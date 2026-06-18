-- 变量调用统计表：记录 /v1/variables/* 的调用次数
CREATE TABLE IF NOT EXISTS variable_access_logs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  var_name   TEXT    NOT NULL,
  key_id     INTEGER,
  ip         TEXT,
  result     TEXT    NOT NULL DEFAULT 'ok',
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_var_access_name_time ON variable_access_logs (var_name, created_at);
CREATE INDEX IF NOT EXISTS idx_var_access_key_time  ON variable_access_logs (key_id, created_at);
