/**
 * AES-256-GCM 加密 / 解密工具
 * 用 SESSION_SECRET 通过 SHA-256 派生 32 字节密钥
 * 密文格式：<12字节IV>:<密文>:<16字节authTag>，全部 hex
 *
 * 关键：密钥从 SESSION_SECRET 派生 —— 改 SESSION_SECRET 会让历史密文无法解密
 *       所以对存量数据要做一次"解密→加密"迁移
 */
const crypto = require('crypto');

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;

function getKey() {
  const secret = process.env.SESSION_SECRET || 'keymgr-default-secret-change-me';
  return crypto.createHash('sha256').update(secret).digest();
}

function encrypt(plaintext) {
  if (plaintext == null) return null;
  const key = getKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${enc.toString('hex')}:${tag.toString('hex')}`;
}

function decrypt(packed) {
  if (packed == null) return null;
  // 兼容旧的明文：未冒号分隔的视为明文
  if (typeof packed !== 'string' || !packed.includes(':')) return packed;
  try {
    const [ivHex, dataHex, tagHex] = packed.split(':');
    if (!ivHex || !dataHex || !tagHex) return packed;
    const iv = Buffer.from(ivHex, 'hex');
    const data = Buffer.from(dataHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    if (iv.length !== IV_LEN || tag.length !== TAG_LEN) return packed;
    const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(data), decipher.final()]);
    return dec.toString('utf8');
  } catch (e) {
    // 解密失败 —— 可能是 SESSION_SECRET 改过，返回 null 触发业务方重建
    return null;
  }
}

/** 判断一段字符串是否是加密格式 */
function isEncrypted(packed) {
  if (typeof packed !== 'string') return false;
  const parts = packed.split(':');
  return parts.length === 3 && /^[0-9a-f]+$/i.test(parts[0]);
}

module.exports = { encrypt, decrypt, isEncrypted };
