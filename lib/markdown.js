/* 正文 Markdown 子集 → HTML（站点渲染用，零依赖）
   行内：**粗体**  *斜体*  [文字](url)
   块级：## / ### 小标题、> 引用、--- 分割线、![图注](路径) 插图
   限制：一个引用块限单段；URL 支持一层平衡括号，不支持嵌套多层括号。
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

/* URL 片段：允许一层平衡括号（如维基百科条目名），不支持多层嵌套 */
const URL_SRC = '[^()\\s]+(?:\\([^()\\s]*\\)[^()\\s]*)*';
const LINK_RE = new RegExp('\\[([^\\]]+)\\]\\((' + URL_SRC + ')\\)', 'g');
const IMG_RE = new RegExp('^!\\[([^\\]]*)\\]\\((' + URL_SRC + ')\\)$');

function inline(s) {
  let t = escHtml(s);
  t = t.replace(LINK_RE,
    '<a href="$2" target="_blank" rel="noopener">$1</a>');
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return t;
}

function blockToHtml(block, imgPrefix) {
  const img = block.match(IMG_RE);
  if (img) {
    const src = escHtml((imgPrefix || '') + img[2]);
    const alt = escHtml(img[1]);
    const caption = alt ? `<figcaption>${alt}</figcaption>` : '';
    return `<figure class="reader-fig"><img src="${src}" alt="${alt}">${caption}</figure>`;
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

/* 剥离 Markdown 记号留纯文本（摘要自动兜底等纯文本场景用） */
function stripMd(s) {
  return s
    .replace(/^!\[([^\]]*)\]\(([^()\s]+(?:\([^()\s]*\)[^()\s]*)*)\)$/, '$1')  // 整段插图 → 图注
    .replace(/^#{2,3}\s+/, '')      // 小标题
    .replace(/^>\s+/, '')           // 引用
    .replace(/^---\s*$/, '')        // 分割线
    .replace(LINK_RE, '$1')         // 链接留文字
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .trim();
}

module.exports = { escHtml, inline, blockToHtml, renderBody, stripMd, IMG_RE };
