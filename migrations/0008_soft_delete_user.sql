-- 0008 · 账号软删除
-- 给 users 加 deleted_at 字段
--
-- 业务规则：
--   - DELETE /api/accounts/:id 仅设 deleted_at（软删），主 Key / 普通 keys 也一起软删
--   - 主 admin（getDefaultAdminId() 选出的那个）禁止删除
--   - 软删后：
--       - 该用户不能登录
--       - /api/auth/me 等接口对该用户返回 401
--       - /api/accounts 列表 / 详情 不再返回该用户
--       - 该用户的 key 不再被 verify 命中（owner_user_id 关联的 user 已被软删）
--   - 数据保留在 DB 中（后续可加 30 天自动清理 / 恢复接口，按需扩展）

ALTER TABLE users ADD COLUMN deleted_at TEXT;
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);
