---
title: "文字炼金坊"
cat: code
date: 2026.08.10
tags: []
excerpt: "AI 写作风格转换工具：把任意文字「炼」成名家文风。"
slug: webapp
---
**67 位作家 × 4 种转换模式**：选择作家与模式，一键改写你的文字；

**自定义文风提取**：粘贴一段范文，提取其风格特征用于转换；

**多轮续写**：在转换结果基础上持续对话、迭代打磨；

**多作家对比**：同一段文字同时用多位作家的风格转换，并排比较。

[https://cpc1513.github.io/literature-Alchemy-Workshop/](https://cpc1513.github.io/literature-Alchemy-Workshop/)

**技术栈**：前端 React 19 + Vite + TypeScript + Tailwind CSS + shadcn/ui，部署在 GitHub Pages；后端是 Hono + tRPC 的轻量代理，负责保管 DeepSeek API Key 并转发请求。前后端通过 tRPC 实现端到端类型安全，共享 contracts/ 目录中的作家数据与 prompt 构建逻辑。无数据库——密钥存于Netlify平台环境变量，接口由 Cloudflare Turnstile 人机验证、访问口令与 IP 限频保护。
