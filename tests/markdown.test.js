'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { inline, blockToHtml, renderBody, stripMd } = require('../lib/markdown');

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

test('inline: URL 中的 & 保持转义产物', () => {
  assert.strictEqual(
    inline('[x](https://e.com/a?b=1&c=2)'),
    '<a href="https://e.com/a?b=1&amp;c=2" target="_blank" rel="noopener">x</a>');
});

test('inline: URL 允许含平衡括号', () => {
  assert.strictEqual(
    inline('[w](https://zh.wikipedia.org/wiki/甲_(天干))'),
    '<a href="https://zh.wikipedia.org/wiki/甲_(天干)" target="_blank" rel="noopener">w</a>');
});

test('blockToHtml: 空图注时省略空 figcaption', () => {
  assert.strictEqual(
    blockToHtml('![](assets/a.jpg)', '../../'),
    '<figure class="reader-fig"><img src="../../assets/a.jpg" alt=""></figure>');
});

test('stripMd: 剥离块级记号（标题 / 引用 / 整段插图 / 分割线）', () => {
  assert.strictEqual(stripMd('## 第一节'), '第一节');
  assert.strictEqual(stripMd('> 湖水很安静'), '湖水很安静');
  assert.strictEqual(stripMd('![天池](assets/photos/tianchi.jpg)'), '天池');
  assert.strictEqual(stripMd('---'), '');
});

test('stripMd: 剥离行内记号，保留纯文本', () => {
  assert.strictEqual(
    stripMd('见[秋水居](https://example.com)一文，**重**点与*轻*声'),
    '见秋水居一文，重点与轻声');
});
