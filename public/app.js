// 简单前端脚本
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// ─── SVG 图标（用于表格操作按钮，替代 emoji） ───
const ICO = {
  copy:   '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>',
  edit:   '<svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  reroll: '<svg viewBox="0 0 24 24"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>',
  toggle_on:  '<svg viewBox="0 0 24 24"><rect x="1" y="5" width="22" height="14" rx="7"/><circle cx="16" cy="12" r="3"/></svg>',
  toggle_off: '<svg viewBox="0 0 24 24"><rect x="1" y="5" width="22" height="14" rx="7"/><circle cx="8" cy="12" r="3"/></svg>',
  del:    '<svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>',
  restore:'<svg viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 105.64-11.36L1 10"/></svg>',
  purge:  '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
  key:    '<svg viewBox="0 0 24 24"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>',
  lock:   '<svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>',
  timeline: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14l2 2 4-4"/></svg>',
  check:    '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="11" y2="14"/><line x1="11" y1="8" x2="14" y2="11"/></svg>',

  // ── 通用 UI 图标 ──
  nav_keys:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>',
  nav_users:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>',
  nav_vars:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
  nav_logs:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
  nav_docs:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>',
  nav_handover:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><path d="M9 12h6M9 16h4"/></svg>',

  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>',
  moon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>',

  search:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  close:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  chevron_down:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
  refresh:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>',
  warning:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  eye:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
  chart:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
  flame:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"/></svg>',
  shield:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  ok:        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  fail:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  pause:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>',
  map:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>',
  tag:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
  gear:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
  cloud:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/></svg>',
  snow:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="22"/><path d="M20 8H4M20 16H4M16 4l-4 4-4-4M16 20l-4-4-4 4"/></svg>',
  zzz:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 6h7l-7 8h7M14 11h5l-5 6h5"/></svg>',
};

/**
 * 把 picker 下拉浮层定位到 trigger 正下方（fixed 定位）。
 * 解决两个问题：
 *   1) 父级 overflow:hidden/auto（如 modal-card 的 overflow-y:auto）会裁切 position:absolute 子级
 *   2) 多层嵌套下，position:absolute 的层级很容易被相邻元素盖住
 * 用 fixed 定位后，浮层挂在 viewport 上下文里，不会被父级裁切，z-index 也能稳定生效。
 */
function positionPickerPanel(panel, trigger) {
  if (!panel || !trigger) return;
  panel.classList.add('picker-floating');  // CSS 用这个类切换到 fixed 定位
  // 用 rAF 让浏览器先把布局算完再读 rect，避免读到旧位置
  requestAnimationFrame(() => {
    const r = trigger.getBoundingClientRect();
    const top = r.bottom + 4;
    const left = r.left;
    const width = r.width;
    panel.style.position = 'fixed';
    panel.style.top = top + 'px';
    panel.style.left = left + 'px';
    panel.style.width = width + 'px';
    panel.style.maxHeight = Math.max(160, window.innerHeight - top - 8) + 'px';
  });
}

/**
 * 浮层开着时，窗口滚动 / 缩放时需要跟着重定位。
 * 挂在 window 上（capture 阶段），避免某些滚动容器（如 modal-card）不冒泡。
 */
window.addEventListener('scroll', repositionOpenPickerPanels, true);
window.addEventListener('resize', repositionOpenPickerPanels);
function repositionOpenPickerPanels() {
  $$('.picker-floating').forEach((panel) => {
    if (panel.hidden) return;
    // 通过 id 反查 trigger：约定 panel id 形如 "var-group-panel" / "key-owner-new-panel"
    // 对应的 trigger 是 id 去 "-panel" 后缀 + "-trigger" / "-new-trigger" / "-edit-trigger"
    // 简单地：找最近的 group-picker / tag-picker 容器里的 [id$="-trigger"]
    const wrap = panel.closest('.group-picker, .tag-picker');
    if (!wrap) return;
    const trigger = wrap.querySelector('[id$="-trigger"]');
    if (!trigger) return;
    const r = trigger.getBoundingClientRect();
    panel.style.top = (r.bottom + 4) + 'px';
    panel.style.left = r.left + 'px';
    panel.style.width = r.width + 'px';
    panel.style.maxHeight = Math.max(160, window.innerHeight - r.bottom - 12) + 'px';
  });
}

// 防抖：连续触发时只在停顿 ms 后执行一次
function debounce(fn, ms = 250) {
  let t = null;
  return function (...args) {
    if (t) clearTimeout(t);
    t = setTimeout(() => { t = null; fn.apply(this, args); }, ms);
  };
}

function api(path, opts = {}) {
  return fetch(path, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  }).then(async r => {
    const data = await r.json().catch(() => ({}));
    // session 过期 / 未登录 → 统一跳 login（避免空白页）
    if (r.status === 401 && path !== '/api/auth/login' && !path.startsWith('/api/auth/login')) {
      // /v1/* 公开端点返回 401 含义不同，不跳转
      if (path.startsWith('/v1/')) {
        const msg = data.error || `HTTP ${r.status}`;
        const err = new Error(msg);
        err.status = r.status; err.code = data.code; err.field = data.field;
        throw err;
      }
      // 避免重复 toast
      if (!location.pathname.endsWith('/login') && !window.__redirecting401) {
        window.__redirecting401 = true;
        try { toast('登录已过期，即将跳到登录页', 'warn', 3000); } catch (_) {}
        setTimeout(() => { location.href = '/login'; }, 600);
      }
      const err = new Error('登录已过期');
      err.status = 401; err.code = 'UNAUTHORIZED';
      throw err;
    }
    if (!r.ok) {
      // 优先用后端的 error/code/field 信息
      const msg = data.error || `HTTP ${r.status}`;
      const err = new Error(msg);
      err.status = r.status;
      err.code = data.code;
      err.field = data.field;
      throw err;
    }
    return data;
  });
}

// ============== 全局错误兜底 ==============
// 之前出现过「点了没反应」「卡死」之类的症状，多半是某处 throw 没被 try/catch 兜住。
// 这里把 window 上的未捕获错误显示成右上角红 toast，并打 console.error。
window.addEventListener('error', (e) => {
  console.error('[uncaught]', e.error || e.message);
  try { toast('脚本错误：' + (e.message || e.error?.message || 'unknown'), 'err', 6000); } catch (_) {}
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[unhandledrejection]', e.reason);
  try { toast('异步错误：' + (e.reason?.message || e.reason || 'unknown'), 'err', 6000); } catch (_) {}
});

// ============== 全局事件委托（点击复制密码 / 关闭弹窗） ==============
// 把 [data-copy-target] 的 inline onclick 全部干掉，用一个事件委托处理：
//   - 避免 inline JS 在 HTML 解析期就尝试调用未定义的全局函数
//   - 避免用户改主题 / 卸载/重挂弹窗时丢失监听
document.addEventListener('click', (e) => {
  const copyEl = e.target.closest('[data-copy-target]');
  if (copyEl && copyEl.textContent && copyEl.textContent.trim()) {
    const ok = copyTextSync(copyEl.textContent);
    toast(ok ? '已复制到剪贴板' : '复制失败', ok ? 'ok' : 'err');
  }
});
// 同步版 copyText（不返回 Promise）—— inline 场景用
function copyTextSync(text) {
  if (!text) return false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) {}
  // 兜底：textarea + execCommand
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return !!ok;
  } catch (_) {
    return false;
  }
}

// Tabs
$$('.sidebar-nav a').forEach(a => a.addEventListener('click', (e) => {
  e.preventDefault();
  $$('.sidebar-nav a').forEach(x => x.classList.remove('active'));
  $$('.tab').forEach(x => x.classList.remove('active'));
  a.classList.add('active');
  $('#tab-' + a.dataset.tab).classList.add('active');
  // Update topbar title
  const titleMap = { keys: 'Keys', accounts: '账号管理', variables: '变量库', logs: '验证日志', docs: 'API 文档', handover: '交接' };
  const topTitle = $('#topbar-title');
  if (topTitle) topTitle.textContent = titleMap[a.dataset.tab] || a.dataset.tab;
  // Close mobile sidebar
  $('#sidebar')?.classList.remove('is-open');
  $('#sidebar-overlay')?.classList.remove('is-open');
  if (a.dataset.tab === 'logs') { loadLogs(); loadStats(); }
  if (a.dataset.tab === 'keys') loadKeys();
  if (a.dataset.tab === 'variables') loadVariables();
  if (a.dataset.tab === 'accounts') loadAccounts();
}));

// Mobile sidebar toggle
$('#mobile-menu-btn')?.addEventListener('click', () => {
  $('#sidebar')?.classList.toggle('is-open');
  $('#sidebar-overlay')?.classList.toggle('is-open');
});

$('#sidebar-overlay')?.addEventListener('click', () => {
  $('#sidebar')?.classList.remove('is-open');
  $('#sidebar-overlay')?.classList.remove('is-open');
});

$('#logout').addEventListener('click', async () => {
  await api('/api/auth/logout', { method: 'POST' });
  location.href = '/login';
});

function fmtTime(s) {
  if (!s) return '-';
  return s.replace('T', ' ').replace('Z', '');
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let keySearchTerm = '';
let keyAccountFilter = '';   // admin 限定看哪个账号
let keyTagFilter = '';       // 按 tag 过滤（OR 关系，逗号分隔），'' = 不过滤
let keyOwnerFilter = '';     // 按 owner 过滤（单值），'' = 不过滤
let showDeleted = false;
let allKeys = [];
let allUsers = [];             // admin 才能拉到
let currentUser = null;        // {id,username,role,...}

function canWrite() {
  return currentUser && currentUser.role !== 'viewer';
}

async function loadCurrentUser() {
  try {
    const r = await api('/api/users/me/info');
    currentUser = r.user;
  } catch (e) { /* 401 会被全局捕获 */ }
}

async function loadUsers() {
  if (!currentUser || currentUser.role !== 'admin') {
    allUsers = currentUser ? [{ id: currentUser.id, username: currentUser.username, role: currentUser.role, disabled: 0 }] : [];
    return;
  }
  try {
    const r = await api('/api/users');
    allUsers = r.items || [];
  } catch (e) {
    allUsers = [];
  }
}

async function loadKeys() {
  const qs = new URLSearchParams();
  if (keySearchTerm) qs.set('q', keySearchTerm);
  if (showDeleted) qs.set('includeDeleted', '1');
  if (keyAccountFilter) {
    if (keyAccountFilter.startsWith('u:')) qs.set('ownerUserId', keyAccountFilter.slice(2));
    else if (keyAccountFilter.startsWith('s:')) qs.set('account', keyAccountFilter.slice(2));
  }
  if (keyTagFilter) qs.set('tag', keyTagFilter);
  if (keyOwnerFilter) qs.set('owner', keyOwnerFilter);
  const q = qs.toString() ? `?${qs.toString()}` : '';
  const { items } = await api('/api/keys' + q);
  allKeys = items;
  // 顺便刷一下 tag + owner 缓存（picker 用）
  api('/api/keys/tags').then(r => { allKeyTags = r.items || []; renderTagFilter(); }).catch(() => {});
  api('/api/keys/owners').then(r => { allKeyOwners = r.items || []; renderOwnerFilter(); }).catch(() => {});
  renderKeys();
  // 更新标题旁的计数
  const cnt = $('#keys-count');
  if (cnt) {
    const total = items.length;
    cnt.textContent = total === 0 ? '（空）' : `共 ${total} 条`;
  }
}

function renderKeys() {
  const tbody = $('#keys-tbody');
  const items = allKeys;
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="11"><div class="empty empty--key">
      <div>还没有 Key</div>
      <button type="button" class="primary" data-act="empty-new-key"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>新建 Key</button>
    </div></td></tr>`;
    return;
  }
  // 紧凑时间（不带日期），避免换行；过长则省略
  const shortTime = (s) => {
    if (!s) return '—';
    return s.replace('T', ' ').replace('Z', '').slice(5, 16); // MM-DD HH:MM
  };
  const fullTime = (s) => s ? fmtTime(s) : '—';
  tbody.innerHTML = items.map((k, i) => {
    const tagsHtml = (k.tags || []).map(t =>
      `<span class="tag" data-tag-filter="${escapeHtml(t)}" title="点击按该 tag 过滤">${escapeHtml(t)}</span>`
    ).join('');
    const isDel = !!k.deleted_at;
    const delBadge = isDel ? `<span class="badge warn" title="${escapeHtml(k.deleted_at)}">已删</span>` : '';
    // Keys 列表只显示普通 key（is_default=0）；主 Key 走「账号管理」页面
    const acct = k.ownerUsername
      ? `<span class="badge ${k.ownerUsername === currentUser?.username ? 'ok' : ''}">${escapeHtml(k.ownerUsername)}</span>`
      : `<span class="muted" title="老库兼容：未归属">—</span>`;
    return `
    <tr ${isDel ? 'style="opacity:.6;"' : ''}>
      <td data-label="#"><b>${i + 1}</b></td>
      <td data-label="名称" class="cell-name">
        <div class="primary-name">${escapeHtml(k.name)}</div>
        ${delBadge}
        ${k.meta ? `<div class="secondary">${Object.keys(k.meta).length} meta</div>` : ''}
      </td>
      <td data-label="前缀" data-col="prefix" class="mono">${escapeHtml(k.prefix)}…</td>
      <td data-label="账号">${acct}</td>
      <td data-label="owner">${k.owner
          ? `<span class="tag" data-owner-filter="${escapeHtml(k.owner)}" title="点击按该 owner 过滤">${escapeHtml(k.owner)}</span>`
          : '<span class="muted">—</span>'}</td>
      <td data-label="tags" class="tags-cell"><div class="tags-cell-inner">${tagsHtml || '<span class="muted">—</span>'}</div></td>
      <td data-label="状态">${k.enabled ? '<span class="badge ok">启用</span>' : '<span class="badge fail">停用</span>'}</td>
      <td data-label="过期" data-col="time" title="${escapeHtml(fullTime(k.expires_at))}">${shortTime(k.expires_at)}</td>
      <td data-label="最近使用" data-col="time" title="${escapeHtml(fullTime(k.last_used_at))}">${shortTime(k.last_used_at)}</td>
      <td data-label="创建时间" data-col="time" title="${escapeHtml(fullTime(k.created_at))}">${shortTime(k.created_at)}</td>
      <td data-label="操作" class="actions-cell">
        ${canWrite()
          ? `<button class="ghost primary-act" data-act="copy" data-id="${k.id}" title="复制当前 key">${ICO.copy}</button>
             ${isDel
               ? `<button class="ghost" data-act="restore" data-id="${k.id}" title="30 天内可恢复">${ICO.restore}</button>
                  <button class="ghost danger" data-act="purge" data-id="${k.id}" title="永久删除">${ICO.purge}</button>`
               : `<button class="ghost" data-act="edit" data-id="${k.id}" title="编辑">${ICO.edit}</button>
                  <button class="ghost" data-act="reroll" data-id="${k.id}" title="重置">${ICO.reroll}</button>
                  <button class="ghost" data-act="toggle" data-id="${k.id}" title="${k.enabled ? '停用' : '启用'}">${k.enabled ? ICO.toggle_on : ICO.toggle_off}</button>
                  <button class="ghost" data-act="del" data-id="${k.id}" title="删除">${ICO.del}</button>`}`
          : '<span class="muted">只读</span>'}
      </td>
    </tr>`;
  }).join('');
}

$('#key-search')?.addEventListener('input', debounce((e) => {
  keySearchTerm = e.target.value.trim();
  loadKeys();
}, 200));

// key help 按钮（展开/折叠说明）
$('#key-help-toggle')?.addEventListener('click', (e) => {
  const help = $('#key-help');
  const btn = e.currentTarget;
  if (!help) return;
  const open = help.classList.toggle('is-open');
  btn.classList.toggle('is-open', open);
});

$('#key-account-filter')?.addEventListener('change', (e) => {
  keyAccountFilter = e.target.value;
  loadKeys();
});

// tag 过滤：多选（按住 Ctrl/Cmd 可选多个；点击外部也提交变更）
$('#key-tag-filter')?.addEventListener('change', (e) => {
  const sel = e.target;
  const vals = Array.from(sel.selectedOptions).map(o => o.value).filter(Boolean);
  keyTagFilter = vals.join(',');
  loadKeys();
});
// owner 过滤：单选
$('#key-owner-filter')?.addEventListener('change', (e) => {
  keyOwnerFilter = e.target.value;
  loadKeys();
});
// 标签 chip 点击 → 把 tag 设为当前过滤（替换，而非追加）
$('#keys-tbody')?.addEventListener('click', (e) => {
  const tag = e.target.closest('[data-tag-filter]');
  if (tag) {
    keyTagFilter = tag.dataset.tagFilter;
    loadKeys();
    return;
  }
  // owner chip 点击 → 把 owner 设为当前过滤
  const owner = e.target.closest('[data-owner-filter]');
  if (owner) {
    keyOwnerFilter = owner.dataset.ownerFilter;
    loadKeys();
  }
});

// 一键清除所有筛选
$('#key-clear-filters')?.addEventListener('click', () => {
  keySearchTerm = '';
  keyTagFilter = '';
  keyOwnerFilter = '';
  keyAccountFilter = '';
  const searchEl = $('#key-search');
  if (searchEl) searchEl.value = '';
  const tagEl = $('#key-tag-filter');
  if (tagEl) tagEl.selectedIndex = 0;
  const ownerEl = $('#key-owner-filter');
  if (ownerEl) ownerEl.selectedIndex = 0;
  const acctEl = $('#key-account-filter');
  if (acctEl) acctEl.selectedIndex = 0;
  const delEl = $('#key-show-deleted');
  if (delEl) delEl.checked = false;
  loadKeys();
  toast('已清除所有筛选', 'ok');
});

/**
 * 把账号列表填到 select 控件里：
 *   - new-key-owner-select：默认选中当前用户；非 admin 禁用（只能给自己）
 *   - edit-key-owner-select：默认选中 key 当前归属；非 admin 禁用
 *   - key-account-filter：仅 admin 用；operator/viewer 隐藏
 */
function populateAccountSelects() {
  const isAdmin = currentUser && currentUser.role === 'admin';
  const users = allUsers || [];

  // filter
  const filterEl = $('#key-account-filter');
  if (filterEl) {
    filterEl.innerHTML = '';
    if (isAdmin) {
      const all = document.createElement('option');
      all.value = '';
      all.textContent = '全部账号';
      filterEl.appendChild(all);
      for (const u of users) {
        if (u.disabled) continue;
        const opt = document.createElement('option');
        opt.value = 'u:' + u.id;
        opt.textContent = u.username + (u.role === 'admin' ? ' (admin)' : '');
        filterEl.appendChild(opt);
      }
    } else {
      filterEl.parentElement && (filterEl.parentElement.style.display = 'none');
    }
  }

  // new key
  const newSel = $('#new-key-owner-select');
  if (newSel) {
    newSel.innerHTML = '';
    if (isAdmin) {
      for (const u of users) {
        if (u.disabled) continue;
        const opt = document.createElement('option');
        opt.value = u.id;
        opt.textContent = u.username + (u.role === 'admin' ? ' (admin)' : '');
        if (currentUser && currentUser.id === u.id) opt.selected = true;
        newSel.appendChild(opt);
      }
    } else {
      // 非 admin：只能给自己（值是当前用户 id，控件 disabled）
      const opt = document.createElement('option');
      opt.value = currentUser ? currentUser.id : '';
      opt.textContent = currentUser ? currentUser.username : 'me';
      opt.selected = true;
      newSel.appendChild(opt);
      newSel.disabled = true;
    }
  }

  // edit key
  const editSel = $('#edit-key-owner-select');
  if (editSel) {
    editSel.innerHTML = '';
    if (isAdmin) {
      for (const u of users) {
        if (u.disabled) continue;
        const opt = document.createElement('option');
        opt.value = u.id;
        opt.textContent = u.username + (u.role === 'admin' ? ' (admin)' : '');
        editSel.appendChild(opt);
      }
    } else {
      const opt = document.createElement('option');
      opt.value = currentUser ? currentUser.id : '';
      opt.textContent = currentUser ? currentUser.username : 'me';
      editSel.appendChild(opt);
      editSel.disabled = true;
    }
  }
}

$('#key-show-deleted')?.addEventListener('change', (e) => {
  showDeleted = !!e.target.checked;
  loadKeys();
});

$('#keys-tbody').addEventListener('click', async (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  // 空状态：点击「新建 Key」直接打开弹窗
  if (btn.dataset.act === 'empty-new-key') {
    openNewKeyModal();
    return;
  }
  const id = btn.dataset.id;
  if (btn.dataset.act === 'copy') {
    // 列表里的"复制" = 从数据库取当前 key 并复制，**不重置**
    try {
      const r = await api(`/api/keys/${id}/plain`);
      const ok = await copyText(r.currentPlain);
      toast(ok ? '已复制当前 key' : '复制失败', ok ? 'ok' : 'err');
    } catch (e) {
      // 老库无 plain 字段时降级
      if (e.status === 404) toast('该 key 不存在', 'err');
      else toast('复制失败：' + e.message, 'err');
    }
  } else if (btn.dataset.act === 'edit') {
    const item = allKeys.find(x => String(x.id) === String(id));
    if (item) openEditKeyModal(item);
  } else if (btn.dataset.act === 'toggle') {
    try { await api(`/api/keys/${id}/toggle`, { method: 'POST' }); loadKeys(); }
    catch (e) { toast('操作失败：' + e.message, 'err'); }
  } else if (btn.dataset.act === 'reroll') {
    if (!await appConfirm({ title: '重置 Key', message: '重置后旧 key 立即失效，确认继续？', okText: '重置', danger: true })) return;
    await rerollAndCopy(id);
  } else if (btn.dataset.act === 'restore') {
    if (!await appConfirm({ title: '恢复 Key', message: '确定恢复该 key？', okText: '恢复', danger: false })) return;
    try {
      await api(`/api/keys/${id}/restore`, { method: 'POST' });
      toast('已恢复', 'ok');
      loadKeys();
    } catch (e) { toast('恢复失败：' + e.message, 'err'); }
  } else if (btn.dataset.act === 'purge') {
    if (!await appConfirm({ title: '永久删除', message: '永久删除后无法恢复，确认？', okText: '永久删除', danger: true })) return;
    try {
      await api(`/api/keys/${id}/purge`, { method: 'DELETE' });
      toast('已永久删除', 'ok');
      loadKeys();
    } catch (e) { toast('删除失败：' + e.message, 'err'); }
  } else if (btn.dataset.act === 'del') {
    if (!await appConfirm({ title: '删除 Key', message: '确定删除该 Key？30 天内可在「显示已删除」中恢复。', okText: '删除', danger: true })) return;
    try {
      await api(`/api/keys/${id}`, { method: 'DELETE' });
      const m = loadPlainMap(); delete m[String(id)]; savePlainMap(m);
      toast('已删除（30 天内可恢复）', 'ok'); loadKeys();
    } catch (e) { toast('删除失败：' + e.message, 'err'); }
  }
});

// 重新生成 + 显示 + 自动复制 + 写入会话缓存
async function rerollAndCopy(id) {
  try {
    const r = await api(`/api/keys/${id}/reroll`, { method: 'POST' });
    $('#new-key-plain').textContent = r.key;
    $('#new-key-banner').hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const ok = await copyText(r.key);
    rememberPlain(id, r.key);
    toast(ok ? '新 key 已生成并复制' : '新 key 已生成，请手动点击"复制"', ok ? 'ok' : 'warn');
    loadKeys();
  } catch (e) { toast('重置失败：' + e.message, 'err'); }
}

// New key modal
function openModal() {
  if (!canWrite()) { toast('当前角色为只读，不能新建 Key', 'warn'); return; }
  $('#new-key-form').reset();
  setMode('generate');
  populateAccountSelects();
  // owner picker 初始化（空）+ 拉 owner 列表缓存
  setOwnerPickerValue('new', '');
  api('/api/keys/owners').then(r => { allKeyOwners = r.items || []; }).catch(() => { allKeyOwners = []; });
  initTagPicker('new', []);   // 全新为空
  // 拉一次所有 tag 缓存，下拉里展示
  api('/api/keys/tags').then(r => { allKeyTags = r.items || []; }).catch(() => { allKeyTags = []; });
  $('#new-key-modal').hidden = false;
  setTimeout(() => $('input[name="name"]', $('#new-key-form')).focus(), 50);
}
function closeModal() { $('#new-key-modal').hidden = true; }
$('#btn-new-key').addEventListener('click', openModal);
$('#btn-cancel').addEventListener('click', closeModal);
$('#new-key-close')?.addEventListener('click', closeModal);
$('#new-key-modal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('#new-key-modal').hidden) closeModal();
});

// 模式切换
function setMode(mode) {
  $('#new-key-form').dataset.mode = mode;
  $$('.seg-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  $$('#new-key-form [data-show]').forEach(el => {
    el.hidden = el.dataset.show !== mode;
  });
  // 主提交按钮文案
  $('#btn-submit-new-key').textContent = mode === 'import' ? '导入' : '创建';
}
$$('.seg-btn').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));

// 文档页 code tabs
// 通用 tab 切换：每个 .code-tab-bar 独立管理自己范围内的 button 和 pane
// 用 stopPropagation 阻止嵌套 tab 之间的冒泡干扰
$$('.code-tab-bar').forEach(bar => {
  bar.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-pane]');
    if (!btn || !bar.contains(btn)) return;
    e.stopPropagation(); // 关键：阻止冒泡到外层 tab bar

    const pane = btn.dataset.pane;
    // 作用域：bar 的直接父级（也就是装本组所有 pane 的容器）
    const scope = bar.parentElement;
    // 只切 scope 的**直属子元素**中 data-pane 等于目标的项，
    // 不递归进嵌套的 .code-tabs 容器内，避免误伤内层 pane
    for (const child of scope.children) {
      if (!(child instanceof HTMLElement)) continue;
      if (child.tagName === 'BUTTON') continue; // 跳过 button（tab-bar 本身）
      if (!child.hasAttribute('data-pane')) continue;
      child.hidden = (child.dataset.pane !== pane);
    }
    // 切换本组 button 高亮
    $$('button[data-pane]', bar).forEach(x => x.classList.toggle('active', x === btn));
  });
});
// 健壮的复制（支持降级到 execCommand）
async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) {}
  // 降级：textarea + execCommand
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '0'; ta.style.left = '0';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (_) { return false; }
}

// ----- 本会话内明文缓存（仅 sessionStorage，关浏览器即清空） -----
const PLAIN_KEY = 'km_plain_keys';
function loadPlainMap() {
  try { return JSON.parse(sessionStorage.getItem(PLAIN_KEY) || '{}'); }
  catch { return {}; }
}
function savePlainMap(m) {
  try { sessionStorage.setItem(PLAIN_KEY, JSON.stringify(m)); } catch {}
}
function rememberPlain(id, plain) {
  const m = loadPlainMap();
  m[String(id)] = { plain, ts: Date.now() };
  savePlainMap(m);
}
function getRememberedPlain(id) {
  return loadPlainMap()[String(id)]?.plain || null;
}

function copyPlain() {
  const v = $('#new-key-plain').textContent.trim();
  if (!v) return Promise.resolve(false);
  return copyText(v).then(ok => toast(ok ? '已复制到剪贴板' : '复制失败，请手动选择文本', ok ? 'ok' : 'err'));
}
$('#btn-dismiss-banner').addEventListener('click', () => { $('#new-key-banner').hidden = true; });
$('#btn-copy').addEventListener('click', () => copyPlain());
// 点击明文 code 也能复制
$('#new-key-plain').addEventListener('click', () => copyPlain());

// ============== 改自己的密码 ==============
function openChangePwModal() {
  const f = $('#change-pw-form');
  if (f) f.reset();
  $('#change-pw-modal').hidden = false;
  setTimeout(() => $('input[name="currentPassword"]', $('#change-pw-form'))?.focus(), 30);
}
function closeChangePwModal() { $('#change-pw-modal').hidden = true; }
$('#btn-change-pw')?.addEventListener('click', openChangePwModal);
$('#change-pw-close')?.addEventListener('click', closeChangePwModal);
$('#change-pw-cancel')?.addEventListener('click', closeChangePwModal);
$('#change-pw-modal')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) closeChangePwModal(); });
$('#change-pw-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.currentTarget;
  const submitBtn = $('#change-pw-submit');
  if (submitBtn.disabled) return;
  const body = {
    currentPassword: f.currentPassword.value,
    newPassword: f.newPassword.value,
  };
  submitBtn.disabled = true;
  const oldText = submitBtn.textContent;
  submitBtn.textContent = '提交中…';
  try {
    const r = await api('/api/auth/change-password', { method: 'POST', body: JSON.stringify(body) });
    closeChangePwModal();
    toast(r.message || '密码已更新', 'ok', 3000);
  } catch (err) {
    if (err.code === 'INVALID_CURRENT_PASSWORD') {
      f.currentPassword.focus();
      f.currentPassword.classList.add('input-error');
      setTimeout(() => f.currentPassword.classList.remove('input-error'), 1500);
    }
    toast(err.message || '修改失败', 'err');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = oldText;
  }
});

function toast(msg, type = 'ok', durationMs = 1800) {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('show'), 10);
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 200); }, durationMs);
}

$('#new-key-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const submitBtn = $('#btn-submit-new-key');
  if (submitBtn.disabled) return;
  const fd = new FormData(e.target);
  const mode = e.target.dataset.mode;
  let meta = null;
  const m = fd.get('meta');
  if (m && m.trim()) {
    try { meta = JSON.parse(m); }
    catch { toast('Meta 必须是合法 JSON', 'err'); return; }
  }
  const expiresAt = fd.get('expiresAt') ? new Date(fd.get('expiresAt')).toISOString() : null;
  const body = { name: fd.get('name'), meta, expiresAt };

  // owner
  const owner = (fd.get('owner') || '').toString().trim();
  if (owner) body.owner = owner;
  // 归属账号
  const ownerUid = (fd.get('ownerUserId') || '').toString().trim();
  if (ownerUid) body.ownerUserId = parseInt(ownerUid, 10);
  // tags: 来自 tag-picker 的 hidden（JSON 数组）
  let tags = [];
  try {
    const raw = (fd.get('tags') || '[]').toString();
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) tags = arr.map(s => String(s).trim()).filter(Boolean);
  } catch (_) { tags = []; }
  if (tags.length) body.tags = tags;

  // 两个模式各自的字段
  if (mode === 'import') {
    body.mode = 'import';
    body.plain = fd.get('plain') || '';
    const customPrefix = (fd.get('importPrefix') || '').toString().trim();
    if (customPrefix) body.prefix = customPrefix;
  } else {
    body.prefix = (fd.get('generatePrefix') || '').toString().trim() || 'sk_live';
  }

  submitBtn.disabled = true;
  const oldText = submitBtn.textContent;
  submitBtn.textContent = mode === 'import' ? '导入中…' : '创建中…';
  try {
    const data = await api('/api/keys', { method: 'POST', body: JSON.stringify(body) });
    closeModal();
    if (mode === 'import') {
      $('#new-key-banner').hidden = true;
      // 导入模式没有明文，不写缓存
      toast(`已导入 key #${data.id}`, 'ok');
    } else {
      $('#new-key-plain').textContent = data.key;
      $('#new-key-banner').hidden = false;
      rememberPlain(data.id, data.key);
      const ok = await copyText(data.key);
      toast(ok ? 'Key 已创建并复制到剪贴板' : 'Key 已创建，请点击横幅里的"复制"', ok ? 'ok' : 'warn');
    }
    loadKeys();
  } catch (err) {
    const tag = err.status ? `[${err.status}${err.code ? ' ' + err.code : ''}] ` : '';
    toast(tag + (err.message || '操作失败'), 'err');
    // 字段级错误时回填到对应输入框
    if (err.field) {
      const fieldName = err.field === 'prefix' ? (mode === 'import' ? 'importPrefix' : 'generatePrefix') : err.field;
      const el = $(`#new-key-form [name="${fieldName}"]`);
      if (el) { el.focus(); el.classList.add('input-error'); setTimeout(() => el.classList.remove('input-error'), 1500); }
    }
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = oldText;
  }
});

// Logs
$('#log-filter').addEventListener('change', loadLogs);

async function loadLogs() {
  const tbody = $('#logs-tbody');
  if (!tbody) return;
  if (currentUser && currentUser.role === 'viewer') {
    tbody.innerHTML = '<tr><td colspan="7"><div class="empty">当前角色无权查看验证日志。</div></td></tr>';
    const cnt = $('#logs-count');
    if (cnt) cnt.textContent = '（无权限）';
    return;
  }

  const result = $('#log-filter').value;
  const qs = result ? `?result=${result}` : '';
  try {
    const { items } = await api('/api/logs' + qs);
    tbody.innerHTML = items.map(l => `
    <tr>
      <td data-label="时间">${fmtTime(l.created_at)}</td>
      <td data-label="结果"><span class="badge ${l.result}">${l.result}</span></td>
      <td data-label="原因" class="truncate">${escapeHtml(l.reason || '-')}</td>
      <td data-label="前缀" data-col="prefix"><code>${escapeHtml(l.key_masked || '-')}</code></td>
      <td data-label="IP" data-col="ip" style="white-space:nowrap;">${escapeHtml(l.ip || '-')}</td>
      <td data-label="UA" class="truncate" title="${escapeHtml(l.user_agent || '')}">${escapeHtml(l.user_agent || '-')}</td>
      <td data-label="耗时(ms)" class="num">${l.duration_ms != null ? l.duration_ms.toFixed(2) : '-'}</td>
    </tr>
  `).join('');
    // 计数
    const cnt = $('#logs-count');
    if (cnt) {
      const total = items.length;
      cnt.textContent = total === 0 ? '（空）' : `共 ${total} 条`;
    }
    if (!items.length) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty empty--log">还没有验证日志</div></td></tr>`;
      return;
    }
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty">日志加载失败：${escapeHtml(e.message)}</div></td></tr>`;
    const cnt = $('#logs-count');
    if (cnt) cnt.textContent = '（加载失败）';
  }
}

// ===== 验证统计面板 =====
// viewer 看不到 logs（后端 requireRole('operator')），这里按角色隐藏面板
const statsDaysEl = $('#stats-days');
const statsRefreshBtn = $('#btn-refresh-stats');
if (statsDaysEl) statsDaysEl.addEventListener('change', loadStats);
if (statsRefreshBtn) statsRefreshBtn.addEventListener('click', loadStats);

async function loadStats() {
  const panel = $('#logs-stats-panel');
  if (!panel) return;
  // viewer 无权访问 /api/logs/*，直接隐藏面板，不发请求
  if (currentUser && currentUser.role === 'viewer') { panel.hidden = true; return; }
  panel.hidden = false;

  const days = statsDaysEl ? statsDaysEl.value : '7';
  let data;
  try {
    data = await api(`/api/logs/stats?days=${encodeURIComponent(days)}`);
  } catch (e) {
    const overview = panel.querySelector('.stats-overview');
    if (overview) overview.style.opacity = '.5';
    ['#stat-total', '#stat-ok', '#stat-fail', '#stat-rate'].forEach(sel => { const el = $(sel); if (el) el.textContent = '—'; });
    ['#stat-ok-sub', '#stat-fail-sub', '#stat-rate-sub', '#stat-range-sub'].forEach(sel => { const el = $(sel); if (el) el.textContent = ''; });
    renderStatsChart([]);
    renderStatsReasons([{ label: '统计加载失败', count: 1, severity: 'warn', explain: e.message || '请稍后重试', fixes: ['确认当前账号权限', '检查服务端日志或刷新页面重试'] }]);
    renderStatsList('#stats-top-keys', [], () => ({}));
    renderStatsList('#stats-top-ips', [], () => ({}));
    return;
  }
  const overview = panel.querySelector('.stats-overview');
  if (overview) overview.style.opacity = '';

  // 概览卡
  const t = { ok: 0, fail: 0, total: 0, successRate: null, ...(data.totals || {}) };
  const range = { days, ...(data.range || {}) };
  const topKeys = Array.isArray(data.topKeys) ? data.topKeys : [];
  const topIps = Array.isArray(data.topIps) ? data.topIps : [];
  $('#stat-total').textContent = t.total;
  $('#stat-ok').textContent = t.ok;
  $('#stat-fail').textContent = t.fail;
  $('#stat-rate').textContent = t.successRate == null ? '—' : t.successRate + '%';
  const pct = (n) => t.total ? ((n / t.total * 100).toFixed(1) + '%') : '—';
  $('#stat-ok-sub').textContent = t.total ? `占 ${pct(t.ok)}` : '';
  $('#stat-fail-sub').textContent = t.total ? `占 ${pct(t.fail)}` : '';
  $('#stat-rate-sub').textContent = `${range.days} 天内`;
  $('#stat-range-sub').textContent = `${range.days} 天`;

  renderStatsChart(Array.isArray(data.byDay) ? data.byDay : []);
  renderStatsReasons(Array.isArray(data.topReasons) ? data.topReasons : []);
  renderStatsList('#stats-top-keys', topKeys.slice(0, 5), (k) => ({
    main: escapeHtml(k.name || '(已删除)') + (k.deleted ? ' <span class="muted">已删</span>' : ''),
    sub: `<code>${escapeHtml(k.prefix || '-')}</code> · ${k.total} 次（失败 ${k.fail}）`,
    failRate: k.total ? k.fail / k.total : 0,
  }));
  renderStatsList('#stats-top-ips', topIps.slice(0, 5), (ip) => ({
    main: escapeHtml(ip.ip),
    sub: `${ip.total} 次（失败 ${ip.fail}）`,
    failRate: ip.total ? ip.fail / ip.total : 0,
  }));
}

// 每日趋势：纯 div 柱状图（ok / fail 双柱，无依赖）
function renderStatsChart(byDay) {
  const el = $('#stats-chart');
  if (!el) return;
  if (!byDay || !byDay.length) { el.innerHTML = '<span class="muted">无数据</span>'; return; }
  const max = Math.max(1, ...byDay.map(d => Math.max(d.ok, d.fail)));
  const bars = byDay.map(d => {
    const okH = (d.ok / max * 100).toFixed(1);
    const failH = (d.fail / max * 100).toFixed(1);
    const label = d.date.slice(5); // MM-DD
    const title = `${d.date}\n成功 ${d.ok} · 失败 ${d.fail}`;
    return `<div class="bar-col" title="${escapeHtml(title)}">
      <div class="bar-stack">
        <div class="bar bar-fail" style="height:${failH}%"></div>
        <div class="bar bar-ok" style="height:${okH}%"></div>
      </div>
      <span class="bar-label">${label}</span>
    </div>`;
  }).join('');
  el.innerHTML = bars;
}

function renderStatsReasons(reasons) {
  const el = $('#stats-reasons');
  if (!el) return;
  if (!reasons || !reasons.length) { el.innerHTML = '<li class="muted">没有失败记录 🎉</li>'; return; }
  const max = Math.max(1, ...reasons.map(r => r.count));
  el.innerHTML = reasons.slice(0, 6).map(r => {
    const w = (r.count / max * 100).toFixed(1);
    const sev = r.severity || 'info';
    const fixes = (r.fixes || []).map(f => `<li>${escapeHtml(f)}</li>`).join('');
    return `<li class="reason-item reason-${sev}">
      <div class="reason-row">
        <span class="reason-label">${escapeHtml(r.label || r.reason)}</span>
        <span class="reason-count">${r.count}</span>
      </div>
      <div class="reason-bar"><div class="reason-bar-fill" style="width:${w}%"></div></div>
      ${r.explain ? `<p class="reason-explain">${escapeHtml(r.explain)}</p>` : ''}
      ${fixes ? `<ul class="reason-fixes">${fixes}</ul>` : ''}
    </li>`;
  }).join('');
}

function renderStatsList(selector, items, mapFn) {
  const el = $(selector);
  if (!el) return;
  if (!items || !items.length) { el.innerHTML = '<li class="muted">无数据</li>'; return; }
  el.innerHTML = items.map(it => {
    const m = mapFn(it);
    const riskClass = m.failRate > 0.5 ? 'risk-high' : m.failRate > 0.2 ? 'risk-mid' : '';
    return `<li class="list-item ${riskClass}">
      <div class="list-main">${m.main}</div>
      <div class="list-sub">${m.sub}</div>
    </li>`;
  }).join('');
}

(async function init() {
  await loadCurrentUser();
  if (!currentUser) { location.href = '/login'; return; }
  await loadUsers();
  populateAccountSelects();
  $('#me').textContent = `${currentUser.username}（${currentUser.role}）`;
  const avatar = $('#me-avatar');
  if (avatar) avatar.textContent = (currentUser.displayName || currentUser.username).charAt(0).toUpperCase();
  // 非 admin 隐藏「+ 新建子账号」按钮；viewer 只读，隐藏写入口
  const newAcctBtn = $('#btn-new-account');
  if (newAcctBtn) {
    newAcctBtn.style.display = currentUser.role === 'admin' ? '' : 'none';
  }
  const readonly = !canWrite();
  [['#btn-new-key', '当前角色为只读，不能新建 Key'], ['#btn-new-var', '当前角色为只读，不能新建变量']].forEach(([sel, title]) => {
    const btn = $(sel);
    if (btn) { btn.disabled = readonly; btn.title = readonly ? title : ''; }
  });
  loadKeys();
  loadVariables();
  // 首次进首页时不主动拉 accounts（懒加载：切到 tab 时再拉）
})();

// ============== 变量库 ==============
let allVariables = [];
let allGroups = [];     // 分组名清单（含每组计数），管理 UI 渲染用
let editingVarId = null;
let varSearchTerm = '';
let varGroupFilter = ''; // '' = 全部；'__null__' = 未分组；其他 = 分组名

async function loadVariables() {
  const tbody = $('#vars-tbody');
  if (!tbody) return;
  try {
    // 拉分组清单（用于 filter / 分组选择器）
    try {
      const rg = await api('/api/variables/groups');
      allGroups = rg.items || [];
    } catch (_) { allGroups = []; }
    renderGroupFilter();
    // 同步触发一次「分组选择器」的列表渲染（如果它的面板当前是开着的）
    if ($('#var-group-panel') && !$('#var-group-panel').hidden) renderGroupPickerList();

    // 拉变量列表（带分组过滤）
    const qs = varGroupFilter ? `?group=${encodeURIComponent(varGroupFilter)}` : '';
    const { items } = await api('/api/variables' + qs);
    allVariables = items || [];
    renderVariables();
    const cnt = $('#vars-count');
    if (cnt) {
      const total = allVariables.length;
      cnt.textContent = total === 0 ? '（空）' : `共 ${total} 个`;
    }
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty">加载失败：${escapeHtml(e.message)}</div></td></tr>`;
  }
}

// ============== 变量分组选择器（替代原生的 <datalist>） ==============
const GROUP_PICKER_NONE = '不分组';
function setGroupPickerValue(value) {
  const hidden = $('#var-group-hidden');
  const label = $('#var-group-trigger-label');
  if (!hidden || !label) return;
  const v = (value || '').trim();
  hidden.value = v;
  label.textContent = v || GROUP_PICKER_NONE;
  label.style.fontStyle = v ? 'normal' : 'italic';
  label.style.color = v ? '' : 'var(--muted)';
  // 同步搜索框
  const search = $('#var-group-search');
  if (search && document.activeElement !== search) search.value = v;
}
function ensureGroupPickerItems() {
  // 打开下拉时调用，确保已加载分组
  if (typeof allGroups === 'undefined' || !allGroups.length) {
    // 同步拉一次（不能 await — 渲染先空着，等数据回来再补）
    api('/api/variables/groups').then(rg => {
      allGroups = rg.items || [];
      if (!$('#var-group-panel').hidden) renderGroupPickerList();
    }).catch(() => { allGroups = []; });
  }
}
function renderGroupPickerList() {
  const list = $('#var-group-list');
  if (!list) return;
  const search = $('#var-group-search');
  const term = (search?.value || '').trim().toLowerCase();
  const current = ($('#var-group-hidden')?.value || '').trim();
  const groups = (allGroups || []).slice().sort((a, b) => a.name.localeCompare(b.name));

  const items = [];
  // 1) "不分组"
  items.push(`
    <div class="group-picker-item is-none ${current === '' ? 'is-selected' : ''}" data-value="" role="option" aria-selected="${current === ''}">
      <span class="group-picker-item-name">不分组</span>
    </div>
  `);
  // 2) 已有分组（按搜索词过滤）
  const filtered = term
    ? groups.filter(g => g.name.toLowerCase().includes(term))
    : groups;
  for (const g of filtered) {
    items.push(`
      <div class="group-picker-item ${g.name === current ? 'is-selected' : ''}" data-value="${escapeHtml(g.name)}" role="option" aria-selected="${g.name === current}">
        <span class="group-picker-item-name">${escapeHtml(g.name)}</span>
        <span class="group-picker-item-count">${g.count}</span>
      </div>
    `);
  }
  // 3) 如果搜索词不为空且没有完全匹配，追加"创建"项
  if (term) {
    const exact = groups.find(g => g.name.toLowerCase() === term);
    if (!exact) {
      items.push(`
        <div class="group-picker-item is-create" data-value="${escapeHtml(search.value.trim())}" role="option">
          <span class="group-picker-item-name">✚ 新建分组「${escapeHtml(search.value.trim())}」</span>
        </div>
      `);
    }
  }
  if (items.length === 1) {
    items.push(`<div class="group-picker-empty">无匹配分组。输入 2~64 字符的名称按 Enter 直接新建。</div>`);
  }
  list.innerHTML = items.join('');
  // 绑定点击事件（事件委托）
  list.onclick = (e) => {
    const item = e.target.closest('.group-picker-item');
    if (!item) return;
    setGroupPickerValue(item.dataset.value || '');
    closeGroupPicker();
  };
}
function openGroupPicker() {
  const panel = $('#var-group-panel');
  const trigger = $('#var-group-trigger');
  if (!panel || !trigger) return;
  panel.hidden = false;
  trigger.setAttribute('aria-expanded', 'true');
  ensureGroupPickerItems();
  renderGroupPickerList();
  // 浮层定位（避开父级 overflow:auto 裁切，比如 modal-card 的滚动容器）
  positionPickerPanel(panel, trigger);
  // 自动聚焦搜索框 + 选中现有值
  const search = $('#var-group-search');
  if (search) {
    search.value = $('#var-group-hidden')?.value || '';
    setTimeout(() => { search.focus(); search.select(); }, 10);
  }
}
function closeGroupPicker() {
  const panel = $('#var-group-panel');
  const trigger = $('#var-group-trigger');
  if (!panel || !trigger) return;
  panel.hidden = true;
  trigger.setAttribute('aria-expanded', 'false');
  // 浮层关闭时清掉 fixed 定位的 inline 样式 + 类，恢复普通 absolute 定位
  panel.classList.remove('picker-floating');
  panel.style.position = '';
  panel.style.top = '';
  panel.style.left = '';
  panel.style.width = '';
  panel.style.maxHeight = '';
  // 关闭时如有未提交输入，回退到 hidden 的当前值
  const hidden = $('#var-group-hidden');
  const search = $('#var-group-search');
  if (search && hidden) search.value = hidden.value;
}
function toggleGroupPicker() {
  const panel = $('#var-group-panel');
  if (!panel) return;
  if (panel.hidden) openGroupPicker();
  else closeGroupPicker();
}

// ============== Owner Picker（单选，复用 group-picker 视觉，2 个实例：new/edit） ==============
// 全局 owner 列表缓存：每次 loadKeys 时刷一次
let allKeyOwners = []; // [{ name, count }]

function setOwnerPickerValue(pfx, value) {
  const hidden = $(`#key-owner-${pfx}-hidden`);
  const label = $(`#key-owner-${pfx}-trigger-label`);
  if (!hidden || !label) return;
  const v = (value || '').trim();
  hidden.value = v;
  label.textContent = v || '（未指定）';
  label.style.fontStyle = v ? 'normal' : 'italic';
  label.style.color = v ? '' : 'var(--muted)';
  const search = $(`#key-owner-${pfx}-search`);
  if (search && document.activeElement !== search) search.value = v;
}

function ensureOwnerPickerItems(pfx) {
  // 打开下拉时调用，确保已加载
  if (!allKeyOwners.length) {
    api('/api/keys/owners').then(r => {
      allKeyOwners = r.items || [];
      const panel = $(`#key-owner-${pfx}-panel`);
      if (panel && !panel.hidden) renderOwnerPickerList(pfx);
    }).catch(() => { allKeyOwners = []; });
  }
}

function renderOwnerPickerList(pfx) {
  const list = $(`#key-owner-${pfx}-list`);
  if (!list) return;
  const search = $(`#key-owner-${pfx}-search`);
  const term = (search?.value || '').trim();
  const current = ($(`#key-owner-${pfx}-hidden`)?.value || '').trim();
  const owners = (allKeyOwners || []).slice().sort((a, b) => a.name.localeCompare(b.name));

  const items = [];
  // 1) "未指定" 选项
  items.push(`
    <div class="group-picker-item is-none ${current === '' ? 'is-selected' : ''}" data-value="" role="option" aria-selected="${current === ''}">
      <span class="group-picker-item-name">（未指定）</span>
    </div>
  `);
  // 2) 已有 owner（按搜索词过滤）
  const filtered = term
    ? owners.filter(o => o.name.toLowerCase().includes(term.toLowerCase()))
    : owners;
  for (const o of filtered) {
    items.push(`
      <div class="group-picker-item ${o.name === current ? 'is-selected' : ''}" data-value="${escapeHtml(o.name)}" role="option" aria-selected="${o.name === current}">
        <span class="group-picker-item-name">${escapeHtml(o.name)}</span>
        <span class="group-picker-item-count">${o.count}</span>
      </div>
    `);
  }
  // 3) 搜索词不为空且不等于已有 owner → 追加"创建"项
  if (term) {
    const exact = owners.find(o => o.name.toLowerCase() === term.toLowerCase());
    if (!exact && term.length <= 64) {
      items.push(`
        <div class="group-picker-item is-create" data-value="${escapeHtml(term)}" role="option">
          <span class="group-picker-item-name">✚ 新建 owner「${escapeHtml(term)}」</span>
        </div>
      `);
    } else if (term.length > 64) {
      items.push(`<div class="group-picker-empty">owner 最长 64 字符</div>`);
    }
  }
  if (items.length === 1) {
    items.push(`<div class="group-picker-empty">无匹配 owner，直接输入名称按 Enter 即用</div>`);
  }
  list.innerHTML = items.join('');
  // 事件委托
  list.onclick = (e) => {
    const item = e.target.closest('.group-picker-item');
    if (!item) return;
    setOwnerPickerValue(pfx, item.dataset.value || '');
    closeOwnerPicker(pfx);
  };
}

function openOwnerPicker(pfx) {
  const panel = $(`#key-owner-${pfx}-panel`);
  const trigger = $(`#key-owner-${pfx}-trigger`);
  if (!panel || !trigger) return;
  panel.hidden = false;
  trigger.setAttribute('aria-expanded', 'true');
  ensureOwnerPickerItems(pfx);
  renderOwnerPickerList(pfx);
  // 浮层定位（避开父级 overflow:auto 裁切，比如 modal-card 的滚动容器）
  positionPickerPanel(panel, trigger);
  const search = $(`#key-owner-${pfx}-search`);
  if (search) {
    search.value = $(`#key-owner-${pfx}-hidden`)?.value || '';
    setTimeout(() => { search.focus(); search.select(); }, 10);
  }
}
function closeOwnerPicker(pfx) {
  const panel = $(`#key-owner-${pfx}-panel`);
  const trigger = $(`#key-owner-${pfx}-trigger`);
  if (!panel || !trigger) return;
  panel.hidden = true;
  trigger.setAttribute('aria-expanded', 'false');
  // 浮层关闭时清掉 fixed 定位的 inline 样式 + 类
  panel.classList.remove('picker-floating');
  panel.style.position = '';
  panel.style.top = '';
  panel.style.left = '';
  panel.style.width = '';
  panel.style.maxHeight = '';
  const hidden = $(`#key-owner-${pfx}-hidden`);
  const search = $(`#key-owner-${pfx}-search`);
  if (search && hidden) search.value = hidden.value;
}
function toggleOwnerPicker(pfx) {
  const panel = $(`#key-owner-${pfx}-panel`);
  if (!panel) return;
  if (panel.hidden) openOwnerPicker(pfx);
  else closeOwnerPicker(pfx);
}

// 初始化某个 pfx 的 owner picker 事件
function initOwnerPickerEvents(pfx) {
  $(`#key-owner-${pfx}-trigger`)?.addEventListener('click', (e) => { e.stopPropagation(); toggleOwnerPicker(pfx); });
  $(`#key-owner-${pfx}-search`)?.addEventListener('input', () => renderOwnerPickerList(pfx));
  $(`#key-owner-${pfx}-search`)?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const v = $(`#key-owner-${pfx}-search`).value.trim();
      if (v && v.length > 64) { toast('owner 最长 64 字符', 'err'); return; }
      setOwnerPickerValue(pfx, v);
      closeOwnerPicker(pfx);
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      closeOwnerPicker(pfx);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const items = Array.from(document.querySelectorAll(`#key-owner-${pfx}-list .group-picker-item`));
      if (!items.length) return;
      const cur = items.findIndex(it => it.classList.contains('is-active'));
      let next = e.key === 'ArrowDown' ? cur + 1 : cur - 1;
      if (next < 0) next = items.length - 1;
      if (next >= items.length) next = 0;
      items.forEach(it => it.classList.remove('is-active'));
      items[next].classList.add('is-active');
      items[next].scrollIntoView({ block: 'nearest' });
    }
  });
  $(`#key-owner-${pfx}-clear`)?.addEventListener('click', (e) => {
    e.stopPropagation();
    setOwnerPickerValue(pfx, '');
    renderOwnerPickerList(pfx);
    $(`#key-owner-${pfx}-search`)?.focus();
  });
}

// 初始化 new + edit 两个实例
initOwnerPickerEvents('new');
initOwnerPickerEvents('edit');

// 点击页面其他地方关闭所有 owner picker 下拉
document.addEventListener('mousedown', (e) => {
  ['new', 'edit'].forEach(pfx => {
    const panel = $(`#key-owner-${pfx}-panel`);
    if (!panel || panel.hidden) return;
    if (e.target.closest(`#key-owner-${pfx}-picker`)) return;
    closeOwnerPicker(pfx);
  });
});

// ============== Tag Picker（多选 chip 风格，分组选择器视觉风格一致） ==============
// 与后端 TAG_NAME_RE /api/keys/tags 一致：1~32 字符 [A-Za-z0-9_.\-]
const TAG_PICKER_RE = /^[A-Za-z0-9_.\-]{1,32}$/;

// allTagsTags 全局缓存：每次 loadKeys 时刷一次
let allKeyTags = []; // [{ name, count }]

function renderTagPickerChips(pfx, selected) {
  const field = $(`#tag-picker-${pfx}-field`);
  if (!field) return;
  // 保留 input
  const input = $(`#tag-picker-${pfx}-input`, field);
  // 移除所有 chip + 占位符
  $$('.tag-chip, .tag-picker-empty', field).forEach(el => el.remove());
  if (!selected.length) {
    const empty = document.createElement('span');
    empty.className = 'tag-picker-empty';
    empty.textContent = '（点击下方输入或从已有标签选择）';
    field.insertBefore(empty, input);
  } else {
    for (const t of selected) {
      const chip = document.createElement('span');
      chip.className = 'tag-chip';
      chip.innerHTML = `${escapeHtml(t)}<button type="button" class="tag-chip-x" aria-label="移除">×</button>`;
      chip.querySelector('.tag-chip-x').addEventListener('click', (e) => {
        e.stopPropagation();
        const cur = readTagPickerSelected(pfx);
        const next = cur.filter(x => x !== t);
        writeTagPickerSelected(pfx, next);
        renderTagPickerChips(pfx, next);
        renderTagPickerList(pfx);
      });
      field.insertBefore(chip, input);
    }
  }
}

function renderTagPickerList(pfx) {
  const list = $(`#tag-picker-${pfx}-list`);
  const input = $(`#tag-picker-${pfx}-input`);
  if (!list) return;
  const term = (input?.value || '').trim();
  const selected = readTagPickerSelected(pfx);
  const selSet = new Set(selected);
  // 已有 tag 列表（已存在），过滤掉已选的、按搜索词过滤
  const existing = (allKeyTags || []).slice().sort((a, b) => a.name.localeCompare(b.name));
  const items = [];
  for (const t of existing) {
    if (selSet.has(t.name)) continue; // 已选的不在下拉里展示
    if (term && !t.name.toLowerCase().includes(term.toLowerCase())) continue;
    items.push(`
      <div class="group-picker-item" data-tag-pick="${escapeHtml(t.name)}" role="option">
        <span class="group-picker-item-name">${escapeHtml(t.name)}</span>
        <span class="group-picker-item-count">${t.count}</span>
      </div>
    `);
  }
  // 搜索词不空且不是已存在 tag → 提供"新建"
  if (term) {
    const valid = TAG_PICKER_RE.test(term);
    if (valid && !selSet.has(term) && !existing.find(x => x.name.toLowerCase() === term.toLowerCase())) {
      items.push(`
        <div class="group-picker-item is-create" data-tag-pick="${escapeHtml(term)}" data-tag-new="1" role="option">
          <span class="group-picker-item-name">✚ 新建标签「${escapeHtml(term)}」</span>
        </div>
      `);
    }
  }
  if (!items.length) {
    items.push(`<div class="group-picker-empty">${term ? '（无匹配标签，按 Enter 添加）' : '（还没有标签，输入名称回车创建）'}</div>`);
  }
  list.innerHTML = items.join('');
  // 事件委托
  list.onclick = (e) => {
    const item = e.target.closest('[data-tag-pick]');
    if (!item) return;
    const v = item.dataset.tagPick;
    if (TAG_PICKER_RE.test(v) && !readTagPickerSelected(pfx).includes(v)) {
      const next = [...readTagPickerSelected(pfx), v];
      writeTagPickerSelected(pfx, next);
      renderTagPickerChips(pfx, next);
      // 选完后清空搜索框，焦点回到 input
      if (input) input.value = '';
      renderTagPickerList(pfx);
    }
  };
}

function readTagPickerSelected(pfx) {
  const hidden = $(`#tag-picker-${pfx}-hidden`);
  if (!hidden) return [];
  try {
    const v = JSON.parse(hidden.value || '[]');
    return Array.isArray(v) ? v : [];
  } catch { return []; }
}
function writeTagPickerSelected(pfx, arr) {
  const hidden = $(`#tag-picker-${pfx}-hidden`);
  if (hidden) hidden.value = JSON.stringify(arr);
}

function openTagPickerPanel(pfx) {
  const panel = $(`#tag-picker-${pfx}-panel`);
  if (panel) {
    panel.hidden = false;
    // 拉一次 tags 列表
    if (!allKeyTags.length) {
      api('/api/keys/tags').then(r => {
        allKeyTags = r.items || [];
        if (!panel.hidden) renderTagPickerList(pfx);
      }).catch(() => { allKeyTags = []; });
    }
    renderTagPickerList(pfx);
    // 浮层定位：fixed 定位避免被 modal-card 的 overflow:auto 裁切
    const trigger = $(`#tag-picker-${pfx}-trigger`) || $(`#tag-picker-${pfx}-field`);
    positionPickerPanel(panel, trigger);
    setTimeout(() => $(`#tag-picker-${pfx}-input`)?.focus(), 10);
  }
}
function closeTagPickerPanel(pfx) {
  const panel = $(`#tag-picker-${pfx}-panel`);
  if (!panel) return;
  panel.hidden = true;
  // 浮层关闭时清掉 fixed 定位的 inline 样式 + 类
  panel.classList.remove('picker-floating');
  panel.style.position = '';
  panel.style.top = '';
  panel.style.left = '';
  panel.style.width = '';
  panel.style.maxHeight = '';
}

/**
 * 初始化 / 重新初始化 tag picker。
 * 每次弹窗打开都调用一次（避免切换 key 时残留旧值）。
 */
function initTagPicker(pfx, initial = []) {
  const input = $(`#tag-picker-${pfx}-input`);
  const panel = $(`#tag-picker-${pfx}-panel`);
  const field = $(`#tag-picker-${pfx}-field`);
  if (!input || !panel || !field) return;
  // 重置值
  writeTagPickerSelected(pfx, initial.slice());
  if (input.value) input.value = '';
  renderTagPickerChips(pfx, initial);
  // 关闭下拉（如果开着的）
  panel.hidden = true;
  // 拆掉旧的 input 事件监听：直接用 flag 即可（oninput 重新绑定）
  input.oninput = () => {
    if (panel.hidden) panel.hidden = false;
    renderTagPickerList(pfx);
  };
  input.onkeydown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const term = input.value.trim();
      if (!term) return;
      if (!TAG_PICKER_RE.test(term)) {
        toast('tag 必须是 1~32 字符 [A-Za-z0-9_.-]', 'err');
        return;
      }
      const cur = readTagPickerSelected(pfx);
      if (cur.includes(term)) return; // 去重
      const next = [...cur, term];
      writeTagPickerSelected(pfx, next);
      input.value = '';
      renderTagPickerChips(pfx, next);
      renderTagPickerList(pfx);
    } else if (e.key === 'Backspace' && !input.value) {
      // 空输入时按 Backspace 删最后一个 chip
      const cur = readTagPickerSelected(pfx);
      if (cur.length) {
        const next = cur.slice(0, -1);
        writeTagPickerSelected(pfx, next);
        renderTagPickerChips(pfx, next);
        renderTagPickerList(pfx);
      }
    } else if (e.key === 'Escape') {
      // 阻止冒泡到外层 modal 关闭
      if (!panel.hidden) { e.stopPropagation(); closeTagPickerPanel(pfx); }
    }
  };
  // 点击 field 时聚焦 input
  field.onclick = (e) => {
    if (e.target.closest('.tag-chip')) return; // 点 chip 上的 × 不抢焦点
    input.focus();
  };
  field.querySelector('.tag-picker-input')?.addEventListener('focus', () => {
    if (panel.hidden) openTagPickerPanel(pfx);
  });
}

// 全局：点击页面其他地方关闭所有 tag picker
document.addEventListener('mousedown', (e) => {
  ['new', 'edit'].forEach(pfx => {
    const panel = $(`#tag-picker-${pfx}-panel`);
    if (!panel || panel.hidden) return;
    if (e.target.closest(`#tag-picker-${pfx}`)) return;
    panel.hidden = true;
  });
});

function renderGroupFilter() {
  const sel = $('#var-group-filter');
  if (!sel) return;
  const cur = varGroupFilter;
  sel.innerHTML = '<option value="">全部分组</option>'
    + '<option value="__null__">（未分组）</option>'
    + (allGroups || []).map(g => `<option value="${escapeHtml(g.name)}">${escapeHtml(g.name)} (${g.count})</option>`).join('');
  sel.value = cur;
}

function renderTagFilter() {
  const sel = $('#key-tag-filter');
  if (!sel) return;
  // 多选模式：把当前值塞到 selected（逗号分隔）
  const current = (keyTagFilter || '').split(',').map(s => s.trim()).filter(Boolean);
  sel.innerHTML = '<option value="">全部 tag</option>'
    + (allKeyTags || []).map(g => `<option value="${escapeHtml(g.name)}">${escapeHtml(g.name)} (${g.count})</option>`).join('');
  // 选中当前
  Array.from(sel.options).forEach(o => { o.selected = current.includes(o.value); });
  // 保持 single 显示态：如果有多个，让首项显示为「多个」样式
  if (current.length > 1) {
    const first = sel.options[0];
    first.text = `全部 tag（已选 ${current.length} 个）`;
  } else {
    sel.options[0].text = '全部 tag';
  }
}

function renderOwnerFilter() {
  const sel = $('#key-owner-filter');
  if (!sel) return;
  const cur = keyOwnerFilter;
  sel.innerHTML = '<option value="">全部 owner</option>'
    + (allKeyOwners || []).map(o => `<option value="${escapeHtml(o.name)}">${escapeHtml(o.name)} (${o.count})</option>`).join('');
  // 如果当前 owner 不在列表里（可能是新建的），加一个特殊项
  if (cur && !(allKeyOwners || []).find(o => o.name === cur)) {
    sel.innerHTML += `<option value="${escapeHtml(cur)}">${escapeHtml(cur)}</option>`;
  }
  sel.value = cur;
}

function renderVariables() {
  const tbody = $('#vars-tbody');
  if (!tbody) return;
  const term = varSearchTerm.toLowerCase();
  const list = allVariables.filter(v => !term ||
    v.name.toLowerCase().includes(term) ||
    (v.description || '').toLowerCase().includes(term) ||
    (v.group || '').toLowerCase().includes(term));
  if (!list.length) {
    if (allVariables.length) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty empty--var">无匹配项</div></td></tr>`;
    } else {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty empty--var">
        <div>还没有变量</div>
        <button type="button" class="primary" data-act="empty-new-var"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>新建变量</button>
      </div></td></tr>`;
    }
    return;
  }
  tbody.innerHTML = list.map((v, i) => {
    const groupCell = v.group
      ? `<span class="badge ok" data-act="var-view-group" data-group="${escapeHtml(v.group)}" title="查看该分组下全部变量">${escapeHtml(v.group)}</span>`
      : '<span class="muted">—</span>';
    const descShort = v.description && v.description.length > 60 ? v.description.slice(0, 60) + '…' : (v.description || '');
    return `
    <tr>
      <td data-label="#"><b>${i + 1}</b></td>
      <td data-label="name"><div class="primary-name"><code>${escapeHtml(v.name)}</code></div></td>
      <td data-label="value" class="truncate" title="${escapeHtml(v.value)}"><code class="muted-code">${escapeHtml(v.value.length > 60 ? v.value.slice(0, 60) + '…' : v.value)}</code></td>
      <td data-label="分组">${groupCell}</td>
      <td data-label="描述" class="truncate" title="${escapeHtml(v.description || '')}">${descShort ? escapeHtml(descShort) : '<span class="muted">—</span>'}</td>
      <td data-label="更新时间" data-col="time">${fmtTime(v.updated_at)}</td>
      <td data-label="操作" class="actions-cell">
        <button class="ghost primary-act" data-act="var-copy" data-name="${escapeHtml(v.name)}" data-value="${escapeHtml(v.value)}" title="复制 value">${ICO.copy}</button>
        ${canWrite()
          ? `<button class="ghost" data-act="var-edit" data-id="${v.id}" data-name="${escapeHtml(v.name)}" data-value="${escapeHtml(v.value)}" data-desc="${escapeHtml(v.description || '')}" data-group="${escapeHtml(v.group || '')}" title="编辑">${ICO.edit}</button>
             <button class="ghost danger" data-act="var-del" data-id="${v.id}" data-name="${escapeHtml(v.name)}" title="删除">${ICO.del}</button>`
          : '<span class="muted">只读</span>'}
      </td>
    </tr>`;
  }).join('');
}

$('#var-search')?.addEventListener('input', debounce((e) => {
  varSearchTerm = e.target.value;
  renderVariables();
}, 150));

$('#var-group-filter')?.addEventListener('change', (e) => {
  varGroupFilter = e.target.value;
  loadVariables();
});

// 变量库一键清除筛选
$('#var-clear-filters')?.addEventListener('click', () => {
  varSearchTerm = '';
  varGroupFilter = '';
  const searchEl = $('#var-search');
  if (searchEl) searchEl.value = '';
  const groupEl = $('#var-group-filter');
  if (groupEl) groupEl.selectedIndex = 0;
  loadVariables();
  toast('已清除所有筛选', 'ok');
});

$('#btn-new-var')?.addEventListener('click', () => openVarModal(null));

function openVarModal(v) {
  if (!canWrite()) { toast('当前角色为只读，不能修改变量', 'warn'); return; }
  editingVarId = v ? v.id : null;
  $('#var-modal-title').textContent = v ? `编辑变量 #${v.id}` : '新建变量';
  $('#var-modal-sub').textContent = v
    ? '修改后所有持有有效 key 的业务服务会立即拿到新值。'
    : 'name 全局唯一，2~64 字符。';
  const f = $('#var-form');
  f.name.value = v ? v.name : '';
  f.value.value = v ? v.value : '';
  f.description.value = v ? (v.description || '') : '';
  // 分组：用新选择器（触发按钮 + 隐藏字段）
  setGroupPickerValue(v ? (v.group || '') : '');
  f.name.disabled = !!v; // 编辑时 name 不可改（避免破坏业务引用）
  $('#var-modal').hidden = false;
  setTimeout(() => f.name.focus(), 50);
}
function closeVarModal() { $('#var-modal').hidden = true; editingVarId = null; closeGroupPicker(); }
$('#btn-cancel-var')?.addEventListener('click', closeVarModal);
$('#var-modal-close')?.addEventListener('click', closeVarModal);
$('#var-modal')?.addEventListener('click', (e) => { if (e.target.id === 'var-modal') { closeVarModal(); } else if (!e.target.closest('.group-picker') && !e.target.closest('.group-picker-panel')) { closeGroupPicker(); } });

// 分组选择器：触发 / 搜索 / 清空 / 键盘
$('#var-group-trigger')?.addEventListener('click', (e) => { e.stopPropagation(); toggleGroupPicker(); });
$('#var-group-search')?.addEventListener('input', () => renderGroupPickerList());
$('#var-group-search')?.addEventListener('keydown', (e) => {
  // Enter：把搜索框里的文字作为最终值（可能是已有，也可能是新建）
  if (e.key === 'Enter') {
    e.preventDefault();
    const v = e.currentTarget.value.trim();
    setGroupPickerValue(v);
    closeGroupPicker();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    closeGroupPicker();
  } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    // 简单键盘导航：高亮第一个 / 最后一个
    e.preventDefault();
    const items = Array.from(document.querySelectorAll('#var-group-list .group-picker-item'));
    if (!items.length) return;
    const cur = items.findIndex(it => it.classList.contains('is-active'));
    items.forEach(it => it.classList.remove('is-active'));
    let next = cur;
    if (e.key === 'ArrowDown') next = (cur < 0 ? 0 : (cur + 1) % items.length);
    else                      next = (cur <= 0 ? items.length - 1 : cur - 1);
    items[next].classList.add('is-active');
    items[next].scrollIntoView({ block: 'nearest' });
  }
});
$('#var-group-clear')?.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  setGroupPickerValue('');
  renderGroupPickerList();
  $('#var-group-search')?.focus();
});
// 全局点击：点击 picker 外部时关闭
document.addEventListener('click', (e) => {
  if (!$('#var-modal') || $('#var-modal').hidden) return;
  if (!$('#var-group-panel') || $('#var-group-panel').hidden) return;
  if (e.target.closest('.group-picker')) return;
  closeGroupPicker();
});

$('#var-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.currentTarget;
  // 分组：优先用 hidden（提交时 picker 通常已关闭）；如果 picker 开着且搜索框有未提交输入，则用搜索框里的值
  let groupRaw = (f.group.value || '').trim();
  const panel = $('#var-group-panel');
  const search = $('#var-group-search');
  if (panel && !panel.hidden && search && search.value.trim()) {
    groupRaw = search.value.trim();
    setGroupPickerValue(groupRaw); // 同步到 hidden
  }
  const body = {
    name: f.name.value.trim(),
    value: f.value.value,
    description: f.description.value || null,
    group: groupRaw || null,
  };
  if (editingVarId) delete body.name; // 编辑时不改 name

  const submitBtn = $('#btn-submit-var');
  submitBtn.disabled = true;
  const oldText = submitBtn.textContent;
  submitBtn.textContent = editingVarId ? '保存中…' : '创建中…';
  try {
    if (editingVarId) {
      await api(`/api/variables/${editingVarId}`, { method: 'PATCH', body: JSON.stringify(body) });
      toast('变量已更新', 'ok');
    } else {
      await api('/api/variables', { method: 'POST', body: JSON.stringify(body) });
      toast('变量已创建', 'ok');
    }
    closeVarModal();
    loadVariables();
  } catch (err) {
    const tag = err.status ? `[${err.status}${err.code ? ' ' + err.code : ''}] ` : '';
    toast(tag + (err.message || '操作失败'), 'err');
    if (err.field) {
      const el = $(`#var-form [name="${err.field}"]`);
      if (el) { el.focus(); el.classList.add('input-error'); setTimeout(() => el.classList.remove('input-error'), 1500); }
    }
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = oldText;
  }
});

// 查看分组（弹窗展示该分组下所有 name/value 集合）
let currentGroupData = null; // { group, count, items }
async function openGroupModal(groupName) {
  $('#group-modal-title').textContent = groupName;
  $('#group-modal-body').innerHTML = '<div class="muted">加载中…</div>';
  $('#group-modal').hidden = false;
  try {
    const r = await api(`/api/variables/group/${encodeURIComponent(groupName)}`);
    currentGroupData = r;
    const body = $('#group-modal-body');
    if (!r.items || !r.items.length) {
      body.innerHTML = '<div class="empty">该分组为空。</div>';
      return;
    }
    body.innerHTML = `
      <table class="grid" style="font-size:13px;">
        <thead><tr><th>name</th><th>value</th><th>描述</th></tr></thead>
        <tbody>
          ${r.items.map(it => `
            <tr>
              <td><code>${escapeHtml(it.name)}</code></td>
              <td><code class="muted-code" style="word-break:break-all;">${escapeHtml(it.value)}</code></td>
              <td>${it.description ? escapeHtml(it.description) : '<span class="muted">-</span>'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <p class="muted" style="font-size:12px;margin:8px 0 0;">共 ${r.count} 个变量。业务侧用 <code class="inline">POST /v1/variables/group</code> 传 <code class="inline">{ "group": "${escapeHtml(r.group)}" }</code> 一次取走。</p>
    `;
  } catch (e) {
    $('#group-modal-body').innerHTML = `<div class="empty">加载失败：${escapeHtml(e.message)}</div>`;
  }
}
function closeGroupModal() { $('#group-modal').hidden = true; currentGroupData = null; }
$('#group-modal-cancel')?.addEventListener('click', closeGroupModal);
$('#group-modal-close')?.addEventListener('click', closeGroupModal);
$('#group-modal')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) closeGroupModal(); });
$('#group-modal-copy-json')?.addEventListener('click', async () => {
  if (!currentGroupData) return;
  const payload = currentGroupData.items.map(i => ({ name: i.name, value: i.value, description: i.description || null }));
  const ok = await copyText(JSON.stringify(payload, null, 2));
  toast(ok ? `已复制 ${payload.length} 项为 JSON` : '复制失败', ok ? 'ok' : 'err');
});

$('#vars-tbody')?.addEventListener('click', async (e) => {
  // 空状态：点击「新建变量」直接打开弹窗
  const emptyBtn = e.target.closest('[data-act="empty-new-var"]');
  if (emptyBtn) { openVarModal(); return; }
  // 分组徽标点击 → 打开分组查看
  const grp = e.target.closest('[data-act="var-view-group"]');
  if (grp) {
    openGroupModal(grp.dataset.group);
    return;
  }
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  const act = btn.dataset.act;
  if (act === 'var-copy') {
    const v = btn.dataset.value;
    const ok = await copyText(v);
    toast(ok ? `已复制 ${btn.dataset.name}` : '复制失败', ok ? 'ok' : 'err');
  } else if (act === 'var-edit') {
    openVarModal({
      id: btn.dataset.id,
      name: btn.dataset.name,
      value: btn.dataset.value,
      description: btn.dataset.desc,
      group: btn.dataset.group || '',
    });
  } else if (act === 'var-del') {
    if (!await appConfirm({
      title: '删除变量',
      message: `确定删除变量「${btn.dataset.name}」？\n\n业务侧将立即无法再取到该值，正在使用该变量的服务会立即 500。`,
      okText: '删除',
      danger: true,
    })) return;
    try {
      await api(`/api/variables/${btn.dataset.id}`, { method: 'DELETE' });
      toast('已删除', 'ok');
      loadVariables();
    } catch (err) { toast('删除失败：' + err.message, 'err'); }
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  // 只关「最上层」的可见 modal（按 DOM 顺序的后者覆盖在前）
  const visible = ['confirm-modal', 'reset-pw-modal', 'group-modal', 'var-modal', 'main-key-modal', 'edit-key-modal', 'new-key-modal', 'new-account-modal']
    .map(id => document.getElementById(id))
    .filter(el => el && !el.hidden);
  if (visible.length) {
    const top = visible[visible.length - 1];
    // confirm-modal 由它自己的 onCancel 收拾；这里只 hide
    if (top.id === 'confirm-modal') {
      // appConfirm 自己注册的 onEsc 会 resolve；这里不重复处理
      return;
    }
    if (top.id === 'var-modal') {
      closeVarModal();
      return;
    }
    top.hidden = true;
  }
});

// ============== 应用内确认弹窗（替代浏览器原生 confirm()） ==============
// 用法：
//   const ok = await appConfirm({ title: '...', message: '...', okText: '刷新', danger: true });
//   if (!ok) return;
//
// 设计要点（解决「点了没反应/卡死/黑屏」）：
//   1. 单一全局 Promise 状态：state = 'open' | 'closed'
//      避免多次关闭动作重复 resolve / 死锁
//   2. 关闭路径全部走 done()：点确认/取消/点背景/按 Esc/点 X —— 都保证只 resolve 一次
//   3. 抛错时也能 resolve(false)，调用方不至于永远 await
//   4. 同步 hide + 同步 resolve，避免任何 setTimeout / Promise 漏
//   5. 用 onClose 单 callback：调用方可挂一次性清理
//   6. 焦点落到确认按钮 + 自动回车 = 确认
//   7. 兜底：如果 DOM 缺失，立即 resolve(false)，绝不让 UI 卡死
function appConfirm(opts) {
  opts = opts || {};
  const title     = opts.title     || '确认操作';
  const message   = opts.message   || '';
  const okText    = opts.okText    || '确认';
  const cancelText= opts.cancelText|| '取消';
  const danger    = !!opts.danger;

  let pendingResolve = null;

  const promise = new Promise((resolve) => {
    pendingResolve = resolve;

    let state = 'open';
    function done(result) {
      if (state !== 'open') return;
      state = 'closed';
      // 先恢复 DOM
      try {
        m.hidden = true;
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
        m.removeEventListener('click', onBackdrop);
        document.removeEventListener('keydown', onEscCap, true);
        closeX && closeX.removeEventListener('click', onCancel);
      } catch (_) {}
      // 再 resolve
      try { resolve(result); } catch (_) {}
      pendingResolve = null;
    }

    const m = document.getElementById('confirm-modal');
    if (!m) {
      // DOM 都不在 —— 直接 resolve(false)，别让调用方死等
      console.warn('appConfirm: confirm-modal 不存在');
      pendingResolve = null;
      try { resolve(false); } catch (_) {}
      return;
    }
    const titleEl  = document.getElementById('confirm-title');
    const msgEl    = document.getElementById('confirm-message');
    const okBtn    = document.getElementById('confirm-ok');
    const cancelBtn= document.getElementById('confirm-cancel');
    const closeX   = m.querySelector('[data-confirm-close]');
    if (!titleEl || !msgEl || !okBtn || !cancelBtn) {
      console.warn('appConfirm: 必需元素缺失');
      pendingResolve = null;
      try { resolve(false); } catch (_) {}
      return;
    }

    // 写内容
    titleEl.textContent = title;
    msgEl.textContent   = message;
    okBtn.textContent   = okText;
    cancelBtn.textContent = cancelText;
    okBtn.className     = danger ? 'danger' : 'primary';

    // 显示
    m.hidden = false;

    const onOk     = () => done(true);
    const onCancel = () => done(false);
    const onBackdrop = (e) => {
      // 点模态背景关闭；点 modal-card 或其子元素不关
      // 用 closest 判断更稳
      if (e.target === m) done(false);
    };
    const onEscCap   = (e) => {
      if (e.key === 'Escape' && !m.hidden) {
        e.stopPropagation();
        done(false);
      }
    };

    // 绑定（capture 阶段确保比其它 keydown 早触发）
    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
    m.addEventListener('click', onBackdrop);
    document.addEventListener('keydown', onEscCap, true);
    if (closeX) closeX.addEventListener('click', onCancel);

    // 焦点放到确认按钮上，让 Enter 直接确认
    setTimeout(() => { try { okBtn.focus(); } catch (_) {} }, 0);
  });

  return promise;
}
function closeConfirmModal() {
  // 兼容旧调用 —— 同步 hide
  const m = document.getElementById('confirm-modal');
  if (m) m.hidden = true;
}

// ============== 编辑 Key 弹窗（name / owner / tags / 过期 / meta / 账号） ==============
let editingKeyId = null;
function openEditKeyModal(item) {
  editingKeyId = item.id;
  const f = $('#edit-key-form');
  f.name.value = item.name || '';
  // owner picker 用项的 owner 初始化
  setOwnerPickerValue('edit', item.owner || '');
  f.expiresAt.value = item.expires_at ? item.expires_at.slice(0, 16) : '';
  f.meta.value = item.meta ? JSON.stringify(item.meta, null, 2) : '';
  // tag picker 用项的 tags 初始化
  initTagPicker('edit', item.tags || []);
  // 拉一次 owner + tag 缓存
  api('/api/keys/owners').then(r => { allKeyOwners = r.items || []; }).catch(() => { allKeyOwners = []; });
  api('/api/keys/tags').then(r => { allKeyTags = r.items || []; }).catch(() => { allKeyTags = []; });
  // 归属账号：默认选中 item.ownerUserId
  const sel = f.ownerUserId;
  if (sel) {
    populateAccountSelects();
    if (item.ownerUserId != null) {
      sel.value = String(item.ownerUserId);
    } else if (currentUser) {
      // 老 key（无 owner_user_id）落到 admin；非 admin 改不动
      sel.value = String(currentUser.id);
    }
  }
  $('#edit-key-modal').hidden = false;
  setTimeout(() => f.name.focus(), 50);
}
function closeEditKeyModal() { $('#edit-key-modal').hidden = true; editingKeyId = null; }
$('#edit-key-cancel')?.addEventListener('click', closeEditKeyModal);
$('#edit-key-close')?.addEventListener('click', closeEditKeyModal);
$('#edit-key-modal')?.addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeEditKeyModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && $('#edit-key-modal') && !$('#edit-key-modal').hidden) closeEditKeyModal();
});

$('#edit-key-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!editingKeyId) return;
  const f = e.currentTarget;
  const body = {};
  body.name = f.name.value.trim();
  body.owner = f.owner.value.trim() || null;
  // tags: 来自 tag-picker 的 hidden（JSON 数组）
  try {
    const arr = JSON.parse((f.tags.value || '[]').toString());
    body.tags = Array.isArray(arr) ? arr.map(s => String(s).trim()).filter(Boolean) : [];
  } catch (_) { body.tags = []; }
  body.expiresAt = f.expiresAt.value ? new Date(f.expiresAt.value).toISOString() : null;
  const metaRaw = f.meta.value.trim();
  if (metaRaw) {
    try { body.meta = JSON.parse(metaRaw); }
    catch { toast('Meta 必须是合法 JSON', 'err'); f.meta.focus(); return; }
  } else {
    body.meta = null;
  }
  // 归属账号：admin 才能改
  const ownerUid = (f.ownerUserId?.value || '').toString().trim();
  if (ownerUid) body.ownerUserId = parseInt(ownerUid, 10);
  const submitBtn = $('#edit-key-submit');
  submitBtn.disabled = true;
  const oldText = submitBtn.textContent;
  submitBtn.textContent = '保存中…';
  try {
    await api(`/api/keys/${editingKeyId}`, { method: 'PATCH', body: JSON.stringify(body) });
    toast('已更新', 'ok');
    closeEditKeyModal();
    loadKeys();
  } catch (err) {
    const tag = err.status ? `[${err.status}${err.code ? ' ' + err.code : ''}] ` : '';
    toast(tag + (err.message || '更新失败'), 'err');
    if (err.field) {
      const el = $(`#edit-key-form [name="${err.field}"]`);
      if (el) { el.focus(); el.classList.add('input-error'); setTimeout(() => el.classList.remove('input-error'), 1500); }
    }
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = oldText;
  }
});

// ============== 账号管理 ==============
let allAccounts = [];

async function loadAccounts() {
  const tbody = $('#accounts-tbody');
  if (!tbody) return;
  try {
    const r = await api('/api/accounts');
    allAccounts = r.items || [];
    renderAccounts();
    const cnt = $('#accounts-count');
    if (cnt) {
      const total = allAccounts.length;
      cnt.textContent = total === 0 ? '（空）' : `共 ${total} 个`;
    }
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty">加载失败：${escapeHtml(e.message)}</div></td></tr>`;
  }
}

function renderAccounts() {
  const tbody = $('#accounts-tbody');
  if (!tbody) return;
  const isAdmin = currentUser && currentUser.role === 'admin';
  if (!allAccounts.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty">还没有账号</div></td></tr>`;
    return;
  }
  tbody.innerHTML = allAccounts.map((a, i) => {
    const mk = a.mainKey;
    const mkBadge = !mk
      ? '<span class="badge warn" title="点击「查看」自动补建">未配置</span>'
      : `<code>${escapeHtml(mk.prefix)}…</code> <span class="muted" style="font-size:11px;">#${mk.id} · ${mk.enabled ? '启用' : '停用'}</span>`;
    const isSelf = currentUser && currentUser.id === a.id;
    const isAdminRow = a.role === 'admin';
    const isMainAdmin = isAdminRow && a.id === (window.__mainAdminId || 0);
    // 主 admin / 自己：禁删
    const delBtnDisabled = isMainAdmin || isSelf;
    const delBtnTitle = isMainAdmin
      ? '主 admin 不可删除'
      : (isSelf ? '不能删除自己' : '软删该账号');
    // 重置密码：不能改自己；停用账号不允许
    const resetPwDisabled = isSelf || a.disabled;
    const resetPwTitle = isSelf
      ? '不能重置自己的密码'
      : (a.disabled ? '账号已停用，请先启用' : '重置密码');
    return `
    <tr ${a.deleted ? 'style="opacity:.5;"' : ''}>
      <td data-label="#"><b>${i + 1}</b></td>
      <td data-label="账号" class="cell-name">
        <div class="primary-name">${escapeHtml(a.username)}${isSelf ? ' <span class="muted">（我）</span>' : ''}</div>
        ${a.displayName ? `<div class="secondary">${escapeHtml(a.displayName)}</div>` : ''}
        ${isAdminRow ? '<span class="badge ok" style="font-size:10px;">admin' + (isMainAdmin ? ' · 主' : '') + '</span>' : ''}
        ${a.deleted ? '<span class="badge fail" style="font-size:10px;">已软删</span>' : ''}
      </td>
      <td data-label="角色" data-col="role">${escapeHtml(a.role)}</td>
      <td data-label="状态" data-col="status">${a.disabled ? '<span class="badge fail">停</span>' : '<span class="badge ok">正常</span>'}</td>
      <td data-label="主 Key" class="truncate">${mkBadge}</td>
      <td data-label="主 Key 最近使用" data-col="time">${mk && mk.lastUsedAt ? fmtTime(mk.lastUsedAt) : '<span class="muted">—</span>'}</td>
      <td data-label="账号创建" data-col="time">${fmtTime(a.createdAt)}</td>
      <td data-label="操作" class="actions-cell">
        <button class="ghost primary-act" data-act="acct-view-key" data-id="${a.id}" title="查看主 Key">${ICO.key}</button>
        <button class="ghost" data-act="acct-reroll" data-id="${a.id}" data-name="${escapeHtml(a.username)}" title="刷新主 Key">${ICO.reroll}</button>
        <button class="ghost" data-act="acct-reset-pw" data-id="${a.id}" data-name="${escapeHtml(a.username)}" data-self="${isSelf ? 1 : 0}" data-disabled="${a.disabled ? 1 : 0}" title="${escapeHtml(resetPwTitle)}" ${resetPwDisabled ? 'disabled' : ''}>${ICO.lock}</button>
        <button class="ghost danger" data-act="acct-delete" data-id="${a.id}" data-name="${escapeHtml(a.username)}" data-self="${isSelf ? 1 : 0}" data-main="${isMainAdmin ? 1 : 0}" title="${escapeHtml(delBtnTitle)}" ${delBtnDisabled ? 'disabled' : ''}>${ICO.del}</button>
      </td>
    </tr>`;
  }).join('');

  // 把主 admin id 记到全局，给禁用提示用
  if (currentUser && currentUser.role === 'admin') {
    const mainAdmin = allAccounts.find(a => a.role === 'admin' && !a.deleted);
    window.__mainAdminId = mainAdmin ? mainAdmin.id : 0;
  }
}

$('#accounts-tbody')?.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  // 防止「双击 / 网络慢」时按钮被卡住：按钮已经在 loading 就直接 return
  if (btn.dataset.busy === '1') return;
  const id = btn.dataset.id;

  // 通用工具：标记按钮为「忙」+ 改文案；并保证结束后一定恢复
  const startBusy = (label) => {
    btn.dataset.busy = '1';
    btn.dataset.origText = btn.textContent;
    btn.disabled = true;
    btn.textContent = label || '…';
  };
  const endBusy = () => {
    btn.dataset.busy = '';
    btn.disabled = false;
    if (btn.dataset.origText) {
      btn.textContent = btn.dataset.origText;
      btn.dataset.origText = '';
    }
  };

  if (btn.dataset.act === 'acct-view-key') {
    startBusy('读取中…');
    try {
      const r = await api(`/api/accounts/${id}/main-key`);
      openMainKeyModal(r);
    } catch (e) {
      toast('查询失败：' + e.message, 'err');
    } finally {
      endBusy();
    }
  } else if (btn.dataset.act === 'acct-reroll') {
    // 第 1 步：先弹确认（按钮立即变 "..."，避免双击）
    startBusy('…');
    let ok = false;
    try {
      ok = await appConfirm({
        title: '刷新主 Key',
        message: `确定刷新「${btn.dataset.name}」的主 Key？\n\n旧主 Key 立即失效，所有正在使用该 Key 的业务服务将立即 401。\n新主 Key 仅在弹窗中显示一次，请立即复制保存。`,
        okText: '刷新主 Key',
        danger: true,
      });
    } catch (e) {
      console.error('appConfirm error', e);
    }
    if (!ok) { endBusy(); return; }

    // 第 2 步：调 API
    btn.textContent = '生成中…';
    try {
      const r = await api(`/api/accounts/${id}/main-key/reroll`, { method: 'POST' });
      endBusy(); // 先恢复按钮
      toast(r.autoCreated ? '该账号原本未配置主 Key，已自动补建' : '已生成新主 Key，请立即复制保存', r.autoCreated ? 'warn' : 'ok');
      openMainKeyModal({
        accountId: r.accountId,
        username: r.username,
        keyId: r.keyId,
        prefix: r.prefix,
        currentPlain: r.key,
        isReroll: !r.autoCreated,   // 自动补建时不算「刷新」
        autoCreated: r.autoCreated,
        warning: r.warning,
      });
      loadAccounts();
    } catch (e) {
      endBusy();
      const tag = e.code ? `[${e.code}] ` : '';
      toast(tag + '刷新失败：' + (e.message || '网络错误'), 'err');
    }
  } else if (btn.dataset.act === 'acct-reset-pw') {
    if (btn.dataset.self === '1') { toast('不能重置自己的密码', 'err'); return; }
    if (btn.dataset.disabled === '1') { toast('账号已停用，请先启用再重置', 'err'); return; }
    const name = btn.dataset.name;

    // 第 1 步：先弹确认
    startBusy('…');
    let ok = false;
    try {
      ok = await appConfirm({
        title: '重置账号密码',
        message: `确定重置「${name}」的密码？\n\n将生成 1 个 16 字符高强度新密码：\n  · 覆盖当前密码（旧密码立即失效）\n  · 撤销该账号的所有 session（强制重新登录）\n  · 主 Key 不受影响\n\n点击「确认」后新密码会显示在弹窗中，请立即复制并安全交付给子账号。`,
        okText: '生成新密码',
        danger: true,
      });
    } catch (e) { console.error('appConfirm error', e); }
    if (!ok) { endBusy(); return; }

    // 第 2 步：调 API
    btn.textContent = '生成中…';
    try {
      const r = await api(`/api/accounts/${id}/reset-password`, { method: 'POST' });
      endBusy();
      openResetPwModal(r);
      loadAccounts();
    } catch (e) {
      endBusy();
      const tag = e.code ? `[${e.code}] ` : '';
      toast(tag + '重置失败：' + (e.message || '网络错误'), 'err');
    }
  } else if (btn.dataset.act === 'acct-delete') {
    if (btn.dataset.main === '1') {
      toast('主 admin 账号不可删除', 'err');
      return;
    }
    if (btn.dataset.self === '1') {
      toast('不能删除自己', 'err');
      return;
    }
    const name = btn.dataset.name;
    const ok = await appConfirm({
      title: '软删账号',
      message: `确定软删账号「${name}」？\n\n会一并软删该账号的「主 Key」和所有普通 key，并强制下线该用户的所有 session。\n该账号将无法再登录。`,
      okText: '软删',
      danger: true,
    });
    if (!ok) return;
    try {
      const r = await api(`/api/accounts/${id}`, { method: 'DELETE' });
      toast(`已软删「${name}」：主 Key + ${r.keysSoftDeleted} 个 key 软删，${r.sessionsRevoked} 个 session 撤销`, 'ok');
      loadAccounts();
    } catch (e) {
      toast('删除失败：' + e.message, 'err');
    }
  }
});

function openMainKeyModal(r) {
  const wasAutoCreated = !!r.autoCreated;
  $('#main-key-modal-title').textContent = (r.isReroll ? '已刷新主 Key · ' : (wasAutoCreated ? '已自动补建主 Key · ' : '账号主 Key · ')) + r.username;
  $('#main-key-modal-sub').innerHTML = r.isReroll
    ? '<span style="color:var(--warn);">旧主 Key 已立即失效，新主 Key 仅在此刻显示，请立即复制保存！</span>'
    : wasAutoCreated
      ? '<span style="color:var(--warn);">检测到该账号未配置主 Key，已自动补建。明文仅此刻显示，请立即复制保存！</span>'
      : '主 Key 是该账号的「凭证钥匙」。admin 账号的主 Key 在 verify 时跨账号通杀。';
  $('#main-key-modal-hint').textContent = r.warning
    || (r.isReroll
      ? '旧主 Key 立即失效，所有正在使用该 Key 的业务服务将立即 401。'
      : '主 Key 是该账号的「凭证钥匙」。');
  $('#main-key-plain').textContent = r.currentPlain || r.key || '';
  // 注：不再展示「原 key」。重置后原 key 即视为失效，用户场景下没必要保留。
  const origRow = $('#main-key-original-row');
  if (origRow) origRow.hidden = true;
  $('#main-key-modal').dataset.plain = r.currentPlain || r.key || '';
  $('#main-key-modal').hidden = false;
}
function closeMainKeyModal() { $('#main-key-modal').hidden = true; }
$('#main-key-cancel')?.addEventListener('click', closeMainKeyModal);
$('#main-key-close')?.addEventListener('click', closeMainKeyModal);
$('#main-key-modal')?.addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeMainKeyModal();
});
$('#main-key-copy')?.addEventListener('click', async () => {
  const v = $('#main-key-modal').dataset.plain || '';
  const ok = await copyText(v);
  toast(ok ? '主 Key 已复制' : '复制失败', ok ? 'ok' : 'err');
});

// 重置密码弹窗
function openResetPwModal(r) {
  $('#reset-pw-username').textContent = r.username;
  $('#reset-pw-plain').textContent = r.password;
  $('#reset-pw-info').textContent = `已撤销 ${r.sessionsRevoked} 个 session。${r.warning || ''}`;
  $('#reset-pw-result-row').hidden = false;
  $('#reset-pw-modal').dataset.plain = r.password;
  $('#reset-pw-modal').hidden = false;
  // 不再 auto-copy：在 HTTPS / secure context 之外自动复制可能失败 / 弹浏览器拦截，
  // 反而让用户以为密码没生成。改成显式点「复制新密码」或点击代码块。
  setTimeout(() => $('#reset-pw-copy')?.focus(), 30);
}
function closeResetPwModal() { $('#reset-pw-modal').hidden = true; }
$('#reset-pw-cancel')?.addEventListener('click', closeResetPwModal);
$('#reset-pw-close')?.addEventListener('click', closeResetPwModal);
$('#reset-pw-modal')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) closeResetPwModal(); });
$('#reset-pw-copy')?.addEventListener('click', async () => {
  const v = $('#reset-pw-modal').dataset.plain || '';
  const ok = await copyText(v);
  toast(ok ? '新密码已复制' : '复制失败', ok ? 'ok' : 'err');
});

// 新建子账号
function openNewAccountModal() {
  $('#new-account-form').reset();
  $('#new-account-modal').hidden = false;
  setTimeout(() => $('#new-account-form input[name="username"]').focus(), 50);
}
function closeNewAccountModal() { $('#new-account-modal').hidden = true; }
$('#btn-new-account')?.addEventListener('click', openNewAccountModal);
$('#btn-cancel-account')?.addEventListener('click', closeNewAccountModal);
$('#new-account-close')?.addEventListener('click', closeNewAccountModal);
$('#new-account-modal')?.addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeNewAccountModal();
});
$('#new-account-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.currentTarget;
  const body = {
    username: f.username.value.trim(),
    password: f.password.value,
    role: f.role.value,
    displayName: f.displayName.value.trim() || undefined,
  };
  const submitBtn = $('#btn-submit-account');
  submitBtn.disabled = true;
  const oldText = submitBtn.textContent;
  submitBtn.textContent = '创建中…';
  try {
    const r = await api('/api/accounts', { method: 'POST', body: JSON.stringify(body) });
    closeNewAccountModal();
    // 新建账号会同时返回主 Key 明文（仅此刻可见）→ 弹窗展示
    if (r.mainKey && r.mainKey.plain) {
      openMainKeyModal({
        accountId: r.id,
        username: r.username,
        keyId: r.mainKey.id,
        prefix: r.mainKey.prefix,
        currentPlain: r.mainKey.plain,
        isReroll: false,
      });
    }
    toast(`已创建账号 ${r.username}`, 'ok');
    loadAccounts();
  } catch (err) {
    const tag = err.status ? `[${err.status}${err.code ? ' ' + err.code : ''}] ` : '';
    toast(tag + (err.message || '创建失败'), 'err');
    if (err.field) {
      const el = $(`#new-account-form [name="${err.field}"]`);
      if (el) { el.focus(); el.classList.add('input-error'); setTimeout(() => el.classList.remove('input-error'), 1500); }
    }
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = oldText;
  }
});

// ============== 暗色主题切换 ==============
const THEME_KEY = 'km_theme';
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  $$('.theme-icon').forEach((icon) => {
    icon.innerHTML = t === 'dark' ? ICO.sun : ICO.moon;
  });
}
function initTheme() {
  let t = localStorage.getItem(THEME_KEY);
  if (!t) t = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  applyTheme(t);
}
$('#theme-toggle')?.addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-theme') || 'light';
  const next = cur === 'dark' ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
});
initTheme();

// 把 HTML 里 [data-i="xxx"] 占位符替换成对应 SVG 图标
function renderIconPlaceholders(root = document) {
  $$('[data-i]', root).forEach((el) => {
    const key = el.dataset.i;
    if (ICO[key]) el.innerHTML = ICO[key];
  });
}
renderIconPlaceholders();

// ============== Key 健康评分 ==============
function computeKeyHealth(k) {
  let score = 100;
  const factors = [];

  // 已删除 → 0 分
  if (k.deleted_at) {
    return { score: 0, level: 'dead', factors: [{ label: '已删除', impact: -100 }] };
  }
  // 已停用 → 10 分
  if (!k.enabled) {
    return { score: 10, level: 'disabled', factors: [{ label: '已停用', impact: -90 }] };
  }
  // 无归属
  if (!k.ownerUserId && !k.ownerUsername) {
    score -= 15;
    factors.push({ label: '未归属到账号', impact: -15 });
  }
  // 无 owner
  if (!k.owner) {
    score -= 5;
    factors.push({ label: '未指定 owner', impact: -5 });
  }
  // 无 tag
  if (!k.tags || !k.tags.length) {
    score -= 5;
    factors.push({ label: '无标签分类', impact: -5 });
  }
  // 过期检查
  if (k.expires_at) {
    const exp = new Date(k.expires_at + (k.expires_at.endsWith('Z') ? '' : 'Z')).getTime();
    const now = Date.now();
    const daysLeft = (exp - now) / (24 * 3600 * 1000);
    if (daysLeft < 0) {
      score -= 40;
      factors.push({ label: '已过期', impact: -40 });
    } else if (daysLeft < 1) {
      score -= 30;
      factors.push({ label: '即将过期（< 1 天）', impact: -30 });
    } else if (daysLeft < 3) {
      score -= 20;
      factors.push({ label: '即将过期（< 3 天）', impact: -20 });
    } else if (daysLeft < 7) {
      score -= 10;
      factors.push({ label: '即将过期（< 7 天）', impact: -10 });
    }
  }
  // 长期未使用
  if (k.last_used_at) {
    const lastUsed = new Date(k.last_used_at + (k.last_used_at.endsWith('Z') ? '' : 'Z')).getTime();
    const daysSince = (Date.now() - lastUsed) / (24 * 3600 * 1000);
    if (daysSince > 90) {
      score -= 15;
      factors.push({ label: '超过 90 天未使用', impact: -15 });
    } else if (daysSince > 30) {
      score -= 5;
      factors.push({ label: '超过 30 天未使用', impact: -5 });
    }
  } else {
    score -= 10;
    factors.push({ label: '从未被使用', impact: -10 });
  }

  score = Math.max(0, Math.min(100, score));
  const level = score >= 80 ? 'good' : score >= 60 ? 'warn' : score >= 30 ? 'bad' : 'critical';
  return { score, level, factors };
}

function healthBadgeHtml(k) {
  const h = computeKeyHealth(k);
  const colors = { good: 'ok', warn: 'warn', bad: 'err', critical: 'err', disabled: 'muted', dead: 'muted' };
  return `<span class="badge health-badge ${colors[h.level] || ''}" data-act="health" data-id="${k.id}" title="健康评分 ${h.score} · 点击查看详情" style="cursor:pointer;">${h.score}</span>`;
}

function openHealthModal(k) {
  const h = computeKeyHealth(k);
  const colors = { good: 'var(--ok)', warn: 'var(--warn)', bad: 'var(--err)', critical: 'var(--err)', disabled: 'var(--muted)', dead: 'var(--muted)' };
  const labels = { good: '健康', warn: '注意', bad: '较差', critical: '危险', disabled: '停用', dead: '已删' };
  $('#health-key-name').textContent = k.name;
  const factorHtml = h.factors.length
    ? h.factors.map(f => `<li class="health-factor health-factor-bad">${ICO.warning} <span>${escapeHtml(f.label)}</span> <span class="health-impact">-${f.impact}</span></li>`).join('')
    : `<li class="health-factor health-factor-ok">${ICO.ok} <span>无风险因素</span></li>`;
  $('#health-body').innerHTML = `
    <div class="health-score" style="--c:${colors[h.level]};">
      <div class="health-score-num">${h.score}</div>
      <div class="health-score-cap">/ 100 · ${labels[h.level]}</div>
    </div>
    <h4 style="margin:16px 0 6px;font-size:13px;">评分因素</h4>
    <ul class="health-factors">${factorHtml}</ul>
    <p class="muted" style="font-size:12px;margin-top:14px;padding:8px 10px;background:var(--bg-subtle);border-radius:var(--radius-sm);">评分规则：基础 100 分，按风险因素扣减。≥80 健康，≥60 注意，≥30 较差，&lt;30 危险。</p>
  `;
  $('#health-modal').hidden = false;
}
$('#health-close')?.addEventListener('click', () => { $('#health-modal').hidden = true; });
$('#health-cancel')?.addEventListener('click', () => { $('#health-modal').hidden = true; });
$('#health-modal')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) $('#health-modal').hidden = true; });

// ============== 查看明文二次确认 ==============
// 覆盖 keys-tbody 的 copy 操作：先确认再复制
// （原逻辑在 #keys-tbody 的 click 事件里；我们在这里拦截 act=copy）

// ============== Key 时间轴 ==============
async function openTimelineModal(keyId) {
  const key = allKeys.find(k => String(k.id) === String(keyId));
  $('#timeline-key-name').textContent = key ? key.name : `#${keyId}`;
  $('#timeline-body').innerHTML = '<div class="muted">加载中…</div>';
  $('#timeline-modal').hidden = false;
  try {
    const r = await api(`/api/keys/${keyId}/timeline`);
    const events = r.events || [];
    if (!events.length) {
      $('#timeline-body').innerHTML = '<div class="empty">暂无事件记录。</div>';
      return;
    }
    const actionIcons = {
      CREATE_KEY:        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
      IMPORT_KEY:        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
      REROLL_KEY:        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>',
      TOGGLE_KEY:        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="5" width="22" height="14" rx="7"/><circle cx="16" cy="12" r="3"/></svg>',
      PATCH_KEY:         '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
      DELETE_KEY:        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>',
      RESTORE_KEY:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 105.64-11.36L1 10"/></svg>',
      PURGE_KEY:         '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      VIEW_KEY_PLAIN:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
      CHECK_KEY_EXTERNAL:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="11" y2="14"/><line x1="11" y1="8" x2="14" y2="11"/></svg>',
    };
    const html = events.map(e => {
      if (e.type === 'audit') {
        const icon = actionIcons[e.action] || '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="1"/></svg>';
        const detailStr = e.details ? Object.entries(e.details).map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`).join(', ') : '';
        return `<div class="timeline-item">
          <span class="timeline-icon">${icon}</span>
          <div class="timeline-content">
            <div class="timeline-title">${escapeHtml(e.action)}</div>
            ${detailStr ? `<div class="timeline-detail">${escapeHtml(detailStr.slice(0, 200))}</div>` : ''}
            ${e.ip ? `<div class="timeline-meta">IP: ${escapeHtml(e.ip)}</div>` : ''}
          </div>
          <span class="timeline-time">${fmtTime(e.time)}</span>
        </div>`;
      } else if (e.type === 'verify_summary') {
        return `<div class="timeline-item timeline-verify">
          <span class="timeline-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></span>
          <div class="timeline-content">
            <div class="timeline-title">${e.day} 调用统计</div>
            <div class="timeline-detail">
              <span class="timeline-ok">${ICO.ok} ${e.ok}</span>
              <span class="timeline-fail">${ICO.fail} ${e.fail}</span>
            </div>
          </div>
          <span class="timeline-time">${e.day}</span>
        </div>`;
      }
      return '';
    }).join('');
    $('#timeline-body').innerHTML = `<div class="timeline">${html}</div>`;
  } catch (e) {
    $('#timeline-body').innerHTML = `<div class="empty">加载失败：${escapeHtml(e.message)}</div>`;
  }
}
$('#timeline-close')?.addEventListener('click', () => { $('#timeline-modal').hidden = true; });
$('#timeline-cancel')?.addEventListener('click', () => { $('#timeline-modal').hidden = true; });
$('#timeline-modal')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) $('#timeline-modal').hidden = true; });

// ============== 第三方 Key 检测 ==============
async function openCheckModal(keyId) {
  const key = allKeys.find(k => String(k.id) === String(keyId));
  $('#check-key-name').textContent = key ? key.name : `#${keyId}`;
  $('#check-body').innerHTML = '<div class="muted">正在检测…</div>';
  $('#check-modal').hidden = false;
  try {
    const r = await api(`/api/keys/${keyId}/check`, { method: 'POST' });
    const statusText = r.status === 'healthy' ? '有效' : r.status === 'unhealthy' ? '无效' : r.status === 'error' ? '检测失败' : '未知';
    const statusColor = r.isHealthy ? 'var(--ok)' : 'var(--err)';
    const statusIconSvg = r.isHealthy
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:36px;height:36px;"><circle cx="12" cy="12" r="10"/><polyline points="9 12 12 15 16 10"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:36px;height:36px;"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
    $('#check-body').innerHTML = `
      <div style="text-align:center;margin:16px 0;">
        <div style="color:${statusColor};">${statusIconSvg}</div>
        <div style="font-size:18px;font-weight:700;color:${statusColor};margin-top:8px;">${statusText}</div>
      </div>
      <table class="grid" style="font-size:13px;">
        <tr><td class="muted" style="width:100px;">检测地址</td><td><code>${escapeHtml(r.checkUrl)}</code></td></tr>
        <tr><td class="muted">HTTP 状态码</td><td>${r.statusCode || '—'}</td></tr>
        <tr><td class="muted">耗时</td><td>${r.durationMs}ms</td></tr>
      </table>
      ${r.responseBody ? `<details style="margin-top:10px;"><summary style="cursor:pointer;font-size:13px;color:var(--muted);">响应内容</summary><pre style="font-size:12px;max-height:200px;overflow:auto;">${escapeHtml(typeof r.responseBody === 'object' ? JSON.stringify(r.responseBody, null, 2) : String(r.responseBody))}</pre></details>` : ''}
    `;
  } catch (e) {
    const isNoConfig = e.code === 'NO_CHECK_CONFIG';
    if (isNoConfig) {
      $('#check-body').innerHTML = `
        <div style="text-align:center;margin:20px 0;">
          <div class="empty-icon">${ICO.gear}</div>
          <p style="margin-top:8px;">该 Key 尚未配置检测规则。</p>
          <p class="muted" style="font-size:12px;">请在编辑 Key 时，在 meta 字段中添加 <code>checkUrl</code> 等配置。</p>
          <pre style="text-align:left;font-size:12px;margin-top:8px;">示例 meta:
{
  "checkUrl": "https://api.openai.com/v1/models",
  "checkHeader": "Authorization",
  "checkPrefix": "Bearer "
}</pre>
        </div>
      `;
    } else {
      $('#check-body').innerHTML = `<div class="empty">检测失败：${escapeHtml(e.message)}</div>`;
    }
  }
}
$('#check-close')?.addEventListener('click', () => { $('#check-modal').hidden = true; });
$('#check-cancel')?.addEventListener('click', () => { $('#check-modal').hidden = true; });
$('#check-modal')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) $('#check-modal').hidden = true; });

// ============== 账号编辑弹窗 ==============
function openEditAccountModal(acct) {
  const f = $('#edit-account-form');
  f.displayName.value = acct.displayName || '';
  f.role.value = acct.role || 'operator';
  f.disabled.checked = !!acct.disabled;
  f.id.value = acct.id;
  $('#edit-account-username').textContent = acct.username;
  $('#edit-account-modal').hidden = false;
}
$('#edit-account-close')?.addEventListener('click', () => { $('#edit-account-modal').hidden = true; });
$('#edit-account-cancel')?.addEventListener('click', () => { $('#edit-account-modal').hidden = true; });
$('#edit-account-modal')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) $('#edit-account-modal').hidden = true; });
$('#edit-account-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.currentTarget;
  const id = f.id.value;
  const body = {
    displayName: f.displayName.value.trim() || null,
    role: f.role.value,
    disabled: f.disabled.checked,
  };
  const submitBtn = $('#edit-account-submit');
  submitBtn.disabled = true;
  submitBtn.textContent = '保存中…';
  try {
    await api(`/api/accounts/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
    toast('账号已更新', 'ok');
    $('#edit-account-modal').hidden = true;
    loadAccounts();
  } catch (err) {
    toast('更新失败：' + (err.message || '未知错误'), 'err');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = '保存';
  }
});

// ============== 交接报告 ==============
let handoverData = null;
async function openHandoverModal() {
  $('#handover-body').innerHTML = '<div class="muted">正在生成交接报告…</div>';
  $('#handover-modal').hidden = false;
  try {
    handoverData = await api('/api/handover', { method: 'POST' });
    renderHandoverReport(handoverData);
  } catch (e) {
    $('#handover-body').innerHTML = `<div class="empty">生成失败：${escapeHtml(e.message)}</div>`;
  }
}
function renderHandoverReport(r) {
  const riskHtml = (r.risks || []).map(ri => {
    const colors = { high: 'err', warn: 'warn', info: 'muted' };
    return `<li class="badge ${colors[ri.level] || 'muted'}" style="display:block;margin:4px 0;">${ri.level.toUpperCase()}: ${escapeHtml(ri.message)}</li>`;
  }).join('') || `<li class="health-factor health-factor-ok">${ICO.ok} <span>无风险项</span></li>`;

  const userHtml = (r.users || []).map(u =>
    `<tr>
      <td>${escapeHtml(u.username)}</td>
      <td>${escapeHtml(u.role)}</td>
      <td>${u.disabled ? '<span class="badge fail">停用</span>' : '<span class="badge ok">正常</span>'}</td>
      <td>${u.key_count}</td>
    </tr>`
  ).join('');

  const expiringHtml = (r.expiringKeys || []).map(k =>
    `<li class="health-factor health-factor-warn">${ICO.warning} <span>${escapeHtml(k.name)} <span class="muted">(${escapeHtml(k.owner_username || k.owner || '-')})</span> — 过期于 ${fmtTime(k.expires_at)}</span></li>`
  ).join('') || '<li class="muted" style="font-size:13px;padding:6px 0;">无</li>';

  const expiredHtml = (r.expiredKeys || []).map(k =>
    `<li class="health-factor health-factor-bad">${ICO.warning} <span>${escapeHtml(k.name)} <span class="muted">(${escapeHtml(k.owner_username || k.owner || '-')})</span> — 已过期于 ${fmtTime(k.expires_at)}</span></li>`
  ).join('') || '<li class="muted" style="font-size:13px;padding:6px 0;">无</li>';

  const tagHtml = (r.keysByTag || []).map(t =>
    `<span class="tag">${escapeHtml(t.tag)} (${t.count})</span>`
  ).join('') || '<span class="muted">无</span>';

  const v7 = r.verifyStats7d || {};
  const failRate = v7.total ? (v7.fail / v7.total * 100).toFixed(1) : '0';

  $('#handover-body').innerHTML = `
    <div class="handover-meta">生成时间：${fmtTime(r.generatedAt)} · 生成人：${escapeHtml(r.generatedBy)}</div>

    <h4 class="handover-h4">${ICO.chart} 系统概览</h4>
    <div class="stats-overview" style="grid-template-columns:repeat(4,1fr);margin-bottom:12px;">
      <div class="stat-card"><span class="stat-label">账号</span><strong class="stat-value">${r.overview?.totalUsers || 0}</strong></div>
      <div class="stat-card"><span class="stat-label">普通 Key</span><strong class="stat-value">${r.overview?.totalKeys || 0}</strong></div>
      <div class="stat-card"><span class="stat-label">主 Key</span><strong class="stat-value">${r.overview?.totalMainKeys || 0}</strong></div>
      <div class="stat-card"><span class="stat-label">变量</span><strong class="stat-value">${r.overview?.totalVariables || 0}</strong></div>
    </div>

    <h4 class="handover-h4">${ICO.warning} 风险项</h4>
    <ul class="health-factors">${riskHtml}</ul>

    <h4 class="handover-h4">即将过期（7 天内）</h4>
    <ul class="health-factors">${expiringHtml}</ul>

    <h4 class="handover-h4">已过期</h4>
    <ul class="health-factors">${expiredHtml}</ul>

    <h4 class="handover-h4">${ICO.nav_users} 账号清单</h4>
    <table class="grid" style="font-size:13px;">
      <thead><tr><th>账号</th><th>角色</th><th>状态</th><th>Key 数</th></tr></thead>
      <tbody>${userHtml}</tbody>
    </table>

    <h4 class="handover-h4">${ICO.tag} Key 标签分布</h4>
    <div>${tagHtml}</div>

    <h4 class="handover-h4">${ICO.chart} 近 7 天验证统计</h4>
    <div class="muted" style="font-size:13px;">总 ${v7.total || 0} 次 · 成功 ${v7.ok || 0} · 失败 ${v7.fail || 0} · 失败率 ${failRate}%</div>
  `;
}
$('#handover-close')?.addEventListener('click', () => { $('#handover-modal').hidden = true; });
$('#handover-cancel')?.addEventListener('click', () => { $('#handover-modal').hidden = true; });
$('#handover-modal')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) $('#handover-modal').hidden = true; });
$('#handover-copy')?.addEventListener('click', async () => {
  if (!handoverData) return;
  const r = handoverData;
  const text = [
    `KeyMgr 交接报告`,
    `生成时间: ${fmtTime(r.generatedAt)}`,
    `生成人: ${r.generatedBy}`,
    ``,
    `== 系统概览 ==`,
    `账号: ${r.overview?.totalUsers}, 普通 Key: ${r.overview?.totalKeys}, 主 Key: ${r.overview?.totalMainKeys}, 变量: ${r.overview?.totalVariables}`,
    ``,
    `== 风险项 ==`,
    ...(r.risks || []).map(ri => `[${ri.level.toUpperCase()}] ${ri.message}`),
    ``,
    `== 即将过期 ==`,
    ...(r.expiringKeys || []).map(k => `${k.name} (${k.owner_username || '-'}) 过期于 ${k.expires_at}`),
    ``,
    `== 已过期 ==`,
    ...(r.expiredKeys || []).map(k => `${k.name} (${k.owner_username || '-'}) 已过期于 ${k.expires_at}`),
    ``,
    `== 账号 ==`,
    ...(r.users || []).map(u => `${u.username} / ${u.role} / ${u.disabled ? '停用' : '正常'} / ${u.key_count} key`),
    ``,
    `== 近 7 天验证 ==`,
    `总 ${r.verifyStats7d?.total || 0}, 成功 ${r.verifyStats7d?.ok || 0}, 失败 ${r.verifyStats7d?.fail || 0}`,
  ].join('\n');
  const ok = await copyText(text);
  toast(ok ? '已复制交接报告' : '复制失败', ok ? 'ok' : 'err');
});

// 交接导航按钮
$('#nav-handover')?.addEventListener('click', (e) => {
  e.preventDefault();
  if (currentUser?.role !== 'admin') { toast('仅 admin 可生成交接报告', 'warn'); return; }
  openHandoverModal();
});

// ============== 变量热度统计 ==============
async function loadVarHeat() {
  const days = $('#var-heat-days')?.value || '30';
  $('#var-heat-body').innerHTML = '<div class="muted">加载中…</div>';
  try {
    const r = await api(`/api/variables/stats?days=${encodeURIComponent(days)}`);
    const items = r.items || [];
    if (!items.length) {
      $('#var-heat-body').innerHTML = '<div class="empty">暂无数据。确保业务侧正在通过 /v1/variables/get 调用。</div>';
      return;
    }
    const heatColors = { hot: 'var(--err)', warm: 'var(--warn)', cool: 'var(--accent)', idle: 'var(--muted)' };
    const heatLabels = { hot: `<span class="heat-pill heat-hot">${ICO.flame} 热门</span>`, warm: `<span class="heat-pill heat-warm">${ICO.cloud} 常用</span>`, cool: `<span class="heat-pill heat-cool">${ICO.snow} 冷门</span>`, idle: `<span class="heat-pill heat-idle">${ICO.zzz} 未用</span>` };
    const maxTotal = Math.max(1, ...items.map(i => i.total));
    const html = `<table class="grid" style="font-size:13px;">
      <thead><tr><th>变量名</th><th>分组</th><th style="width:60px;">热度</th><th style="width:80px;">调用次数</th><th style="width:80px;">成功/失败</th><th style="width:120px;">最近调用</th></tr></thead>
      <tbody>${items.map(v => `
        <tr>
          <td><code>${escapeHtml(v.name)}</code></td>
          <td>${v.group ? `<span class="badge ok">${escapeHtml(v.group)}</span>` : '<span class="muted">—</span>'}</td>
          <td><span style="color:${heatColors[v.heat]};">${heatLabels[v.heat]}</span></td>
          <td>
            <div style="background:var(--line);height:6px;border-radius:3px;overflow:hidden;">
              <div style="width:${(v.total / maxTotal * 100).toFixed(1)}%;height:100%;background:${heatColors[v.heat]};border-radius:3px;"></div>
            </div>
            <span style="font-size:11px;">${v.total}</span>
          </td>
          <td><span style="color:var(--ok);">${v.ok}</span> / <span style="color:var(--err);">${v.fail}</span></td>
          <td style="font-size:12px;">${v.lastAccess ? fmtTime(v.lastAccess) : '<span class="muted">—</span>'}</td>
        </tr>
      `).join('')}</tbody>
    </table>
    <p class="muted" style="font-size:12px;margin-top:8px;">共 ${r.total || items.length} 个变量 · 近 ${days} 天统计</p>`;
    $('#var-heat-body').innerHTML = html;
  } catch (e) {
    $('#var-heat-body').innerHTML = `<div class="empty">加载失败：${escapeHtml(e.message)}</div>`;
  }
}
$('#btn-var-heat')?.addEventListener('click', () => {
  if (currentUser?.role !== 'admin') { toast('仅 admin 可查看变量热度', 'warn'); return; }
  $('#var-heat-modal').hidden = false;
  loadVarHeat();
});
$('#var-heat-close')?.addEventListener('click', () => { $('#var-heat-modal').hidden = true; });
$('#var-heat-cancel')?.addEventListener('click', () => { $('#var-heat-modal').hidden = true; });
$('#var-heat-modal')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) $('#var-heat-modal').hidden = true; });
$('#var-heat-refresh')?.addEventListener('click', loadVarHeat);
$('#var-heat-days')?.addEventListener('change', loadVarHeat);

// ============== 修改现有 renderKeys 以添加健康评分徽章和新操作按钮 ==============
// 我们需要修改原有的 renderKeys 函数。用一个 wrapper 来做。
const _originalRenderKeys = renderKeys;
renderKeys = function() {
  // 先调原始
  _originalRenderKeys();
  // 然后给每个 key 行添加健康评分 + 额外操作按钮
  const tbody = $('#keys-tbody');
  if (!tbody) return;
  const rows = tbody.querySelectorAll('tr');
  rows.forEach((row, i) => {
    if (i >= allKeys.length) return;
    const k = allKeys[i];
    // 在「状态」列后面添加健康评分
    const statusCell = row.querySelector('[data-label="状态"]');
    if (statusCell && !statusCell.querySelector('.health-badge')) {
      statusCell.innerHTML += ' ' + healthBadgeHtml(k);
    }
    // 在操作列添加时间轴 + 检测按钮
    const actionsCell = row.querySelector('.actions-cell');
    if (actionsCell && canWrite() && !actionsCell.querySelector('[data-act="timeline"]')) {
      const timelineBtn = document.createElement('button');
      timelineBtn.className = 'ghost';
      timelineBtn.dataset.act = 'timeline';
      timelineBtn.dataset.id = k.id;
      timelineBtn.innerHTML = ICO.timeline;
      timelineBtn.title = '时间轴';
      actionsCell.insertBefore(timelineBtn, actionsCell.firstChild);

      const checkBtn = document.createElement('button');
      checkBtn.className = 'ghost';
      checkBtn.dataset.act = 'check';
      checkBtn.dataset.id = k.id;
      checkBtn.innerHTML = ICO.check;
      checkBtn.title = '第三方检测';
      actionsCell.insertBefore(checkBtn, timelineBtn.nextSibling);
    }
  });
};

// 扩展 keys-tbody 的 click 事件（在原有处理之后追加）
// 使用 MutationObserver 或直接在现有的 click handler 里加逻辑
// 这里用事件委托：在 keys-tbody 上增加对新 data-act 的处理
$('#keys-tbody')?.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) {
    // 检查是否点击了健康评分徽章
    const healthBadge = e.target.closest('[data-act="health"]');
    if (healthBadge) {
      const id = healthBadge.dataset.id;
      const k = allKeys.find(x => String(x.id) === String(id));
      if (k) openHealthModal(k);
    }
    return;
  }
  const id = btn.dataset.id;
  if (btn.dataset.act === 'timeline') {
    openTimelineModal(id);
  } else if (btn.dataset.act === 'check') {
    openCheckModal(id);
  }
  // 注意：copy 操作的二次确认在原有的 handler 里已经有 confirm（reroll）
  // 对于 "copy" 操作（复制当前 key），加二次确认
  if (btn.dataset.act === 'copy') {
    // 替代原有的 copy 逻辑：先确认
    e.stopImmediatePropagation();
    e.preventDefault();
    const ok = await appConfirm({
      title: '查看 Key 明文',
      message: '查看明文会记录审计日志。确认继续？\n\n提示：复制后请妥善保管，不要在不安全的地方粘贴。',
      okText: '确认查看并复制',
      danger: false,
    });
    if (!ok) return;
    try {
      const r = await api(`/api/keys/${id}/plain`);
      const copied = await copyText(r.currentPlain);
      toast(copied ? '已复制当前 key' : '复制失败', copied ? 'ok' : 'err');
    } catch (err) {
      if (err.status === 404) toast('该 key 不存在', 'err');
      else toast('复制失败：' + err.message, 'err');
    }
  }
});

// ============== 修改账号管理：添加编辑按钮 ==============
const _originalRenderAccounts = renderAccounts;
renderAccounts = function() {
  _originalRenderAccounts();
  // 给每行添加编辑按钮
  const tbody = $('#accounts-tbody');
  if (!tbody) return;
  const rows = tbody.querySelectorAll('tr');
  rows.forEach((row, i) => {
    if (i >= allAccounts.length) return;
    const a = allAccounts[i];
    const actionsCell = row.querySelector('.actions-cell');
    if (actionsCell && !actionsCell.querySelector('[data-act="acct-edit"]') && currentUser?.role === 'admin') {
      const editBtn = document.createElement('button');
      editBtn.className = 'ghost';
      editBtn.dataset.act = 'acct-edit';
      editBtn.dataset.id = a.id;
      editBtn.innerHTML = ICO.edit;
      editBtn.title = '编辑账号';
      // 插在删除按钮之前
      const delBtn = actionsCell.querySelector('[data-act="acct-delete"]');
      if (delBtn) actionsCell.insertBefore(editBtn, delBtn);
      else actionsCell.appendChild(editBtn);
    }
  });
};

// 账号编辑按钮事件
$('#accounts-tbody')?.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-act="acct-edit"]');
  if (!btn) return;
  const id = btn.dataset.id;
  const acct = allAccounts.find(a => String(a.id) === String(id));
  if (acct) openEditAccountModal(acct);
});

// ============== 显示交接导航（仅 admin） ==============
// 在 init 中已经能拿到 currentUser，这里也补一下
if (currentUser?.role === 'admin') {
  const nav = $('#nav-handover');
  if (nav) nav.style.display = '';
}

// ============== 失败原因库 UI 增强：可展开排查建议 ==============
// 扩展 renderStatsReasons 以支持展开/收起
const _origRenderStatsReasons = renderStatsReasons;
renderStatsReasons = function(reasons) {
  const el = $('#stats-reasons');
  if (!el) return;
  if (!reasons || !reasons.length) { el.innerHTML = '<li class="muted">没有失败记录 🎉</li>'; return; }
  const max = Math.max(1, ...reasons.map(r => r.count));
  el.innerHTML = reasons.slice(0, 6).map((r, idx) => {
    const w = (r.count / max * 100).toFixed(1);
    const sev = r.severity || 'info';
    const fixes = (r.fixes || []).map(f => `<li>${escapeHtml(f)}</li>`).join('');
    const hasDetails = r.explain || fixes;
    return `<li class="reason-item reason-${sev}">
      <div class="reason-row" style="cursor:${hasDetails ? 'pointer' : 'default'};" data-reason-toggle="${idx}">
        <span class="reason-label">${escapeHtml(r.label || r.reason)}</span>
        <span class="reason-count">${r.count} ${hasDetails ? '<span style="font-size:10px;color:var(--muted);">▾</span>' : ''}</span>
      </div>
      <div class="reason-bar"><div class="reason-bar-fill" style="width:${w}%"></div></div>
      <div class="reason-details" data-reason-details="${idx}" ${hasDetails ? 'hidden' : ''}>
        ${r.explain ? `<p class="reason-explain">${escapeHtml(r.explain)}</p>` : ''}
        ${fixes ? `<ul class="reason-fixes">${fixes}</ul>` : ''}
      </div>
    </li>`;
  }).join('');
  // 绑定展开/收起
  el.querySelectorAll('[data-reason-toggle]').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const idx = toggle.dataset.reasonToggle;
      const details = el.querySelector(`[data-reason-details="${idx}"]`);
      if (details) details.hidden = !details.hidden;
    });
  });
};

// ============== 账户关系图可视化 ==============
// 在账号管理页添加一个简单的文本版关系图
const _origRenderAccounts2 = renderAccounts;
renderAccounts = function() {
  _origRenderAccounts2();
  // 在账号表格后面添加关系图区域
  const tab = $('#tab-accounts');
  if (!tab || tab.querySelector('.relation-graph')) return;
  if (!allAccounts.length) return;

  const graphDiv = document.createElement('div');
  graphDiv.className = 'relation-graph';
  graphDiv.style.cssText = 'margin-top:16px;padding:16px;background:var(--card);border:1px solid var(--line);border-radius:var(--radius);';

  // 简单文本关系图：每个账号 → Key 数量 → 标签
  let graphHtml = `<h4 class="handover-h4">${ICO.map} 账户关系图</h4>`;
  graphHtml += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;">';
  for (const a of allAccounts) {
    const mk = a.mainKey;
    const statusBadge = a.disabled ? '<span class="badge fail">停</span>' : '<span class="badge ok">正常</span>';
    const roleBadge = a.role === 'admin' ? '<span class="badge ok" style="font-size:10px;">admin</span>'
      : a.role === 'operator' ? '<span class="badge" style="font-size:10px;background:var(--accent-soft);color:var(--accent);">operator</span>'
      : '<span class="muted" style="font-size:10px;">viewer</span>';
    graphHtml += `<div style="padding:10px;border:1px solid var(--line);border-radius:8px;background:var(--card-2);">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
        ${statusBadge} <strong>${escapeHtml(a.username)}</strong> ${roleBadge}
      </div>
      ${a.displayName ? `<div class="muted" style="font-size:12px;">${escapeHtml(a.displayName)}</div>` : ''}
      <div style="font-size:12px;margin-top:6px;">
        主 Key: ${mk ? `<code>${escapeHtml(mk.prefix)}…</code> ${mk.enabled ? '<span style="color:var(--ok)">启用</span>' : '<span style="color:var(--err)">停用</span>'}` : '<span class="muted">无</span>'}
      </div>
    </div>`;
  }
  graphHtml += '</div>';
  graphDiv.innerHTML = graphHtml;
  tab.appendChild(graphDiv);
};
