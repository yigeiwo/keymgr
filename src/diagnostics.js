/**
 * 失败原因库（Reason Library）
 *
 * 把 verify 返回的 reason/code 统一映射成：
 *   - 中文标签
 *   - 通俗解释
 *   - 排查建议
 *
 * 被两处复用：
 *   1. GET /api/logs/stats 的 topReasons 聚合 → 直接带上 label/fix
 *   2. GET /api/keys/:id/health 单 Key 诊断 → 引用同样的语义
 *
 * 维护方式：reason 新增时补一条即可，缺失时回退到通用项。
 */

const REASON_LIBRARY = {
  // ===== 业务侧传参问题 =====
  MISSING_KEY: {
    label: '未提供 Key',
    severity: 'warn',
    explain: '请求里没有有效的 key。可能是调用方没配环境变量，或 header 名写错了。',
    fixes: [
      '检查调用方是否设置了 Authorization: Bearer <key> 或 x-api-key',
      '检查环境变量是否注入成功（curl 时 -d 里别漏 key 字段）',
    ],
  },
  INVALID: {
    label: 'Key 无效',
    severity: 'bad',
    explain: '传了 key 但格式不合法或与任何记录都不匹配。',
    fixes: ['确认 key 完整复制（没有多余空格 / 换行）', '确认该 key 没被误改成另一段文本'],
  },

  // ===== Key 状态问题 =====
  NOT_FOUND: {
    label: 'Key 不存在',
    severity: 'bad',
    explain: 'key 不存在，或不属于当前指定的账号。',
    fixes: [
      '确认 verify 时指定的 account / ownerUserId 是否正确',
      '在管理端确认 key 还在（可能已被删除或归属到了别的账号）',
      '老 key（owner_user_id 为空）默认归 admin，跨账号调用会 NOT_FOUND',
    ],
  },
  EXPIRED: {
    label: 'Key 已过期',
    severity: 'bad',
    explain: 'key 的 expires_at 已过。',
    fixes: ['在管理端编辑 key，更新过期时间或清空（=永不过期）', '必要时重新生成 key'],
  },
  DISABLED: {
    label: 'Key 已停用',
    severity: 'bad',
    explain: 'key 被 toggle 关掉了（enabled=0）。',
    fixes: ['在管理端把 key 重新启用', '若是误停，检查最近的审计日志'],
  },

  // ===== 账号问题 =====
  ACCOUNT_NOT_FOUND: {
    label: '账号不存在',
    severity: 'bad',
    explain: 'verify 时指定的 account 不存在或已被软删。',
    fixes: ['确认账号 username 拼写', '在账号管理页确认该账号未被删除'],
  },
  ACCOUNT_DISABLED: {
    label: '账号已停用',
    severity: 'bad',
    explain: '目标账号被 disabled 了。',
    fixes: ['让 admin 重新启用该账号', '或换一个可用的账号'],
  },
  INVALID_OWNER_USER_ID: {
    label: '账号 ID 非法',
    severity: 'warn',
    explain: 'ownerUserId 不是合法整数。',
    fixes: ['传数字类型的 user id，别传字符串 username'],
  },
  NO_ADMIN: {
    label: '无可用管理员',
    severity: 'bad',
    explain: '系统里没有可用的 admin 账号（全被停用 / 软删）。',
    fixes: ['让数据库里有至少一个 role=admin 且未停用的账号'],
  },

  // ===== 变量相关 =====
  MISSING_NAME: {
    label: '缺少变量名',
    severity: 'warn',
    explain: '调用 /v1/variables/get 时没传 name。',
    fixes: ['请求体里带上 name 字段'],
  },
  INVALID_NAME: {
    label: '变量名非法',
    severity: 'warn',
    explain: '变量名不符合字符集规则（[A-Za-z0-9_.-]，2~64）。',
    fixes: ['检查变量名拼写，只允许字母数字 _ . -'],
  },
  NOT_FOUND_VAR: {
    label: '变量不存在',
    severity: 'bad',
    explain: '该 name 在变量库里查不到。',
    fixes: ['在变量库页确认该变量存在', '确认大小写 / 分组没弄错'],
  },
  SCOPE_FORBIDDEN: {
    label: 'Key 无权访问该变量',
    severity: 'bad',
    explain: 'key 上声明了 meta.scopes，但请求的变量不在 scope 列表里。',
    fixes: ['编辑 key 的 meta.scopes，把该变量名加进去', '或清空 scopes 表示放开全部'],
  },
  MISSING_GROUP: {
    label: '缺少分组名',
    severity: 'warn',
    explain: '调用 /v1/variables/group 时没传 group。',
    fixes: ['请求体里带上 group 字段'],
  },
  GROUP_NOT_FOUND: {
    label: '分组不存在',
    severity: 'bad',
    explain: '该分组名下没有变量（或分组本身不存在）。',
    fixes: ['在变量库页确认分组名拼写', '确认该分组下确实有变量'],
  },

  // ===== 通用兜底 =====
  UNKNOWN: {
    label: '未知原因',
    severity: 'warn',
    explain: '没有匹配到已知 reason。',
    fixes: ['查看原始日志的 reason 字段', '检查最近的 verify_logs / 审计日志'],
  },
};

/**
 * 取某个 reason 的说明，缺失回退到 UNKNOWN。
 * @param {string|null|undefined} reason
 */
function describeReason(reason) {
  if (!reason) return REASON_LIBRARY.UNKNOWN;
  return REASON_LIBRARY[reason] || { ...REASON_LIBRARY.UNKNOWN, explain: `${REASON_LIBRARY.UNKNOWN.explain}（reason=${reason}）` };
}

/**
 * 把一批 [reason, count] 附加 label/severity/fix，按 count 降序。
 */
function annotateReasonCounts(pairs) {
  return pairs
    .map(([reason, count]) => ({ reason, count, ...describeReason(reason) }))
    .sort((a, b) => b.count - a.count);
}

const HEALTH_FIXES = {
  deleted: ['如需继续使用，在 30 天恢复窗口内执行恢复', '超过恢复窗口则重新创建 key'],
  disabled: ['在管理端启用该 key', '查看审计日志确认是否被误停用'],
  expired: ['编辑 key 的 expiresAt 或重新生成 key', '同步更新调用方配置'],
  bad_expires: ['检查数据库中的 expires_at 格式', '通过管理端重新保存过期时间'],
  expire_1d: ['立即安排续期或重新生成 key', '确认调用方切换计划'],
  expire_7d: ['在过期前完成续期', '必要时提前生成备用 key'],
  expire_30d: ['记录续期负责人和时间窗口'],
  fail_rate: ['打开验证日志查看失败原因 Top', '确认调用方是否传错 account / ownerUserId', '检查 key 是否被旧环境或错误服务调用'],
  idle_90d: ['确认该 key 是否仍有业务使用', '如果已废弃，建议停用或删除'],
  idle_30d: ['确认调用链是否迁移到了其它 key', '必要时更新 owner / tags 备注'],
  never_used: ['确认调用方是否已经拿到并配置该 key', '若只是预留 key，可加标签说明用途'],
  stale: ['制定轮换计划并更新调用方配置', '优先轮换权限范围较大的 key'],
};

function withHealthFixes(result) {
  return {
    ...result,
    issues: (result.issues || []).map(it => ({
      ...it,
      fixes: it.fixes || HEALTH_FIXES[it.key] || [],
    })),
  };
}

/**
 * Key 健康评分：综合 5 个维度打 0~100 分 + 风险等级。
 *
 * 维度与权重：
 *   - 停用 / 已过期        → 直接 0 分（critical）
 *   - 已软删               → 直接 0 分
 *   - 过期临近度（30/7/1 天阈值）→ 0/15/30 分
 *   - 最近失败率            → 最多扣 30 分
 *   - 是否长期未用          → 扣 15 分
 *   - 是否长期未更新        → 扣 10 分
 *
 * 返回：
 *   { score, level, levelLabel, color, issues: [{key, message, severity, fixes}] }
 *
 * @param {object} keyRow  api_keys 一行（含 enabled/expires_at/deleted_at/last_used_at/created_at）
 * @param {object} verifyStat  { ok, fail } 该 key 最近 N 天的验证统计（可缺省）
 */
function scoreKeyHealth(keyRow, verifyStat = { ok: 0, fail: 0 }) {
  const issues = [];
  let score = 100;

  // 1) 硬性致命状态
  if (keyRow.deleted_at) {
    return withHealthFixes({ score: 0, level: 'deleted', levelLabel: '已删除', color: 'muted',
      issues: [{ key: 'deleted', message: '该 key 已被软删除', severity: 'critical' }] });
  }
  if (!keyRow.enabled) {
    return withHealthFixes({ score: 0, level: 'disabled', levelLabel: '已停用', color: 'danger',
      issues: [{ key: 'disabled', message: '该 key 当前处于停用状态，无法通过验证', severity: 'critical' }] });
  }

  const now = Date.now();

  // 2) 过期
  if (keyRow.expires_at) {
    const exp = new Date(keyRow.expires_at + (keyRow.expires_at.endsWith('Z') ? '' : 'Z')).getTime();
    if (isNaN(exp)) {
      // 过期时间格式异常，不致命但提示
      issues.push({ key: 'bad_expires', message: '过期时间格式异常', severity: 'warn' });
      score -= 10;
    } else if (exp < now) {
      return withHealthFixes({ score: 0, level: 'expired', levelLabel: '已过期', color: 'danger',
        issues: [{ key: 'expired', message: '该 key 已超过有效期，验证一律失败', severity: 'critical' }] });
    } else {
      const daysLeft = (exp - now) / (24 * 3600 * 1000);
      if (daysLeft <= 1) {
        score -= 30; issues.push({ key: 'expire_1d', message: `${daysLeft.toFixed(1)} 天后过期（紧急）`, severity: 'critical' });
      } else if (daysLeft <= 7) {
        score -= 15; issues.push({ key: 'expire_7d', message: `${daysLeft.toFixed(1)} 天后过期`, severity: 'warn' });
      } else if (daysLeft <= 30) {
        issues.push({ key: 'expire_30d', message: `${daysLeft.toFixed(0)} 天后过期（留意）`, severity: 'info' });
      }
    }
  }

  // 3) 最近失败率（最近 N 天 verify_logs）
  const ok = verifyStat.ok || 0;
  const fail = verifyStat.fail || 0;
  const total = ok + fail;
  if (total > 0) {
    const failRate = fail / total;
    const penalty = Math.round(failRate * 30);
    if (penalty > 0) {
      score -= penalty;
      issues.push({
        key: 'fail_rate',
        message: `最近失败率 ${(failRate * 100).toFixed(1)}%（${fail}/${total}）`,
        severity: failRate > 0.5 ? 'critical' : failRate > 0.2 ? 'warn' : 'info',
      });
    }
  }

  // 4) 长期未使用（>30 天无 last_used_at）
  if (keyRow.last_used_at) {
    const last = new Date(keyRow.last_used_at + (keyRow.last_used_at.endsWith('Z') ? '' : 'Z')).getTime();
    if (!isNaN(last)) {
      const daysIdle = (now - last) / (24 * 3600 * 1000);
      if (daysIdle > 90) {
        score -= 15; issues.push({ key: 'idle_90d', message: `已 ${daysIdle.toFixed(0)} 天未被调用（疑似废弃）`, severity: 'warn' });
      } else if (daysIdle > 30) {
        score -= 5; issues.push({ key: 'idle_30d', message: `已 ${daysIdle.toFixed(0)} 天未被调用`, severity: 'info' });
      }
    }
  } else if (keyRow.created_at) {
    const created = new Date(keyRow.created_at + (keyRow.created_at.endsWith('Z') ? '' : 'Z')).getTime();
    if (!isNaN(created) && (now - created) / (24 * 3600 * 1000) > 30) {
      score -= 15; issues.push({ key: 'never_used', message: '创建至今从未被验证调用（疑似未启用）', severity: 'warn' });
    }
  }

  // 5) 长期未更新（创建超过 180 天）
  if (keyRow.created_at) {
    const created = new Date(keyRow.created_at + (keyRow.created_at.endsWith('Z') ? '' : 'Z')).getTime();
    if (!isNaN(created)) {
      const ageDays = (now - created) / (24 * 3600 * 1000);
      if (ageDays > 365) {
        score -= 10; issues.push({ key: 'stale', message: `Key 已 ${ageDays.toFixed(0)} 天未轮换`, severity: 'info' });
      }
    }
  }

  // 兜底
  if (score < 0) score = 0;
  if (score > 100) score = 100;

  let level, levelLabel, color;
  if (score >= 80) { level = 'good'; levelLabel = '健康'; color = 'success'; }
  else if (score >= 50) { level = 'fair'; levelLabel = '一般'; color = 'warning'; }
  else { level = 'bad'; levelLabel = '风险'; color = 'danger'; }

  return withHealthFixes({ score, level, levelLabel, color, issues });
}

module.exports = {
  REASON_LIBRARY,
  describeReason,
  annotateReasonCounts,
  scoreKeyHealth,
};
