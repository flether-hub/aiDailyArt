# 🎨 AI 名画艺术馆 (AI Art Gallery)

**一个基于 AI 驱动的名画聚合与赏析平台**。该系统能够跨博物馆平台（如大都会艺术博物馆、芝加哥艺术学院等）自动发现名画，并利用 Google Gemini AI 进行深度的艺术风格分析、历史背景解读及关键词提取。

---

## 🌟 核心功能

- **🤖 全自动艺术发现**：集成多源博物馆 API，支持定时或手动从全球顶级博物馆库中挖掘名画。
- **🧠 AI 深度解析**：利用 **Gemini 2.0 Flash** 对每一幅作品进行视觉分析，生成专业的引导式赏析内容。
- **⚡ 边缘原生存储**：
    - **Cloudflare D1**：轻量级边缘关系型数据库 (SQLite)，存储作品元数据与 AI 解读。
    - **Cloudflare R2**：分布式对象存储 (S3 兼容)，自动转存名画原图，确保全球高速访问。
- **📺 现代流动界面**：基于 React + Tailwind CSS 构建，支持瀑布流布局与毛玻璃美学设计。
- **⚙️ 管理员面板**：支持配置抓取频率、API 密钥、手动触发抓取任务，并能实时观测 AI 分析进度流。

---

## 🛠️ 技术架构

本项目采用了现代化的 **全栈边缘计算** 架构：

### 1. Web 框架: Hono
[Hono](https://hono.dev/) 是本项目后端的核心。它是一个极致轻量、基于 Web 标准的框架。
- **生产环境**: 部署为 Cloudflare Pages Functions，直接运行在边缘节点，利用 `hono/cloudflare-pages` 适配器。
- **开发环境**: 利用 `@hono/node-server` 适配器，通过 Vite 中间件挂载到本地 Node.js 服务器中运行，实现 100% 的代码复用。

### 2. 对象存储: R2 (Object Storage)
R2 用于托管所有艺术品图片。
- **写入**: 在 `_ai-fetcher.ts` 中，系统抓取图片后通过 `env.ART_GALLERY_IMAGES.put()` 直接写入 R2。
- **分发**: 在 `functions/api/[[path]].ts` 中通过 `/api/cdn/*` 路由实现。它从 R2 读取流并返回，充当了一个轻量级的图片 CDN。

---

## 📂 项目结构

- `/functions/api`: **核心后端逻辑** (Hono)
    - `[[path]].ts`: 路由主入口，包含 API 接口与 R2 图片分发逻辑。
    - `_db.ts`: 数据库抽象层。在生产环境使用 **Cloudflare D1**，在开发环境自动切换为 **Better-SQLite3**。
    - `_ai-fetcher.ts`: 负责对接多博物馆 API、调用 Gemini AI 进行分析并上传 R2。
    - `_cloud-env.ts`: 环境变量与 Cloudflare 绑定资源的全局管理。
- `/src`: **前端 React 代码**
- `/server.ts`: 本地开发服务器 (Express + Vite + Hono Adapter)。
- `wrangler.toml`: Cloudflare 资源绑定声明控制文件。

---

## 🚀 部署指南 (Cloudflare Pages)

1. **创建资源**: 在 Cloudflare 控制台创建 D1 实例 (`ART_GALLERY_DB`) 和 R2 存储桶 (`ART_GALLERY_IMAGES`)。
2. **管理密码**: 设置 `ADMIN_PASSWORD`。
3. **API 密钥**: 部署后登录后台，在“设置”中配置你的 **Gemini** 或 **Qwen** API 密钥。
4. **资源绑定**: 在 Pages 项目设置中将 D1 (`ART_GALLERY_DB`) 和 R2 (`ART_GALLERY_IMAGES`) 绑定到对应的变量名。
4. **数据库初始化**: 首次运行 API 时，系统会自动检查并在 D1 中创建所需的表。

---

## 💡 开发提示

- 本地开发时，数据库文件将保存为根目录下的 `local.db`。
- 本地开发时，R2 图片操作将尝试调用本地模拟（或在未配置时提示错误）。
- AI 采集任务采用 **SSE (Server-Sent Events)** 实现，代码位于 `[[path]].ts` 的 `/admin/trigger-fetch` 路由。
