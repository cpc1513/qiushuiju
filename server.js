#!/usr/bin/env node
/* ============================================================
   秋水居 · 本地编辑后台
   在仓库根目录运行：node server.js
   然后浏览器打开 http://localhost:3210
   纯 Node 内置模块，零依赖。
   ============================================================ */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile, exec } = require('child_process');

const ROOT = __dirname;                 // 仓库根目录
const POSTS = path.join(ROOT, 'posts');
const PHOTOS = path.join(ROOT, 'assets', 'photos');
const PORT = 3210;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
};

/* ---------------- front matter 解析 ---------------- */
function parseFM(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: text };
  const meta = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    let [, k, v] = kv;
    v = v.trim();
    if (v.startsWith('[') && v.endsWith(']')) {
      v = v.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean);
    } else if (v.startsWith('"') && v.endsWith('"')) {
      v = v.slice(1, -1);
    }
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

/* ---------------- 文章 CRUD ---------------- */
function listPosts() {
  if (!fs.existsSync(POSTS)) return [];
  return fs.readdirSync(POSTS).filter(f => f.endsWith('.md')).map(f => {
    const raw = fs.readFileSync(path.join(POSTS, f), 'utf8');
    const hasFM = /^---\n[\s\S]*?\n---/.test(raw);
    const { meta, body } = parseFM(raw);
    return {
      slug: meta.slug || f.replace(/\.md$/, ''),
      title: meta.title || f,
      cat: meta.cat || 'essays',
      date: meta.date || '',
      tags: Array.isArray(meta.tags) ? meta.tags : (meta.tags ? [meta.tags] : []),
      img: meta.img || '',
      excerpt: meta.excerpt || '',
      words: (body || '').replace(/\s/g, '').length,
      broken: !hasFM,                    // 缺 front matter，构建会跳过
    };
  }).sort((a, b) => (a.date < b.date ? 1 : -1));
}

function readPost(slug) {
  const file = path.join(POSTS, slug + '.md');
  if (!fs.existsSync(file)) return null;
  const { meta, body } = parseFM(fs.readFileSync(file, 'utf8'));
  return { meta, body };
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

/* ---------------- 请求处理 ---------------- */
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
    execFile(cmd, args, { cwd, timeout: 60000 }, (err, stdout, stderr) => {
      res({ code: err ? err.code : 0, out: (stdout || '') + (stderr || '') });
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;

  try {
    /* ---------- API ---------- */
    if (p === '/api/posts' && req.method === 'GET') {
      return json(res, { posts: listPosts() });
    }

    if (p.startsWith('/api/post/') && req.method === 'GET') {
      const slug = decodeURIComponent(p.slice('/api/post/'.length));
      const post = readPost(slug);
      return post ? json(res, post) : json(res, { error: 'not found' }, 404);
    }

    if (p === '/api/save' && req.method === 'POST') {
      const body = await readBody(req);
      const data = JSON.parse(body.toString('utf8'));
      const { slug, oldSlug, meta, body: content } = data;
      if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
        return json(res, { error: 'slug 只能用小写英文、数字、连字符' }, 400);
      }
      savePost(slug, meta, content, oldSlug);
      return json(res, { ok: true });
    }

    if (p === '/api/delete' && req.method === 'POST') {
      const body = await readBody(req);
      const { slug } = JSON.parse(body.toString('utf8'));
      deletePost(slug);
      return json(res, { ok: true });
    }

    if (p === '/api/photos' && req.method === 'GET') {
      const imgs = fs.existsSync(PHOTOS)
        ? fs.readdirSync(PHOTOS).filter(f => /\.(jpe?g|png)$/i.test(f))
        : [];
      return json(res, { photos: imgs });
    }

    // 上传图片：前端已压缩裁好，base64 传回
    if (p === '/api/upload' && req.method === 'POST') {
      const body = await readBody(req);
      const { name, data } = JSON.parse(body.toString('utf8'));
      const safe = name.replace(/[^\w.-]/g, '-').toLowerCase();
      const buf = Buffer.from(data, 'base64');
      fs.writeFileSync(path.join(PHOTOS, safe), buf);
      return json(res, { ok: true, path: `assets/photos/${safe}` });
    }

    // 构建
    if (p === '/api/build' && req.method === 'POST') {
      const r = await run('node', ['build.js']);
      return json(res, { ok: r.code === 0, log: r.out });
    }

    // 发布：build + git add/commit/push
    if (p === '/api/publish' && req.method === 'POST') {
      const body = await readBody(req);
      const { message } = JSON.parse(body.toString('utf8') || '{}');
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

    // git 状态
    if (p === '/api/status' && req.method === 'GET') {
      const r = await run('git', ['status', '--short']);
      return json(res, { out: r.out });
    }

    /* ---------- 前端静态 ---------- */
    if (p === '/' || p === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(fs.readFileSync(path.join(ROOT, 'admin', 'index.html')));
    }
    if (p === '/admin.css') {
      res.writeHead(200, { 'Content-Type': MIME['.css'] });
      return res.end(fs.readFileSync(path.join(ROOT, 'admin', 'admin.css')));
    }
    if (p === '/admin.js') {
      res.writeHead(200, { 'Content-Type': MIME['.js'] });
      return res.end(fs.readFileSync(path.join(ROOT, 'admin', 'admin.js')));
    }
    // 图片预览
    if (p.startsWith('/photos/')) {
      const f = path.join(PHOTOS, decodeURIComponent(p.slice(8)));
      if (fs.existsSync(f)) {
        res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'image/jpeg' });
        return res.end(fs.readFileSync(f));
      }
    }

    json(res, { error: 'not found' }, 404);
  } catch (e) {
    json(res, { error: String(e.message || e) }, 500);
  }
});

server.listen(PORT, () => {
  console.log('');
  console.log('  秋水居 · 编辑后台已启动');
  console.log(`  浏览器打开 →  http://localhost:${PORT}`);
  console.log('');
  console.log('  文章目录:', POSTS);
  console.log('  按 Ctrl+C 停止');
  console.log('');
});
