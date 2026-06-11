-- 0004 · 软删除 + 角色 + 元数据扩展
-- 给老库补加列（IF NOT EXISTS 在 sql.js 不支持，每个 ALTER 用 try/catch 兜底）

-- users：角色 / 昵称 / 禁用
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'admin';
ALTER TABLE users ADD COLUMN display_name TEXT;
ALTER TABLE users ADD COLUMN disabled INTEGER NOT NULL DEFAULT 0;

-- api_keys：明文（加密存）/ owner / tags / 软删除
ALTER TABLE api_keys ADD COLUMN original_plain TEXT;
ALTER TABLE api_keys ADD COLUMN current_plain  TEXT;
ALTER TABLE api_keys ADD COLUMN owner TEXT;
ALTER TABLE api_keys ADD COLUMN tags TEXT;
ALTER TABLE api_keys ADD COLUMN deleted_at TEXT;
ALTER TABLE api_keys ADD COLUMN deleted_by INTEGER;
