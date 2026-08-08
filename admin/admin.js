/* 秋水居 · 编辑后台 · 前端逻辑（三栏 + 工具 + 图片库 + 草稿） */

const $ = (id) => document.getElementById(id);
const CAT_NAME = { code: '编程', reading: '阅读', photos: '摄影', essays: '随笔' };

let posts = [];
let tools = [];
let photos = [];
let currentSlug = null;
let currentToolIdx = null;
let view = '';            // '' code reading photos essays | tools | draft | media
let searchKw = '';
let dirty = false;

/* ---------------- 工具 ---------------- */
function toast(msg, isErr) {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'toast show' + (isErr ? ' err' : '');
  setTimeout(() => t.classList.remove('show'), 2200);
}
async function api(path, method = 'GET', data) {
  const opt = { method, headers: { 'Content-Type': 'application/json' } };
  if (data !== undefined) opt.body = JSON.stringify(data);
  return (await fetch(path, opt)).json();
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
}

/* ---------------- 数据加载 ---------------- */
async function loadAll() {
  const [p, t, ph] = await Promise.all([
    api('/api/posts'), api('/api/tools'), api('/api/photos'),
  ]);
  posts = p.posts || [];
  tools = t.tools || [];
  photos = ph.photos || [];
  renderNav();
  renderList();
  refreshStatus();
}

/* ---------------- 左侧导航 ---------------- */
function renderNav() {
  document.querySelectorAll('.nav-item').forEach(b => {
    b.classList.toggle('on', b.dataset.cat === view);
  });
}

/* ---------------- 中间列表 ---------------- */
function renderList() {
  const ul = $('postList');
  const kw = searchKw.toLowerCase();

  if (view === 'tools') {
    ul.innerHTML = tools.map((t, i) => `
      <li data-idx="${i}" class="${i === currentToolIdx ? 'on' : ''}">
        <div class="pl-title">${escapeHtml(t.name)}</div>
        <div class="pl-meta"><span class="pl-cat">${escapeHtml(t.kind || '工具')}</span></div>
      </li>`).join('') || '<li style="color:var(--ink-3);cursor:default">暂无工具</li>';
    ul.querySelectorAll('li[data-idx]').forEach(li => li.onclick = () => openTool(+li.dataset.idx));
    return;
  }

  if (view === 'media') {
    ul.innerHTML = photos.map(n => `
      <li data-name="${n}">
        <div class="pl-title" style="font-size:.82rem;word-break:break-all">${escapeHtml(n)}</div>
        <img class="pl-thumb" src="/photos/${n}" alt="">
      </li>`).join('') || '<li style="color:var(--ink-3);cursor:default">暂无图片</li>';
    return;
  }

  let list = posts;
  if (view === 'draft') list = posts.filter(p => p.draft);
  else if (view) list = posts.filter(p => p.cat === view && !p.draft);
  else list = posts.filter(p => !p.draft);

  if (kw) list = list.filter(p => p.title.toLowerCase().includes(kw) || (p.tags||[]).join('').toLowerCase().includes(kw));

  ul.innerHTML = list.map(p => `
    <li data-slug="${p.slug}" class="${p.slug === currentSlug ? 'on' : ''}">
      <div class="pl-title">${escapeHtml(p.title)}</div>
      <div class="pl-meta">
        <span class="pl-cat">${CAT_NAME[p.cat] || p.cat}</span>
        <span>${p.date}</span>
        <span>${p.words}字</span>
        ${p.draft ? '<span class="pl-badge b-draft">草稿</span>' : ''}
        ${p.broken ? '<span class="pl-badge b-broken">缺头部</span>' : ''}
      </div>
      ${p.img ? `<img class="pl-thumb" src="/photos/${(p.img.match(/photos\/(.+)$/)||[])[1] || ''}" onerror="this.remove()">` : ''}
    </li>`).join('') || '<li style="color:var(--ink-3);cursor:default;padding:1rem">这里空空如也</li>';

  ul.querySelectorAll('li[data-slug]').forEach(li => li.onclick = () => openPost(li.dataset.slug));
}

/* ---------------- 文章编辑 ---------------- */
function openPost(slug) {
  const p = posts.find(x => x.slug === slug);
  if (!p) return;
  currentSlug = slug;
  api('/api/post/' + encodeURIComponent(slug)).then(({ meta, body }) => {
    showEditor('post');
    $('fTitle').value = meta.title || '';
    $('fCat').value = meta.cat || 'essays';
    $('fDate').value = meta.date || todayStr();
    $('fSlug').value = slug;
    $('fTags').value = Array.isArray(meta.tags) ? meta.tags.join(', ') : (meta.tags || '');
    $('fExcerpt').value = meta.excerpt || '';
    $('fDraft').checked = meta.draft === 'true' || meta.draft === true;
    $('fPoem').value = meta.poem || '';
    $('fSeason').value = meta.season || '秋';
    $('fImg').value = meta.img || '';
    $('fBody').value = body || '';
    dirty = false;
    togglePhotoExtra(); renderImgPreview(); renderPreview(); updateCount();
    renderList();
  });
}

function newPost() {
  currentSlug = null;
  showEditor('post');
  $('fTitle').value = '';
  $('fCat').value = (view && CAT_NAME[view]) ? view : 'essays';
  $('fDate').value = todayStr();
  $('fSlug').value = '';
  $('fTags').value = ''; $('fExcerpt').value = '';
  $('fDraft').checked = false;
  $('fPoem').value = ''; $('fImg').value = ''; $('fBody').value = '';
  dirty = false;
  togglePhotoExtra(); renderImgPreview(); renderPreview(); updateCount();
  $('fTitle').focus();
  renderList();
}

function showEditor(which) {
  $('editorEmpty').style.display = 'none';
  $('editorBody').style.display = which === 'post' ? 'block' : 'none';
  $('toolBody').style.display = which === 'tool' ? 'block' : 'none';
}
function togglePhotoExtra() { $('photoExtra').style.display = $('fCat').value === 'photos' ? 'block' : 'none'; }

/* Markdown 预览（段落 + 图片 + 标题 + 加粗） */
function renderPreview() {
  const text = $('fBody').value;
  const paras = text.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
  $('fPreview').innerHTML = paras.map(p => {
    let h = escapeHtml(p);
    h = h.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (m, a, src) => {
      const local = src.match(/photos\/(.+)$/);
      return `<img src="${local ? '/photos/' + local[1] : src}" alt="${a}">`;
    });
    h = h.replace(/^### (.+)$/gm, '<h3>$1</h3>').replace(/^## (.+)$/gm, '<h2>$1</h2>').replace(/^# (.+)$/gm, '<h1>$1</h1>');
    h = h.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    return /^<h\d|^<img/.test(h) ? h : `<p>${h.replace(/\n/g, '<br>')}</p>`;
  }).join('');
}

function updateCount() {
  const n = $('fBody').value.replace(/\s/g, '').length;
  $('wordCount').textContent = n ? `正文 ${n} 字` : '';
}

async function savePost() {
  const slug = $('fSlug').value.trim();
  if (!slug) { toast('请填 slug（小写英文+连字符）', true); $('fSlug').focus(); return; }
  if (!/^[a-z0-9-]+$/.test(slug)) { toast('slug 只能用小写英文、数字、连字符', true); return; }
  if (!$('fTitle').value.trim()) { toast('请填标题', true); $('fTitle').focus(); return; }

  const meta = {
    title: $('fTitle').value.trim(),
    cat: $('fCat').value,
    date: $('fDate').value.trim() || todayStr(),
    tags: $('fTags').value.split(/[,，]/).map(s => s.trim()).filter(Boolean),
    excerpt: $('fExcerpt').value.trim(),
  };
  if ($('fDraft').checked) meta.draft = 'true';
  if (meta.cat === 'photos') {
    meta.img = $('fImg').value.trim();
    meta.poem = $('fPoem').value.trim();
    meta.season = $('fSeason').value;
  }
  const r = await api('/api/save', 'POST', { slug, oldSlug: currentSlug, meta, body: $('fBody').value });
  if (r.ok) {
    toast($('fDraft').checked ? '已存为草稿' : '已保存');
    currentSlug = slug; dirty = false;
    loadAll();
  } else toast(r.error || '保存失败', true);
}

async function deletePost() {
  if (!currentSlug) { toast('这是未保存的新文章', true); return; }
  if (!confirm(`确定删除「${$('fTitle').value}」吗？此操作不可恢复。`)) return;
  await api('/api/delete', 'POST', { slug: currentSlug });
  toast('已删除');
  currentSlug = null; dirty = false;
  newPost(); loadAll();
}

/* ---------------- 工具编辑 ---------------- */
function openTool(idx) {
  currentToolIdx = idx;
  const t = tools[idx];
  showEditor('tool');
  $('toolEdTitle').textContent = '编辑工具';
  $('tName').value = t.name || ''; $('tKind').value = t.kind || '';
  $('tUrl').value = t.url || ''; $('tDesc').value = t.desc || '';
  renderList();
}
function newTool() {
  currentToolIdx = null;
  showEditor('tool');
  $('toolEdTitle').textContent = '新工具';
  $('tName').value = ''; $('tKind').value = ''; $('tUrl').value = ''; $('tDesc').value = '';
  $('tName').focus();
  renderList();
}
async function saveTool() {
  const name = $('tName').value.trim();
  if (!name) { toast('请填名称', true); return; }
  const item = { name, kind: $('tKind').value.trim(), url: $('tUrl').value.trim(), desc: $('tDesc').value.trim() };
  if (currentToolIdx === null) tools.push(item); else tools[currentToolIdx] = item;
  await api('/api/tools', 'POST', { tools });
  toast('已保存');
  loadAll();
}
async function deleteTool() {
  if (currentToolIdx === null) { toast('这是未保存的新工具', true); return; }
  if (!confirm(`删除工具「${tools[currentToolIdx].name}」？`)) return;
  tools.splice(currentToolIdx, 1);
  await api('/api/tools', 'POST', { tools });
  toast('已删除');
  currentToolIdx = null; newTool(); loadAll();
}

/* ---------------- 图片 ---------------- */
function pickImage() { $('fileInput').click(); }
$('fileInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  toast('处理图片中…');
  try {
    const { dataUrl, name } = await processImage(file);
    const r = await api('/api/upload', 'POST', { name, data: dataUrl.split(',')[1] });
    if (r.ok) { $('fImg').value = r.path; renderImgPreview(); toast('已上传：' + name); loadAll(); }
    else toast('上传失败', true);
  } catch (err) { toast('图片处理失败：' + err.message, true); }
  e.target.value = '';
});

function processImage(file) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      let { width: w, height: h } = img;
      const target = 3 / 2;
      let sx = 0, sy = 0, sw = w, sh = h;
      if (w / h > target) { sw = h * target; sx = (w - sw) / 2; }
      else { sh = w / target; sy = (h - sh) * 0.42; }
      let dw = sw, dh = sh;
      if (dw > 1600) { dh = dh * 1600 / dw; dw = 1600; }
      const c = document.createElement('canvas');
      c.width = dw; c.height = dh;
      c.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
      const base = file.name.replace(/\.[^.]+$/, '').replace(/[^\w-]/g, '-').toLowerCase();
      res({ dataUrl: c.toDataURL('image/jpeg', 0.82), name: base + '.jpg' });
    };
    img.onerror = () => rej(new Error('无法读取图片'));
    img.src = URL.createObjectURL(file);
  });
}

function renderImgPreview() {
  const v = $('fImg').value.trim();
  const m = v.match(/photos\/(.+)$/);
  $('imgPreview').innerHTML = m ? `<img src="/photos/${m[1]}" alt="">` : '<span class="img-none">暂无配图</span>';
}

function openMedia(pickMode) {
  const grid = $('mediaGrid');
  grid.innerHTML = photos.map(n => `
    <div class="media-item" data-name="${n}">
      <img src="/photos/${n}" alt="">
      <span class="m-name">${escapeHtml(n)}</span>
      <button class="m-del" data-del="${n}" title="删除">✕</button>
    </div>`).join('') || '<p style="color:var(--ink-3);grid-column:1/-1;text-align:center;padding:2rem">图片库为空</p>';
  grid.querySelectorAll('.media-item').forEach(item => {
    item.querySelector('img').onclick = () => {
      if (pickMode) {
        $('fImg').value = 'assets/photos/' + item.dataset.name;
        renderImgPreview();
        closeMask('mediaMask');
      }
    };
    const del = item.querySelector('[data-del]');
    del.onclick = async (e) => {
      e.stopPropagation();
      if (!confirm(`删除图片 ${item.dataset.name}？`)) return;
      await api('/api/photo-delete', 'POST', { name: item.dataset.name });
      toast('已删除');
      loadAll().then(() => openMedia(pickMode));
    };
  });
  $('mediaMask').style.display = 'flex';
}

/* ---------------- 构建 / 发布 ---------------- */
function showLog(title, html) {
  $('logTitle').textContent = title;
  $('logcontent').innerHTML = html;
  $('logmask').style.display = 'flex';
}
async function build() {
  showLog('构建', '运行 node build.js …');
  const r = await api('/api/build', 'POST');
  showLog('构建', `<span class="${r.ok ? 'ok' : 'fail'}">${r.ok ? '✓ 构建成功' : '✗ 构建失败'}</span>\n\n${escapeHtml(r.log)}`);
  refreshStatus();
}
async function publish() {
  const msg = prompt('提交信息（留空用默认）:', '');
  if (msg === null) return;
  showLog('发布', '构建并推送中，请稍候…');
  const r = await api('/api/publish', 'POST', { message: msg });
  let html = '';
  for (const s of r.steps || []) html += `<span class="${s.ok ? 'ok' : 'fail'}">${s.ok ? '✓' : '✗'} ${s.name}</span>\n${escapeHtml(s.log || '')}\n\n`;
  html += r.ok ? '\n<span class="ok">✓ 已发布，约 1 分钟后线上更新</span>'
               : '\n<span class="fail">✗ 发布未完全成功，检查上面日志（git 凭证是否配置）</span>';
  showLog('发布', html);
  refreshStatus();
}
async function refreshStatus() {
  const r = await api('/api/status');
  const n = (r.out || '').split('\n').filter(Boolean).length;
  $('gitStatus').textContent = n ? `${n} 个未提交改动` : '工作区干净';
}

function closeMask(id) { $(id).style.display = 'none'; }

/* ---------------- 事件 ---------------- */
document.querySelectorAll('.nav-item').forEach(b => {
  b.onclick = () => {
    view = b.dataset.cat;
    currentSlug = null; currentToolIdx = null;
    renderNav(); renderList();
    if (view === 'tools') newTool();
    else if (view === 'media') { showEditor(null); $('editorEmpty').style.display = 'flex'; }
    else newPost();
  };
});
$('btnNew').onclick = () => { if (view === 'tools') newTool(); else newPost(); };
$('btnSave').onclick = savePost;
$('btnDelete').onclick = deletePost;
$('btnToolSave').onclick = saveTool;
$('btnToolDelete').onclick = deleteTool;
$('btnBuild').onclick = build;
$('btnPublish').onclick = publish;
$('btnUpload').onclick = pickImage;
$('btnPickLib').onclick = () => openMedia(true);
$('fCat').onchange = togglePhotoExtra;
$('fBody').oninput = () => { renderPreview(); updateCount(); dirty = true; };
$('fImg').oninput = renderImgPreview;
['fTitle','fSlug','fDate','fTags','fExcerpt','fPoem'].forEach(id => $(id).oninput = () => dirty = true);
$('search').oninput = (e) => { searchKw = e.target.value.trim(); renderList(); };
document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => closeMask(b.dataset.close));

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    if ($('editorBody').style.display !== 'none') savePost();
    else if ($('toolBody').style.display !== 'none') saveTool();
  }
});
window.addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

loadAll();
