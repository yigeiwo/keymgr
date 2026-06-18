#!/usr/bin/env node
/**
 * 一次性脚本：重置管理员/账号密码
 * 用法：
 *   node src/reset-admin.js <new-password>
 *   node src/reset-admin.js --username admin <new-password>
 */
'use strict';

const bcrypt = require('bcryptjs');
const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const config = require('./config');

function parseArgs(argv) {
  const out = { username: config.adminUsername || 'admin', password: '', help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--username' || arg === '-u') out.username = argv[++i] || '';
    else if (arg === '--password' || arg === '-p') out.password = argv[++i] || '';
    else if (arg === '-h' || arg === '--help') out.help = true;
    else if (!out.password) out.password = arg;
  }
  return out;
}

function printHelp() {
  console.log(`
重置账号密码

用法:
  node src/reset-admin.js <新密码>
  node src/reset-admin.js --username <用户名> <新密码>

选项:
  -u, --username <用户名>  要重置的账号，默认取 ADMIN_USERNAME 或 admin
  -p, --password <密码>   新密码（也可作为位置参数传入）
  -h, --help             显示帮助
`.trim());
}

function backupDb(dbFile) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const bak = dbFile + '.bak-reset-' + ts;
  fs.copyFileSync(dbFile, bak);
  return bak;
}

function writeDbAtomic(db, dbFile) {
  const tmp = dbFile + '.tmp';
  fs.writeFileSync(tmp, Buffer.from(db.export()));
  fs.renameSync(tmp, dbFile);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { printHelp(); process.exit(0); }
  if (!args.username) {
    console.error('用户名不能为空');
    process.exit(1);
  }
  if (!args.password) {
    console.error('用法：node src/reset-admin.js [--username 用户名] <新密码>');
    process.exit(1);
  }
  if (args.password.length < 8) {
    console.error('密码至少 8 字符');
    process.exit(1);
  }

  const dbFile = path.join(config.dataDir, 'keymgr.db');
  if (!fs.existsSync(dbFile)) {
    console.error('数据库不存在，请先启动一次应用');
    process.exit(1);
  }

  const SQL = await initSqlJs({
    locateFile: (file) => path.join(path.dirname(require.resolve('sql.js')), file),
  });
  const db = new SQL.Database(fs.readFileSync(dbFile));
  const stmt = db.prepare('SELECT id, username FROM users WHERE username = ? AND deleted_at IS NULL');
  let user = null;
  try {
    stmt.bind([args.username]);
    if (stmt.step()) user = stmt.getAsObject();
  } finally {
    stmt.free();
  }
  if (!user || !user.id) {
    console.error(`找不到账号：${args.username}`);
    process.exit(1);
  }

  const bak = backupDb(dbFile);
  const hash = bcrypt.hashSync(args.password, 10);
  db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, user.id]);
  const changed = db.getRowsModified();
  if (changed !== 1) {
    console.error(`密码更新失败，已保留备份：${bak}`);
    process.exit(1);
  }

  db.run('DELETE FROM sessions WHERE user_id = ?', [user.id]);
  const sessionsRevoked = db.getRowsModified();
  writeDbAtomic(db, dbFile);

  console.log(`✓ 已重置账号 ${user.username} 的密码`);
  console.log(`✓ 已撤销 ${sessionsRevoked} 个 session`);
  console.log(`✓ 已备份到: ${bak}`);
}

main().catch(e => {
  console.error('重置失败：', e.message);
  process.exit(1);
});
