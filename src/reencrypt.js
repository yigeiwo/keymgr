#!/usr/bin/env node
/**
 * SESSION_SECRET 轮换脚本（一次性 CLI）
 *
 * 用途：当你要改 SESSION_SECRET 时，api_keys.current_plain / original_plain 里
 *       用旧 SECRET 加密的密文会变成无法解密。本脚本用旧 SECRET 解密全部密文，
 *       再用新 SECRET 重新加密写回 DB，让轮换无感完成。
 *
 * 用法：
 *   npm run reencrypt -- --from OLD_SECRET --to NEW_SECRET        # 执行
 *   npm run reencrypt -- --from OLD --to NEW --dry-run            # 只预演不写盘
 *   npm run reencrypt -- --from OLD --to NEW --no-backup          # 跳过自动备份（不建议）
 *   node src/reencrypt.js --from OLD --to NEW
 *
 * 安全：
 *   - 默认执行前自动备份 DB 到 data/keymgr.db.bak-<ts>
 *   - 先验证全部目标密文；任一解密失败则中止，不备份、不写盘
 *   - 只动 current_plain / original_plain 两列；不动 hash、用户密码、其它表
 *
 * 退出码：
 *   0 成功（含 dry-run）
 *   1 参数错 / 找不到 DB
 *   2 有行解密失败（未写盘）
 *
 * 注意：执行时 server 不要同时运行（避免写冲突）。脚本不会自动停服务。
 */
'use strict';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const initSqlJs = require('sql.js');

const ROOT = path.join(__dirname, '..');
const DB_FILE = path.join(ROOT, 'data', 'keymgr.db');

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;

// ===== 显式传密钥的加解密（跟 src/crypto.js 逻辑一致，但不依赖 process.env）=====
function keyFromSecret(secret) {
  return crypto.createHash('sha256').update(String(secret)).digest();
}

function encryptWith(secret, plaintext) {
  if (plaintext == null) return null;
  const key = keyFromSecret(secret);
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${enc.toString('hex')}:${tag.toString('hex')}`;
}

function decryptWith(secret, packed) {
  if (packed == null || typeof packed !== 'string') return { ok: false, value: null, reason: 'null' };
  if (!packed.includes(':')) return { ok: false, value: null, reason: 'plaintext' }; // 旧明文（未加密格式）
  try {
    const [ivHex, dataHex, tagHex] = packed.split(':');
    if (!ivHex || !dataHex || !tagHex) return { ok: false, value: null, reason: 'malformed' };
    const iv = Buffer.from(ivHex, 'hex');
    const data = Buffer.from(dataHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    if (iv.length !== IV_LEN || tag.length !== TAG_LEN) return { ok: false, value: null, reason: 'malformed' };
    const decipher = crypto.createDecipheriv(ALGO, keyFromSecret(secret), iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(data), decipher.final()]);
    return { ok: true, value: dec.toString('utf8'), reason: null };
  } catch (e) {
    return { ok: false, value: null, reason: e.message };
  }
}

function parseArgs(argv) {
  const out = { from: null, to: null, dryRun: false, noBackup: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--from') out.from = argv[++i];
    else if (a === '--to') out.to = argv[++i];
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--no-backup') out.noBackup = true;
    else if (a === '-h' || a === '--help') out.help = true;
  }
  return out;
}

function printHelp() {
  console.log(`
SESSION_SECRET 轮换脚本

用法:
  node src/reencrypt.js --from <旧SECRET> --to <新SECRET> [选项]

选项:
  --from <secret>   旧的 SESSION_SECRET（当前 DB 用的那个）
  --to   <secret>   新的 SESSION_SECRET（轮换后要用）
  --dry-run         只预演，不写盘、不备份
  --no-backup       跳过自动备份（默认会在 data/ 下存一份 .bak）
  -h, --help        显示帮助

示例:
  node src/reencrypt.js --from "old-secret-123" --to "new-secret-456"
  npm run reencrypt -- --from old --to new --dry-run
`.trim());
}

function backupDb() {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const bak = DB_FILE + '.bak-' + ts;
  fs.copyFileSync(DB_FILE, bak);
  return bak;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { printHelp(); process.exit(0); }
  if (!args.from || !args.to) {
    console.error('✗ 缺少参数。--from 和 --to 都必填。用 -h 查看帮助。');
    process.exit(1);
  }
  if (args.from === args.to) {
    console.error('✗ --from 和 --to 不能相同。');
    process.exit(1);
  }
  if (!fs.existsSync(DB_FILE)) {
    console.error('✗ 找不到数据库：' + DB_FILE);
    console.error('  请确认在项目根目录运行，且 data/keymgr.db 存在。');
    process.exit(1);
  }

  console.log('=== SESSION_SECRET 轮换 ===');
  console.log('DB 文件:', DB_FILE);
  console.log('模式:', args.dryRun ? '预演（dry-run，不写盘）' : '执行');

  // 加载 DB
  const SQL = await initSqlJs({
    locateFile: (file) => path.join(path.dirname(require.resolve('sql.js')), file),
  });
  const db = new SQL.Database(fs.readFileSync(DB_FILE));

  // 确认表和列存在
  const info = db.exec("PRAGMA table_info(api_keys)");
  if (!info[0]) {
    console.error('✗ api_keys 表不存在');
    process.exit(1);
  }
  const cols = info[0].values.map(r => r[1]);
  const targets = ['current_plain', 'original_plain'].filter(c => cols.includes(c));
  if (!targets.length) {
    console.error('✗ api_keys 没有 current_plain / original_plain 列，无需轮换。');
    process.exit(1);
  }
  console.log('待重加密列:', targets.join(', '));

  // 读全部行
  const colList = ['id', 'name', ...targets].join(', ');
  const stmt = db.prepare(`SELECT ${colList} FROM api_keys ORDER BY id ASC`);
  const rows = [];
  try {
    stmt.bind([]);
    while (stmt.step()) rows.push(stmt.getAsObject());
  } finally {
    stmt.free();
  }
  console.log(`扫描到 ${rows.length} 行 api_keys`);

  let skippedPlaintext = 0;  // 本来就是明文（未加密），直接重新加密即可
  const failures = [];       // {id, name, col, reason}
  const updates = [];        // {id, col, value}

  for (const row of rows) {
    for (const col of targets) {
      const packed = row[col];
      if (packed == null) continue; // null 跳过

      const dec = decryptWith(args.from, packed);
      if (!dec.ok) {
        if (dec.reason === 'plaintext') {
          // 旧明文格式 —— 直接当明文重新加密（更安全）
          updates.push({ id: row.id, col, value: packed });
          skippedPlaintext++;
          continue;
        }
        failures.push({ id: row.id, name: row.name, col, reason: dec.reason });
        continue;
      }
      updates.push({ id: row.id, col, value: dec.value });
    }
  }

  if (failures.length) {
    console.log('');
    console.log('=== 结果汇总 ===');
    console.log(`可重新加密:    ${updates.length} 列`);
    console.log(`  其中明文格式转加密: ${skippedPlaintext}`);
    console.log(`解密失败:      ${failures.length} 列`);
    console.log('');
    console.log('⚠ 解密失败的行（可能是 --from SECRET 不对，或数据已损坏）：');
    for (const f of failures.slice(0, 20)) {
      console.log(`  id=${f.id} name=${f.name} col=${f.col} reason=${f.reason}`);
    }
    if (failures.length > 20) console.log(`  ...还有 ${failures.length - 20} 行`);
    console.log('');
    console.log('✗ 已中止：未备份、未写盘，避免产生部分重加密状态。');
    process.exit(2);
  }

  // 备份
  if (!args.dryRun && !args.noBackup) {
    const bak = backupDb();
    console.log('✓ 已备份到:', bak);
  } else if (args.noBackup) {
    console.log('⚠ 已用 --no-backup 跳过备份');
  }

  for (const item of updates) {
    if (!args.dryRun) {
      const re = encryptWith(args.to, item.value);
      db.run(`UPDATE api_keys SET ${item.col} = ? WHERE id = ?`, [re, item.id]);
    }
  }

  // 写盘
  if (!args.dryRun) {
    const data = db.export();
    const tmp = DB_FILE + '.tmp';
    fs.writeFileSync(tmp, Buffer.from(data));
    fs.renameSync(tmp, DB_FILE);
    console.log('✓ 已写回 DB');
  } else {
    console.log('（dry-run 模式：未写盘）');
  }

  console.log('');
  console.log('=== 结果汇总 ===');
  console.log(`重新加密成功:  ${updates.length} 列`);
  console.log(`  其中明文格式转加密: ${skippedPlaintext}`);
  console.log('解密失败:      0 列');

  if (!args.dryRun) {
    console.log('');
    console.log('✓ 轮换完成。下一步：');
    console.log('  1) 修改 .env 里的 SESSION_SECRET 为新值');
    console.log('  2) 重启服务（npm start）');
    console.log('  3) 用任意 key 调一次 /v1/verify 验证解密正常');
  } else if (args.dryRun) {
    console.log('');
    console.log('（这是预演。去掉 --dry-run 实际执行。）');
  }
}

main().catch(e => {
  console.error('✗ 轮换失败：', e.message);
  console.error(e.stack);
  process.exit(1);
});
