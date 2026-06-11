-- 0007 · 账号主 Key
-- 给 api_keys 加 is_default 标记
-- 业务规则：
--   - 每个账号最多 1 个主 Key（admin 也不例外）
--   - 主 Key 的作用：账号对外的「凭证钥匙」
--       - admin 账号的主 Key = 跨账号通杀，verify 时可匹配任意账号的 key
--       - 非 admin 账号的主 Key = 仅匹配自己账号下的 key
--   - 主 Key 在「账号管理」页面可查看明文、刷新（重置明文、保留 is_default=1）
--   - 主 Key 与现有普通 key 共用同一张表，仅多 1 个标记位
--   - 兼容：普通 key 行为不变，仍可在 /v1/verify 使用
--
-- 迁移期间：已有库中 owner_user_id IS NULL 的老 key 不视作主 key

ALTER TABLE api_keys ADD COLUMN is_default INTEGER NOT NULL DEFAULT 0;

-- 每个账号最多 1 个主 key；partial unique index 在 SQLite 支持
CREATE UNIQUE INDEX IF NOT EXISTS uniq_api_keys_default_per_account
  ON api_keys(owner_user_id) WHERE is_default = 1;
