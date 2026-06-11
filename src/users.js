/**
 * 公共工具：账号 / 角色相关查询
 * 把原本散在 routes/verify.js 和 routes/accounts.js 里重复定义的 getDefaultAdminId 收口。
 */
const db = require('./db');

/**
 * 主 admin 判定：id 最小且未停用、未软删的 admin 账号。
 *  - verify 的「超级钥匙」通杀逻辑依赖此 id
 *  - 「不可删除」的保护也基于此 id
 *
 * 注意：每次返回「当前」的主 admin id（不缓存）。
 *       如果主 admin 被禁/删，super-key 行为会随之下沉到下一个 admin。
 */
function getDefaultAdminId() {
  const u = db.prepare(`
    SELECT id FROM users
    WHERE role = 'admin' AND disabled = 0 AND deleted_at IS NULL
    ORDER BY id ASC LIMIT 1
  `).get();
  return u ? u.id : 0;
}

module.exports = { getDefaultAdminId };
