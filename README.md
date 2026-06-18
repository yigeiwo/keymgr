# KeyMgr

轻量级 **API Key 管理 + 验证服务**，自托管、单文件 SQLite，适合放到一台小服务器上跑。

## 更新日志

### v0.11
- **UI 全面修复与统一**：
  - 修复 index.html / app.js / app.css 历史上累积的字符编码损坏（替换字符 `\uFFFD`），全部按钮 / 标签 / 提示文案恢复正常显示
  - 表格「操作」列与表头 `th` 宽度对齐（230px），避免 5 个动作按钮溢出主框
  - 「说明」按钮用 CSS class `is-open` 切换，chevron 图标通过 `transform: rotate(180deg)` 旋转，替代之前的 `▴/▾` 文本
  - 「自动清理」状态从 disabled `<button>` 改为 `status-pill`（带时钟 SVG），消除歧义
  - Keys / 变量 / 日志空状态改为可点击的「新建」按钮 + SVG 图标，零数据时一键打开对应弹窗
  - Sidebar 导航 / 主题切换 / 文档区 doc-hero 的几何装饰 + 渐变 mesh 全部以 SVG 替代 emoji，跨平台一致
  - 全部操作类图标统一通过 `ICO.*` 常量注入，避免散落的 emoji 字符
  - 浮层（tag / owner / group picker）继续走 `position:fixed` 定位，避免被 `modal-card` 的 `overflow:auto` 裁切

### v0.10（当前）
- **历史 Key 不可调用**：`POST /api/keys/:id/reroll` 重置时同步覆盖 `original_plain`，旧明文在数据库里彻底消失（业务侧 verify 本来就走 hash 匹配，现在 DB 层面也无残留）。`GET /api/keys/:id/plain` 不再返回 `originalPlain` / `isOriginal`。
- **「复制原 key」功能下线**：UI 去掉「🗝 复制原 key」按钮；「账号主 Key」弹窗不再展示「原始 Key」区域。明文只活在「当前有效」这一刻。
- **账号主 Key 自愈**：`GET /api/accounts/:id/main-key` / `POST /api/accounts/:id/main-key/reroll` 在账号无主 Key 时会自动补建，并返回 `autoCreated:true` 让前端区分弹窗标题。
- **UI 整体优化**：
  - 工具栏 (toolbar)：标题 + 主按钮一行，过滤行（搜索 / 标签 / 所有者 / 账号）一行；窄屏自动收缩。
  - 标签 / 所有者选择器统一为「分组选择器」交互（搜索 + 多选 + chips）。
  - 模态框：所有控件 36px 同高对齐、列宽 1:1、grid row 模板保证两列控件 y 坐标严格相同。
  - 浮层（tag picker / owner picker / group picker）`position:fixed` 定位 + JS 重定位，避免被 modal-card 的 `overflow:auto` 裁切。
  - 表格：操作列 4 按钮（复制 / 编辑 / 重置 / 启用停用 / 删除）紧凑排布；长 tag 列表不撑高行高。
- **`purgeHistoricalOriginals` 启动迁移**：首次升级到 v0.10 时一次性把 `api_keys` 里所有 `original_plain != current_plain` 的行统一刷成 `current_plain`，确保历史 Key 数据在 DB 中彻底清空。

### v0.9
- 变量按 `group_name` 分组；`POST /v1/variables/group` 一次性取走一组。

### v0.7
- 每个账号固定 1 个「主 Key」（`is_default=1`）；admin 账号的主 Key 是「超级钥匙」（`superKey:true`，跨账号通杀）。

### v0.6
- 验证默认走 admin 账号；业务侧可显式传 `account` / `ownerUserId` 切到其他账号。

## 功能

- 后台登录（账号密码，bcrypt 哈希，HttpOnly Cookie，IP 级登录限流防爆破）
- Key 管理：新建 / 列表 / 搜索 / 编辑 / 启用 / 停用 / 重置 / **软删除（30 天可恢复）** / 永久删除
- Key 元数据：**owner 字段** + **tags 标签**（任意业务标记）
- **按账号归属**（owner_user_id）：每个 key 归属于某个用户账号，operator/viewer 只能看管自己的 key；admin 可跨账号操作
- **账号主 Key**（v0.7 起）：每个账号固定 1 个主 Key（`is_default=1`），管理端可见明文、可刷新；admin 账号的主 Key 是「超级钥匙」
- **对外验证默认走 admin 账号**：业务侧调 `/v1/verify` 时可显式传 `account` / `ownerUserId` 切到其他账号
- 支持 **导入已有 Key**（OpenAI、Anthropic、其他系统签发的都可纳入管理）
- 支持 **自定义前缀**（2~24 字符，可包含字母数字和 `_-`）
- **当前明文可恢复**：创建/导入/重置时保存 SHA-256 哈希，并用 AES-256-GCM 加密保存 `current_plain`（仅授权接口可解密返回）
- **变量库**：按 `name` 存取值（连接串、API key、灰度开关等），业务侧通过 key 鉴权后按 name 取值
- **变量分组**（v0.9 起）：给变量打 `group_name` 标签，业务侧可用 `POST /v1/variables/group` 一次性取走一个分组下所有 name/value
- **多用户 + 三角色**：admin（全权） / operator（读写，不可管用户） / viewer（只读）
- **AES-256-GCM 加密存储**：DB 泄露也不出明文
- **统一对外验证接口** `POST /v1/verify`，业务服务调用即可
- **批量变量接口** `POST /v1/variables/multi`：一次拉多个变量
- 三重日志：控制台 + 按天切割的日志文件 + 数据库（最近 30 天）
- 增强的 `/healthz`：db 状态、活跃会话、内存、版本、P95/P99 响应时间
- 响应时间埋点：滑动窗口 P50/P95/P99
- 告警 Webhook：短时间内大量失败验证 → POST 到你指定的 URL（钉钉 / Slack / 飞书 / 自建都行）
- **验证统计面板**：日志页展示成功率、失败原因 Top、每日趋势、活跃 Key 与来源 IP
- **Key 健康诊断**：按状态、过期时间、最近失败率和使用情况生成健康评分与排查建议
- 一键备份：`npm run backup` 把 db + 最近 7 天日志打 tar.gz
- **SESSION_SECRET 轮换脚本**：`npm run reencrypt` 可将 DB 内密文重新加密到新密钥
- 暗色主题：顶栏一键切换，localStorage 记忆，跟随系统
- 语义化 HTTP 状态码（200/400/401/403/404/409/422/429/503）
- 内置限流：登录失败 5/10min 锁 15min；验证 600/min/IP；变量 1200/min/IP

## 目录结构

```
keymgr/
├── src/
│   ├── server.js      # 入口
│   ├── config.js      # 配置（读 .env）
│   ├── db.js          # SQLite 初始化、迁移、默认管理员
│   ├── auth.js        # 登录、会话、Cookie、角色
│   ├── keys.js        # Key 生成 / 导入 / 重置 / 加密明文存储
│   ├── crypto.js      # AES-256-GCM 加密
│   ├── diagnostics.js # 失败原因库 + Key 健康评分
│   ├── metrics.js     # 滑动窗口 P95/P99 指标
│   ├── alerts.js      # Webhook 告警
│   ├── logger.js      # 日志（控制台 + 文件 + 数据库）
│   ├── audit.js       # 审计日志
│   ├── backup.js      # npm run backup 命令
│   ├── reencrypt.js   # SESSION_SECRET 轮换重加密脚本
│   └── routes/
│       ├── auth.js    # /api/auth/*
│       ├── keys.js    # /api/keys/* CRUD + 编辑
│       ├── variables.js  # /api/variables/*
│       ├── logs.js    # /api/logs/* 验证日志
│       ├── audit.js   # /api/audit
│       ├── users.js   # /api/users
│       └── verify.js  # /v1/verify 对外验证
├── migrations/        # 数据库迁移 SQL（NNNN_xxx.sql）
├── public/            # 登录页 / Dashboard / API 文档
├── data/              # SQLite 数据库（运行时生成）
├── logs/              # 按天切割的日志文件（运行时生成）
├── backups/           # 备份文件（运行时生成）
├── package.json
└── .env.example
```

## 快速开始

```bash
cd keymgr
cp .env.example .env       # 修改 ADMIN_PASSWORD 和 SESSION_SECRET
npm install
npm start
```

首次启动会在终端打印默认管理员账号密码（如果没配 `ADMIN_PASSWORD`），用它登录 `http://your-host:3000/`。

### 默认账号

| 账号 | 密码 | 角色 | 备注 |
|---|---|---|---|
| `admin` | `admin123` | `admin` | 超级管理员，主 Key 是「超级钥匙」 |

> ⚠️ 上面这组 `admin / admin123` 是 **本机开发环境的默认密码**，方便首次跑通。
> 生产环境务必在 `.env` 里显式设置 `ADMIN_PASSWORD`（任意 ≥ 8 字符的字符串），启动时不再打印密码。
>
> 启动时如果没设 `ADMIN_PASSWORD`，系统会**自动生成一个 9 字节的 base64url 随机密码**（约 12 字符）并打到终端里（只显示一次，丢失了就按下面方式重置）。

**重置 admin 密码**（万一忘了）：

```bash
# 方式 1：用 .env 强制覆盖（推荐）
# 在 .env 写 ADMIN_PASSWORD=新密码
echo "ADMIN_PASSWORD=NewP@ssw0rd!Aa1" >> .env
npm start
# 启动时会自动用新密码覆盖那个账号

# 方式 2：用项目自带的脚本（会备份 DB、撤销该账号 sessions，不回显新密码）
npm run reset-admin -- 'NewP@ssw0rd!Aa1'
npm run reset-admin -- --username admin 'NewP@ssw0rd!Aa1'
```

**子账号**：admin 登录后到「账号管理」页面 → 「+ 新建子账号」，可创建 `operator` / `viewer` / `admin` 角色；创建时 admin 设置初始密码（≥ 8 字符），账号创建后系统会一并生成该账号的「主 Key」明文（弹窗一次性展示，请立即复制保存）。

**改自己的密码**：登录后顶栏右上角「🔑 改密」按钮 → 输旧密码 + 新密码 → 改完撤销该账号的其他 session（**当前会话保留**，不会被立刻踢出）。

**admin 重置子账号密码**：账号管理 → 行末「重置密码」→ 系统生成 16 字符高强度新密码（一次性展示，admin 复制给子账号）；同时撤销该子账号的所有 session（强制下次登录用新密码）。注意：**admin 不能用此入口重置自己的密码**（会立刻锁出当前会话），改自己请走「🔑 改密」。

### 备份

```bash
npm run check             # 语法检查主要后端脚本与前端 JS
npm run backup            # 备份 db + 最近 7 天日志
npm run backup -- 30      # 备份 db + 最近 30 天日志
# 备份文件：./backups/keymgr-backup-YYYYMMDD-HHmmss.tar.gz
# 若系统无 tar，会降级输出 .bundle.gz（非 tar 格式）
# 自动保留最近 30 份（可调 BACKUP_KEEP 环境变量）
```

### SESSION_SECRET 重加密

```bash
npm run reencrypt -- --from OLD_SECRET --to NEW_SECRET --dry-run  # 预演
npm run reencrypt -- --from OLD_SECRET --to NEW_SECRET            # 执行轮换
```

脚本会扫描 `api_keys.current_plain` / `original_plain`，用旧 `SESSION_SECRET` 解密后用新值重新加密；执行前会先验证所有目标密文，任一解密失败都会中止且不写盘。验证通过后默认备份 `data/keymgr.db` 到 `.bak-时间戳`，执行时请先停止正在运行的服务。

### 健康检查 / 指标

```bash
curl http://localhost:3000/healthz | jq
# → 200/503 { ok, version, uptimeSec, db, sessions, memory, metrics, alerts }

# 详细指标（需 admin 登录）
curl -b cookie.txt http://localhost:3000/api/metrics | jq
# → { counters, duration:{p50,p95,p99,max}, memory, uptimeSec, alerts }
```

## 接口一览

### 对外验证 API

```http
POST /v1/verify
Content-Type: application/json
{ "key": "sk_live_xxxxx_xxxxxxxxxxxx" }
```

支持 `Authorization: Bearer <key>` 和 `x-api-key: <key>` 两种 header 形式。响应永远 200，业务方按 `valid` 字段判断：

```json
{ "valid": true,  "keyId": 1, "name": "prod-server", "account": "admin", "ownerUserId": 1, "isDefault": false, "superKey": false, "meta": { "owner": "team-a" } }
{ "valid": false, "code": "NOT_FOUND", "reason": "key 不存在或不属于此账号" }
```

`isDefault` / `superKey` 仅 v0.7+ 返回，老调用方忽略即可（兼容）。`superKey:true` 表示传入的是 admin 账号的主 Key —— 详见「账号主 Key」一节。

**按账号校验**（v0.6 起）：默认情况下 verify 走 **admin 账号**（`role='admin'` 且未停用、id 最小的那个用户），即只有归属于该账号的 key 才能通过校验。可显式传下面三个之一切换：

| 字段 | 类型 | 含义 |
|---|---|---|
| `account` | string | 目标账号 username |
| `ownerUserId` | int | 目标账号 user id |
| `ownerUsername` | string | 同 `account`（兼容） |

```bash
# 默认（admin）
curl -X POST http://keymgr:3000/v1/verify \
  -H "Content-Type: application/json" \
  -d '{"key":"sk_live_xxx"}'

# 切到 alice 账号
curl -X POST http://keymgr:3000/v1/verify \
  -H "Content-Type: application/json" \
  -d '{"key":"sk_live_xxx","account":"alice"}'
```

老库（`owner_user_id IS NULL` 的历史 key）会被当作 admin 账号所有，兼容行为不变。

**安全性**：默认走 admin 账号可避免「一个 service 拿到的 key 被另一个账号 import 后误通过」。如果业务侧需要跨账号访问，传 `account` 显式指定即可。`/v1/variables/get|list|multi|group` 同样适用该规则。

完整文档见 Dashboard 的「API 文档」标签页。

### 后台管理 API（需登录）

| Method | Path | 说明 |
|---|---|---|
| POST | `/api/auth/login` | 登录，返回 cookie |
| POST | `/api/auth/logout` | 注销 |
| POST | `/api/auth/change-password` | 修改自己的密码（保留当前会话，撤销其它 sessions） |
| GET  | `/api/users/me/info` | 当前用户 |
| GET  | `/api/keys?q=&tag=&owner=&ownerUserId=&account=&includeMain=` | 列表 + 搜索 + 账号过滤（admin 才能跨账号；主 Key 默认不出现，admin 可加 `includeMain=1` 列出；`tag` 支持单值或逗号分隔多值精确匹配） |
| GET  | `/api/keys/tags` | 标签清单 + 计数（按字母排序，与 `/api/variables/groups` 对齐） |
| GET  | `/api/keys/owners` | owner 清单 + 计数（按字母排序，与 `/api/keys/tags` 对齐） |
| GET  | `/api/keys/tag/:name` | 按标签取 key（与 `/api/variables/group/:name` 对齐） |
| GET  | `/api/keys/:id` | 详情（不含明文） |
| GET  | `/api/keys/:id/plain` | **拿明文**（仅当前有效 key；重置后旧明文历史不可拿回） |
| GET  | `/api/keys/:id/health?days=7` | Key 健康诊断（评分、风险等级、最近失败率与排查建议） |
| POST | `/api/keys` | 新建（自动生成 / 导入；支持 owner / tags / ownerUserId） |
| GET  | `/api/accounts` | 账号列表（admin 全量，其他只看自己；admin 加 `?includeDeleted=1` 列出已软删） |
| GET  | `/api/accounts/:id` | 账号详情（含主 Key 摘要） |
| GET  | `/api/accounts/:id/main-key` | **拿主 Key 明文** |
| POST | `/api/accounts/:id/main-key/reroll` | 刷新主 Key（旧立即失效） |
| POST | `/api/accounts` | 创建账号（自动生成主 Key，仅 admin） |
| POST | `/api/accounts/:id/reset-password` | **重置账号密码**（生成 16 字符新密码 + 撤销该账号所有 session；仅 admin；不能改自己 / 停用账号） |
| DELETE | `/api/accounts/:id` | 软删账号（仅 admin；主 admin / 自己 不可删；一并软删主 Key + 所有 key + 撤销 sessions） |
| POST | `/api/keys/:id/toggle` | 启用/停用 |
| POST | `/api/keys/:id/reroll` | 重置（生成新 key） |
| PATCH| `/api/keys/:id` | 改名 / 改 meta / 改 owner / 改 tags / 改过期 / 改归属账号（仅 admin） |
| DELETE | `/api/keys/:id` | **软删除**（30 天内可恢复） |
| POST | `/api/keys/:id/restore` | 恢复已软删除的 key |
| DELETE | `/api/keys/:id/purge` | 永久删除（不可恢复） |
| GET  | `/api/variables?group=<name>` | 变量列表（`group` 可选：填分组名过滤；`__null__` 仅看未分组） |
| GET  | `/api/variables/groups` | 所有分组名 + 计数 |
| GET  | `/api/variables/group/:name` | 按分组批量取（管理端用） |
| GET  | `/api/variables/:id` | 变量详情 |
| POST | `/api/variables` | 新建变量（支持 `group` 字段） |
| PATCH| `/api/variables/:id` | 改值 / 改描述 / 改分组 |
| DELETE | `/api/variables/:id` | 删除变量 |
| GET  | `/api/logs` | 验证日志查询 |
| GET  | `/api/logs/stats?days=7&keyId=` | 验证统计（成功率、失败原因、每日趋势、活跃 Key、来源 IP） |
| GET  | `/api/audit` | 审计日志 |
| GET  | `/api/users` | 用户列表（admin） |
| POST | `/api/users` | 创建用户（admin） |
| PATCH| `/api/users/:id` | 改用户（admin） |
| DELETE | `/api/users/:id` | 删用户（admin） |
| GET  | `/api/metrics` | 指标快照（admin） |
| GET  | `/healthz` | 健康检查（公开） |

### 验证统计与诊断

`GET /api/logs/stats?days=7` 会聚合最近 N 天的 `verify_logs`：

- `totals`：成功 / 失败 / 总量 / 成功率
- `topReasons`：失败原因 Top，并附带中文解释与排查建议
- `byDay`：按天分桶的 ok/fail 趋势，Dashboard 日志页会渲染成小柱状图
- `topKeys`：最活跃 Key Top 10
- `topIps`：调用来源 IP Top 10，用来发现异常来源

`GET /api/keys/:id/health?days=7` 会对单个 Key 生成健康评分：

- 硬性状态：软删、停用、已过期直接判为高风险
- 过期临近度：1 天 / 7 天 / 30 天分级提示
- 最近失败率：结合 `verify_logs` 的 ok/fail 比例扣分
- 使用活跃度：长期未调用、长期未轮换会给出提醒

### 对外变量 API（业务服务调用）

```http
POST /v1/variables/get
Authorization: Bearer <key>
Content-Type: application/json
{ "name": "DB_URL" }
```

响应：
```json
{ "ok": true,  "name": "DB_URL", "value": "postgres://...", "description": "..." }
{ "ok": false, "code": "NOT_FOUND", "reason": "变量不存在" }
```

也支持 `POST /v1/variables/list`（列出所有变量名，不含 value）和 `POST /v1/variables/multi`（批量取）。这三个接口都需先经 `/v1/verify` 同款 key 校验（key 必须 status 有效、未停用、未过期）。

**按分组批量取**（v0.9 起）：

```http
POST /v1/variables/group
Authorization: Bearer <key>
Content-Type: application/json
{ "group": "DB" }
```

响应：
```json
{
  "ok": true,
  "group": "DB",
  "count": 3,
  "items": [
    { "name": "DB_URL",      "value": "postgres://...", "description": "主库" },
    { "name": "DB_REPL_URL", "value": "postgres://...", "description": "从库" },
    { "name": "DB_USER",     "value": "app",            "description": "账号" }
  ]
}
```

业务侧一次性拿走一个主题下的全部配置（比如 DB、FEATURE、PROD 三套）。分组名字符集同 `name`（`[A-Za-z0-9_.-]`，2~64 字符）。如果 key 上声明了 `meta.scopes`，自动按 scopes 过滤返回项。

### 状态码

| 状态 | 含义 |
|---|---|
| 200 | 成功 |
| 400 | 参数错（`code` 指明具体原因） |
| 401 | 未登录 / 会话失效 |
| 403 | 角色权限不足 |
| 404 | 资源不存在 |
| 409 | 冲突（name 重复 / 导入的 key 已存在） |
| 422 | 格式合法但语义错（key 太短、过期时间已过去） |
| 429 | 限流 |
| 503 | 服务不可用（db 不可用） |

错误响应统一格式：
```json
{ "ok": false, "error": "name 已存在", "code": "NAME_TAKEN", "field": "name" }
```

## 数据库迁移

Schema 变更统一在 `migrations/` 目录管理，文件名按 `NNNN_xxx.sql` 顺序编号：

```
migrations/
├── 0001_init.sql                       # users / api_keys / verify_logs / sessions
├── 0002_variables.sql                  # 变量库
├── 0003_audit.sql                      # 审计日志
├── 0004_soft_delete_and_metadata.sql   # owner / tags / soft delete / 明文存储
├── 0005_verify_index.sql               # (hash, deleted_at) 组合索引
├── 0006_owner_user_id.sql              # api_keys.owner_user_id 账号归属
├── 0007_main_key.sql                   # api_keys.is_default + partial unique（每账号 1 个主 Key）
├── 0008_soft_delete_user.sql           # users.deleted_at 账号软删
└── 0009_variable_group.sql             # variables.group_name 变量分组
```

启动时自动跑：

- 读取 `migrations/` 下所有 `NNNN_*.sql` 按版本号升序
- 跟 `schema_version` 表对比，没跑过的就执行
- 跑完一条写一行 `schema_version` 记录
- **老库自动 baseline**：如果已有 `users` 表但没有 `schema_version`，会直接标记为 `migrations/` 当前最高版本，不重跑历史迁移
- **主 Key 回填**：每次启动时为「无主 Key 的账号」自动补建 1 个；新用户由 `POST /api/users` / `POST /api/accounts` 在创建时同步建

**新增迁移**：

```bash
# 例：给 api_keys 加一列
cat > migrations/0006_add_dept.sql <<'SQL'
ALTER TABLE api_keys ADD COLUMN dept TEXT;
SQL
```

下次启动自动应用。

## Key 明文存储模型

| 字段 | 含义 | 创建时 | 重置时 | 删除时 |
|---|---|---|---|---|
| `current_plain`  | 当前有效 key 的 AES-GCM 密文（解密后才是明文） | = 新明文加密 | = 新明文加密 | 行没了 |
| `hash`           | SHA-256(current_plain) | 算 | 重新算 | 行没了 |
| `owner`          | 负责人/团队（≤64 字符） | 可选 | 保留 | 行没了 |
| `tags`           | 标签数组（≤20 项 × ≤32 字符，JSON 字符串） | 可选 | 保留 | 行没了 |
| `owner_user_id`  | 归属账号（users.id），null 视作 admin | 默认 = 创建者（admin 可指定其他） | 保留 | 行没了 |
| `is_default`     | 是否该账号的「主 Key」（0/1，partial unique：每账号最多 1 个） | 默认 0 | 保留 | 行没了 |

> **v0.10 起「历史 key」不可调用**：数据库不再保留"创建/导入时的原始 key"。重置时 `original_plain` 会被同步覆盖为新值（旧明文在 DB 中彻底消失）。业务侧 verify 本来就走 hash 匹配，行为不变；但你**不能从 DB / API 拿回旧明文了**。如果某天你需要"重置后能拿回旧的"语义，需要回滚 v0.10 之前的版本。

`current_plain` 用 **AES-256-GCM** 加密存储（密钥由 `SESSION_SECRET` 派生）。改 `SESSION_SECRET` 会让历史密文无法解密 —— 见下方"密钥轮换"小节。

## 角色权限

| 角色 | 读 keys | 写 keys | 读/写 variables | 读 logs | 读 audit | 管 users | 看 metrics |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| admin | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| operator | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| viewer | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

## 按账号归属（owner_user_id）

每个 Key 归属于一个**账号**（`users.id`），管理端和验证端的访问控制都基于此关系：

**管理端**：
- `admin`：可看到 / 操作所有账号的 key
- `operator` / `viewer`：只能看到 / 操作自己作为 owner 的 key（`owner_user_id = me.id`）
- 老 key（`owner_user_id IS NULL`）默认属于 admin，其他角色看不到也动不了
- 创建 Key 时，归属账号默认 = 当前用户；只有 admin 能在 UI / API 显式指定其他账号
- 编辑 Key 时切账号、列表过滤按账号查：都仅 admin 可用

**验证端**（`/v1/verify`、`/v1/variables/*`）：
- 默认校验 `admin` 账号下的 key（`role='admin'` 且未停用，id 最小的那个）
- 调用方可在 body 传 `account`（username）/ `ownerUserId`（int）/ `ownerUsername`（兼容别名）显式指定其他账号
- 账号不存在返回 `ACCOUNT_NOT_FOUND`，账号已停用返回 `ACCOUNT_DISABLED`（HTTP 200，业务方按 `valid`/`ok` 判断）
- `key_user_id` 跟目标账号不匹配时返回 `NOT_FOUND`（不区分「key 不存在」和「key 不属于此账号」，避免账号枚举）

**好处**：
- 不同业务 / 团队用自己的账号管理 key，互不干扰
- 即使一个 key 被另一个账号误导入，verify 默认也不会通过，避免横向越权
- admin 仍可一站式管理（切账号过滤、跨账号 verify）

**示例**：

```bash
# admin 创建一个归属于 alice 的 key
curl -X POST http://keymgr:3000/api/keys \
  -H "Content-Type: application/json" -b cookie.txt \
  -d '{"name":"alice-prod","prefix":"sk_live","ownerUserId":2}'

# 业务侧默认调 verify —— 走 admin，alice 的 key 不会通过
curl -X POST http://keymgr:3000/v1/verify \
  -H "Content-Type: application/json" \
  -d '{"key":"sk_live_xxx"}'
# → { "valid": false, "code": "NOT_FOUND", "reason": "key 不存在或不属于此账号" }

# 业务侧显式指定 alice 账号
curl -X POST http://keymgr:3000/v1/verify \
  -H "Content-Type: application/json" \
  -d '{"key":"sk_live_xxx","account":"alice"}'
# → { "valid": true, "keyId": 1, "account": "alice", "ownerUserId": 2, ... }

# admin 在管理端按账号过滤（只看 alice 的 key）
curl -b cookie.txt 'http://keymgr:3000/api/keys?account=alice'
```

## 账号主 Key（v0.7 起）

每个账号**固定 1 个「主 Key」**（`api_keys.is_default=1`），由 `UNIQUE (owner_user_id) WHERE is_default=1` 约束保证。  

- 跟普通 key 共用同一张表，仅多 1 个标记位
- 创建账号（`POST /api/accounts` 或 `POST /api/users`）时自动生成 1 个主 Key（`prefix=sk_acc`）
- 启动时若发现某个账号没有主 Key，会自动补建
- **运行时自愈**（v0.10 起）：`GET /api/accounts/:id/main-key` / `POST /api/accounts/:id/main-key/reroll` 在账号没有主 Key 时也会按需补建，响应里带 `autoCreated:true` 让前端弹窗标题区分「补建」与「刷新」。三种补建策略：① 有未软删的 → 直接用；② 只有软删的 → 复活；③ 都没有 → 新建。
- 老 key（`owner_user_id IS NULL`）不影响主 Key 概念

**主 Key 不出现在「Keys」列表里**：`/api/keys` 默认只列 `is_default=0` 的普通 key。  
主 Key 的查看 / 刷新 / 生成都走「账号管理」页面（`/api/accounts/:id/main-key*`）。  
admin 想要一次性浏览所有主 Key 的话可以加 `?includeMain=1`，但管理 UI 不暴露这个开关。

**管理端**（顶栏 `账号管理` Tab）：

| 操作 | 谁能做 | 接口 |
|---|---|---|
| 列出账号 + 主 Key 摘要 | admin 全部；其他看自己 | `GET /api/accounts` |
| 拿某账号主 Key 明文 | 自己账号的都能看；admin 都能看 | `GET /api/accounts/:id/main-key` |
| 刷新主 Key（生成新明文，旧立即失效） | 同上 | `POST /api/accounts/:id/main-key/reroll` |
| 新建子账号 | 仅 admin | `POST /api/accounts` |
| 软删账号 | 仅 admin；**主 admin / 自己 不能删** | `DELETE /api/accounts/:id` |

**软删账号的连锁清理**（`DELETE /api/accounts/:id`，一次事务）：
- `users.deleted_at = now()` 软删账号
- 该账号名下的**所有 key**（主 Key + 普通 keys）一起软删
- 该账号的**所有 sessions** 全部撤销（强制下线）
- 后续：`/api/auth/login` 该用户失败；`/v1/verify` 不会再命中该用户的 key；账号列表默认不显示

**主 admin 不可删**：`getDefaultAdminId()` 选出的 admin（id 最小、未停用、未软删）是系统的「超级钥匙」账号，禁止删除。
- 自己不能删自己（`CANNOT_DELETE_SELF`）
- 哪怕你登录的是另一个 admin 账号，想删主 admin 也会被拒（`CANNOT_DELETE_MAIN_ADMIN`）
- 想换主 admin：先禁用当前主 admin → 系统会自动「升级」下一个 admin 为新主 admin

**验证端**（`/v1/verify`）：

| 传入的 key | 响应 |
|---|---|
| admin 账号的主 Key | `valid:true, superKey:true` —— 标记为「超级钥匙」 |
| 某非 admin 账号的主 Key | `valid:true, isDefault:true, superKey:false` —— 作用域 = 该账号 |
| 普通 key | `valid:true, isDefault:false` —— 维持现有行为（按 owner 匹配） |
| 无 key | `valid:false, code:MISSING_KEY` |
| key 不存在 | `valid:false, code:NOT_FOUND` |

**超级钥匙（superKey）**：
- admin 账号的主 Key 是「跨账号通杀」—— 业务侧拿着它即可视为「以 admin 身份」调用，无需额外授权
- 业务侧拿到 `superKey:true` 后可信任地走「任意账号可见/可写」的逻辑
- 拿到 `superKey:false` 时仍按响应里 `account` 字段做账号级鉴权

**普通 key 完全兼容**：现有调用方只关心 `valid:true/false`，主 Key 只是多返回了 `isDefault` / `superKey` 字段，不会破坏老调用。

**示例**：

```bash
# 拿到 admin 主 Key
curl -b cookie.txt http://keymgr:3000/api/accounts/1/main-key
# → { "currentPlain": "sk_acc_912291_H5RPLQJKfe6Kycb_...", ... }

# 业务侧拿 admin 主 Key 验一个 alice 账号下的普通 key
curl -X POST http://keymgr:3000/v1/verify \
  -H "Content-Type: application/json" \
  -d '{"key":"sk_live_alice_regular_key"}'
# → { "valid": false, "code": "NOT_FOUND" }   ← 普通 key 不在 admin scope
#   如果是 admin 主 Key 自身，会返回 superKey:true

# 刷新某个子账号的主 Key（旧立即失效）
curl -X POST -b cookie.txt http://keymgr:3000/api/accounts/4/main-key/reroll
# → { "key": "sk_acc_d102fc_NewPlain...", "warning": "旧主 Key 已立即失效" }

# 创建一个子账号
curl -X POST -b cookie.txt http://keymgr:3000/api/accounts \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"alice12345","role":"operator","displayName":"Alice"}'
# → { "id": 5, "username": "alice", "mainKey": { "prefix": "sk_acc_..." } }
```

## 服务器部署

### 用 PM2

```bash
npm i -g pm2
pm2 start src/server.js --name keymgr
pm2 save && pm2 startup
# 每天凌晨 3 点备份
pm2 startup
crontab -e
# 0 3 * * *  cd /opt/keymgr && /usr/bin/node src/backup.js >> logs/cron.log 2>&1
```

### 用 systemd

创建 `/etc/systemd/system/keymgr.service`：

```ini
[Unit]
Description=KeyMgr
After=network.target

[Service]
WorkingDirectory=/opt/keymgr
ExecStart=/usr/bin/node src/server.js
Restart=always
User=www-data
EnvironmentFile=/opt/keymgr/.env

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable --now keymgr
```

### 反向代理（Nginx + HTTPS）

```nginx
# HTTP → HTTPS 强制跳转
server {
  listen 80;
  server_name keymgr.example.com;
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl http2;
  server_name keymgr.example.com;

  ssl_certificate     /etc/letsencrypt/live/keymgr.example.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/keymgr.example.com/privkey.pem;
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_prefer_server_ciphers off;
  ssl_session_cache shared:SSL:10m;
  ssl_session_timeout 1d;

  # HSTS（先小范围，半年后改 max-age=31536000）
  add_header Strict-Transport-Security "max-age=2592000; includeSubDomains" always;
  add_header X-Frame-Options "DENY" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header Referrer-Policy "no-referrer" always;

  client_max_body_size 256k;  # 限 body 大小

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_http_version 1.1;
    proxy_read_timeout 30s;
  }
}
```

启用 HTTPS 后记得把 `.env` 里 `COOKIE_SECURE=1`，避免 Cookie 跨协议丢失。

### HTTPS / HSTS 强制说明

- **必须** 走 HTTPS，否则 `km_sid` Cookie 可能被中间人窃取
- 启用 HTTPS 后改 `.env`：`COOKIE_SECURE=1`
- HSTS 头会让浏览器在 `max-age` 时间内强制 HTTPS。先用 `max-age=300`（5 分钟）验证一切正常，再扩到 6 个月
- 若有子域统一签证书，可加 `includeSubDomains`；否则**别加**，否则子域就锁死了

### 日志归档

`logs/app-YYYY-MM-DD.log` 接入 logrotate：

```
/opt/keymgr/logs/*.log {
  daily
  rotate 14
  compress
  missingok
  notifempty
  copytruncate
}
```

### 数据库备份

两种方式任选：

1. **应用级**：`npm run backup`（推荐）—— 把 db + 最近 7 天日志打 tar.gz 到 `./backups/`，自动保留 30 份；无系统 `tar` 时降级为 `.bundle.gz`
2. **系统级**：cron 拷贝 `data/keymgr.db` 到备份目录（注意要先 `sqlite3 .backup` 再拷，避免文件被锁）

## 告警 Webhook

`.env` 配置：

```ini
ALERT_WEBHOOK_URL=https://oapi.dingtalk.com/robot/send?access_token=...
ALERT_WEBHOOK_THRESHOLD=30      # 滑动窗口内失败次数
ALERT_WEBHOOK_WINDOW_MS=60000   # 滑动窗口长度
ALERT_COOLDOWN_MS=300000        # 同一告警冷却（避免刷屏）
```

触发时 POST 给该 URL 的 body：

```json
{
  "event": "verify_fail_spike",
  "severity": "high",
  "count": 30,
  "windowMs": 60000,
  "topReasons": [{"reason": "NOT_FOUND", "count": 25}, ...],
  "ts": "2026-06-11T10:00:00.000Z",
  "host": "keymgr-prod-01",
  "service": "keymgr"
}
```

- **飞书 / 钉钉 / Slack**：URL 配成机器人 webhook，再加个简单转发（不同平台 body 不一样，5 行代码搞定）
- **Prometheus AlertManager**：配 `alertmanager:9093/api/v1/alerts`，把 `count` 映射成 severity
- **自建 HTTP**：写个接收端即可

## 密钥轮换

如果你想换 `SESSION_SECRET`（比如怀疑泄露），但又不想丢历史 key 的明文，可以用内置脚本重加密数据库密文：

```bash
# 1) 先停服，避免 DB 文件并发写入
# 2) 预演：检查能否用旧 secret 正常解密
npm run reencrypt -- --from "old-secret" --to "new-secret" --dry-run

# 3) 正式执行：脚本会自动备份 data/keymgr.db
npm run reencrypt -- --from "old-secret" --to "new-secret"

# 4) 修改 .env
# SESSION_SECRET=new-secret

# 5) 重启并验证
npm start
```

脚本只会重写 `api_keys.current_plain` / `original_plain` 两列，不会修改 `hash`、用户密码或其它表。若出现解密失败，请优先确认 `--from` 是否为旧的 `SESSION_SECRET`；脚本会直接中止且不写盘，只有全部目标密文可解密时才会备份并写回。

## 性能与运维细节

| 主题 | 行为 | 调优 |
|---|---|---|
| `last_used_at` 写入 | 异步批写（30 秒合并同 key 的多次命中） | 高频 verify 场景下减少 N 倍写盘 |
| 审计日志 | `setImmediate` 异步写，不阻塞主请求 | — |
| DB 刷盘 | 200ms 防抖落盘 + SIGINT/SIGTERM 优雅退出 | 进程被 kill 不丢数据 |
| DB 写盘安全 | 写 tmp 文件再 `rename` | 避免半写状态破坏 db |
| verify 索引 | `(hash, deleted_at)` 组合 | 软删除过滤不回表 |
| 前端搜索 | 200ms / 150ms 防抖 | 减少不必要的列表请求 |
| 内存指标 | `/healthz` 暴露 RSS / heap | 接 Prometheus 监控 |

`/healthz` 一次给出：

```json
{
  "ok": true,
  "version": "1.0.0",
  "uptimeSec": 12345,
  "db": { "ok": true, "err": null, "queryMs": 2 },
  "sessions": { "active": 3 },
  "memory": { "rss": ..., "heapUsed": ..., "heapTotal": ... },
  "metrics": { "counters": {...}, "duration": { "p50": 1.2, "p95": 4.5, "p99": 12.3, "max": 50 } },
  "alerts": { "enabled": true, "currentWindow": 0, ... }
}
```

`/api/metrics`（需 admin 登录）拿详细指标 + 当前告警窗口状态。

## 安全注意

- 务必修改 `.env` 中的 `SESSION_SECRET` 和 `ADMIN_PASSWORD`；生产环境使用默认 `SESSION_SECRET` 会拒绝启动
- 生产环境**必须**套 HTTPS（Cloudflare / Nginx + Let's Encrypt 都行）
- 数据库文件 `data/keymgr.db` 包含 AES 加密后的明文，文件权限务必收紧（`chmod 600`）
- 登录限流是按 IP 的，多人共享出口 IP 时调高 `LOGIN_FAIL_MAX`
- 不要把数据目录放到 git / 公共可访问的位置
- 监控 `/healthz`：db 不可用时返回 503，Prometheus / k8s 探针就会告警
- 建议接入告警 Webhook，失败率突增时能立即发现
