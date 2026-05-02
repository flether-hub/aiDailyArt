# 🎨 AI 每日画廊 (AI Art Gallery)

**一个基于 AI 驱动的名画聚合与策展赏析平台**。该系统能够跨博物馆平台（如大都会艺术博物馆、卢浮宫、大英博物馆等）自动发现名画，并利用 Google Gemini AI 进行深度的艺术风格分析、历史背景解读及关键词提取，生成幽默风趣带有“凡尔赛”气息的深度艺术解读。

---

## 🌟 核心功能

- **🤖 全自动艺术发现**：集成 Wikidata SPARQL 与大都会艺术博物馆 API，支持定时或手动从全球数十家顶级博物馆数字库中挖掘名画。
- **🧠 AI 深度解析**：利用 **Gemini AI** 对每一幅作品进行解读转换，生成专业的引导式赏析内容。支持配置模型引擎和 API Key。
- **⚡ 边缘原生存储**：
    - **Cloudflare D1 (SQLite)**：轻量级关系型数据库，存储作品元数据与 AI 解读。本地开发时使用 `better-sqlite3` 智能回退。
    - **Cloudflare R2**：分布式对象存储 (S3 兼容)，自动转存名画原图，确保全球高速访问。
- **📺 现代流动界面**：基于 React + Tailwind CSS 构建，支持响应式瀑布流布局与毛玻璃美学设计。
- **⚙️ 管理员面板**：支持配置抓取频率、更换模型 (支持 Google Gemini 和 阿里百炼 SDK)、配置 API 密钥、手动触发抓取任务，并能通过 SSE (Server-Sent Events) 实时观测 AI 分析进度流。

---

## 🛠️ 技术架构与代码解析

本项目采用了现代化的 **全栈边缘计算** 架构，前后端分离，高度解耦。

### 1. 前端 (React + Vite + Tailwind CSS)

前端部分位于 `/src` 目录，采用了功能组件、React Router 进行单页路由和状态管理。

- **`src/App.tsx`**: 主应用入口，配置了路由控制（首页、画作详情页、管理后台），包含顶部导航栏。
- **`src/pages/Home.tsx`**: 首页瀑布流展示，负责拉取画作数据。包含顶部的大屏 Banner 和精选推荐区块。右侧包含一个按“艺术焦点”（关键词）进行快速拉取与筛选的组件。
- **`src/pages/ArtworkDetail.tsx`**: 画作详情页。显示放大的高清画作（支持灯箱弹窗缩放查看），并且展示由 AI 提取生成的详尽策展赏析。
- **`src/pages/AdminDashboard.tsx`**: 核心的管理后台。负责进行模型配置（切换 Gemini/百炼）、填写 API Key、设置自动抓取间隔。支持“手动甄选单幅名画”、支持重新解读及删除管理。包含了与后端的 SSE (流模式) 通信来实时上报运行日志。
- **`src/AuthContext.tsx` & `src/JobContext.tsx`**: 使用 Context API 全局管理后台登录状态与正在执行的 AI 抓取作业的状态。

### 2. 后端 API (Hono)

后端核心位于 `/functions/api`，采用了轻量级的 **Hono** 框架。

- **`functions/api/[[path]].ts`**: 统一接口入口，通过通配跨度拦截 API 请求，声明并抛出了 `/api/*` 开头的所有路由（如 `/api/artworks` 返回列表、`/api/stats` 等）。
    - 代理了 `/cdn/*` 路由用作访问上传至 Cloudflare R2 的图片分发端点。
    - 特别实现了 `/cron` 接口用于接收自动化触发事件，通过 `c.executionCtx.waitUntil` 将长时间采集任务置于后台。包含 SSE 逻辑块。
- **`functions/api/_ai-fetcher.ts`**: **核心智能流水线引擎**。
    - 内置多个数据源适配：`fetchFromWikidata` 借助 SPARQL 收集世界各个美术馆的数据；`fetchFromMet` 对接大都会博物馆原生 API。
    - `runAIAggregation`: 进行整个执行流控制。判断定时间隔、调用 API 获取随机画作资源，调用 `uploadToR2` 将资源持久化保存。
    - `generateDetailedInterpretation`: AI 大脑执行逻辑。携带特定 Prompt 提示词（“风趣幽默、见多识广、偶尔带点‘凡尔赛’…”），动态决定调用 Google 的 `SDK`，或者是兼容 OpenAI 范式的阿里云 API（通过 URL Fetch），生成 `{"title_zh", "content", "keywords"}` 等结构化的名画内容。
- **`functions/api/_db.ts`**: SQLite 数据库抽象聚合层。动态检测运行环境。
    - **生产环境**: 匹配和代理 `D1` binding。
    - **Node/本地环境**: 动态 `require('better-sqlite3')` 并在根目录下落盘生成 `database.sqlite`。
- **`functions/api/_cloud-env.ts`**: 获取系统上下文依赖用于请求间传递。

### 3. 工程化与服务驱动 (Node.js)

- **`server.ts`**: 本地开发和构建时环境载体。采用 Express 作为主体，启动侦听 `3000` 端口。针对前端请求挂载 `Vite` 作为中间件实现渲染重载，针对 `/api/` 路由将 Hono App 转接至 Express 处理，实现了 Node 环境下一体化的高质开发体验。

---

## 🚀 部署指南 (Cloudflare Pages)

本项目基于 Cloudflare Pages 和 Cloudflare Functions 构建，支持通过 GitHub 仓库进行一键式持续部署。

### 1. 云端资源准备
1. 登录 Cloudflare 控制台。
2. 在 **D1 数据库** 面板中创建一个新的数据库，记录其名称以供绑定。
3. 在 **R2 对象存储** 面板中创建一个新的存储桶。

### 2. 通过 GitHub 连接部署
1. 将当前项目推送到你的 GitHub 仓库中。
2. 在 Cloudflare 控制台的 **Workers & Pages** 栏目下，点击 **Create application (创建应用)** -> **Pages** -> **Connect to Git (连接到 Git)**。
3. 选择您推送的这个 GitHub 仓库。
4. **Build settings (构建设置)** 如下：
    - Framework preset: 选择 `None` 或者默认
    - Build command: `npm run build`
    - Build output directory: `dist`
5. 点击 **Save and Deploy (保存并部署)**。首次部署由于我们还没有绑定数据库和 R2，API 会暂时失效，此时可以先忽略。

### 3. 系统资源配置与绑定 (Bindings)
部署完成后，进入项目详情页，点击 **Settings (设置)** -> **Functions** 面板：
1. **D1 数据库绑定**: 找到 D1 database bindings，点击添加，变量名 **必须为 `ART_GALLERY_DB`**，并将其指向您在这之前创建的 D1 数据库。
2. **R2 存储桶绑定**: 找到 R2 bucket bindings，点击添加，变量名 **必须为 `ART_GALLERY_IMAGES`**，并指向第一步创建的 R2 存储桶。
3. **环境变量绑定 (Environment Variables)**:
    - 添加环境变量 `ADMIN_PASSWORD` (必需)：设置管理后台的登录密码。
    - 添加环境变量 `CRON_SECRET` (可选)：设置一个密钥值，如果你使用计划触发器等，用于保护 cron 接口。

### 4. 重新部署与自动建表
1. 所有资源绑定更新完毕后，前往 **Deployments (部署记录)** 页面，点击最新的部署，选择 **Retry deployment (重试部署)**。
2. 重新部署成功后，只要你首次通过浏览器访问任何网站上的 API 端点，系统便会自动感知并在 D1 中迁移并建立所需的表结构！

### 5. AI 模型激活
1. 访问线上部署好的站点 URL 后跟 `/admin/login`。
2. 输入刚才配置的管理密码 (`ADMIN_PASSWORD`) 登录系统。
3. 在鉴赏模型配置区域，输入你的 **Gemini API Key** 或者是 **阿里百炼 API Key** （也可选择切换并修改默认分析模型），点击保存。
4. 现在可以点击上方【手动甄选单幅名画】来感受第一副深度解析后的经典杰作，或者在下方添加“Cron Trigger”交由 Cloudflare Workers 自动每天抓取。
