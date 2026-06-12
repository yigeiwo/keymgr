const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('./db');
const { encrypt, decrypt } = require('./crypto');

/**
 * 生成一个 key：
 *   形如：sk_live_<prefix>_<random>
 *  - prefix 用于在日志/列表中肉眼识别
 *  - 数据库存 hash + encrypted(current_plain)
 *  - 明文只在创建/重置瞬间返回给用户
 *  - isDefault=1 时表示该 key 是账号的「主 Key」（每个账号 1 个，由 partial unique 约束）
 *
 * 注：original_plain 字段保留是为了兼容旧 schema / 旧导入的 Key；
 *     重置时会同步覆盖，历史 key 不再保留 —— 业务侧只认 current_plain 的 hash。
 */
function generateKey({ name, meta, expiresAt, prefix = 'sk_live', owner, tags, ownerUserId = null, isDefault = false }) {
  const random = crypto.randomBytes(24).toString('base64url');
  const keyTag = crypto.randomBytes(3).toString('hex');
  const plain = `${prefix}_${keyTag}_${random}`;
  const keyPrefix = plain.slice(0, 12);
  const hash = crypto.createHash('sha256').update(plain).digest('hex');
  const bcryptHash = bcrypt.hashSync(plain, 8);

  // 加密存储（DB 泄露也不出明文）
  const encOriginal = encrypt(plain);
  const encCurrent  = encrypt(plain);

  const info = db.prepare(`
    INSERT INTO api_keys (name, prefix, hash, meta, expires_at, original_plain, current_plain, owner, tags, owner_user_id, is_default)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, keyPrefix, hash, meta ? JSON.stringify(meta) : null, expiresAt || null,
         encOriginal, encCurrent, owner || null, Array.isArray(tags) ? JSON.stringify(tags) : null,
         ownerUserId, isDefault ? 1 : 0);

  return {
    id: info.lastInsertRowid,
    name,
    prefix: keyPrefix,
    plain,
    bcryptHash,
    meta: meta || null,
    expiresAt: expiresAt || null,
    owner: owner || null,
    ownerUserId,
    isDefault: !!isDefault,
    tags: Array.isArray(tags) ? tags : [],
  };
}

function maskKey(plain) {
  if (!plain) return '';
  if (plain.length <= 12) return plain;
  return plain.slice(0, 8) + '…' + plain.slice(-4);
}

function maskFromPrefix(prefix, lastFour) {
  return `${prefix}…${lastFour || '****'}`;
}

/**
 * 导入一个外部已有 key —— 数据库存 hash + encrypted(plain)。
 * 重复导入（哈希相同）会返回 null。
 */
function importKey({ name, plain, meta, expiresAt, prefix = null, owner, tags, ownerUserId = null, isDefault = false }) {
  if (!plain || typeof plain !== 'string') throw new Error('plain key 必填');
  const hash = crypto.createHash('sha256').update(plain).digest('hex');

  const exists = db.prepare('SELECT id FROM api_keys WHERE hash = ?').get(hash);
  if (exists) return { duplicate: true, id: exists.id };

  const detectedPrefix = prefix || (plain.length >= 12 ? plain.slice(0, 12) : plain.slice(0, 8));
  const enc = encrypt(plain);
  const info = db.prepare(`
    INSERT INTO api_keys (name, prefix, hash, meta, expires_at, original_plain, current_plain, owner, tags, owner_user_id, is_default)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name || 'imported', detectedPrefix, hash, meta ? JSON.stringify(meta) : null,
         expiresAt || null, enc, enc, owner || null,
         Array.isArray(tags) ? JSON.stringify(tags) : null, ownerUserId, isDefault ? 1 : 0);

  return { duplicate: false, id: info.lastInsertRowid, prefix: detectedPrefix };
}

/**
 * 重新生成某个 Key 的明文 —— 旧 key 立即失效。
 *
 * 注意：重置时连同 original_plain 一起覆盖为新值 —— 历史 key 不再保留，
 * 避免「重置过的 key 还能拿回创建时的」这种「历史可调用」语义。
 * 业务侧 verify 仍然只看 current_plain 的 hash 匹配，所以重置后旧 key 必然 401。
 */
function rerollKey(id) {
  const row = db.prepare('SELECT id, prefix FROM api_keys WHERE id = ?').get(id);
  if (!row) return null;

  // 复用原有 prefix 段位
  const newTag = crypto.randomBytes(3).toString('hex');
  let prefix;
  if (row.prefix && row.prefix.includes('_')) {
    const parts = row.prefix.split('_');
    parts[parts.length - 1] = newTag;
    prefix = parts.join('_');
  } else {
    prefix = (row.prefix || 'sk_live') + '_' + newTag;
  }

  const random = crypto.randomBytes(24).toString('base64url');
  const plain = `${prefix}_${random}`;
  const hash = crypto.createHash('sha256').update(plain).digest('hex');

  const enc = encrypt(plain);

  // 关键修改：重置时 original_plain 也跟着覆盖为新值，历史 key 不再保留
  db.prepare(`
    UPDATE api_keys
    SET prefix = ?, hash = ?, current_plain = ?, original_plain = ?, last_used_at = NULL
    WHERE id = ?
  `).run(prefix, hash, enc, enc, id);

  return { id, prefix, plain };
}

/**
 * 解密读取某行的明文。带自动迁移（旧的明文读出来还是明文）。
 */
function readPlain(row) {
  if (!row) return null;
  const cur = decrypt(row.current_plain);
  const orig = decrypt(row.original_plain);
  return { currentPlain: cur, originalPlain: orig };
}

module.exports = { generateKey, importKey, rerollKey, maskKey, maskFromPrefix, readPlain };
