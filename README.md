# aiDailyArt - 您的数字名画美术馆

aiDailyArt 是一家为您全天候开放的数字美术馆。它不仅是一个展示平台，更是一个自动进化的艺术生态系统。系统会自动从全球顶级博物馆（如大都会艺术博物馆、卢浮宫、故宫博物院等）寻得传世名作，并以辛辣、深刻且富有感染力的 AI 视角进行解读与策展。

## ✨ 核心特性

- **全球溯源**: 自动对接 Met API、Wikidata (SPARQL) 等权威数据源，涵盖东西方艺术精品。
- **AI 策展**: 基于 Google Gemini 或阿里云大模型，为每幅画作生成独特的、讲故事式的赏析。
- **全自动运行**: 定时任务自动发现、分析并入库名画，无需人工干预。
- **交互体验**: 支持评论互动、IP 归属地自动显示、优雅的画廊排版。
- **现代架构**: 前端基于 React 19 + Tailwind CSS 4，后端自适应 Node.js 与 Cloudflare Pages。

---

## 📁 代码架构详解

本项目采用了典型的前后端分离，同时针对**边缘计算 (Edge Computing)** 进行了深度优化的全栈架构（也支持本地 Node.js 运行）。下面详细解释这套代码架构的原理和分层逻辑：

### 1. 前端部分 (`/src`)
使用 **React 18/19**、**React Router Dom** 和 **Tailwind CSS** 构建。
- **`App.tsx`**: 整个应用的主路口。配置了所有的路由 (Routes)，包含了页眉 (Navbar) 和页脚的公用组件。使用 `framer-motion` 的 `AnimatePresence` 拦截路由切换，实现平滑转场动画。
- **`pages/Home.tsx`**: 呈现画廊首页。它分为主展示区（带精美题词页面的 Hero Section、最新精选放大展示区、瀑布流作品栅格）以及右侧固定浮动的侧边栏（最受欢迎作品排行、热门话题聚合网）。采用桌面端和移动端双布局自适应。
- **`pages/ArtworkDetail.tsx`**: 艺术品深度赏析细节页。带有交互式图片放大器 (`createPortal` 避免层级穿透)、用户评论组件 (`ArtworkDetail` 内)、“猜你喜欢” 的关联推荐模块。
- **`pages/AdminDashboard.tsx` & `AdminLogin.tsx`**: 提供强有力的后端管理能力。后台界面可以实时手动触发 AI 的策展任务，监控运行状态，管理 API Keys (以保密格式存储于数据库)，也能查看访客统计和拦截恶意 IP 评论。
- **`lib/artUtils.ts` & `lib/ipUtils.ts` 等**: 为前端提供功能性的 Hooks 和格式化插件，比如正则净化 AI 输入内容的段落标题，为评论模块提供脱敏策略 (MaskIP) 等等。

### 2. 后端 API 部分 (`/functions/api`)
为了既支持 Cloudflare Pages，又能兼容本地运行，后端基于轻量级和 Edge 原生的 **Hono** 框架构建，核心文件有：
- **`[[path]].ts`**: Hono 路由的总收口，实现了完整的 RESTful 服务能力：
  - **CRUD 接口**: `GET /api/artworks`, `POST /api/comments/:id`。
  - **安全与身份校验**: HMAC-SHA256 生成 Admin Token 鉴权，防御路由中间件。
  - **Server-Sent Events (SSE)**: 用于 `/api/admin/trigger-fetch`。由于 AI 拉取和分析可能要 10-30 秒不等，使用 Edge 支持的 Server Stream (SSE) 持续向前端输出日志和进度 `yield`（例如“💡 正在进行深度分析并转存资源...”）。
  - **CDN图片保护拦截**: `/api/cdn/*` 路由通过拦截实现对绑定的 R2 存储桶内容的私有代理及持久化缓存 (`Cache-Control`) 下发。
- **`_ai-fetcher.ts`**: **全系统最关键的业务逻辑处理引擎**。
  - 实现从外部多源（大都会博物馆 API、维基数据 Wikidata SPARQL 查询）抓取随机艺术名作的 ETL 过程。
  - 并发调用 Google Gemini 1.5 或是阿里云 Qwen，引入专门调教好的提示词完成艺术策展解析的内容生产。
  - 提供数据清洗封装功能，把抓取的图片缓冲，进而使用 `uploadToR2` 上传至永久存储桶。
- **`_db.ts` 与 `_cloud-env.ts`**: **数据库抽象层与平台兼容配网器**。
  - 采用适配器模式 (Adapter Pattern)。当其发现所处的 `env` 拥有 `ART_GALLERY_DB` 注入时，自动开启 `Cloudflare D1` 游标通讯。
  - 若探明自己正处于 Node.js 本地开发态时，会自动 `require('better-sqlite3')` 构建本地的 `.sqlite` 数据库以支持 AI Studio 和开发测试。甚至具备在 SQL 损坏 (malformed) 时重命名旧数据表实行安全降级重启的容错机制。

---

## 💰 运行成本 (免费白嫖指南)

本项目在架构设计上追求**零成本**运行，完美利用了各家云厂商的免费额度 (Free Tier)：

1. **托管与计算 (Cloudflare Pages)**: 
   - 免费额度：每天 100,000 次请求。对于个人项目或中小型画廊绰绰有余。
2. **结构化数据 (Cloudflare D1 数据库)**:
   - 免费额度：每天 500 万次行读取，10 万次行写入，最高 5 GB 存储。由于我们只存储文本和点赞记录，完全不会超标。
3. **图片图床 (Cloudflare R2 对象存储)**:
   - 免费额度：每个月 10 GB 存储空间，100 万次 A 类操作（上传等）及高达 1,000 万次 B 类操作（读取）。完全可以容纳超过数万张名画的源文件。此外 R2 的出口流量 (Egress) 是永久免费的！
4. **AI 策展大脑 (Google Gemini 1.5 Flash)**:
   - 免费额度：Google 开发者的免费层阶（通常为每分钟 15 次请求，每日最多 1500 次）。因为系统通过 Cron 每天/每小时定时只抓取极少量画作，所以 API 使用量微乎其微。
   - 备选方案：阿里云百炼等国内大模型也拥有极低的 Token 定价，生成一段千字点评成本不到一分钱人民币。

---

## 🚀 部署至 Cloudflare (Pages + D1 + R2)

本项目深度优化了 Cloudflare 生态，能够以极低成本甚至零成本在边缘节点运行。

### 1. 前置准备
- 安装 [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/): `npm install -g wrangler`
- 登录 Cloudflare: `wrangler login`

### 2. 创建 Cloudflare 资源
在 Cloudflare 控制台或使用命令行创建以下关键基础设施：

**👉 D1 数据库 (保存艺术品与评论数据)**:
```bash
wrangler d1 create art_db
```
*记录下输出中的 `database_id`，并务必将其更新至 `wrangler.toml` 文件的 `[[d1_databases]]` 中。*

**👉 R2 存储桶 (永久化托管图片)**:
```bash
wrangler r2 bucket create art-images
```

### 3. 配置 wrangler.toml
根据以上步骤创建后，请确保 `wrangler.toml` 中的绑定名称与系统要求的命名规范一致，不可随意更改代码引用名称：
- **D1 绑定名称**: `ART_GALLERY_DB`
- **R2 绑定名称**: `ART_GALLERY_IMAGES`

### 4. 设置环境变量 (环境变量)
在 Cloudflare Pages 部署项目页 -> **Settings (设置)** -> **Environment variables (环境变量)** 中添加生产必需变量：
- `ADMIN_PASSWORD`: 管理后台登录密码，用于前端登录及操作（必须设置以开启后台！）。
- `CRON_SECRET`: (可选) 用于保护定时触发器 `/api/cron` 接口防抓取的专属暗号密钥。

### 5. 初始化数据库与启动
本项目具备按需**自动初始化建表逻辑**。在 Pages 上线并关联好 D1 后，首次访问系统接口将自动探测并创建所需的 `artworks`、`comments` 等数据表，免去了写建表脚本的烦恼！

### 6. 部署应用流程
将应用编译并一键推送上线：
```bash
npm run build
wrangler pages deploy dist
```

### 7. 配置自动化任务 (Cron Triggers 寻宝计划)

由于 Cloudflare Pages 自身并不像 Workers 那样直接支持原生定期任务的 `scheduled` 导出逻辑，为了实现画作“每天自动上新”：

**方案：使用独立 Worker 定期打卡 (官方推荐解法)**
本项目已内置了专门的轻量唤醒胶水代码 `cron-worker.js`，部署简单：

1. **一键部署 Cron Worker**:
   ```bash
   wrangler deploy cron-worker.js --name aidailyart-cron
   ```
2. **在 Worker 面板配置指向 Pages 的环境变量**:
   在 Cloudflare 控制台中给刚刚发布的 Worker 设置如下变量：
   - `CRON_TARGET_URL`: 填入您的 Pages 应用后端 Cron 地址。
     例如: `https://your-page-app.pages.dev/api/cron?secret=您的CRON_SECRET`
3. **设置频率触发器**:
   在该 Worker 的“Settings” -> “Triggers”中配置您的按时唤醒频率（例如配置 `0 */1 * * *` 表示整点每小时系统会尝试执行一次新画寻库之旅）。

---

## 🛠️ 本地开发与常规配置详解

1. **安装所有开发依赖包**: `npm install`
2. **启动全栈开发服**: `npm run dev`
   - 将自动在 3000 端口可用，本地运行时，框架会在根目录生成便携的 `database.sqlite` 以代替 D1。
3. **安全配置 AI 引擎与模型偏好**:
   1. 浏览器访问 `/admin` 并输入配置好的 `ADMIN_PASSWORD`。
   2. 在后台控制面板找到“核心设置”：
      - 设置 **API Key** (支持 Gemini API 或阿里云百炼 DashScope API)。
      - 选择供应商并指定适合的模型 ID，然后便可开启 “触发全网策展任务” 开始游览您的私人艺术馆了！
