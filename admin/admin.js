/* 秋水居 · 编辑后台 · 前端逻辑 */

const $ = (id) => document.getElementById(id);
const CAT_NAME = { code: '编程', reading: '阅读', photos: '摄影', essays: '随笔' };

let posts = [];
let currentSlug = null;   // 正在编辑的文章 slug
let filterCat = '';
let searchKw = '';

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
  const r = await fetch(path, opt);
  return r.json();
}

/* ---------------- 列表 ---------------- */
async function loadPosts() {
  const r = await api('/api/posts');
  posts = r.posts || [];
  renderList();
  refreshStatus();
}

function renderList() {
  const ul = $('postList');
  const kw = searchKw.toLowerCase();
  const list = posts.filter(p =>
    (!filterCat || p.cat === filterCat) &&
    (!kw || p.title.toLowerCase().includes(kw) || (p.tags || []).join('').toLowerCase().includes(kw))
  );
  ul.innerHTML = list.map(p => `
    <li data-slug="${p.slug}" class="${p.slug === currentSlug ? 'on' : ''}">
      <div class="pl-title">${p.broken ? '⚠ ' : ''}${escapeHtml(p.title)}</div>
      <div class="pl-meta">
        <span class="pl-cat">${CAT_NAME[p.cat] || p.cat}</span>
        <span>${p.date}</span>
        <span>${p.words}字</span>
        ${p.broken ? '<span style="color:#b23a24">缺头部信息</span>' : ''}
      </div>
    </li>`).join('');
  ul.querySelectorAll('li').forEach(li => {
    li.onclick = () => openPost(li.dataset.slug);
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------------- 编辑器 ---------------- */
function openPost(slug) {
  const p = posts.find(x => x.slug === slug);
  if (!p) return;
  currentSlug = slug;
  api('/api/post/' + encodeURIComponent(slug)).then(({ meta, body }) => {
    fillEditor(meta, body, slug);
    renderList();
  });
}

function fillEditor(meta, body, slug) {
  $('editorEmpty').style.display = 'none';
  $('editorBody').style.display = 'block';
  $('fTitle').value = meta.title || '';
  $('fCat').value = meta.cat || 'essays';
  $('fDate').value = meta.date || todayStr();
  $('fSlug').value = slug;
  $('fSlug').disabled = false;
  $('fTags').value = Array.isArray(meta.tags) ? meta.tags.join(', ') : (meta.tags || '');
  $('fExcerpt').value = meta.excerpt || '';
  $('fPoem').value = meta.poem || '';
  $('fSeason').value = meta.season || '秋';
  $('fImg').value = meta.img || '';
  $('fBody').value = body || '';
  togglePhotoExtra();
  renderImgPreview();
  renderPreview();
  updateCount();
}

function newPost() {
  currentSlug = null;
  $('editorEmpty').style.display = 'none';
  $('editorBody').style.display = 'block';
  $('fTitle').value = '';
  $('fCat').value = 'essays';
  $('fDate').value = todayStr();
  $('fSlug').value = '';
  $('fSlug').disabled = false;
  $('fTags').value = '';
  $('fExcerpt').value = '';
  $('fPoem').value = '';
  $('fImg').value = '';
  $('fBody').value = '';
  togglePhotoExtra();
  renderImgPreview();
  renderPreview();
  updateCount();
  $('fTitle').focus();
  renderList();
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function togglePhotoExtra() {
  $('photoExtra').style.display = $('fCat').value === 'photos' ? 'block' : 'none';
}

/* 预览：简单的 Markdown 段落渲染（够用于随笔） */
function renderPreview() {
  const text = $('fBody').value;
  const paras = text.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
  $('fPreview').innerHTML = paras.map(p => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`).join('');
}

function updateCount() {
  const n = $('fBody').value.replace(/\s/g, '').length;
  $('wordCount').textContent = n ? `正文 ${n} 字` : '';
}

/* ---------------- 保存 / 删除 ---------------- */
async function save() {
  const slug = $('fSlug').value.trim();
  if (!slug) { toast('请填 slug（网址用，小写英文+连字符）', true); return; }
  if (!$('fTitle').value.trim()) { toast('请填标题', true); return; }

  const meta = {
    title: $('fTitle').value.trim(),
    cat: $('fCat').value,
    date: $('fDate').value.trim() || todayStr(),
    tags: $('fTags').value.split(/[,，]/).map(s => s.trim()).filter(Boolean),
    excerpt: $('fExcerpt').value.trim(),
  };
  if (meta.cat === 'photos') {
    meta.img = $('fImg').value.trim();
    meta.poem = $('fPoem').value.trim();
    meta.season = $('fSeason').value;
  }
  const r = await api('/api/save', 'POST', {
    slug, oldSlug: currentSlug, meta, body: $('fBody').value,
  });
  if (r.ok) {
    toast(currentSlug && currentSlug !== slug ? '已保存（slug 已改）' : '已保存');
    currentSlug = slug;
    loadPosts();
  } else {
    toast(r.error || '保存失败', true);
  }
}

async function del() {
  if (!currentSlug) { toast('这是未保存的新文章', true); return; }
  if (!confirm(`确定删除「${$('fTitle').value}」吗？此操作不可恢复。`)) return;
  await api('/api/delete', 'POST', { slug: currentSlug });
  toast('已删除');
  currentSlug = null;
  newPost();
  loadPosts();
}

/* ---------------- 图片上传（前端压缩裁 3:2） ---------------- */
function pickImage() { $('fileInput').click(); }

$('fileInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  toast('处理图片中…');
  try {
    const { dataUrl, name } = await processImage(file);
    const base64 = dataUrl.split(',')[1];
    const r = await api('/api/upload', 'POST', { name, data: base64 });
    if (r.ok) {
      $('fImg').value = r.path;
      renderImgPreview();
      toast('图片已上传：' + name);
    } else {
      toast('上传失败', true);
    }
  } catch (err) {
    toast('图片处理失败：' + err.message, true);
  }
  e.target.value = '';
});

function processImage(file) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      let { width: w, height: h } = img;
      const target = 3 / 2;
      const c = document.createElement('canvas');
      let sx = 0, sy = 0, sw = w, sh = h;
      if (w / h > target) { sw = h * target; sx = (w - sw) / 2; }
      else { sh = w / target; sy = (h - sh) * 0.42; }
      let dw = sw, dh = sh;
      if (dw > 1600) { dh = dh * 1600 / dw; dw = 1600; }
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
  const m = v.match(/assets\/photos\/(.+)$/);
  $('imgPreview').innerHTML = m ? `<img src="/photos/${m[1]}" alt="">` : '';
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
  for (const s of r.steps || []) {
    html += `<span class="${s.ok ? 'ok' : 'fail'}">${s.ok ? '✓' : '✗'} ${s.name}</span>\n${escapeHtml(s.log || '')}\n\n`;
  }
  html += r.ok
    ? '\n<span class="ok">✓ 已发布，约 1 分钟后线上更新</span>'
    : '\n<span class="fail">✗ 发布未完全成功，请检查上面的日志（git 是否已配置凭证）</span>';
  showLog('发布', html);
  refreshStatus();
}

async function refreshStatus() {
  const r = await api('/api/status');
  const n = (r.out || '').split('\n').filter(Boolean).length;
  $('gitStatus').textContent = n ? `${n} 个未提交改动` : '工作区干净';
}

/* ---------------- 事件 ---------------- */
$('btnNew').onclick = newPost;
$('btnSave').onclick = save;
$('btnDelete').onclick = del;
$('btnBuild').onclick = build;
$('btnPublish').onclick = publish;
$('btnUpload').onclick = pickImage;
$('logClose').onclick = () => $('logmask').style.display = 'none';
$('fCat').onchange = togglePhotoExtra;
$('fBody').oninput = () => { renderPreview(); updateCount(); };
$('fImg').oninput = renderImgPreview;
$('search').oninput = (e) => { searchKw = e.target.value.trim(); renderList(); };
$('filter').querySelectorAll('button').forEach(b => {
  b.onclick = () => {
    $('filter').querySelectorAll('button').forEach(x => x.classList.remove('on'));
    b.classList.add('on');
    filterCat = b.dataset.cat;
    renderList();
  };
});

// Ctrl+S 保存
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    if ($('editorBody').style.display !== 'none') save();
  }
});

loadPosts();
