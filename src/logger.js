const fs = require('fs');
const path = require('path');
const dayjs = require('dayjs');
const config = require('./config');
const db = require('./db');

const LOG_LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const currentLevel = LOG_LEVELS[(process.env.LOG_LEVEL || 'info').toLowerCase()] || LOG_LEVELS.info;

function pad(n) {
  return String(n).padStart(2, '0');
}

function ts() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// 显式跟踪当前日志文件路径，避免依赖 stream.path（Node 18+ 上不可靠）
let currentLogFile = path.join(config.logsDir, `app-${dayjs().format('YYYY-MM-DD')}.log`);
let stream = openLogStream(currentLogFile);

function openLogStream(file) {
  return fs.createWriteStream(file, { flags: 'a' });
}

function rollIfNeeded() {
  const today = dayjs().format('YYYY-MM-DD');
  const file = path.join(config.logsDir, `app-${today}.log`);
  if (currentLogFile !== file) {
    stream.end();
    currentLogFile = file;
    stream = openLogStream(file);
  }
}

// 每分钟检查一次切日
const rollTimer = setInterval(rollIfNeeded, 60 * 1000);
rollTimer.unref();

function write(level, msg, extra) {
  if (LOG_LEVELS[level] < currentLevel) return;
  const line = `[${ts()}] [${level.toUpperCase()}] ${msg}` + (extra ? ` ${JSON.stringify(extra)}` : '');
  // eslint-disable-next-line no-console
  console.log(line);
  try {
    stream.write(line + '\n');
  } catch (_) { /* 忽略 */ }
}

function debug(msg, extra) { write('debug', msg, extra); }
function info(msg, extra)  { write('info',  msg, extra); }
function warn(msg, extra)  { write('warn',  msg, extra); }
function error(msg, extra) { write('error', msg, extra); }

/**
 * 记录一次 verify 请求到数据库
 */
function logVerify({ keyId, keyPrefix, keyMasked, ip, userAgent, result, reason, durationMs }) {
  try {
    db.prepare(`
      INSERT INTO verify_logs (key_id, key_prefix, key_masked, ip, user_agent, result, reason, duration_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      keyId || null,
      keyPrefix || null,
      keyMasked || null,
      ip || null,
      userAgent || null,
      result,
      reason || null,
      typeof durationMs === 'number' ? durationMs : null,
    );
  } catch (e) {
    warn('写 verify 日志失败', { err: e.message });
  }
}

/**
 * 清理过期日志（仅数据库；文件日志按天切割，部署时由 logrotate 处理）
 */
function cleanOldLogs() {
  try {
    const cutoff = dayjs().subtract(config.logRetentionDays, 'day').format('YYYY-MM-DD HH:mm:ss');
    const infoRow = db.prepare('DELETE FROM verify_logs WHERE created_at < ?').run(cutoff);
    if (infoRow.changes) info(`清理 ${infoRow.changes} 条旧日志`);
  } catch (e) {
    warn('清理旧日志失败', { err: e.message });
  }
}

/**
 * 清理超过 30 天的软删除 key（彻底删除）
 */
function cleanSoftDeletedKeys() {
  try {
    const cutoff = dayjs().subtract(30, 'day').format('YYYY-MM-DD HH:mm:ss');
    const r = db.prepare('DELETE FROM api_keys WHERE deleted_at IS NOT NULL AND deleted_at < ?').run(cutoff);
    if (r.changes) info(`清理 ${r.changes} 个超过 30 天的软删除 key`);
  } catch (e) {
    warn('清理软删除 key 失败', { err: e.message });
  }
}

// 每天清一次；用 .unref() 避免定时器阻止进程退出
const oldLogTimer = setInterval(cleanOldLogs, 24 * 60 * 60 * 1000);
oldLogTimer.unref();
const softDelTimer = setInterval(cleanSoftDeletedKeys, 24 * 60 * 60 * 1000);
softDelTimer.unref();

module.exports = { debug, info, warn, error, logVerify, cleanOldLogs, cleanSoftDeletedKeys };
