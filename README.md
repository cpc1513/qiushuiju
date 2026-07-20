# 秋水居

> 写代码，读书，拍照，随手记 —— 一人的湖畔。

静态个人博客：宣纸 / 松烟墨 / 朱砂的文人水岸风格，首屏为可交互的秋水涟漪（Canvas 波动算法），Lenis 平滑滚动 + GSAP 滚动编排，摄影卷为横向画廊。内容由 Markdown 驱动，push 即自动构建并发布到 GitHub Pages。

## 发一篇新文章

1. 在 `posts/` 新建一个 `.md` 文件，文件名即文章 slug（建议小写英文加连字符）：

```markdown
---
title: "文章标题"
cat: code            # code 编程 / reading 阅读 / essays 随笔 / photos 摄影
date: 2026.07.17
tags: [标签一, 标签二]
excerpt: "一两句摘要，会出现在列表和分享卡片里。"
---

正文第一段。

正文第二段。段落之间空一行即可。
```

2. `git add . && git commit -m "新文章" && git push`，GitHub Actions 会自动完成构建与发布，约一分钟后上线。

可选字段：

| 字段 | 说明 |
|---|---|
| `mins` | 阅读分钟数，省略时按字数自动估算 |
| `img` | 摄影文的配图路径（如 `assets/photos/xxx.jpg`） |
| `poem` | 摄影图注里的一句诗 |
| `season` | 摄影图注的季节字，默认「秋」 |

**mins/excerpt/img/poem 不写都有兜底**，最少只要 title + cat + date 就能发。

## 添加摄影作品

1. 图片压缩到最长边约 1600px、JPG 质量 80 左右，放进 `assets/photos/`
2. 新建 `posts/p-xxx.md`，`cat: photos`，写上 `img`、`poem`
3. push。首页横向画廊、摄影大图墙、独立手记页都会自动出现

## 本地预览

```bash
npm run serve     # 构建 + 起本地服务于 :8000
# 或
node build.js && python3 -m http.server 8000
```

## 首次部署

1. 在 GitHub 新建仓库（如 `qiushuiju` 或 `用户名.github.io`）
2. 把本目录全部内容推上去（包括 `.github/`）
3. 仓库 Settings → Pages → Source 选 **GitHub Actions**
4. 等第一次 Action 跑完，访问 `https://用户名.github.io`（或 `…/仓库名`）

绑定自定义域名：Settings → Pages → Custom domain 填写域名，并在 DNS 服务商处加 CNAME 记录指向 `用户名.github.io`；同时把 `deploy.yml` 里 SITE_URL 的生成改为你的域名（文件内有注释）。

## 目录结构

```
posts/            全部文章（Markdown，唯一内容源）
build.js          构建脚本：md → content.js + 归档/板块/文章页 + RSS + sitemap
index.html        首页（长卷）
archive/          全部文字归档（构建产物）
code|reading|essays|photos/   板块页（构建产物）
post/<slug>/      独立文章页（构建产物）
feed.xml          RSS 订阅
sitemap.xml       站点地图
css/ js/ vendor/ assets/      样式、脚本、本地依赖与图片
```

`js/content.js` 和 `archive/`、`post/` 等目录都是构建产物，请勿手改——改 `posts/*.md` 后重新构建即可。

## 技术

纯静态，无框架：原生 HTML/CSS/JS + Lenis + GSAP/ScrollTrigger（本地 vendor）。涟漪为双缓冲波动算法的 Canvas 实现，低分辨率模拟 + 柔化渲染。
