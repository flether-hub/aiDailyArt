# aiDailyArt - 您的数字名画美术馆

aiDailyArt 是一家为您全天候开放的数字美术馆。它不仅是一个展示平台，更是一个自动进化的艺术生态系统。系统会自动从全球顶级博物馆（如大都会艺术博物馆、卢浮宫、故宫博物院等）寻得传世名作，并以辛辣、深刻且富有感染力的 AI 视角进行解读与策展。

## ✨ 核心特性

- **全球溯源**: 自动对接 Met API、Wikidata (SPARQL) 等权威数据源，涵盖东西方艺术精品。
- **AI 策展**: 基于 Google Gemini 或 阿里云大模型，为每幅画作生成独特的、讲故事式的赏析。
- **全自动运行**: 定时任务自动发现、分析并入库名画，无需人工干预。
- **交互体验**: 支持评论互动、IP 归属地自动显示、优雅的画廊排版。
- **现代架构**: 前端基于 React 19 + Tailwind CSS 4，后端自适应 Node.js 与 Cloudflare Pages。

---

## 📊 项目统计与架构

本项目包含约 **2,500+** 行代码，采用前沿的全栈边缘计算架构：

- **前端**: React 18+ + Vite + Tailwind CSS 4 + Framer Motion (动画)
- **后端**: Cloudflare Pages Functions (基于 Hono 框架)
- **数据库**: Cloudflare D1 (生产) / SQLite (开发)
- **存储**: Cloudflare R2 (图像持久化)
- **AI 引擎**: Google Gemini SDK (@google/genai) / 阿里云通义千问 (DashScope)

---

## 🚀 部署至 Cloudflare (Pages + D1 + R2)

本项目深度优化了 Cloudflare 生态，能够以极低成本甚至零成本在边缘节点运行。

### 1. 前置准备
- 安装 [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/): `npm install -g wrangler`
- 登录 Cloudflare: `wrangler login`

### 2. 创建 Cloudflare 资源
在 Cloudflare 控制台或使用命令行创建以下资源：

**D1 数据库 (用于存储艺术品与设置)**:
```bash
wrangler d1 create art_db
```
*记录下输出中的 `database_id`，并更新至 `wrangler.toml` 的 `[[d1_databases]]` 部分。*

**R2 存储桶 (用于持久化托管名画图像)**:
```bash
wrangler r2 bucket create art-images
```

### 3. 配置 wrangler.toml
确保 `wrangler.toml` 中的绑定名称如下（这是代码中引用的名称）：
- D1 绑定名称: `ART_GALLERY_DB`
- R2 绑定名称: `ART_GALLERY_IMAGES`

### 4. 设置环境变量
在 Cloudflare Pages 项目控制台 -> **设置** -> **环境变量** 中添加以下变量：
- `ADMIN_PASSWORD`: 管理后台登录密码。
- `CRON_SECRET`: (可选) 用于保护 `/api/cron` 接口的密钥。

### 5. 初始化数据库
本项目具备自动初始化逻辑，首次访问应用接口时会自动创建所需的表。如果您想手动初始化，可以在控制台直接运行 SQL。

### 6. 部署应用
```bash
npm run build
wrangler pages deploy dist
```

### 7. 配置定时任务 (Cron Triggers)
为了让名画能够自动“长”出来，您需要配置定时器：

1. **方法 A: Cloudflare Pages Scheduled Tasks (推荐)**
   - 进入 Cloudflare 控制台 -> Pages 项目 -> 设置 -> Functions -> Cron Triggers。
   - 添加一个定时器，例如 `0 */1 * * *` (每 1 小时抓取一次)。
   - 本项目 `functions/_middleware.ts` 已导出 `scheduled` 处理逻辑。

2. **方法 B: 使用 Cron Worker (本项目提供 `cron-worker.js`)**
   - 部署一个单独的 Worker `cron-worker.js`，设置环境变量 `CRON_TARGET_URL` 为 `https://你的域名/api/cron?secret=你的秘钥`。

---

## 🛠️ 本地开发

1. **安装依赖**: `npm install`
2. **启动开发服务器**: `npm run dev`
   - 本地开发模式下，系统会使用 `better-sqlite3` 在根目录自动创建 `database.sqlite`。
3. **设置 AI**: 访问 `/admin` 页面，输入 `ADMIN_PASSWORD` 登录，在设置页面配置您的 Gemini 或 阿里大模型 API Key。

## 📁 目录结构与功能

- `/functions`: Cloudflare Pages Functions (API 路由)
  - `api/[[path]].ts`: Hono 路由入口，处理 Auth, CRUD, CDN 代理等需求。
  - `api/_ai-fetcher.ts`: **核心逻辑**。包含爬虫逻辑、R2 同步逻辑、AI 接口调用策略。
  - `api/_db.ts`: 数据库驱动适配，支持 D1 与本地 SQLite。
- `/src`: React 前端应用
  - `pages/Home.tsx`: 沉浸式首页。
  - `pages/ArtworkDetail.tsx`: 详情页，包含 AI 标题提取与 Prose 排版。
  - `pages/AdminDashboard.tsx`: 全功能后台，支持模型切换与任务监控。

## 🛡️ 安全与优化

- **CDN 持久缓存**: 通过 `/api/cdn/*` 路由代理 R2 图片，配置了 1 年的持久缓存，减少回源开销。
- **SHA-256 身份验证**: 登录 Token 基于密码生成安全哈希，避免明文传输。
- **僵死任务处理**: 后台任务状态如果超过 10 分钟未更新，会被自动标记为 idle，防止前端挂死。

---
详情请参阅 [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)。
