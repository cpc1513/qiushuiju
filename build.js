#!/usr/bin/env node
/* ============================================================
   秋水居 · 静态构建
   读取 posts/*.md → 生成：
     js/content.js          首页数据
     archive/index.html     全站归档（按年份分组）
     code|reading|essays/index.html   板块归档
     photos/index.html      摄影大图墙
     post/<slug>/index.html 独立文章页（SEO 友好）
     feed.xml  sitemap.xml
   运行：node build.js
   ============================================================ */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SITE = {
  title: '秋水居',
  desc: '写代码，读书，拍照，随手记 —— 一人的湖畔。',
  url: process.env.SITE_URL || '',          // 部署时注入，如 https://qiushuiju.github.io
};

/* ---------------- 分类元数据 ---------------- */
const CATS = {
  code:    { num: '壹', cn: '编程', en: 'CODE',    motto: '码上山水 —— 代码亦有丘壑。', href: 'code/' },
  reading: { num: '贰', cn: '阅读', en: 'READING', motto: '与书对坐，如晤故人。',       href: 'reading/' },
  photos:  { num: '叁', cn: '摄影', en: 'PHOTOS',  motto: '光是水写的字。',             href: 'photos/' },
  essays:  { num: '肆', cn: '随笔', en: 'ESSAYS',  motto: '随意走笔，不着急抵达。',     href: 'essays/' },
};
const CHAPTER_ORDER = ['code', 'reading', 'photos', 'essays'];

/* ---------------- front matter 解析 ---------------- */
function parseFM(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error('front matter 缺失');
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

/* ---------------- 读取全部文章 ---------------- */
function loadPosts() {
  const dir = path.join(ROOT, 'posts');
  const posts = fs.readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const { meta, body } = parseFM(fs.readFileSync(path.join(dir, f), 'utf8'));
      const paras = body.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
      return {
        slug: meta.slug || f.replace(/\.md$/, ''),
        title: meta.title,
        cat: meta.cat,
        date: meta.date,
        tags: Array.isArray(meta.tags) ? meta.tags : [meta.tags].filter(Boolean),
        mins: parseInt(meta.mins, 10) || Math.max(2, Math.round(paras.join('').length / 420)),
        img: meta.img || null,
        poem: meta.poem || null,
        season: meta.season || '秋',
        excerpt: meta.excerpt || paras[0].slice(0, 90) + '……',
        body: paras,
        year: (meta.date || '').slice(0, 4),
      };
    });
  posts.sort((a, b) => (a.date < b.date ? 1 : -1));
  return posts;
}

const POSTS = loadPosts();
const byCat = (c) => POSTS.filter(p => p.cat === c);
const postBy = (s) => POSTS.find(p => p.slug === s);

/* ---------------- 一 · js/content.js ---------------- */
function esc(s) { return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }

function buildContentJS() {
  const chapters = CHAPTER_ORDER.map(id => {
    const c = CATS[id];
    return `  { id: '${id}', num: '${c.num}', cn: '${c.cn}', en: '${c.en}', motto: '${c.motto}', href: '${c.href}' },`;
  }).join('\n');

  const postsObj = POSTS.map(p => {
    const imgLine = p.img ? `\n    img: '${p.img}',` : '';
    const bodyLines = p.body.map(t => `      '${esc(t)}',`).join('\n');
    return `  '${p.slug}': {
    cat: '${CATS[p.cat].cn}', catEn: '${CATS[p.cat].en}', title: '${esc(p.title)}',${imgLine}
    date: '${p.date}', tags: [${p.tags.map(t => `'${esc(t)}'`).join(', ')}], mins: ${p.mins},
    excerpt: '${esc(p.excerpt)}',
    body: [
${bodyLines}
    ],
  },`;
  }).join('\n\n');

  const photos = byCat('photos').map(p => {
    const [short, tail] = p.title.split('·').map(s => s.trim());
    const poem = p.poem || tail || '';
    const cap = (p.tags[0] || '') + (p.tags[0] ? ' · ' : '') + p.year + ' ' + p.season;
    return `  { post: '${p.slug}', img: '${p.img}', title: '${short}', poem: '${esc(poem)}', meta: '${cap}' },`;
  }).join('\n');

  const out = `/* ============================================================
   秋水居 · 内容数据（由 build.js 依据 posts/*.md 生成，请勿手改）
   ============================================================ */

const CHAPTERS = [
${chapters}
  { id: 'tools',   num: '伍', cn: '工具', en: 'TOOLS',   motto: '器以载道，物以养心。' },
];

const POSTS = {

${postsObj}
};

/* 摄影板块条目 */
const PHOTOS = [
${photos}
];

/* 工具板块 */
const TOOLS = [
  { name: 'Neovim',        kind: '编辑器', desc: '十年磨一剑的配置，最后删到只剩三十行。', url: 'https://neovim.io' },
  { name: 'Obsidian',      kind: '笔  记', desc: '第二大脑不必宏大，能找到三年前的念头就好。', url: 'https://obsidian.md' },
  { name: 'Raycast',       kind: '启动器', desc: '⌘ + Space 之后，万事皆可期。', url: 'https://www.raycast.com' },
  { name: 'Fujifilm X100V',kind: '相  机', desc: '不能换镜头，于是学会了多走两步。', url: 'https://fujifilm-x.com' },
  { name: 'LAMY 2000',     kind: '钢  笔', desc: '手写的字比敲出来的慢，也比敲出来的像自己。', url: 'https://www.lamy.com' },
  { name: 'Hario V60',     kind: '手  冲', desc: '两分钟的等待，是早晨唯一的仪式。', url: 'https://hario.co.jp' },
];
`;
  fs.writeFileSync(path.join(ROOT, 'js/content.js'), out);
  return POSTS.length;
}

/* ---------------- 公共模板 ---------------- */
const SEAL_SVG = (w) => `<svg viewBox="0 0 96 96" width="${w}" height="${w}" role="img" aria-label="秋水居印章">
      <g filter="url(#sealAge)">
        <rect x="10" y="10" width="76" height="76" rx="4" fill="#b03a24"/>
        <text x="48" y="69" text-anchor="middle" font-size="54" font-weight="900"
              fill="#f2eee1" font-family="'Noto Serif SC','Songti SC',serif">秋</text>
      </g>
      <rect x="10" y="10" width="76" height="76" fill="#f2eee1" opacity="0.35"
            filter="url(#sealMottle)" style="mix-blend-mode:screen"/>
    </svg>`;

function layout({ depth, title, desc, body, extraCss = '' }) {
  const r = '../'.repeat(depth);
  const canonical = SITE.url ? `<link rel="canonical" href="${SITE.url}/${title === SITE.title ? '' : ''}">` : '';
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<meta name="description" content="${desc}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Ibarra+Real+Nova:ital,wght@0,400;0,500;0,600;1,400&family=Noto+Sans+SC:wght@300;400;500&family=Noto+Serif+SC:wght@400;600;700;900&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
<noscript><link href="https://fonts.googleapis.com/css2?family=Ibarra+Real+Nova:ital,wght@0,400;0,500;0,600;1,400&family=Noto+Sans+SC:wght@300;400;500&family=Noto+Serif+SC:wght@400;600;700;900&display=swap" rel="stylesheet"></noscript>
<link rel="stylesheet" href="${r}css/style.css">
<link rel="alternate" type="application/rss+xml" title="${SITE.title}" href="${r}feed.xml">
${extraCss}
</head>
<body class="sub-page">

<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <filter id="sealAge" x="-25%" y="-25%" width="150%" height="150%">
      <feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves="3" seed="7" result="warp"/>
      <feDisplacementMap in="SourceGraphic" in2="warp" scale="5.5"/>
    </filter>
    <filter id="sealMottle" x="0%" y="0%" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="11" result="t"/>
      <feColorMatrix in="t" type="matrix"
        values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.4 0 0 0 -0.25" result="a"/>
      <feComposite in="SourceGraphic" in2="a" operator="in"/>
    </filter>
  </defs>
</svg>

<header class="sub-topbar">
  <a class="topbar-brand" href="${r}">${SEAL_SVG(26)}秋水居</a>
  <nav class="topbar-nav">
    <a href="${r}code/">编程</a><a href="${r}reading/">阅读</a><a href="${r}photos/">摄影</a><a href="${r}essays/">随笔</a><a href="${r}archive/">归档</a><a href="${r}#tools">工具</a>
  </nav>
</header>

<main class="sub-main">
${body}
</main>

<footer class="sub-footer">
  ${SEAL_SVG(40)}
  <span class="footer-copy">© 2019 – 2026 秋水居 · 以文会友，缓步当车</span>
  <a class="back-home" href="${r}">回到长卷 →</a>
</footer>

</body>
</html>`;
}

function postRowHTML(p, depth) {
  const r = '../'.repeat(depth);
  const tags = p.tags.slice(0, 2).map(t => `<span class="post-tag">${t}</span>`).join('');
  return `<li>
    <a class="post-row" href="${r}post/${p.slug}/">
      <span class="post-date">${p.date}</span>
      <span class="post-main"><h3>${p.title}</h3><p>${p.excerpt}</p></span>
      <span class="post-side">${tags}<span class="post-mins">约 ${p.mins} 分钟</span></span>
      <span class="post-arr"><svg viewBox="0 0 24 24"><path d="M4 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.5"/></svg></span>
    </a>
  </li>`;
}

/* ---------------- 二 · 归档页（按年份） ---------------- */
function buildArchive() {
  const years = [...new Set(POSTS.map(p => p.year))].sort().reverse();
  const sections = years.map(y => {
    const rows = POSTS.filter(p => p.year === y).map(p => postRowHTML(p, 1)).join('\n');
    return `<section class="arch-year">
      <h2 class="arch-year-title"><span>${y}</span></h2>
      <ul class="post-list">${rows}</ul>
    </section>`;
  }).join('\n');

  const body = `
  <header class="sub-head">
    <p class="chapter-kicker">ARCHIVE · 总目</p>
    <h1 class="sub-title">全部文字</h1>
    <p class="sub-motto">${POSTS.length} 篇，自二〇一九年至今，按年份排列。</p>
  </header>
  ${sections}`;

  write('archive/index.html', layout({
    depth: 1, title: `全部文字 · ${SITE.title}`, desc: SITE.desc, body,
  }));
}

/* ---------------- 三 · 板块页 ---------------- */
function buildCatPages() {
  for (const id of ['code', 'reading', 'essays']) {
    const c = CATS[id];
    const list = byCat(id);
    const rows = list.map(p => postRowHTML(p, 1)).join('\n');
    const body = `
  <header class="sub-head">
    <p class="chapter-kicker">${c.en} · 卷${c.num}</p>
    <h1 class="sub-title">${c.cn}</h1>
    <p class="sub-motto">${c.motto}（共 ${list.length} 篇）</p>
  </header>
  <ul class="post-list">${rows}</ul>`;
    write(`${id}/index.html`, layout({
      depth: 1, title: `${c.cn} · ${SITE.title}`, desc: c.motto, body,
    }));
  }

  /* 摄影 · 大图墙 */
  const c = CATS.photos;
  const items = byCat('photos').map(p => `
    <a class="wall-item" href="../post/${p.slug}/">
      <figure>
        <img src="../${p.img}" alt="${p.title}" loading="lazy">
        <figcaption><span class="wall-title">${p.title}</span><span class="wall-meta">${p.date}</span></figcaption>
      </figure>
    </a>`).join('\n');
  const body = `
  <header class="sub-head">
    <p class="chapter-kicker">${c.en} · 卷${c.num}</p>
    <h1 class="sub-title">${c.cn}</h1>
    <p class="sub-motto">${c.motto}（共 ${byCat('photos').length} 帧）</p>
  </header>
  <div class="photo-wall">${items}</div>`;
  write('photos/index.html', layout({
    depth: 1, title: `${c.cn} · ${SITE.title}`, desc: c.motto, body,
  }));
}

/* ---------------- 四 · 独立文章页 ---------------- */
function buildPostPages() {
  for (const p of POSTS) {
    const c = CATS[p.cat];
    const siblings = byCat(p.cat);
    const idx = siblings.indexOf(p);
    const prev = siblings[idx - 1], next = siblings[idx + 1];
    const pn = (s, label) => s
      ? `<a href="../${s.slug}/"><span class="pn-label">${label}</span><span class="pn-title">${s.title}</span></a>`
      : `<a class="disabled"><span class="pn-label">${label}</span><span class="pn-title">—— 已是卷${label.includes('上一') ? '首' : '尾'} ——</span></a>`;

    const imgBlock = p.img ? `
    <figure class="reader-img">
      <img src="../../${p.img}" alt="${p.title}">
      <figcaption>${p.title}</figcaption>
    </figure>` : '';

    const body = `
  <article class="reader-article sub-article">
    <p class="reader-cat">${c.en} · ${c.cn}</p>
    <h1 class="reader-title">${p.title}</h1>
    <div class="reader-meta">
      <span>${p.date}</span>
      <span>${p.tags.join(' · ')}</span>
      <span>约 ${p.mins} 分钟</span>
    </div>
    ${imgBlock}
    <div class="reader-body">
      ${p.body.map(t => `<p>${t}</p>`).join('\n      ')}
    </div>
    <div class="reader-fin">完</div>
    <nav class="reader-pn">
      ${pn(prev, '上一篇')}
      ${pn(next, '下一篇')}
    </nav>
    <p class="arch-back"><a href="../../${c.href}">← 返回${c.cn}卷</a></p>
  </article>`;

    write(`post/${p.slug}/index.html`, layout({
      depth: 2, title: `${p.title} · ${SITE.title}`, desc: p.excerpt, body,
    }));
  }
}

/* ---------------- 五 · RSS / Sitemap ---------------- */
function isoDate(d) {
  const [y, m, dd] = d.split('.');
  return `${y}-${m}-${dd}T08:00:00+08:00`;
}

function buildFeeds() {
  if (!SITE.url) { console.log('  · SITE_URL 未设置，跳过 feed.xml / sitemap.xml 的绝对链接'); }
  const items = POSTS.map(p => `
    <item>
      <title>${p.title}</title>
      <link>${SITE.url}/post/${p.slug}/</link>
      <guid>${SITE.url}/post/${p.slug}/</guid>
      <pubDate>${new Date(isoDate(p.date)).toUTCString()}</pubDate>
      <description>${p.excerpt}</description>
    </item>`).join('');
  write('feed.xml', `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${SITE.title}</title>
    <link>${SITE.url}/</link>
    <description>${SITE.desc}</description>
    <language>zh-CN</language>${items}
  </channel>
</rss>
`);

  const urls = ['', 'archive/', 'code/', 'reading/', 'photos/', 'essays/']
    .map(u => `  <url><loc>${SITE.url}/${u}</loc></url>`)
    .concat(POSTS.map(p => `  <url><loc>${SITE.url}/post/${p.slug}/</loc></url>`))
    .join('\n');
  write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`);
}

/* ---------------- 工具 ---------------- */
function write(rel, content) {
  const p = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
}

/* ---------------- 主流程 ---------------- */
const n = buildContentJS();
buildArchive();
buildCatPages();
buildPostPages();
buildFeeds();
console.log(`✓ 构建完成：${n} 篇文章 → content.js / archive / 4 板块页 / ${n} 文章页 / feed.xml / sitemap.xml`);
