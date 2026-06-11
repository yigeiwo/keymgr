-- 0009 · 变量分组
-- 给 variables 加 group_name 字段
--
-- 业务规则：
--   - 同一分组下的变量会被一起批量取（GET /v1/variables/group/:name）
--   - 业务侧拿到一个分组的全部 name/value，省去逐个 get
--   - group_name 可空（不分组；不参与 group 批量取）
--   - 分组名长度 ≤ 64，charset 与 username 类似：字母数字 _.-

ALTER TABLE variables ADD COLUMN group_name TEXT;
CREATE INDEX IF NOT EXISTS idx_variables_group_name ON variables(group_name);
