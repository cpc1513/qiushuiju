# 秋水居 · 本地管理后台重设计规格

日期：2026-08-10
状态：已通过设计评审，待实现

## 1. 背景与目标

旧版后台（`server.js` + `admin/`，纯 Markdown 文本框）已整体删除。本次重写一个功能完善、视觉与主站一致的本地后台，核心诉求：

- 所见即所得（WYSIWYG）文章编辑
- 文中插图编辑（图库选取 / 本地上传）
- URL 超链接编辑
- 一键构建 + 推送部署
- 模块完整：仪表盘、文章、图库、工具清单、发布

约束：项目为纯静态零框架博客（原生 HTML/CSS/JS），仓库保持「运行时零 npm 依赖」传统；后台仅为本地工具，不参与线上站点。

## 2. 总体架构

```
server.js            零依赖 Node 本地服务（:3210）：JSON API + 静态文件
admin/
  index.html         单页后台入口
  admin.css          文人案头主题
  admin.js           前端逻辑（视图路由 + 各模块）
  editor.js          TipTap 封装 + Markdown 双向转换
  vendor/tiptap.js   esbuild 一次性打包的 TipTap bundle（提交进仓库）
  tools.json         工具清单数据（build.js 优先读取，缺失时内置兜底）
```

- TipTap 依赖（`@tiptap/core` + `@tiptap/starter-kit` + `@tiptap/extension-link` + `@tiptap/extension-image`）用 esbuild 打包成单个 `admin/vendor/tiptap.js`，作为构建产物提交仓库；打包是一次性开发步骤，不进入日常流程。
- 后端只做文件读写与命令执行，编辑、渲染、预览全在前端。

### 2.1 布局（三栏，Notion 式）

- 左：窄图标导航——文章 / 图库 / 工具 / 发布 / 仪表盘
- 中：上下文列表栏（文章模块下为文章列表，支持搜索与板块筛选）
- 右：主工作区（编辑器 / 网格 / 表单 / 日志）

### 2.2 视觉（A · 文人案头）

延续主站气质：宣纸底色（`#f5f0e6` 系）、松烟墨文字、朱砂（`#b03a24`）点缀、印章元素；衬线标题 + 适中圆角卡片。与主站「同一张书桌上写字」的感觉。

## 3. 编辑器（核心）

### 3.1 格式集（封闭）

| 元素 | Markdown 表示 | 说明 |
|---|---|---|
| 段落 | 空行分隔 | 现状不变 |
| 小标题 | `## ` / `### ` | H2 / H3 |
| 引用块 | `> ` | 单段引用 |
| 分割线 | `---` 独占一行 | |
| 粗体 / 斜体 | `**x**` / `*x*` | 行内 |
| 超链接 | `[文字](url)` | 行内 |
| 插图 | `![图注](路径)` 独占一行 | 块级 |

StarterKit 中剔除此集合外的能力（代码块、删除线、列表等不开放，保持转换可控）。

### 3.2 Markdown 双向转换（`admin/editor.js`）

- **打开**：自研解析器把 md 子集 → HTML 字符串 → TipTap `setContent`。
- **保存**：从 TipTap JSON 文档树序列化回 md 子集。
- 格式集封闭，两个转换器规模小、可穷举测试；要求往返无损（md → 编辑器 → md 幂等）。

### 3.3 链接编辑

- 选中文字 → 工具栏链接按钮 → 浮层输入 URL，确认生成链接。
- 点击文中已有链接 → 浮层显示当前 URL，可修改或移除。
- 浮层支持 Enter 确认 / Esc 关闭。

### 3.4 插图编辑

- 工具栏插图按钮 → 浮层二选一：
  - 「从图库选」：图库网格点选插入；
  - 「上传新图」：选择本地文件 → 前端压缩（最长边 1600px，**不裁剪**，保持原比例）→ 上传到 `assets/photos/` → 插入。
- 文中插图可填写/修改图注（alt）。

### 3.5 文章元信息与保存

- 元信息栏：标题、slug（小写英文/数字/连字符，服务端校验）、板块（code/reading/essays/photos）、日期、标签、摘要、草稿开关；摄影文另有配图路径、图注诗（poem）、季节字（season）。
- 底部状态栏：字数统计 + 保存状态。有未保存改动时醒目标记，关闭/切换文章前弹确认。
- 保存即写入 `posts/<slug>.md`（front matter + md 正文）；改 slug 时删除旧文件。

## 4. 其余模块

### 4.1 仪表盘

- 统计卡片：文章总数、草稿数、总字数、图片数。
- git 未提交变更状态（`git status --short`）。
- 最近修改文章列表（按 date 排序前 5）。
- 快捷入口：写新篇、构建并推送。

### 4.2 图库

- 照片网格（缩略预览）、上传（自动压缩 + 裁 3:2，摄影卷用）、删除（确认后）、点击卡片复制路径。
- 数据源：`assets/photos/` 目录扫描。

### 4.3 工具清单

- 首页「案头」条目的增删改：名称 / 分类 / 一句话描述 / 链接。
- 存储：`admin/tools.json`；`build.js` 恢复「优先读 tools.json，缺失或解析失败时用内置默认」的逻辑。

### 4.4 发布

- 「仅构建」：跑 `node build.js`，展示日志（本地预览用）。
- 「构建并推送」：分步执行 构建 → `git add . && git commit` → `git push`，实时展示每步日志；任一步失败即停止并标红展示错误输出。
- commit message 可填，默认为 `更新 <时间>`。

## 5. API 一览（server.js，全部仅本地）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/posts` | 文章列表（含 slug/title/cat/date/tags/draft/字数） |
| GET | `/api/post/:slug` | 单篇文章（meta + body） |
| POST | `/api/save` | 保存文章（slug 合法性校验，支持改 slug） |
| POST | `/api/delete` | 删除文章 |
| GET | `/api/photos` | 图片列表 |
| POST | `/api/upload` | 上传图片（base64，文件名清洗） |
| POST | `/api/photo-delete` | 删除图片 |
| GET/POST | `/api/tools` | 读取 / 保存工具清单 |
| POST | `/api/build` | 运行 build.js，返回日志 |
| POST | `/api/publish` | 构建 + commit + push，分步返回日志 |
| GET | `/api/status` | git status --short |
| GET | `/api/stats` | 仪表盘统计数据 |

静态路由：`/` → `admin/index.html`；`/admin.css` `/admin.js` `/editor.js` `/vendor/*` → `admin/` 下文件；`/photos/*` → `assets/photos/`。

## 6. build.js 配套渲染扩展（必需）

当前 build.js 把正文按纯文本段落渲染（`<p>` 直出），必须同步扩展，否则新格式无法上线：

1. **块级**：`##`/`###` → `<h2>/<h3>`；`> ` → `<blockquote>`；`---` → `<hr>`；`![]()` 独占行 → `<figure><img><figcaption>`。
2. **行内**：先做 HTML 转义，再替换 `[文字](url)` → `<a>`、`**x**` → `<strong>`、`*x*` → `<em>`（转义在前，保证安全）。
3. `parseFM` 已实现 BOM/CRLF 兼容（2026-08-10 修复）。
4. `css/style.css` 补 reader 页面新增元素的样式（h2/h3/blockquote/hr/figure/a/em/strong），风格与现有排版一致。

## 7. 错误处理

- slug 非法（非小写英文/数字/连字符）→ 400 + 中文错误提示，前端表单内联展示。
- 保存/删除/上传的文件操作异常 → 500 + 错误信息，前端 toast。
- 构建 / git 命令失败 → 返回完整 stdout+stderr，发布页分步标红。
- 图片上传限制：仅 jpg/png，单文件前端压缩后上传，文件名清洗为安全字符。
- front matter 缺字段：沿用 build.js 的兜底（title/cat/date 最少三件套，mins 自动估算）。

## 8. 验收标准（手动测试清单）

1. `node server.js` 启动，`:3210` 打开后台，五个模块可切换。
2. 新建文章：WYSIWYG 编辑含 链接/粗斜体/H2/引用/分割线/插图 的内容，保存后 `posts/<slug>.md` 内容为正确的 md 子集。
3. 往返无损：重新打开该文章，编辑器内容与保存前一致；再次保存，md 文件无 diff。
4. 文中插图：从图库选 + 上传新图两条路径均可插入；上传图被压缩（最长边 ≤1600）且未裁剪。
5. 图库上传的图被裁为 3:2。
6. `node build.js` 成功，16+ 篇文章全部构建；含新格式的文章页 HTML 渲染正确（h2/blockquote/hr/figure/a/strong/em）。
7. 工具清单增删改后，构建出的首页「案头」同步更新。
8. 发布流程：「仅构建」显示日志；「构建并推送」分步展示，失败步骤标红。
9. 草稿文章不出现在构建产物中。

## 9. 明确不做（YAGNI）

- 无用户系统 / 无远程访问（仅 localhost 本地工具）。
- 无代码块、列表、表格等更多格式（格式集封闭，后续需要再加）。
- 无自动保存到磁盘（只有未保存提示 + 离开拦截）。
- 无图片 CDN / 对象存储，图床就是 `assets/photos/`。
