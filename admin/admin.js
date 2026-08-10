/* 秋水居 · 案头 主逻辑：视图路由 + 仪表盘/文章/图库/工具/发布 */
/* global EditorKit */
'use strict';

/* ---------- 基础设施 ---------- */
const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => [...(el || document).querySelectorAll(s)];

async function api(path, method, data) {
  const res = await fetch(path, {
    method: method || 'GET',
    headers: data !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || ('HTTP ' + res.status));
  return json;
}

function toast(msg, isErr) {
  const t = document.createElement('div');
  t.className = 'toast' + (isErr ? ' err' : '');
  t.textContent = msg;
  $('#toast-root').appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* 图片前端压缩：maxSide 限最长边；crop32 时先居中裁 3:2（摄影图库用） */
function processImage(file, { maxSide = 1600, crop32 = false } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let sx = 0, sy = 0, sw = img.width, sh = img.height;
      if (crop32) {
        const target = 3 / 2;
        if (sw / sh > target) { const w2 = sh * target; sx = (sw - w2) / 2; sw = w2; }
        else { const h2 = sw / target; sy = (sh - h2) / 2; sh = h2; }
      }
      const scale = Math.min(1, maxSide / Math.max(sw, sh));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(sw * scale);
      canvas.height = Math.round(sh * scale);
      canvas.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]);
    };
    img.onerror = () => reject(new Error('图片读取失败'));
    img.src = URL.createObjectURL(file);
  });
}

async function uploadPhoto(file, crop32) {
  const data = await processImage(file, { crop32 });
  const r = await api('/api/upload', 'POST', { name: file.name.replace(/\.\w+$/, '.jpg'), data });
  return r.path;
}

/* ---------- 全局状态 ---------- */
const state = {
  view: '',           // 初始为空，保证启动时 switchView('dashboard') 真正渲染
  posts: [],
  current: null,      // 当前打开的文章 { slug, meta, body } 或 null
  kit: null,          // EditorKit 实例
  dirty: false,
};

function setDirty(v) {
  state.dirty = v;
  const el = $('#ed-dirty');
  if (el) el.textContent = v ? '● 未保存' : '已保存';
  if (el) el.className = v ? 'dirty' : '';
}

function guardDirty() {
  return !state.dirty || window.confirm('有未保存的修改，确定离开吗？');
}

window.addEventListener('beforeunload', (e) => {
  if (state.dirty) { e.preventDefault(); e.returnValue = ''; }
});

/* ---------- 路由 ---------- */
const VIEWS = {
  dashboard: { list: null, main: renderDashboard },
  posts: { list: renderPostList, main: renderEditorWelcome },
  gallery: { list: null, main: renderGallery },
  tools: { list: null, main: renderTools },
  publish: { list: null, main: renderPublish },
};

function switchView(name) {
  if (name === state.view) return;
  if (!guardDirty()) return;
  state.view = name;
  state.current = null;
  state.kit = null;
  setDirtyFalseSafe();
  $$('#side button').forEach(b => b.classList.toggle('on', b.dataset.view === name));
  $('#list-panel').innerHTML = '';
  $('#list-panel').style.display = VIEWS[name].list ? '' : 'none';
  $('#app').style.gridTemplateColumns = VIEWS[name].list ? '60px 280px 1fr' : '60px 0 1fr';
  if (VIEWS[name].list) VIEWS[name].list();
  VIEWS[name].main();
}

function setDirtyFalseSafe() { state.dirty = false; }

/* ---------- 仪表盘 ---------- */
async function renderDashboard() {
  const w = $('#workspace');
  w.innerHTML = '<h2 class="view-title">仪表盘</h2><p class="muted">加载中…</p>';
  try {
    const [stats, { posts }] = await Promise.all([api('/api/stats'), api('/api/posts')]);
    state.posts = posts;
    const recent = posts.slice(0, 5);
    w.innerHTML = `
      <h2 class="view-title">仪表盘</h2>
      <div class="stat-cards">
        <div class="stat-card"><div class="n">${stats.total}</div><div class="l">文章</div></div>
        <div class="stat-card"><div class="n">${stats.drafts}</div><div class="l">草稿</div></div>
        <div class="stat-card"><div class="n">${stats.words}</div><div class="l">总字数</div></div>
        <div class="stat-card"><div class="n">${stats.photos}</div><div class="l">图片</div></div>
      </div>
      <div class="panel">
        <h3>Git 状态</h3>
        ${stats.gitDirty ? `<div class="log">${esc(stats.gitDirty)}</div>` : '<p class="muted">工作区干净，无未提交变更。</p>'}
      </div>
      <div class="panel">
        <h3>最近文章</h3>
        ${recent.map(p => `<div class="step-line">${esc(p.date)} · ${esc(p.title)}${p.draft ? ' <span style="color:var(--cinnabar)">[草稿]</span>' : ''}</div>`).join('')}
      </div>
      <div class="panel">
        <h3>快捷操作</h3>
        <button class="btn primary" id="dash-new">写新篇</button>
        <button class="btn" id="dash-publish">前往发布</button>
      </div>`;
    $('#dash-new').addEventListener('click', () => { switchView('posts'); newPost(); });
    $('#dash-publish').addEventListener('click', () => switchView('publish'));
  } catch (e) {
    w.innerHTML = `<h2 class="view-title">仪表盘</h2><p class="muted">加载失败：${esc(e.message)}</p>`;
  }
}

/* ---------- 文章模块 ---------- */
const CATS = { code: '编程', reading: '阅读', essays: '随笔', photos: '摄影' };

async function renderPostList() {
  const lp = $('#list-panel');
  lp.innerHTML = `
    <div class="list-head">
      <input type="search" id="post-search" placeholder="搜索标题…">
      <select id="post-cat">
        <option value="">全部</option>
        ${Object.entries(CATS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
      </select>
    </div>
    <button class="btn primary" id="post-new" style="width:100%;margin-bottom:10px">＋ 新文章</button>
    <div id="post-items"><p class="muted">加载中…</p></div>`;
  $('#post-new').addEventListener('click', newPost);
  $('#post-search').addEventListener('input', paintPostItems);
  $('#post-cat').addEventListener('change', paintPostItems);
  const { posts } = await api('/api/posts');
  state.posts = posts;
  paintPostItems();
}

function paintPostItems() {
  const q = ($('#post-search').value || '').toLowerCase();
  const cat = $('#post-cat').value;
  const items = state.posts.filter(p =>
    (!cat || p.cat === cat) && (!q || p.title.toLowerCase().includes(q)));
  $('#post-items').innerHTML = items.map(p => `
    <div class="post-item ${state.current && state.current.slug === p.slug ? 'on' : ''}" data-slug="${esc(p.slug)}">
      <div class="t">${esc(p.title)}</div>
      <div class="m">${esc(p.date)} · ${CATS[p.cat] || p.cat} · ${p.words}字 ${p.draft ? '<span class="draft-tag">[草稿]</span>' : ''}</div>
    </div>`).join('') || '<p class="muted">没有匹配的文章。</p>';
  $$('#post-items .post-item').forEach(el =>
    el.addEventListener('click', () => openPost(el.dataset.slug)));
}

function renderEditorWelcome() {
  $('#workspace').innerHTML = `
    <h2 class="view-title">文章</h2>
    <p class="muted">从左侧选择一篇文章，或点击「＋ 新文章」。</p>`;
}

function newPost() {
  if (!guardDirty()) return;
  const today = new Date();
  const date = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
  openEditor({ slug: null, meta: { title: '', cat: 'essays', date, tags: [], excerpt: '' }, body: '' });
}

async function openPost(slug) {
  if (!guardDirty()) return;
  try {
    const { meta, body } = await api('/api/post/' + encodeURIComponent(slug));
    openEditor({ slug, meta, body });
  } catch (e) {
    toast('打开失败：' + e.message, true);
  }
}

function openEditor(post) {
  state.current = post;
  const m = post.meta;
  const isPhoto = m.cat === 'photos';
  $('#workspace').innerHTML = `
    <div class="ed-meta">
      <div class="field"><label>标题</label><input id="m-title" value="${esc(m.title || '')}"></div>
      <div class="field"><label>SLUG（小写英文/数字/连字符）</label><input id="m-slug" value="${esc(post.slug || '')}" placeholder="my-post"></div>
      <div class="field"><label>板块</label><select id="m-cat">
        ${Object.entries(CATS).map(([k, v]) => `<option value="${k}" ${k === m.cat ? 'selected' : ''}>${v}</option>`).join('')}
      </select></div>
      <div class="field"><label>日期</label><input id="m-date" value="${esc(m.date || '')}" placeholder="2026.08.10"></div>
      <div class="field"><label>标签（逗号分隔）</label><input id="m-tags" value="${esc((m.tags || []).join(', '))}"></div>
      <div class="field"><label>草稿</label><select id="m-draft">
        <option value="">发布</option><option value="true" ${String(m.draft) === 'true' ? 'selected' : ''}>草稿</option>
      </select></div>
      <div class="field wide"><label>摘要</label><input id="m-excerpt" value="${esc(m.excerpt || '')}"></div>
      <div class="field wide photo-only" style="display:${isPhoto ? '' : 'none'}"><label>配图路径（摄影文）</label><input id="m-img" value="${esc(m.img || '')}" placeholder="assets/photos/xxx.jpg"></div>
      <div class="field photo-only" style="display:${isPhoto ? '' : 'none'}"><label>图注诗</label><input id="m-poem" value="${esc(m.poem || '')}"></div>
      <div class="field photo-only" style="display:${isPhoto ? '' : 'none'}"><label>季节字</label><input id="m-season" value="${esc(m.season || '')}" placeholder="秋"></div>
    </div>
    <div class="ed-toolbar" id="ed-toolbar"></div>
    <div id="ed-mount"></div>
    <div class="ed-statusbar">
      <span id="ed-words">0 字</span>
      <span id="ed-dirty"></span>
      <span>
        ${post.slug ? '<button class="btn danger" id="ed-delete">删除</button> ' : ''}
        <button class="btn primary" id="ed-save">保存</button>
      </span>
    </div>`;

  $('#m-cat').addEventListener('change', () => {
    const show = $('#m-cat').value === 'photos';
    $$('.photo-only').forEach(el => { el.style.display = show ? '' : 'none'; });
    setDirty(true);
  });
  $$('.ed-meta input, .ed-meta select').forEach(el =>
    el.addEventListener('input', () => setDirty(true)));

  state.kit = EditorKit.create({
    mount: $('#ed-mount'),
    toolbar: $('#ed-toolbar'),
    body: post.body,
    onDirty: () => { setDirty(true); paintWords(); },
    loadPhotos: async () => (await api('/api/photos')).photos,
    uploadImage: (file) => uploadPhoto(file, false),
  });

  setDirty(false);
  paintWords();
  $('#ed-save').addEventListener('click', saveCurrent);
  const del = $('#ed-delete');
  if (del) del.addEventListener('click', deleteCurrent);
  paintPostItems();
}

function paintWords() {
  if (!state.kit) return;
  const n = state.kit.getMarkdown().replace(/\s/g).length;
  $('#ed-words').textContent = n + ' 字';
}

function collectMeta() {
  const cat = $('#m-cat').value;
  const meta = {
    title: $('#m-title').value.trim(),
    cat,
    date: $('#m-date').value.trim(),
    tags: $('#m-tags').value.split(/[,，]/).map(s => s.trim()).filter(Boolean),
    excerpt: $('#m-excerpt').value.trim(),
  };
  if ($('#m-draft').value) meta.draft = 'true';
  if (cat === 'photos') {
    meta.img = $('#m-img').value.trim();
    meta.poem = $('#m-poem').value.trim();
    meta.season = $('#m-season').value.trim();
  }
  return meta;
}

async function saveCurrent() {
  const slug = $('#m-slug').value.trim();
  try {
    await api('/api/save', 'POST', {
      slug,
      oldSlug: state.current.slug,
      meta: collectMeta(),
      body: state.kit.getMarkdown(),
    });
    state.current.slug = slug;
    setDirty(false);
    toast('已保存 posts/' + slug + '.md');
    const { posts } = await api('/api/posts');
    state.posts = posts;
    if ($('#post-items')) paintPostItems();
  } catch (e) {
    toast('保存失败：' + e.message, true);
  }
}

async function deleteCurrent() {
  if (!window.confirm(`确定删除「${state.current.meta.title || state.current.slug}」？文件删除后不可恢复。`)) return;
  try {
    await api('/api/delete', 'POST', { slug: state.current.slug });
    toast('已删除');
    state.current = null;
    state.kit = null;
    setDirtyFalseSafe();
    const { posts } = await api('/api/posts');
    state.posts = posts;
    paintPostItems();
    renderEditorWelcome();
  } catch (e) {
    toast('删除失败：' + e.message, true);
  }
}

/* ---------- 图库 ---------- */
async function renderGallery() {
  const w = $('#workspace');
  w.innerHTML = `
    <h2 class="view-title">图库</h2>
    <p class="muted">上传自动压缩到最长边 1600px 并居中裁 3:2。点击卡片复制站点路径。</p>
    <p><label class="btn primary">上传图片
      <input type="file" id="gallery-upload" accept="image/jpeg,image/png" multiple hidden>
    </label></p>
    <div class="gallery-grid" id="gallery-grid"><p class="muted">加载中…</p></div>`;
  $('#gallery-upload').addEventListener('change', async (e) => {
    for (const file of e.target.files) {
      try {
        await uploadPhoto(file, true);
        toast('已上传 ' + file.name);
      } catch (err) {
        toast('上传失败：' + err.message, true);
      }
    }
    renderGallery();
  });
  const { photos } = await api('/api/photos');
  $('#gallery-grid').innerHTML = photos.map(n => `
    <div class="gallery-card">
      <img src="/photos/${encodeURIComponent(n)}" data-path="assets/photos/${esc(n)}" alt="${esc(n)}">
      <div class="ops">
        <span class="muted">${esc(n)}</span>
        <button class="btn danger" data-del="${esc(n)}">删</button>
      </div>
    </div>`).join('') || '<p class="muted">图库为空。</p>';
  $$('#gallery-grid img').forEach(img => img.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(img.dataset.path); toast('已复制 ' + img.dataset.path); }
    catch { toast(img.dataset.path); }
  }));
  $$('#gallery-grid [data-del]').forEach(btn => btn.addEventListener('click', async () => {
    if (!window.confirm('删除图片 ' + btn.dataset.del + '？')) return;
    try {
      await api('/api/photo-delete', 'POST', { name: btn.dataset.del });
      toast('已删除');
      renderGallery();
    } catch (e) { toast('删除失败：' + e.message, true); }
  }));
}

/* ---------- 工具清单 ---------- */
async function renderTools() {
  const w = $('#workspace');
  w.innerHTML = '<h2 class="view-title">工具清单</h2><p class="muted">加载中…</p>';
  const { tools } = await api('/api/tools');
  w.innerHTML = `
    <h2 class="view-title">工具清单</h2>
    <p class="muted">首页「案头」栏目内容，保存后需重新构建生效。</p>
    <table class="tools-table"><tbody id="tools-body"></tbody></table>
    <p style="margin-top:12px">
      <button class="btn" id="tools-add">＋ 加一行</button>
      <button class="btn primary" id="tools-save">保存</button>
    </p>`;
  const body = $('#tools-body');
  const row = (t = {}) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input data-k="name" value="${esc(t.name || '')}" placeholder="名称"></td>
      <td><input data-k="kind" value="${esc(t.kind || '')}" placeholder="分类"></td>
      <td style="width:42%"><input data-k="desc" value="${esc(t.desc || '')}" placeholder="一句话描述"></td>
      <td><input data-k="url" value="${esc(t.url || '')}" placeholder="https://…"></td>
      <td><button class="btn danger">删</button></td>`;
    tr.querySelector('button').addEventListener('click', () => tr.remove());
    body.appendChild(tr);
  };
  tools.forEach(t => row(t));
  $('#tools-add').addEventListener('click', () => row());
  $('#tools-save').addEventListener('click', async () => {
    const list = $$('#tools-body tr').map(tr => {
      const o = {};
      $$('input', tr).forEach(i => { o[i.dataset.k] = i.value.trim(); });
      return o;
    }).filter(t => t.name);
    try {
      await api('/api/tools', 'POST', { tools: list });
      toast('已保存工具清单');
    } catch (e) { toast('保存失败：' + e.message, true); }
  });
}

/* ---------- 发布 ---------- */
async function renderPublish() {
  const w = $('#workspace');
  w.innerHTML = `
    <h2 class="view-title">发布</h2>
    <div class="panel">
      <h3>Git 状态</h3>
      <div id="pub-status"><p class="muted">查询中…</p></div>
    </div>
    <div class="panel">
      <h3>操作</h3>
      <div class="field"><label>提交信息（可空，默认「更新 + 时间」）</label>
        <input id="pub-msg" placeholder="新文章《…》"></div>
      <button class="btn" id="pub-build">仅构建（本地预览）</button>
      <button class="btn primary" id="pub-push">构建并推送上线</button>
    </div>
    <div id="pub-log"></div>`;
  try {
    const { out } = await api('/api/status');
    $('#pub-status').innerHTML = out.trim()
      ? `<div class="log">${esc(out)}</div>` : '<p class="muted">工作区干净。</p>';
  } catch (e) {
    $('#pub-status').innerHTML = `<p class="muted">查询失败：${esc(e.message)}</p>`;
  }

  const showSteps = (steps) => {
    $('#pub-log').innerHTML = steps.map(s => `
      <div class="step-line ${s.ok ? 'ok' : 'fail'}">${esc(s.name)}${s.ok ? '' : ' 失败'}</div>
      <div class="log">${esc(s.log || '（无输出）')}</div>`).join('');
  };

  $('#pub-build').addEventListener('click', async () => {
    $('#pub-log').innerHTML = '<p class="muted">构建中…</p>';
    try {
      const r = await api('/api/build', 'POST', {});
      showSteps([{ name: '构建', ok: r.ok, log: r.log }]);
    } catch (e) { toast('构建失败：' + e.message, true); }
  });

  $('#pub-push').addEventListener('click', async () => {
    if (!window.confirm('将执行 构建 → git 提交 → git push，确定？')) return;
    $('#pub-log').innerHTML = '<p class="muted">发布中…</p>';
    try {
      const r = await api('/api/publish', 'POST', { message: $('#pub-msg').value.trim() });
      showSteps(r.steps);
      toast(r.ok ? '已推送上线' : '发布中断，见日志', !r.ok);
    } catch (e) { toast('发布失败：' + e.message, true); }
  });
}

/* ---------- 启动 ---------- */
$$('#side button').forEach(b => b.addEventListener('click', () => switchView(b.dataset.view)));
switchView('dashboard');
