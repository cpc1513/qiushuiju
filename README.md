# 秋水居

> 写代码，读书，拍照，随手记 —— 一人的湖畔。

静态个人博客：宣纸 / 松烟墨 / 朱砂的文人水岸风格，首屏为可交互的秋水涟漪（Canvas 波动算法），Lenis 平滑滚动 + GSAP 滚动编排，摄影卷为横向画廊。内容由 Markdown 驱动。

## 部署（GitHub Pages）

本仓库已包含全部构建产物，直接开启 Pages 即可：

1. 仓库 Settings → Pages → Source 选 **Deploy from a branch**
2. Branch 选 `master`，目录选 `/ (root)`，保存
3. 稍后访问 `https://cpc1513.github.io/qiushuiju/`

## 发一篇新文章

1. 在 `posts/` 新建一个 `.md` 文件（文件名即 slug）：

```markdown
---
title: "文章标题"
cat: code            # code 编程 / reading 阅读 / essays 随笔 / photos 摄影
date: 2026.07.17
tags: [标签一, 标签二]
excerpt: "一两句摘要。"
---

正文第一段。

正文第二段。
```

2. 本地运行 `node build.js` 重新生成产物
3. `git add . && git commit -m "新文章" && git push`

可选字段：`mins`（阅读分钟，省略按字数估算）、`img`（摄影配图）、`poem`（摄影图注诗句）、`season`（季节，默认「秋」）。

## 本地预览

```bash
npm run serve     # 构建 + 起本地服务于 :8000
```

## 目录结构

```
posts/            全部文章（Markdown，内容源）
build.js          构建脚本：md → content.js + 归档/板块/文章页 + RSS + sitemap
index.html        首页（长卷）
archive/ code/ reading/ essays/ photos/ post/   构建产物
css/ js/ vendor/ assets/      样式、脚本、本地依赖与图片
```

`js/content.js` 与 `archive/`、`post/` 等是构建产物，改 `posts/*.md` 后重新 `node build.js` 即可。

## 技术

纯静态，无框架：原生 HTML/CSS/JS + Lenis + GSAP/ScrollTrigger（本地 vendor）。涟漪为双缓冲波动算法的 Canvas 实现。
