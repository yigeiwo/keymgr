#!/usr/bin/env node
/**
 * 备份：把 data/keymgr.db + 最近 7 天的 logs/app-*.log 打成一个 tar.gz
 * 输出目录：./backups/keymgr-backup-YYYYMMDD-HHmmss.tar.gz
 * 用法：  npm run backup            （7 天）
 *         npm run backup -- 30     （30 天）
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const dataDir = path.join(root, 'data');
const logsDir = path.join(root, 'logs');
const outDir = path.join(root, 'backups');
const days = parseInt(process.argv[2] || process.env.BACKUP_LOG_DAYS || '7', 10);

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const ts = new Date();
const pad = (n) => String(n).padStart(2, '0');
const stamp = `${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}`;
const outFile = path.join(outDir, `keymgr-backup-${stamp}.tar.gz`);

if (!fs.existsSync(dataDir) || !fs.existsSync(path.join(dataDir, 'keymgr.db'))) {
  console.error('[backup] data/keymgr.db 不存在，先启动一次应用初始化数据库');
  process.exit(1);
}

console.log(`[backup] 数据目录: ${dataDir}`);
console.log(`[backup] 日志目录: ${logsDir}（取最近 ${days} 天）`);
console.log(`[backup] 输出文件: ${outFile}`);

// 优先用系统 tar；不存在时降级到 node 内置 stream
function findTar() {
  const r = spawnSync('tar', ['--version'], { stdio: 'ignore' });
  return r.status === 0 ? 'tar' : null;
}
function findTarGzByExt() {
  // 强制走 .tar.gz
  return 'tar';
}

const logFiles = fs.existsSync(logsDir) ? fs.readdirSync(logsDir)
  .filter(f => /^app-\d{4}-\d{2}-\d{2}\.log$/.test(f))
  .sort()
  .reverse()
  .slice(0, days)
  .map(f => path.join('logs', f)) : [];

const args = [
  '-czf', outFile,
  '-C', root,
  'data/keymgr.db',
  ...logFiles,
];

const tar = findTar();
if (tar) {
  const r = spawnSync(tar, args, { stdio: 'inherit' });
  if (r.status !== 0) {
    console.error('[backup] tar 失败');
    process.exit(r.status || 1);
  }
} else {
  // 极简退化：用 node 把文件顺序拼到 gzip 流（不会保留 tar 头，但能写出一份 gz 文件便于读取）
  console.warn('[backup] 系统 tar 不可用，使用退化模式（仅打包，无 tar 头）');
  const out = fs.createWriteStream(outFile);
  const gz = zlib.createGzip();
  gz.pipe(out);
  for (const f of ['data/keymgr.db', ...logFiles]) {
    const p = path.join(root, f);
    if (!fs.existsSync(p)) continue;
    gz.write(`---FILE: ${f} (${fs.statSync(p).size} bytes)---\n`);
    gz.write(fs.readFileSync(p));
    gz.write('\n');
  }
  gz.end();
  out.on('finish', () => console.log('[backup] 完成（退化模式）'));
}

const size = fs.existsSync(outFile) ? fs.statSync(outFile).size : 0;
console.log(`[backup] 完成：${outFile}（${(size / 1024).toFixed(1)} KB）`);

// 保留最近 30 份备份，自动清理
const keep = parseInt(process.env.BACKUP_KEEP || '30', 10);
const all = fs.readdirSync(outDir)
  .filter(f => f.startsWith('keymgr-backup-') && f.endsWith('.tar.gz'))
  .map(f => ({ f, t: fs.statSync(path.join(outDir, f)).mtimeMs }))
  .sort((a, b) => b.t - a.t);
for (const old of all.slice(keep)) {
  fs.unlinkSync(path.join(outDir, old.f));
  console.log(`[backup] 已清理旧备份: ${old.f}`);
}
