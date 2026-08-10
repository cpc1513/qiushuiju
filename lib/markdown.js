/* 正文 Markdown 子集 → HTML（站点渲染用，零依赖）
   行内：**粗体**  *斜体*  [文字](url)
   块级：## / ### 小标题、> 引用、--- 分割线、![图注](路径) 插图
   注意：与 admin/md-convert.js 职责不同（本站产物带 target/figure/路径前缀），
   两者各自独立，勿合并。 */
'use strict';

function escHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inline(s) {
  let t = escHtml(s);
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener">$1</a>');
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return t;
}

const IMG_RE = /^!\[([^\]]*)\]\(([^)\s]+)\)$/;

function blockToHtml(block, imgPrefix) {
  const img = block.match(IMG_RE);
  if (img) {
    return `<figure class="reader-fig"><img src="${escHtml((imgPrefix || '') + img[2])}" alt="${escHtml(img[1])}"><figcaption>${escHtml(img[1])}</figcaption></figure>`;
  }
  if (block === '---') return '<hr class="reader-hr">';
  if (block.startsWith('### ')) return `<h3>${inline(block.slice(4))}</h3>`;
  if (block.startsWith('## ')) return `<h2>${inline(block.slice(3))}</h2>`;
  if (block.startsWith('> ')) return `<blockquote>${inline(block.slice(2))}</blockquote>`;
  return `<p>${inline(block)}</p>`;
}

function renderBody(paras, imgPrefix) {
  return paras.map(b => blockToHtml(b, imgPrefix)).join('\n      ');
}

module.exports = { escHtml, inline, blockToHtml, renderBody, IMG_RE };
