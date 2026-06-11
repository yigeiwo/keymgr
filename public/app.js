// 简单前端脚本
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

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
$$('.topbar nav a').forEach(a => a.addEventListener('click', (e) => {
  e.preventDefault();
  $$('.topbar nav a').forEach(x => x.classList.remove('active'));
  $$('.tab').forEach(x => x.classList.remove('active'));
  a.classList.add('active');
  $('#tab-' + a.dataset.tab).classList.add('active');
  if (a.dataset.tab === 'logs') loadLogs();
  if (a.dataset.tab === 'keys') loadKeys();
  if (a.dataset.tab === 'variables') loadVariables();
  if (a.dataset.tab === 'accounts') loadAccounts();
}));

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
let showDeleted = false;
let allKeys = [];
let allUsers = [];             // admin 才能拉到
let currentUser = null;        // {id,username,role,...}

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
  const q = qs.toString() ? `?${qs.toString()}` : '';
  const { items } = await api('/api/keys' + q);
  allKeys = items;
  renderKeys();
}

function renderKeys() {
  const tbody = $('#keys-tbody');
  const items = allKeys;
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="11"><div class="empty">还没有 Key，点右上角 <b>+ 新建 Key</b> 开始创建。</div></td></tr>`;
    return;
  }
  tbody.innerHTML = items.map((k, i) => {
    const tagsHtml = (k.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');
    const isDel = !!k.deleted_at;
    const delBadge = isDel ? `<span class="badge warn" title="${escapeHtml(k.deleted_at)}">已删除</span>` : '';
    // Keys 列表只显示普通 key（is_default=0）；主 Key 走「账号管理」页面
    const acct = k.ownerUsername
      ? `<span class="badge ${k.ownerUsername === currentUser?.username ? 'ok' : ''}">${escapeHtml(k.ownerUsername)}</span>`
      : `<span class="muted" title="老库兼容：未归属">—</span>`;
    return `
    <tr ${isDel ? 'style="opacity:.6;"' : ''}>
      <td><b>${i + 1}</b></td>
      <td>${escapeHtml(k.name)}${delBadge}</td>
      <td><code>${escapeHtml(k.prefix)}…</code></td>
      <td>${acct}</td>
      <td>${k.owner ? escapeHtml(k.owner) : '<span class="muted">-</span>'}</td>
      <td>${tagsHtml || '<span class="muted">-</span>'}</td>
      <td>${k.enabled ? '<span class="badge ok">启用</span>' : '<span class="badge fail">停用</span>'}</td>
      <td>${fmtTime(k.expires_at) || '-'}</td>
      <td>${fmtTime(k.last_used_at) || '-'}</td>
      <td>${fmtTime(k.created_at)}</td>
      <td>
        <button class="ghost primary-act" data-act="copy" data-id="${k.id}" title="从数据库取当前 key 并复制">复制</button>
        <button class="ghost" data-act="copyOriginal" data-id="${k.id}" title="从数据库取原始 key 并复制（重置过的 key 也能拿回创建时的）">原 key</button>
        ${isDel
          ? `<button class="ghost" data-act="restore" data-id="${k.id}" title="30 天内可恢复">恢复</button>
             <button class="ghost" data-act="purge" data-id="${k.id}" title="永久删除，不可恢复">永久删</button>`
          : `<button class="ghost" data-act="edit" data-id="${k.id}" title="编辑 name / owner / tags / 过期 / 账号">编辑</button>
             <button class="ghost" data-act="reroll" data-id="${k.id}" title="生成新 key，旧 key 立即失效">重置</button>
             <button class="ghost" data-act="toggle" data-id="${k.id}">${k.enabled ? '停用' : '启用'}</button>
             <button class="ghost" data-act="del" data-id="${k.id}">删除</button>`
        }
      </td>
    </tr>`;
  }).join('');
}

$('#key-search')?.addEventListener('input', debounce((e) => {
  keySearchTerm = e.target.value.trim();
  loadKeys();
}, 200));

$('#key-account-filter')?.addEventListener('change', (e) => {
  keyAccountFilter = e.target.value;
  loadKeys();
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
  const id = btn.dataset.id;
  if (btn.dataset.act === 'copy') {
    // 列表里的"复制" = 从数据库取当前 key 并复制，**不重置**
    try {
      const r = await api(`/api/keys/${id}/plain`);
      const ok = await copyText(r.currentPlain);
      const tag = r.isOriginal ? '（原 key）' : '（当前 key）';
      toast(ok ? `已复制 ${tag}` : '复制失败', ok ? 'ok' : 'err');
    } catch (e) {
      // 老库无 plain 字段时降级
      if (e.status === 404) toast('该 key 不存在', 'err');
      else toast('复制失败：' + e.message, 'err');
    }
  } else if (btn.dataset.act === 'copyOriginal') {
    // 复制原始 key
    try {
      const r = await api(`/api/keys/${id}/plain`);
      if (!r.originalPlain) { toast('该 key 无原始 key 记录', 'warn'); return; }
      const ok = await copyText(r.originalPlain);
      toast(ok ? '已复制原 key' : '复制失败', ok ? 'ok' : 'err');
    } catch (e) { toast('复制失败：' + e.message, 'err'); }
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
  $('#new-key-form').reset();
  setMode('generate');
  populateAccountSelects();
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
    // 切换本组 button 高亮
    $$('button[data-pane]', bar).forEach(x => x.classList.toggle('active', x === btn));
    // 切换本组 pane 显隐：只切 data-pane 等于目标 pane 的项
    $$('[data-pane]', scope).forEach(p => {
      if (!(p instanceof HTMLElement)) return;
      if (p.tagName === 'BUTTON') return; // 跳过 button
      p.hidden = (p.dataset.pane !== pane);
    });
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
  // tags: 逗号 / 空格分隔
  const tagsRaw = (fd.get('tags') || '').toString();
  const tags = tagsRaw
    .split(/[,\s，、]+/g).map(s => s.trim()).filter(Boolean);
  if (tags.length) body.tags = tags;

  // 两个模式各自的字段
  if (mode === 'import') {
    body.mode = 'import';
    body.plain = fd.get('plain') || '';
    const customPrefix = fd.get('prefix');
    if (customPrefix) body.prefix = customPrefix;
  } else {
    body.prefix = fd.get('prefix') || 'sk_live';
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
      const el = $(`#new-key-form [name="${err.field}"]`);
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
  const result = $('#log-filter').value;
  const qs = result ? `?result=${result}` : '';
  const { items } = await api('/api/logs' + qs);
  const tbody = $('#logs-tbody');
  tbody.innerHTML = items.map(l => `
    <tr>
      <td>${fmtTime(l.created_at)}</td>
      <td><span class="badge ${l.result}">${l.result}</span></td>
      <td>${escapeHtml(l.reason || '-')}</td>
      <td><code>${escapeHtml(l.key_masked || '-')}</code></td>
      <td>${escapeHtml(l.ip || '-')}</td>
      <td title="${escapeHtml(l.user_agent || '')}" style="max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(l.user_agent || '-')}</td>
      <td>${l.duration_ms != null ? l.duration_ms.toFixed(2) : '-'}</td>
    </tr>
  `).join('');
}

(async function init() {
  await loadCurrentUser();
  if (!currentUser) { location.href = '/login'; return; }
  await loadUsers();
  populateAccountSelects();
  $('#me').textContent = `${currentUser.username}（${currentUser.role}）`;
  // 非 admin 隐藏「+ 新建子账号」按钮
  const newAcctBtn = $('#btn-new-account');
  if (newAcctBtn) {
    newAcctBtn.style.display = currentUser.role === 'admin' ? '' : 'none';
  }
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
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty">加载失败：${escapeHtml(e.message)}</div></td></tr>`;
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

function renderGroupFilter() {
  const sel = $('#var-group-filter');
  if (!sel) return;
  const cur = varGroupFilter;
  sel.innerHTML = '<option value="">全部分组</option>'
    + '<option value="__null__">（未分组）</option>'
    + (allGroups || []).map(g => `<option value="${escapeHtml(g.name)}">${escapeHtml(g.name)} (${g.count})</option>`).join('');
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
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty">${allVariables.length ? '无匹配项' : '还没有变量，点右上角 <b>+ 新建变量</b> 开始添加。'}</div></td></tr>`;
    return;
  }
  tbody.innerHTML = list.map((v, i) => {
    const groupCell = v.group
      ? `<span class="badge ok" style="cursor:pointer;" data-act="var-view-group" data-group="${escapeHtml(v.group)}" title="查看该分组下全部变量">${escapeHtml(v.group)}</span>`
      : '<span class="muted">-</span>';
    return `
    <tr>
      <td><b>${i + 1}</b></td>
      <td><code>${escapeHtml(v.name)}</code></td>
      <td><code class="muted-code">${escapeHtml(v.value.length > 40 ? v.value.slice(0, 40) + '…' : v.value)}</code></td>
      <td>${groupCell}</td>
      <td>${v.description ? escapeHtml(v.description) : '<span class="muted">-</span>'}</td>
      <td>${fmtTime(v.updated_at)}</td>
      <td>${fmtTime(v.created_at)}</td>
      <td>
        <button class="ghost primary-act" data-act="var-copy" data-name="${escapeHtml(v.name)}" data-value="${escapeHtml(v.value)}" title="复制 value">复制</button>
        <button class="ghost" data-act="var-edit" data-id="${v.id}" data-name="${escapeHtml(v.name)}" data-value="${escapeHtml(v.value)}" data-desc="${escapeHtml(v.description || '')}" data-group="${escapeHtml(v.group || '')}">编辑</button>
        <button class="ghost" data-act="var-del" data-id="${v.id}" data-name="${escapeHtml(v.name)}">删除</button>
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

$('#btn-new-var')?.addEventListener('click', () => openVarModal(null));

function openVarModal(v) {
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
  const visible = ['confirm-modal', 'reset-pw-modal', 'group-modal', 'main-key-modal', 'edit-key-modal', 'new-key-modal', 'new-account-modal']
    .map(id => document.getElementById(id))
    .filter(el => el && !el.hidden);
  if (visible.length) {
    const top = visible[visible.length - 1];
    // confirm-modal 由它自己的 onCancel 收拾；这里只 hide
    if (top.id === 'confirm-modal') {
      // appConfirm 自己注册的 onEsc 会 resolve；这里不重复处理
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
//   7. 兜底：如果 DOM 缺失或被卸载，2 秒后强制 resolve(false)，绝不让 UI 卡死
function appConfirm(opts) {
  opts = opts || {};
  const title     = opts.title     || '确认操作';
  const message   = opts.message   || '';
  const okText    = opts.okText    || '确认';
  const cancelText= opts.cancelText|| '取消';
  const danger    = !!opts.danger;

  // 安全兜底：兜底 timeout —— 任何意外分支下，2.5s 后强制 resolve(false)
  // 这样即使 appConfirm 内部死锁，调用方的 await 也会解除（按钮状态会恢复）
  const SAFETY_TIMEOUT_MS = 2500;
  let safetyTimer = null;
  let pendingResolve = null;
  function safetyResolve(result) {
    if (pendingResolve) {
      const r = pendingResolve; pendingResolve = null;
      try { r(result); } catch (_) {}
    }
  }

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
      // 清掉兜底 timer
      if (safetyTimer) { clearTimeout(safetyTimer); safetyTimer = null; }
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

    // 兜底：2.5s 后还没 resolve（说明某条路径断了），强制 resolve(false)
    safetyTimer = setTimeout(() => {
      if (state === 'open') {
        console.warn('appConfirm: 兜底 timeout 触发，强制 resolve(false)');
        try { m.hidden = true; } catch (_) {}
        done(false);
      }
    }, SAFETY_TIMEOUT_MS);
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
  f.owner.value = item.owner || '';
  f.tags.value = (item.tags || []).join(', ');
  f.expiresAt.value = item.expires_at ? item.expires_at.slice(0, 16) : '';
  f.meta.value = item.meta ? JSON.stringify(item.meta, null, 2) : '';
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
  const tags = f.tags.value
    .split(/[,\s，、]+/g).map(s => s.trim()).filter(Boolean);
  body.tags = tags;
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
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="9"><div class="empty">加载失败：${escapeHtml(e.message)}</div></td></tr>`;
  }
}

function renderAccounts() {
  const tbody = $('#accounts-tbody');
  if (!tbody) return;
  const isAdmin = currentUser && currentUser.role === 'admin';
  if (!allAccounts.length) {
    tbody.innerHTML = `<tr><td colspan="9"><div class="empty">还没有账号。</div></td></tr>`;
    return;
  }
  tbody.innerHTML = allAccounts.map((a, i) => {
    const mk = a.mainKey;
    const mkBadge = !mk
      ? '<span class="muted">—</span>'
      : `<code>${escapeHtml(mk.prefix)}…</code><br><span class="muted" style="font-size:11px;">#${mk.id} · ${mk.enabled ? '启用' : '停用'}</span>`;
    const isSelf = currentUser && currentUser.id === a.id;
    const isAdminRow = a.role === 'admin';
    const isMainAdmin = isAdminRow && a.id === (window.__mainAdminId || 0);
    // 主 admin / 自己：禁删
    const delBtnDisabled = isMainAdmin || isSelf;
    const delBtnTitle = isMainAdmin
      ? '主 admin 不可删除（系统的「超级钥匙」账号）'
      : (isSelf ? '不能删除自己' : '软删该账号（主 Key + 所有普通 key 一起软删，强制下线）');
    // 重置密码：不能改自己；停用账号不允许
    const resetPwDisabled = isSelf || a.disabled;
    const resetPwTitle = isSelf
      ? '不能重置自己的密码（当前会话会被撤销）'
      : (a.disabled ? '账号已停用，请先启用' : '生成新密码，并撤销该账号的所有 session');
    return `
    <tr ${a.deleted ? 'style="opacity:.5;"' : ''}>
      <td><b>${i + 1}</b></td>
      <td>
        <b>${escapeHtml(a.username)}</b>${isSelf ? ' <span class="muted">（我）</span>' : ''}
        ${a.displayName ? `<br><span class="muted" style="font-size:12px;">${escapeHtml(a.displayName)}</span>` : ''}
        ${isAdminRow ? '<br><span class="badge ok" style="font-size:10px;">admin' + (isMainAdmin ? ' · 主' : '') + '</span>' : ''}
        ${a.deleted ? '<br><span class="badge fail" style="font-size:10px;">已软删</span>' : ''}
      </td>
      <td>${escapeHtml(a.role)}</td>
      <td>${a.disabled ? '<span class="badge fail">已停用</span>' : '<span class="badge ok">正常</span>'}</td>
      <td>${mkBadge}</td>
      <td>${mk ? fmtTime(mk.createdAt) : '<span class="muted">—</span>'}</td>
      <td>${mk && mk.lastUsedAt ? fmtTime(mk.lastUsedAt) : '<span class="muted">—</span>'}</td>
      <td>${fmtTime(a.createdAt)}</td>
      <td>
        <button class="ghost primary-act" data-act="acct-view-key" data-id="${a.id}" title="从数据库取主 Key 明文">查看主 Key</button>
        <button class="ghost" data-act="acct-reroll" data-id="${a.id}" data-name="${escapeHtml(a.username)}" title="刷新：生成新主 Key，旧立即失效">刷新主 Key</button>
        <button class="ghost" data-act="acct-reset-pw" data-id="${a.id}" data-name="${escapeHtml(a.username)}" data-self="${isSelf ? 1 : 0}" data-disabled="${a.disabled ? 1 : 0}" title="${escapeHtml(resetPwTitle)}" ${resetPwDisabled ? 'disabled' : ''} style="${resetPwDisabled ? 'opacity:.4;cursor:not-allowed;' : ''}">重置密码</button>
        <button class="ghost danger" data-act="acct-delete" data-id="${a.id}" data-name="${escapeHtml(a.username)}" data-self="${isSelf ? 1 : 0}" data-main="${isMainAdmin ? 1 : 0}" title="${escapeHtml(delBtnTitle)}" ${delBtnDisabled ? 'disabled' : ''} style="${delBtnDisabled ? 'opacity:.4;cursor:not-allowed;' : ''}">删除</button>
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
      toast('已生成新主 Key，请立即复制保存', 'ok');
      openMainKeyModal({
        accountId: r.accountId,
        username: r.username,
        keyId: r.keyId,
        prefix: r.prefix,
        currentPlain: r.key,
        originalPlain: r.key,
        isOriginal: true,
        isReroll: true,
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
  $('#main-key-modal-title').textContent = (r.isReroll ? '已刷新主 Key · ' : '账号主 Key · ') + r.username;
  $('#main-key-modal-sub').innerHTML = r.isReroll
    ? '<span style="color:var(--warn);">旧主 Key 已立即失效，新主 Key 仅在此刻显示，请立即复制保存！</span>'
    : '主 Key 是该账号的「凭证钥匙」。admin 账号的主 Key 在 verify 时跨账号通杀。';
  $('#main-key-modal-hint').textContent = r.isReroll
    ? '旧主 Key 立即失效，所有正在使用该 Key 的业务服务将立即 401。'
    : '主 Key 是该账号的「凭证钥匙」。';
  $('#main-key-plain').textContent = r.currentPlain;
  if (r.originalPlain && r.originalPlain !== r.currentPlain) {
    $('#main-key-original').textContent = r.originalPlain;
    $('#main-key-original-row').hidden = false;
  } else {
    $('#main-key-original-row').hidden = true;
  }
  $('#main-key-modal').dataset.plain = r.currentPlain;
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
        originalPlain: r.mainKey.plain,
        isOriginal: true,
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
  const icon = document.querySelector('.theme-icon');
  if (icon) icon.textContent = t === 'dark' ? '☀️' : '🌙';
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
