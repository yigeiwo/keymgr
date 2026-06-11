#!/usr/bin/env node
/**
 * 一次性脚本：重置 admin 密码
 * 用法：node src/reset-admin.js <new-password>
 */
const bcrypt = require('bcryptjs');
const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const config = require('./config');

const newPwd = process.argv[2];
if (!newPwd) {
  console.error('用法：node src/reset-admin.js <新密码>');
  process.exit(1);
}
if (newPwd.length < 8) {
  console.error('密码至少 8 字符');
  process.exit(1);
}

const dbFile = path.join(config.dataDir, 'keymgr.db');
if (!fs.existsSync(dbFile)) {
  console.error('数据库不存在，请先启动一次应用');
  process.exit(1);
}

(async () => {
  const SQL = await initSqlJs({
    locateFile: (file) => path.join(path.dirname(require.resolve('sql.js')), file),
  });
  const db = new SQL.Database(fs.readFileSync(dbFile));
  const hash = bcrypt.hashSync(newPwd, 10);
  const r = db.run('UPDATE users SET password_hash = ? WHERE username = ?', [hash, 'admin']);
  if (r.changes === 0) {
    console.error('找不到 admin 用户');
    process.exit(1);
  }
  fs.writeFileSync(dbFile, Buffer.from(db.export()));
  console.log('admin 密码已重置为：', newPwd);
})();
