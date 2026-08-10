/* 文章 body Markdown 子集 ↔ TipTap 文档 双向转换（UMD：浏览器挂 window.MdConvert，Node 可 require）
   注意：与 lib/markdown.js 职责不同（本文件产物喂给编辑器），勿合并。 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MdConvert = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function escHtml(s) {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ---- md → html（喂给 TipTap setContent） ---- */
  function inlineToHtml(s) {
    let t = escHtml(s);
    t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    return t;
  }

  function mdToHtml(md) {
    return (md || '').split(/\n\s*\n/).map(s => s.trim()).filter(Boolean).map(b => {
      const img = b.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
      if (img) return `<img src="${escHtml(img[2])}" alt="${escHtml(img[1])}">`;
      if (b === '---') return '<hr>';
      if (b.startsWith('### ')) return `<h3>${inlineToHtml(b.slice(4))}</h3>`;
      if (b.startsWith('## ')) return `<h2>${inlineToHtml(b.slice(3))}</h2>`;
      if (b.startsWith('> ')) return `<blockquote><p>${inlineToHtml(b.slice(2))}</p></blockquote>`;
      return `<p>${inlineToHtml(b)}</p>`;
    }).join('');
  }

  /* ---- TipTap JSON → md ---- */
  function serializeInline(nodes) {
    return (nodes || []).map(n => {
      if (n.type === 'image') return `![${n.attrs.alt || ''}](${n.attrs.src})`;
      if (n.type === 'hardBreak') return ' ';
      let text = n.text || '';
      const marks = n.marks || [];
      const link = marks.find(m => m.type === 'link');
      if (marks.some(m => m.type === 'bold')) text = `**${text}**`;
      if (marks.some(m => m.type === 'italic')) text = `*${text}*`;
      if (link) text = `[${text}](${link.attrs.href})`;
      return text;
    }).join('');
  }

  function serializeBlock(node) {
    switch (node.type) {
      case 'paragraph': return serializeInline(node.content);
      case 'heading': return `${'#'.repeat(node.attrs.level)} ${serializeInline(node.content)}`;
      case 'blockquote':
        return (node.content || []).map(serializeBlock).filter(Boolean).map(s => `> ${s}`).join('\n');
      case 'horizontalRule': return '---';
      case 'image': return serializeInline([node]);
      default: return serializeInline(node.content);
    }
  }

  function jsonToMd(doc) {
    return (doc.content || []).map(serializeBlock).filter(Boolean).join('\n\n') + '\n';
  }

  return { mdToHtml, jsonToMd };
});
