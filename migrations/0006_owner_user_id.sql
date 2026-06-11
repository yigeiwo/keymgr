-- 0006 · 账号归属
-- 给 api_keys 加 owner_user_id，关联到 users.id
-- 业务规则：每个 key 归属于一个账号（用户）。
--   - 鉴权/管理界面上，操作者只能动自己的 key（admin 除外）
--   - verify / variables 接口默认按 admin 账号查，调用方可传 account 切到其他账号
-- 老库（owner_user_id IS NULL 的历史 key）会被当作 admin 账号所有（兼容）

ALTER TABLE api_keys ADD COLUMN owner_user_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_api_keys_owner_user_id ON api_keys(owner_user_id);
