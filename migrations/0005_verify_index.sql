-- 0005 · verify 热路径覆盖索引
-- WHERE hash = ? AND deleted_at IS NULL 不再回表
CREATE INDEX IF NOT EXISTS idx_api_keys_hash_alive ON api_keys(hash, deleted_at);
