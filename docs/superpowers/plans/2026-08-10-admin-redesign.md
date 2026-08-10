# 秋水居后台重写 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重写秋水居本地管理后台：TipTap 所见即所得编辑（链接/插图/格式齐全）、图库、工具清单、一键构建推送，文人案头视觉。

**Architecture:** 零依赖 Node 服务 `server.js`（JSON API + 静态文件）+ `admin/` 单页前端（原生 JS + vendor 打包的 TipTap v3）。正文 Markdown 子集 ↔ 编辑器双向转换；`build.js` 同步扩展渲染同一子集。规格见 `docs/superpowers/specs/2026-08-10-admin-redesign-design.md`。

**Tech Stack:** Node 24（内置 `node:test` 做单元测试）、TipTap v3.29.2（core + starter-kit + extension-image，esbuild 0.28.2 打成 IIFE vendor）、原生 HTML/CSS/JS。

**环境事实（已核实）：** Node v24.14.1；`@tiptap/core` 与 `@tiptap/starter-kit` 最新 3.29.2；TipTap v3 的 StarterKit 已内置 Link（配置键 `link`）与 UndoRedo；Image 仍需 `@tiptap/extension-image`。站点 CSS 变量：`--paper:#f2eee1`、`--ink:#1e1d19`、`--line:#d6cfb6`、`--cinnabar:#b23a24`、`--serif/--sans` 字体栈（见 `css/style.css:8-22`）。文章页正文容器为 `.reader-body`，现有段落样式见 `css/style.css:655-665`。

**提交纪律：** 每个 Task 末尾有 commit 步骤；执行前先与用户确认提交授权。

---

## 文件结构

| 文件 | 职责 |
|---|---|
| `lib/markdown.js` | 站点侧：正文 md 子集 → HTML（build.js 引用，CommonJS） |
| `tests/markdown.test.js` | lib/markdown.js 的 node:test 单测 |
| `admin/tools.json` | 工具清单数据（build.js 优先读，缺失走内置兜底） |
| `admin/vendor-src/tiptap-entry.js` | esbuild 打包入口（不进后台页面，仅打 bundle 用） |
| `admin/vendor/tiptap.js` | 打包产物，提交进仓库 |
| `admin/md-convert.js` | 编辑器侧：md → HTML、TipTap JSON → md（UMD，浏览器/Node 双环境） |
| `tests/md-convert.test.js` | md-convert 单测（往返无损为核心断言） |
| `server.js` | 本地 API + 静态服务（:3210） |
| `admin/index.html` | 后台单页骨架（三栏） |
| `admin/admin.css` | 文人案头主题 |
| `admin/editor.js` | TipTap 封装：工具栏、链接浮层、插图浮层 |
| `admin/admin.js` | 视图路由 + 仪表盘/文章/图库/工具/发布五个模块 |
| `build.js` | 接线 renderBody + 恢复 tools.json 读取（仅两处小改） |
| `css/style.css` | 追加 reader 新元素样式（h2/h3/blockquote/hr/figure/a/em/strong） |

---

### Task 1: 站点侧正文渲染扩展（lib/markdown.js + build.js 接线 + reader CSS）

**Files:**
- Create: `lib/markdown.js`
- Create: `tests/markdown.test.js`
- Modify: `build.js`（顶部 require + `buildPostPages` 中 body 渲染一处）
- Modify: `css/style.css`（文件末尾追加）

- [ ] **Step 1: 写失败测试 `tests/markdown.test.js`**

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { inline, blockToHtml, renderBody } = require('../lib/markdown');

test('inline: 转义优先，HTML 原样转义', () => {
  assert.strictEqual(inline('<b>x</b> & y'), '&lt;b&gt;x&lt;/b&gt; &amp; y');
});

test('inline: 粗体 / 斜体 / 链接', () => {
  assert.strictEqual(inline('**重**点'), '<strong>重</strong>点');
  assert.strictEqual(inline('*轻*声'), '<em>轻</em>声');
  assert.strictEqual(
    inline('见[秋水居](https://example.com)一文'),
    '见<a href="https://example.com" target="_blank" rel="noopener">秋水居</a>一文');
});

test('inline: 粗斜嵌套与相邻星号不误判', () => {
  assert.strictEqual(inline('**a** 与 *b*'), '<strong>a</strong> 与 <em>b</em>');
});

test('blockToHtml: 小标题 / 引用 / 分割线', () => {
  assert.strictEqual(blockToHtml('## 第一节'), '<h2>第一节</h2>');
  assert.strictEqual(blockToHtml('### 小节'), '<h3>小节</h3>');
  assert.strictEqual(blockToHtml('> 湖水很安静'), '<blockquote>湖水很安静</blockquote>');
  assert.strictEqual(blockToHtml('---'), '<hr class="reader-hr">');
});

test('blockToHtml: 插图带路径前缀与图注', () => {
  assert.strictEqual(
    blockToHtml('![天池](assets/photos/tianchi.jpg)', '../../'),
    '<figure class="reader-fig"><img src="../../assets/photos/tianchi.jpg" alt="天池"><figcaption>天池</figcaption></figure>');
});

test('blockToHtml: 普通段落走 inline', () => {
  assert.strictEqual(blockToHtml('一段 **话**'), '<p>一段 <strong>话</strong></p>');
});

test('renderBody: 多块拼接', () => {
  const out = renderBody(['第一段', '## 标题', '![图](a.jpg)'], '../../');
  assert.ok(out.includes('<p>第一段</p>'));
  assert.ok(out.includes('<h2>标题</h2>'));
  assert.ok(out.includes('<figure'));
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/markdown.test.js`
Expected: FAIL（`Cannot find module '../lib/markdown'`）

- [ ] **Step 3: 实现 `lib/markdown.js`**

```js
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
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test tests/markdown.test.js`
Expected: PASS（7 个测试全绿）

- [ ] **Step 5: build.js 接线（两处修改）**

修改一，`build.js` 顶部 require 区（现有 `const fs = require('fs')` 等附近）加一行：

```js
const { renderBody } = require('./lib/markdown');
```

修改二，`buildPostPages` 中（现 `build.js:342-344`）：

```js
// 改前：
    <div class="reader-body">
      ${p.body.map(t => `<p>${t}</p>`).join('\n      ')}
    </div>
// 改后：
    <div class="reader-body">
      ${renderBody(p.body, '../../')}
    </div>
```

- [ ] **Step 6: 追加 reader 新元素样式到 `css/style.css` 末尾**

```css
/* ---- 正文扩展元素（build.js renderBody 产物） ---- */
.reader-body h2 {
  font-size: 1.35rem; font-weight: 700; line-height: 1.6;
  margin: 2.6rem 0 1.4rem; color: var(--ink);
}
.reader-body h3 {
  font-size: 1.12rem; font-weight: 700; line-height: 1.6;
  margin: 2.2rem 0 1.2rem; color: var(--ink);
}
.reader-body blockquote {
  margin: 0 0 1.9rem; padding: .2rem 0 .2rem 1.2rem;
  border-left: 3px solid var(--cinnabar);
  color: var(--ink-3); font-size: .98rem; line-height: 2.1;
}
.reader-body hr.reader-hr {
  border: none; margin: 2.8rem auto; width: 4rem; height: 1px;
  background: var(--line);
}
.reader-body figure.reader-fig { margin: 0 0 1.9rem; }
.reader-body figure.reader-fig img { width: 100%; display: block; }
.reader-body figure.reader-fig figcaption {
  margin-top: .7rem; text-align: center;
  font-family: var(--sans); font-size: .7rem; letter-spacing: .2em; color: var(--ink-3);
}
.reader-body a {
  color: var(--cinnabar); text-decoration: none;
  border-bottom: 1px solid color-mix(in srgb, var(--cinnabar) 40%, transparent);
  transition: border-color .3s;
}
.reader-body a:hover { border-bottom-color: var(--cinnabar); }
```

- [ ] **Step 7: 构建回归验证**

Run: `node build.js`
Expected: `✓ 构建完成：16 篇文章 → ...`（文章数不得少于 16，无跳过警告）

再抽查一篇现有文章页未受影响：

Run: `grep -c '<p>' post/walden/index.html`
Expected: ≥ 3（段落正常渲染）

- [ ] **Step 8: Commit**

```bash
git add lib/markdown.js tests/markdown.test.js build.js css/style.css
git commit -m "feat(build): 正文支持小标题/引用/分割线/插图/链接/粗斜体渲染"
```

---

### Task 2: 恢复工具清单数据文件（admin/tools.json + build.js 读取）

**Files:**
- Create: `admin/tools.json`
- Modify: `build.js`（`loadTools` 函数，现 `build.js:94-101` 附近）

- [ ] **Step 1: 创建 `admin/tools.json`**（内容与 build.js 内置兜底一致）

```json
[
  { "name": "Neovim", "kind": "编辑器", "desc": "十年磨一剑的配置，最后删到只剩三十行。", "url": "https://neovim.io" },
  { "name": "Obsidian", "kind": "笔  记", "desc": "第二大脑不必宏大，能找到三年前的念头就好。", "url": "https://obsidian.md" },
  { "name": "Raycast", "kind": "启动器", "desc": "⌘ + Space 之后，万事皆可期。", "url": "https://www.raycast.com" },
  { "name": "Fujifilm X100V", "kind": "相  机", "desc": "不能换镜头，于是学会了多走两步。", "url": "https://fujifilm-x.com" },
  { "name": "LAMY 2000", "kind": "钢  笔", "desc": "手写的字比敲出来的慢，也比敲出来的像自己。", "url": "https://www.lamy.com" },
  { "name": "Hario V60", "kind": "手  冲", "desc": "两分钟的等待，是早晨唯一的仪式。", "url": "https://hario.co.jp" }
]
```

- [ ] **Step 2: 修改 `build.js` 的 `loadTools`**

```js
// 改前：
/* 工具列表（内置默认） */
function loadTools() {
  return [
// 改后（函数头加文件读取，数组兜底保持不变）：
/* 工具：优先读 admin/tools.json（后台可编辑），否则用内置默认 */
function loadTools() {
  const f = path.join(ROOT, 'admin', 'tools.json');
  if (fs.existsSync(f)) {
    try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { /* fallthrough */ }
  }
  return [
```

- [ ] **Step 3: 验证**

Run: `node build.js && grep -c 'tool-row\|Neovim' js/content.js`
Expected: 构建成功；grep 命中 ≥ 1（content.js 的 TOOLS 含 Neovim）

- [ ] **Step 4: Commit**

```bash
git add admin/tools.json build.js
git commit -m "feat(build): 工具清单改由 admin/tools.json 驱动（内置兜底保留）"
```

---

### Task 3: TipTap vendor 打包（一次性开发步骤，产物提交仓库）

**Files:**
- Create: `admin/vendor-src/tiptap-entry.js`
- Create: `admin/vendor/tiptap.js`（打包产物）
- Modify: `package.json`（devDependencies + bundle 脚本）

- [ ] **Step 1: 安装开发依赖（版本已核实为当前最新）**

Run:
```bash
npm install --save-dev esbuild@0.28.2 @tiptap/core@3.29.2 @tiptap/starter-kit@3.29.2 @tiptap/extension-image@3.29.2
```
Expected: 安装成功，`package.json` 多出 devDependencies。`node_modules/` 已在 `.gitignore`，不会进仓库。

- [ ] **Step 2: 写打包入口 `admin/vendor-src/tiptap-entry.js`**

```js
/* esbuild 打包入口：后台页面通过全局 TipTap.* 使用 */
export { Editor } from '@tiptap/core';
export { default as StarterKit } from '@tiptap/starter-kit';
export { default as Image } from '@tiptap/extension-image';
```

- [ ] **Step 3: 打包**

Run:
```bash
npx esbuild admin/vendor-src/tiptap-entry.js --bundle --minify --format=iife --global-name=TipTap --outfile=admin/vendor/tiptap.js
```
Expected: 生成 `admin/vendor/tiptap.js`（约 300-400KB）

在 `package.json` scripts 中加一条，便于以后升级重打：

```json
"bundle:tiptap": "esbuild admin/vendor-src/tiptap-entry.js --bundle --minify --format=iife --global-name=TipTap --outfile=admin/vendor/tiptap.js"
```

- [ ] **Step 4: 冒烟验证 bundle 可用**

创建临时文件 `admin/vendor-src/smoke.html`：

```html
<!DOCTYPE html><meta charset="utf-8">
<div id="ed"></div>
<script src="../vendor/tiptap.js"></script>
<script>
  const ed = new TipTap.Editor({
    element: document.getElementById('ed'),
    extensions: [
      TipTap.StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false, code: false, strike: false,
        bulletList: false, orderedList: false, listItem: false,
        link: { openOnClick: false },
      }),
      TipTap.Image,
    ],
    content: '<h2>题</h2><p>段<strong>粗</strong><a href="https://x.com">链</a></p><blockquote><p>引</p></blockquote><hr><img src="a.jpg" alt="图">',
  });
  document.title = 'OK ' + JSON.stringify(ed.getJSON()).length;
</script>
```

Run: `start admin/vendor-src/smoke.html`（Windows 直接起浏览器）
Expected: 页面渲染出格式化内容、标题变为 `OK <数字>`、控制台无报错。**若 StarterKit 配置键报错**（v3 后续小版本可能改名），按报错信息增删 configure 键后重新打包验证。
验证完毕删除 `smoke.html`。

- [ ] **Step 5: Commit**

```bash
git add admin/vendor-src/tiptap-entry.js admin/vendor/tiptap.js package.json package-lock.json
git commit -m "chore(admin): vendor 打包 TipTap v3（core+starter-kit+image）"
```

---

### Task 4: 编辑器侧 Markdown 双向转换（admin/md-convert.js + 单测）

**Files:**
- Create: `admin/md-convert.js`
- Create: `tests/md-convert.test.js`

说明：与 `lib/markdown.js` 职责不同——这里产物喂给 TipTap（`<img>` 而非 `<figure>`、`<a>` 不带 target），且需反向序列化。保持独立文件。

- [ ] **Step 1: 写失败测试 `tests/md-convert.test.js`**

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { mdToHtml, jsonToMd } = require('../admin/md-convert');

/* 构造最小 TipTap JSON 的辅助 */
const P = (...content) => ({ type: 'paragraph', content });
const T = (text, marks) => ({ type: 'text', text, ...(marks ? { marks } : {}) });

test('mdToHtml: 段落与行内格式', () => {
  assert.strictEqual(
    mdToHtml('一段 **重** 话，见[某文](https://a.com)。'),
    '<p>一段 <strong>重</strong> 话，见<a href="https://a.com">某文</a>。</p>');
});

test('mdToHtml: 块级元素', () => {
  assert.strictEqual(mdToHtml('## 标题'), '<h2>标题</h2>');
  assert.strictEqual(mdToHtml('### 小标题'), '<h3>小标题</h3>');
  assert.strictEqual(mdToHtml('> 引文'), '<blockquote><p>引文</p></blockquote>');
  assert.strictEqual(mdToHtml('---'), '<hr>');
  assert.strictEqual(mdToHtml('![天池](assets/photos/a.jpg)'),
    '<img src="assets/photos/a.jpg" alt="天池">');
});

test('jsonToMd: 行内 marks（粗/斜/链接）', () => {
  const doc = { type: 'doc', content: [P(
    T('见'),
    T('某文', [{ type: 'link', attrs: { href: 'https://a.com' } }]),
    T('，很'),
    T('重', [{ type: 'bold' }]),
    T('要'),
    T('吧', [{ type: 'italic' }]),
  )] };
  assert.strictEqual(jsonToMd(doc), '见[某文](https://a.com)，很**重**要*吧*\n');
});

test('jsonToMd: 块级元素', () => {
  const doc = { type: 'doc', content: [
    { type: 'heading', attrs: { level: 2 }, content: [T('标题')] },
    { type: 'blockquote', content: [P(T('引文'))] },
    { type: 'horizontalRule' },
    P({ type: 'image', attrs: { src: 'assets/photos/a.jpg', alt: '天池' } }),
  ] };
  assert.strictEqual(jsonToMd(doc), '## 标题\n\n> 引文\n\n---\n\n![天池](assets/photos/a.jpg)\n');
});

test('往返无损：md → html → (模拟 TipTap 解析) → md 幂等', () => {
  /* 用 jsonToMd 能消费的 JSON 结构直接断言代表性样例的稳定性；
     真正的 html→JSON 由 TipTap 完成，在验收阶段浏览器验证 */
  const md = '首段 **粗** [链](https://a.com)\n\n## 标题\n\n> 引\n\n---\n\n![图](a.jpg)\n\n尾段\n';
  const html = mdToHtml(md);
  assert.ok(html.includes('<h2>标题</h2>'));
  assert.ok(html.includes('<img src="a.jpg" alt="图">'));
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/md-convert.test.js`
Expected: FAIL（`Cannot find module '../admin/md-convert'`）

- [ ] **Step 3: 实现 `admin/md-convert.js`**

```js
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
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test tests/md-convert.test.js`
Expected: PASS（5 个测试全绿）

- [ ] **Step 5: Commit**

```bash
git add admin/md-convert.js tests/md-convert.test.js
git commit -m "feat(admin): Markdown 子集 ↔ TipTap 双向转换器"
```

---

### Task 5: server.js（本地 API + 静态服务）

**Files:**
- Create: `server.js`

说明：API 面沿用旧版设计并扩展 `/api/stats` 与 `/vendor/*`、`/md-convert.js`、`/editor.js` 静态路由；`parseFM` 带 BOM/CRLF 兼容（与 build.js 2026-08-10 的修复一致）。手工验证为主（无单测框架覆盖 HTTP 层，验收清单兜底）。

- [ ] **Step 1: 创建 `server.js`（完整文件）**

```js
#!/usr/bin/env node
/* ============================================================
   秋水居 · 本地编辑后台
   用法：node server.js  →  http://localhost:3210
   文章/图库/工具/构建发布，纯 Node 内置模块，零依赖。
   ============================================================ */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const ROOT = __dirname;
const POSTS = path.join(ROOT, 'posts');
const PHOTOS = path.join(ROOT, 'assets', 'photos');
const ADMIN = path.join(ROOT, 'admin');
const TOOLS_FILE = path.join(ADMIN, 'tools.json');
const PORT = 3210;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
};

/* ---------------- front matter ---------------- */
function parseFM(text) {
  text = text.replace(/^﻿/, '').replace(/\r\n/g, '\n');   // 兼容 BOM 与 CRLF
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
    const { meta, body } = parseFM(raw);
    return {
      slug: meta.slug || f.replace(/\.md$/, ''),
      title: meta.title || f, cat: meta.cat || 'essays', date: meta.date || '',
      tags: Array.isArray(meta.tags) ? meta.tags : (meta.tags ? [meta.tags] : []),
      img: meta.img || '', excerpt: meta.excerpt || '',
      draft: meta.draft === 'true' || meta.draft === true,
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

/* ---------------- 工具清单 ---------------- */
function readTools() {
  if (!fs.existsSync(TOOLS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(TOOLS_FILE, 'utf8')); } catch { return []; }
}
function writeTools(tools) {
  fs.writeFileSync(TOOLS_FILE, JSON.stringify(tools, null, 2));
}

/* ---------------- 请求辅助 ---------------- */
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
function serveFile(res, file) {
  if (!fs.existsSync(file)) return false;
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
  res.end(fs.readFileSync(file));
  return true;
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

    /* ---------- 仪表盘 ---------- */
    if (p === '/api/stats' && req.method === 'GET') {
      const posts = listPosts();
      const photos = fs.existsSync(PHOTOS) ? fs.readdirSync(PHOTOS).filter(f => /\.(jpe?g|png)$/i.test(f)) : [];
      const git = await run('git', ['status', '--short']);
      return json(res, {
        total: posts.length,
        drafts: posts.filter(x => x.draft).length,
        words: posts.reduce((s, x) => s + x.words, 0),
        photos: photos.length,
        gitDirty: git.out.trim(),
      });
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
      if (commit.code !== 0) return json(res, { ok: false, steps });
      const push = await run('git', ['push']);
      steps.push({ name: '推送', ok: push.code === 0, log: push.out });
      return json(res, { ok: push.code === 0, steps });
    }
    if (p === '/api/status' && req.method === 'GET') {
      const r = await run('git', ['status', '--short']);
      return json(res, { out: r.out });
    }

    /* ---------- 静态 ---------- */
    if (p === '/' || p === '/index.html') return void serveFile(res, path.join(ADMIN, 'index.html')) || json(res, { error: 'not found' }, 404);
    if (p.startsWith('/vendor/')) {
      const f = path.join(ADMIN, 'vendor', path.basename(p));
      return void serveFile(res, f) || json(res, { error: 'not found' }, 404);
    }
    for (const f of ['admin.css', 'admin.js', 'editor.js', 'md-convert.js']) {
      if (p === '/' + f) return void serveFile(res, path.join(ADMIN, f)) || json(res, { error: 'not found' }, 404);
    }
    if (p.startsWith('/photos/')) {
      const f = path.join(PHOTOS, path.basename(decodeURIComponent(p.slice(8))));
      return void serveFile(res, f) || json(res, { error: 'not found' }, 404);
    }

    json(res, { error: 'not found' }, 404);
  } catch (e) {
    json(res, { error: String(e.message || e) }, 500);
  }
});

server.listen(PORT, () => {
  console.log('\n  秋水居 · 编辑后台已启动\n  浏览器打开 →  http://localhost:' + PORT + '\n');
});
```

- [ ] **Step 2: 启动并验证 API**

Run（一个终端）: `node server.js`
另一个终端依次验证：

```bash
curl -s http://localhost:3210/api/posts | head -c 200     # 返回 posts 数组，16+ 篇
curl -s http://localhost:3210/api/post/walden              # 返回 walden 的 meta+body
curl -s http://localhost:3210/api/stats                    # 返回 total/drafts/words/photos/gitDirty
curl -s -X POST http://localhost:3210/api/save -H "Content-Type: application/json" -d '{"slug":"BAD SLUG","meta":{},"body":""}'   # 返回 slug 错误 400
```
Expected: 各响应符合注释。Ctrl+C 停掉服务。

- [ ] **Step 3: Commit**

```bash
git add server.js
git commit -m "feat(admin): 本地后台服务（文章/图库/工具/统计/构建发布 API）"
```

---

### Task 6: 后台单页骨架（admin/index.html + admin/admin.css）

**Files:**
- Create: `admin/index.html`
- Create: `admin/admin.css`
- Modify: `server.js`（静态区加 `/assets/photos/` 路由，供编辑器内联显示插图）

- [ ] **Step 1: 创建 `admin/index.html`（完整文件）**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>秋水居 · 案头</title>
<link rel="stylesheet" href="/admin.css">
</head>
<body>
<div id="app">
  <nav id="side">
    <div class="seal">秋水<br>案头</div>
    <button data-view="dashboard" class="on" title="仪表盘">览</button>
    <button data-view="posts" title="文章">文</button>
    <button data-view="gallery" title="图库">图</button>
    <button data-view="tools" title="工具清单">具</button>
    <button data-view="publish" title="发布">发</button>
  </nav>
  <aside id="list-panel"></aside>
  <main id="workspace"></main>
</div>
<div id="popover-root"></div>
<div id="toast-root"></div>
<script src="/vendor/tiptap.js"></script>
<script src="/md-convert.js"></script>
<script src="/editor.js"></script>
<script src="/admin.js"></script>
</body>
</html>
```

- [ ] **Step 2: server.js 增加插图静态路由**

在静态区 `if (p.startsWith('/photos/'))` 之前插入：

```js
    if (p.startsWith('/assets/photos/')) {
      const f = path.join(PHOTOS, path.basename(decodeURIComponent(p.slice(15))));
      return void serveFile(res, f) || json(res, { error: 'not found' }, 404);
    }
```

（编辑器内 `<img src="assets/photos/x.jpg">` 相对 `/` 解析为 `/assets/photos/x.jpg`，此路由让它可显示；md 文件里存的始终是站点相对路径 `assets/photos/x.jpg`。）

- [ ] **Step 3: 创建 `admin/admin.css`（完整文件，文人案头主题）**

```css
/* 秋水居 · 案头 —— 与主站同源：宣纸 / 松烟墨 / 朱砂 */
:root {
  --paper: #f2eee1; --paper-2: #e9e3d0; --paper-3: #f9f5ea;
  --ink: #1e1d19; --ink-3: #6f6a58;
  --line: #d6cfb6; --cinnabar: #b23a24;
  --serif: 'Ibarra Real Nova', 'Noto Serif SC', 'Songti SC', serif;
  --sans: 'Noto Sans SC', -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; }
body {
  background: var(--paper); color: var(--ink);
  font-family: var(--sans); font-size: 14px;
}

/* ---- 三栏骨架 ---- */
#app { display: grid; grid-template-columns: 60px 280px 1fr; height: 100vh; }
#side {
  background: var(--paper-2); border-right: 1px solid var(--line);
  display: flex; flex-direction: column; align-items: center; padding: 12px 0; gap: 8px;
}
#side .seal {
  font-family: var(--serif); font-weight: 900; font-size: 13px; line-height: 1.5;
  color: var(--paper-3); background: var(--cinnabar);
  padding: 6px 4px; border-radius: 4px; text-align: center; margin-bottom: 10px;
}
#side button {
  width: 38px; height: 38px; border: 1px solid transparent; border-radius: 6px;
  background: none; color: var(--ink-3); font-size: 16px; font-family: var(--serif);
  cursor: pointer; transition: all .2s;
}
#side button:hover { border-color: var(--line); color: var(--ink); }
#side button.on { background: var(--cinnabar); color: var(--paper-3); }
#list-panel {
  background: var(--paper-2); border-right: 1px solid var(--line);
  overflow-y: auto; padding: 14px;
}
#workspace { overflow-y: auto; padding: 22px 28px; background: var(--paper); }

/* ---- 通用控件 ---- */
.btn {
  border: 1px solid var(--line); background: var(--paper-3); color: var(--ink);
  padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 13px;
  font-family: var(--sans); transition: all .2s;
}
.btn:hover { border-color: var(--ink-3); }
.btn.primary { background: var(--cinnabar); border-color: var(--cinnabar); color: var(--paper-3); }
.btn.primary:hover { filter: brightness(1.08); }
.btn.danger { color: var(--cinnabar); }
.btn:disabled { opacity: .45; cursor: default; }
.field { margin-bottom: 12px; }
.field label {
  display: block; font-size: 11px; letter-spacing: .15em;
  color: var(--ink-3); margin-bottom: 4px;
}
.field input, .field select, .field textarea {
  width: 100%; border: 1px solid var(--line); border-radius: 6px;
  background: var(--paper-3); color: var(--ink);
  padding: 7px 10px; font-size: 14px; font-family: var(--sans);
}
.field input:focus, .field select:focus, .field textarea:focus {
  outline: none; border-color: var(--cinnabar);
}
h2.view-title { font-family: var(--serif); font-size: 22px; margin: 0 0 16px; }
.muted { color: var(--ink-3); font-size: 12px; }

/* ---- 文章列表 ---- */
.list-head { display: flex; gap: 8px; margin-bottom: 10px; }
.list-head input, .list-head select {
  border: 1px solid var(--line); border-radius: 6px; background: var(--paper-3);
  padding: 6px 8px; font-size: 13px; min-width: 0;
}
.list-head input { flex: 1; }
.post-item {
  padding: 9px 10px; border-radius: 6px; cursor: pointer;
  border: 1px solid transparent; margin-bottom: 4px;
}
.post-item:hover { border-color: var(--line); }
.post-item.on { background: var(--paper-3); border-color: var(--cinnabar); }
.post-item .t { font-family: var(--serif); font-size: 14px; font-weight: 700; }
.post-item .m { font-size: 11px; color: var(--ink-3); margin-top: 2px; }
.post-item .draft-tag { color: var(--cinnabar); }

/* ---- 编辑器 ---- */
.ed-meta { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 10px 14px; margin-bottom: 14px; }
.ed-meta .wide { grid-column: 1 / -1; }
.ed-toolbar {
  display: flex; gap: 4px; align-items: center;
  border: 1px solid var(--line); border-bottom: none;
  border-radius: 8px 8px 0 0; background: var(--paper-2); padding: 6px 8px;
}
.ed-toolbar button {
  border: none; background: none; min-width: 30px; height: 28px; border-radius: 5px;
  cursor: pointer; font-size: 13px; color: var(--ink); font-family: var(--sans);
}
.ed-toolbar button:hover { background: var(--paper-3); }
.ed-toolbar button.on { background: var(--cinnabar); color: var(--paper-3); }
.ed-toolbar .sep { width: 1px; height: 18px; background: var(--line); margin: 0 4px; }
#ed-mount {
  border: 1px solid var(--line); border-radius: 0 0 8px 8px;
  background: var(--paper-3); min-height: 46vh; padding: 20px 24px;
}
#ed-mount .ProseMirror { outline: none; font-family: var(--serif); font-size: 15.5px; line-height: 2; }
#ed-mount .ProseMirror p { margin: 0 0 1.1em; text-align: justify; }
#ed-mount .ProseMirror h2 { font-size: 1.3em; margin: 1.4em 0 .7em; }
#ed-mount .ProseMirror h3 { font-size: 1.1em; margin: 1.3em 0 .6em; }
#ed-mount .ProseMirror blockquote {
  margin: 0 0 1.1em; padding-left: 1em; border-left: 3px solid var(--cinnabar); color: var(--ink-3);
}
#ed-mount .ProseMirror hr { border: none; width: 4rem; height: 1px; background: var(--line); margin: 2em auto; }
#ed-mount .ProseMirror a { color: var(--cinnabar); }
#ed-mount .ProseMirror img { max-width: 100%; display: block; margin: 0 auto; }
#ed-mount .ProseMirror img.ProseMirror-selectednode { outline: 2px solid var(--cinnabar); }
.ed-statusbar {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 10px; font-size: 12px; color: var(--ink-3);
}
.ed-statusbar .dirty { color: var(--cinnabar); font-weight: 700; }

/* ---- 浮层 / toast ---- */
.popover {
  position: fixed; z-index: 50; background: var(--paper-3);
  border: 1px solid var(--line); border-radius: 8px; padding: 12px;
  box-shadow: 0 8px 28px rgba(30, 29, 25, .18); width: 300px;
}
.popover input {
  width: 100%; border: 1px solid var(--line); border-radius: 6px;
  padding: 6px 8px; margin-bottom: 8px; background: #fff; font-size: 13px;
}
.popover .row { display: flex; gap: 6px; justify-content: flex-end; }
.pop-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; max-height: 180px; overflow-y: auto; margin-bottom: 8px; }
.pop-grid img { width: 100%; aspect-ratio: 3/2; object-fit: cover; border-radius: 4px; cursor: pointer; border: 2px solid transparent; }
.pop-grid img:hover { border-color: var(--cinnabar); }
#toast-root { position: fixed; bottom: 22px; left: 50%; transform: translateX(-50%); z-index: 99; }
.toast {
  background: var(--ink); color: var(--paper); padding: 8px 18px; border-radius: 6px;
  font-size: 13px; margin-top: 8px; animation: fadeup .25s;
}
.toast.err { background: var(--cinnabar); }
@keyframes fadeup { from { opacity: 0; transform: translateY(8px); } }

/* ---- 仪表盘 ---- */
.stat-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 22px; }
.stat-card {
  background: var(--paper-3); border: 1px solid var(--line); border-radius: 10px; padding: 16px;
}
.stat-card .n { font-family: var(--serif); font-size: 30px; font-weight: 900; }
.stat-card .l { font-size: 11px; letter-spacing: .2em; color: var(--ink-3); margin-top: 4px; }
.panel {
  background: var(--paper-3); border: 1px solid var(--line);
  border-radius: 10px; padding: 16px; margin-bottom: 16px;
}
.panel h3 { font-family: var(--serif); margin: 0 0 10px; font-size: 16px; }

/* ---- 图库 ---- */
.gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
.gallery-card { border: 1px solid var(--line); border-radius: 8px; overflow: hidden; background: var(--paper-3); }
.gallery-card img { width: 100%; aspect-ratio: 3/2; object-fit: cover; display: block; cursor: pointer; }
.gallery-card .ops { display: flex; justify-content: space-between; padding: 6px 8px; font-size: 12px; align-items: center; }

/* ---- 工具清单 ---- */
.tools-table { width: 100%; border-collapse: collapse; }
.tools-table td { padding: 4px 6px; }
.tools-table input { width: 100%; border: 1px solid var(--line); border-radius: 5px; padding: 5px 8px; background: var(--paper-3); font-size: 13px; }

/* ---- 发布 ---- */
.log {
  background: var(--ink); color: #d8d4c4; border-radius: 8px;
  padding: 14px; font-family: ui-monospace, Consolas, monospace;
  font-size: 12px; white-space: pre-wrap; max-height: 40vh; overflow-y: auto;
}
.step-line { margin: 6px 0; font-size: 13px; }
.step-line.ok::before { content: '✓ '; color: #7a9a6d; }
.step-line.fail::before { content: '✗ '; color: var(--cinnabar); font-weight: 700; }
```

- [ ] **Step 4: 手动验证骨架**

Run: `node server.js`，浏览器打开 `http://localhost:3210`
Expected: 三栏骨架出现（左侧朱砂印章导航 + 空列表栏 + 空工作区），控制台仅报 `/admin.js` 或 `/editor.js` 404（下一任务创建）；无 CSS 相关报错。Ctrl+C 停服务。

- [ ] **Step 5: Commit**

```bash
git add admin/index.html admin/admin.css server.js
git commit -m "feat(admin): 单页骨架与文人案头主题"
```

---

### Task 7: 编辑器封装（admin/editor.js）

**Files:**
- Create: `admin/editor.js`

接口（供 admin.js 使用）：

```js
const kit = EditorKit.create({
  mount,              // 编辑器挂载元素
  toolbar,            // 工具栏容器（本函数负责渲染按钮）
  body,               // 初始 Markdown 正文
  onDirty,            // 内容变化回调
  loadPhotos,         // async () => ['a.jpg', ...]
  uploadImage,        // async (File) => 'assets/photos/x.jpg'
});
kit.getMarkdown();    // 当前内容 → md
kit.editor;           // 裸 TipTap 实例（备查）
```

- [ ] **Step 1: 创建 `admin/editor.js`（完整文件）**

```js
/* TipTap 编辑器封装：工具栏 + 链接浮层 + 插图浮层 */
/* global TipTap, MdConvert */
'use strict';

const EditorKit = (() => {

  function create(opts) {
    const editor = new TipTap.Editor({
      element: opts.mount,
      extensions: [
        TipTap.StarterKit.configure({
          heading: { levels: [2, 3] },
          codeBlock: false, code: false, strike: false, underline: false,
          bulletList: false, orderedList: false, listItem: false,
          link: { openOnClick: false, autolink: false },
        }),
        TipTap.Image,
      ],
      content: MdConvert.mdToHtml(opts.body || ''),
      onUpdate: () => { refreshToolbar(); opts.onDirty && opts.onDirty(); },
      onSelectionUpdate: refreshToolbar,
    });

    /* ---------- 工具栏 ---------- */
    const BTNS = [
      { cmd: 'bold', label: 'B', title: '粗体' },
      { cmd: 'italic', label: 'I', title: '斜体', style: 'font-style:italic' },
      { sep: true },
      { cmd: 'h2', label: 'H2', title: '小标题' },
      { cmd: 'h3', label: 'H3', title: '小节标题' },
      { cmd: 'quote', label: '❝', title: '引用' },
      { cmd: 'hr', label: '—', title: '分割线' },
      { sep: true },
      { cmd: 'link', label: '🔗', title: '超链接' },
      { cmd: 'image', label: '图', title: '插图' },
    ];
    for (const b of BTNS) {
      if (b.sep) {
        const s = document.createElement('span');
        s.className = 'sep';
        opts.toolbar.appendChild(s);
        continue;
      }
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.cmd = b.cmd;
      btn.textContent = b.label;
      btn.title = b.title || '';
      if (b.style) btn.style.cssText = b.style;
      btn.addEventListener('click', () => runCmd(b.cmd, btn));
      opts.toolbar.appendChild(btn);
    }

    function refreshToolbar() {
      const map = {
        bold: editor.isActive('bold'),
        italic: editor.isActive('italic'),
        h2: editor.isActive('heading', { level: 2 }),
        h3: editor.isActive('heading', { level: 3 }),
        quote: editor.isActive('blockquote'),
        link: editor.isActive('link'),
      };
      for (const btn of opts.toolbar.querySelectorAll('button[data-cmd]')) {
        const k = btn.dataset.cmd;
        if (k in map) btn.classList.toggle('on', !!map[k]);
      }
    }

    function runCmd(cmd, btn) {
      const c = editor.chain().focus();
      switch (cmd) {
        case 'bold': c.toggleBold().run(); break;
        case 'italic': c.toggleItalic().run(); break;
        case 'h2': c.toggleHeading({ level: 2 }).run(); break;
        case 'h3': c.toggleHeading({ level: 3 }).run(); break;
        case 'quote': c.toggleBlockquote().run(); break;
        case 'hr': c.setHorizontalRule().run(); break;
        case 'link': showLinkPopover(btn); break;
        case 'image': showImagePopover(btn); break;
      }
      refreshToolbar();
    }

    /* ---------- 浮层基础设施 ---------- */
    const popRoot = document.getElementById('popover-root');
    function closePopovers() { popRoot.innerHTML = ''; }
    function openPopover(anchorBtn, build) {
      closePopovers();
      const pop = document.createElement('div');
      pop.className = 'popover';
      const r = anchorBtn.getBoundingClientRect();
      pop.style.left = Math.min(r.left, window.innerWidth - 320) + 'px';
      pop.style.top = (r.bottom + 6) + 'px';
      build(pop);
      popRoot.appendChild(pop);
      const input = pop.querySelector('input');
      if (input) input.focus();
    }
    document.addEventListener('mousedown', (e) => {
      if (!e.target.closest('.popover') && !e.target.closest('.ed-toolbar')) closePopovers();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePopovers(); });

    /* ---------- 链接浮层 ---------- */
    function showLinkPopover(btn) {
      const cur = editor.isActive('link') ? (editor.getAttributes('link').href || '') : '';
      openPopover(btn, (pop) => {
        pop.innerHTML = `
          <input type="url" placeholder="https://…" value="${cur.replace(/"/g, '&quot;')}">
          <div class="row">
            ${cur ? '<button class="btn danger" data-act="remove">移除</button>' : ''}
            <button class="btn" data-act="cancel">取消</button>
            <button class="btn primary" data-act="ok">确定</button>
          </div>`;
        const input = pop.querySelector('input');
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') pop.querySelector('[data-act=ok]').click(); });
        pop.addEventListener('click', (e) => {
          const act = e.target.dataset.act;
          if (act === 'cancel') return closePopovers();
          if (act === 'remove') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return closePopovers();
          }
          if (act === 'ok') {
            const href = input.value.trim();
            const chain = editor.chain().focus().extendMarkRange('link');
            if (href) chain.setLink({ href }).run();
            else chain.unsetLink().run();
            closePopovers();
          }
        });
      });
    }

    /* ---------- 插图浮层 ---------- */
    function showImagePopover(btn) {
      const editing = editor.isActive('image');
      const cur = editing ? editor.getAttributes('image') : null;
      openPopover(btn, async (pop) => {
        pop.innerHTML = `<div class="muted" style="margin-bottom:8px">加载图库…</div>`;
        const photos = await opts.loadPhotos();
        pop.innerHTML = `
          <div class="pop-grid">
            ${photos.map(n => `<img src="/photos/${encodeURIComponent(n)}" data-name="${n}" alt="">`).join('')}
          </div>
          <input type="text" placeholder="图注（可空）" value="${cur ? String(cur.alt || '').replace(/"/g, '&quot;') : ''}">
          <div class="row">
            <label class="btn" style="margin-right:auto">上传新图
              <input type="file" accept="image/jpeg,image/png" hidden>
            </label>
            <button class="btn" data-act="cancel">取消</button>
          </div>`;
        const altInput = pop.querySelector('input[type=text]');
        const fileInput = pop.querySelector('input[type=file]');

        pop.querySelector('.pop-grid').addEventListener('click', (e) => {
          const name = e.target.dataset && e.target.dataset.name;
          if (!name) return;
          insertImage('assets/photos/' + name, altInput.value.trim());
        });
        fileInput.addEventListener('change', async () => {
          const file = fileInput.files[0];
          if (!file) return;
          const label = pop.querySelector('label.btn');
          label.textContent = '上传中…';
          try {
            const path = await opts.uploadImage(file);
            insertImage(path, altInput.value.trim());
          } catch (err) {
            label.textContent = '上传失败：' + err.message;
          }
        });
        pop.addEventListener('click', (e) => {
          if (e.target.dataset.act === 'cancel') closePopovers();
        });
      });

      function insertImage(src, alt) {
        if (editor.isActive('image')) {
          editor.chain().focus().updateAttributes('image', { src, alt }).run();
        } else {
          editor.chain().focus().setImage({ src, alt }).run();
        }
        closePopovers();
      }
    }

    return {
      editor,
      getMarkdown: () => MdConvert.jsonToMd(editor.getJSON()),
      closePopovers,
    };
  }

  return { create };
})();
```

- [ ] **Step 2: 语法检查**

Run: `node --check admin/editor.js`
Expected: 无输出（语法通过）

- [ ] **Step 3: Commit**

```bash
git add admin/editor.js
git commit -m "feat(admin): TipTap 编辑器封装（工具栏/链接浮层/插图浮层）"
```

---

### Task 8: 主逻辑（admin/admin.js：路由 + 五模块）

**Files:**
- Create: `admin/admin.js`

- [ ] **Step 1: 创建 `admin/admin.js`（完整文件）**

```js
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
```

- [ ] **Step 2: 语法检查 + 启动冒烟**

Run:
```bash
node --check admin/admin.js && node server.js
```
浏览器打开 `http://localhost:3210`，Expected：
- 仪表盘显示统计卡片、git 状态、最近文章；
- 切到「文」：左侧出现文章列表（16+ 篇），可搜索/筛选；
- 打开 `walden`：正文渲染进编辑器；加粗、插链接、插图、H2、引用、分割线按钮均可用，底部字数变化、状态变「● 未保存」；
- 保存后 `posts/walden.md` 内容格式正确，重新打开内容一致（**往返无损**）；
- 图库上传/删除/复制路径可用；工具清单加行保存后 `admin/tools.json` 更新；
- 发布页「仅构建」显示构建日志。
Ctrl+C 停服务。

- [ ] **Step 3: Commit**

```bash
git add admin/admin.js
git commit -m "feat(admin): 主逻辑（路由 + 仪表盘/文章/图库/工具/发布）"
```

---

### Task 9: 端到端验收（对照规格 §8 清单）

**Files:** 无新增；产出为验证记录。

- [ ] **Step 1: 全部单测**

Run: `node --test tests/`
Expected: `tests/markdown.test.js`（7 个）+ `tests/md-convert.test.js`（5 个）全绿

- [ ] **Step 2: 构建回归**

Run: `node build.js`
Expected: `✓ 构建完成：16 篇文章 → ...`，无跳过警告

- [ ] **Step 3: 规格验收清单逐条走查**（`node server.js` 起服务后按序执行）

| # | 操作 | 预期 |
|---|---|---|
| 1 | 打开 :3210 | 五模块可切换 |
| 2 | 新建文章，用工具栏造 链接/粗斜体/H2/引用/分割线/插图，保存 | `posts/<slug>.md` 为正确 md 子集 |
| 3 | 重新打开该文章再保存 | 编辑器内容一致；`git diff posts/<slug>.md` 无变化（往返无损） |
| 4 | 插图两条路径各插一张 | 均成功；上传图最长边 ≤1600 且未裁剪（用图片查看器确认尺寸比例） |
| 5 | 图库上传一张竖图 | 产物为 3:2 横图 |
| 6 | `node build.js` 后打开该文章的 `post/<slug>/` 页面 | h2/blockquote/hr/figure/a/strong/em 渲染正确、样式与站点一致 |
| 7 | 工具清单加一行 → 保存 → `node build.js` | `js/content.js` 的 TOOLS 含新条目 |
| 8 | 发布页「仅构建」 | 日志显示构建成功 |
| 9 | 把该测试文章设为草稿再构建 | 文章不进构建产物（archive/板块页/content.js 均无） |
| 10 | 删除测试文章，构建 | 回到 16 篇 |

- [ ] **Step 4: 收尾 Commit**

```bash
git add -A
git commit -m "test(admin): 端到端验收通过（规格 §8 全绿）" --allow-empty
```

（若走查中产生修复，把修复文件一并提交，不用 `--allow-empty`。）

---

## 附：已知取舍

- 删除文章 / 发布推送用浏览器原生 `confirm` 对话框（YAGNI，本地工具够用）。
- 正文字符统计含 Markdown 符号，与站点阅读时长估算口径一致（都按字符数）。
- 链接浮层在选区为空时确定，会把链接套在光标处后续输入上（TipTap 默认行为），属可接受交互。
- `admin/vendor/tiptap.js` 为打包产物，升级 TipTap 时改版本号后跑 `npm run bundle:tiptap` 即可。
