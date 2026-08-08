#!/usr/bin/env node
/* ============================================================
   秋水居 · 本地编辑后台（增强版）
   用法：node server.js  →  http://localhost:3210
   支持：文章/工具/草稿管理、图片上传预览、一键构建发布
   纯 Node 内置模块，零依赖。
   ============================================================ */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const ROOT = __dirname;
const POSTS = path.join(ROOT, 'posts');
const PHOTOS = path.join(ROOT, 'assets', 'photos');
const TOOLS_FILE = path.join(ROOT, 'admin', 'tools.json');
const PORT = 3210;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
};

/* ---------------- front matter ---------------- */
function parseFM(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: text };
  const meta = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    let [, k, v] = kv;
    v = v.trim();
    if (v.startsWith('[') && v.endsWith(']')) v = v.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean);
    else if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    meta[k] = v;
  }
  return { meta, body: m[2].trim() };
}

function buildFM(meta, body) {
  const lines = ['---'];
  for (const [k, v] of Object.entries(meta)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v)) lines.push(`${k}: [${v.join(', ')}]`);
    else if (k === 'title' || k === 'excerpt') lines.push(`${k}: "${String(v).replace(/"/g, '\\"')}"`);
    else lines.push(`${k}: ${v}`);
  }
  lines.push('---', '');
  return lines.join('\n') + body;
}

/* ---------------- 文章 ---------------- */
function listPosts() {
  if (!fs.existsSync(POSTS)) return [];
  return fs.readdirSync(POSTS).filter(f => f.endsWith('.md')).map(f => {
    const raw = fs.readFileSync(path.join(POSTS, f), 'utf8');
    const hasFM = /^---\n[\s\S]*?\n---/.test(raw);
    const { meta, body } = parseFM(raw);
    return {
      slug: meta.slug || f.replace(/\.md$/, ''),
      title: meta.title || f, cat: meta.cat || 'essays', date: meta.date || '',
      tags: Array.isArray(meta.tags) ? meta.tags : (meta.tags ? [meta.tags] : []),
      img: meta.img || '', excerpt: meta.excerpt || '',
      draft: meta.draft === 'true' || meta.draft === true,
      broken: !hasFM,
      words: (body || '').replace(/\s/g, '').length,
    };
  }).sort((a, b) => (a.date < b.date ? 1 : -1));
}

function readPost(slug) {
  const file = path.join(POSTS, slug + '.md');
  if (!fs.existsSync(file)) return null;
  return parseFM(fs.readFileSync(file, 'utf8'));
}

function savePost(slug, meta, body, oldSlug) {
  if (oldSlug && oldSlug !== slug) {
    const oldFile = path.join(POSTS, oldSlug + '.md');
    if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
  }
  meta.slug = slug;
  fs.writeFileSync(path.join(POSTS, slug + '.md'), buildFM(meta, body));
}

function deletePost(slug) {
  const file = path.join(POSTS, slug + '.md');
  if (fs.existsSync(file)) { fs.unlinkSync(file); return true; }
  return false;
}

/* ---------------- 工具 ---------------- */
function readTools() {
  if (!fs.existsSync(TOOLS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(TOOLS_FILE, 'utf8')); } catch { return []; }
}
function writeTools(tools) {
  fs.writeFileSync(TOOLS_FILE, JSON.stringify(tools, null, 2));
}

/* ---------------- 请求工具 ---------------- */
function readBody(req) {
  return new Promise((res, rej) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => res(Buffer.concat(chunks)));
    req.on('error', rej);
  });
}
function json(res, data, code = 200) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}
function run(cmd, args, cwd = ROOT) {
  return new Promise((res) => {
    execFile(cmd, args, { cwd, timeout: 90000 }, (err, stdout, stderr) => {
      res({ code: err ? (err.code || 1) : 0, out: (stdout || '') + (stderr || '') });
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  try {
    /* ---------- 文章 API ---------- */
    if (p === '/api/posts' && req.method === 'GET') return json(res, { posts: listPosts() });

    if (p.startsWith('/api/post/') && req.method === 'GET') {
      const post = readPost(decodeURIComponent(p.slice(10)));
      return post ? json(res, post) : json(res, { error: 'not found' }, 404);
    }

    if (p === '/api/save' && req.method === 'POST') {
      const { slug, oldSlug, meta, body: content } = JSON.parse((await readBody(req)).toString('utf8'));
      if (!slug || !/^[a-z0-9-]+$/.test(slug)) return json(res, { error: 'slug 只能用小写英文、数字、连字符' }, 400);
      savePost(slug, meta, content, oldSlug);
      return json(res, { ok: true });
    }

    if (p === '/api/delete' && req.method === 'POST') {
      const { slug } = JSON.parse((await readBody(req)).toString('utf8'));
      deletePost(slug);
      return json(res, { ok: true });
    }

    /* ---------- 工具 API ---------- */
    if (p === '/api/tools' && req.method === 'GET') return json(res, { tools: readTools() });
    if (p === '/api/tools' && req.method === 'POST') {
      const { tools } = JSON.parse((await readBody(req)).toString('utf8'));
      writeTools(tools);
      return json(res, { ok: true });
    }

    /* ---------- 图片 ---------- */
    if (p === '/api/photos' && req.method === 'GET') {
      const imgs = fs.existsSync(PHOTOS) ? fs.readdirSync(PHOTOS).filter(f => /\.(jpe?g|png)$/i.test(f)) : [];
      return json(res, { photos: imgs });
    }
    if (p === '/api/upload' && req.method === 'POST') {
      const { name, data } = JSON.parse((await readBody(req)).toString('utf8'));
      const safe = name.replace(/[^\w.-]/g, '-').toLowerCase();
      fs.writeFileSync(path.join(PHOTOS, safe), Buffer.from(data, 'base64'));
      return json(res, { ok: true, path: `assets/photos/${safe}` });
    }
    if (p === '/api/photo-delete' && req.method === 'POST') {
      const { name } = JSON.parse((await readBody(req)).toString('utf8'));
      const f = path.join(PHOTOS, path.basename(name));
      if (fs.existsSync(f)) fs.unlinkSync(f);
      return json(res, { ok: true });
    }

    /* ---------- 构建 / 发布 ---------- */
    if (p === '/api/build' && req.method === 'POST') {
      const r = await run('node', ['build.js']);
      return json(res, { ok: r.code === 0, log: r.out });
    }
    if (p === '/api/publish' && req.method === 'POST') {
      const { message } = JSON.parse((await readBody(req)).toString('utf8') || '{}');
      const steps = [];
      const build = await run('node', ['build.js']);
      steps.push({ name: '构建', ok: build.code === 0, log: build.out });
      if (build.code !== 0) return json(res, { ok: false, steps });
      await run('git', ['add', '.']);
      const commit = await run('git', ['commit', '-m', message || `更新 ${new Date().toLocaleString('zh-CN')}`]);
      steps.push({ name: '提交', ok: commit.code === 0, log: commit.out });
      const push = await run('git', ['push']);
      steps.push({ name: '推送', ok: push.code === 0, log: push.out });
      return json(res, { ok: push.code === 0, steps });
    }
    if (p === '/api/status' && req.method === 'GET') {
      const r = await run('git', ['status', '--short']);
      return json(res, { out: r.out });
    }

    /* ---------- 前端 ---------- */
    if (p === '/' || p === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(fs.readFileSync(path.join(ROOT, 'admin', 'index.html')));
    }
    for (const f of ['admin.css', 'admin.js']) {
      if (p === '/' + f) {
        res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] });
        return res.end(fs.readFileSync(path.join(ROOT, 'admin', f)));
      }
    }
    if (p.startsWith('/photos/')) {
      const f = path.join(PHOTOS, path.basename(decodeURIComponent(p.slice(8))));
      if (fs.existsSync(f)) {
        res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'image/jpeg' });
        return res.end(fs.readFileSync(f));
      }
    }

    json(res, { error: 'not found' }, 404);
  } catch (e) {
    json(res, { error: String(e.message || e) }, 500);
  }
});

server.listen(PORT, () => {
  console.log('\n  秋水居 · 编辑后台已启动\n  浏览器打开 →  http://localhost:' + PORT + '\n');
});
