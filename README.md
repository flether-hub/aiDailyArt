# AI 名画艺术馆 (AI Art Gallery)

🎨 **一个基于 AI 驱动的名画聚合与赏析平台**。该系统能够跨博物馆平台（如大都会艺术博物馆、芝加哥艺术学院等）自动发现名画，并利用 Google Gemini AI 进行深度的艺术风格分析、历史背景解读及关键词提取。

---

## 🌟 核心功能

-   **全自动艺术发现**：集成多源博物馆 API，支持定时或手动从全球顶级博物馆库中挖掘名画。
-   **AI 深度解析**：利用 **Gemini 2.0 Flash** 对每一幅作品进行视觉分析，生成专业的引导式赏析内容。
-   **边缘原生存储**：
    -   **Cloudflare D1**：轻量级边缘数据库，存储作品信息与 AI 解读。
    -   **Cloudflare R2**：分布式对象存储，自动转存名画原图，确保国内及全球高速访问。
-   **现代流动界面**：基于 React + Tailwind CSS 构建，支持瀑布流布局与毛玻璃美学设计。
-   **管理员面板**：支持配置抓取频率、API 密钥、手动触发抓取任务，并能实时观测 AI 分析进度流。

---

## 🛠️ 技术栈

-   **前端**: React 18, Vite, Tailwind CSS, Lucide Icons, Framer Motion
-   **后端**: [Hono](https://hono.dev/) (高效的 Web 标准框架)
-   **AI**: Google Generative AI (Gemini SDK)
-   **基础设施 (Cloudflare Native)**:
    -   **Pages Functions**: 全栈处理请求。
    -   **D1**: 边缘关系型数据库 (SQLite-compatible)。
    -   **R2**: S3-compatible 存储。

---

## 📂 项目结构说明

```
├── /functions          # Cloudflare Pages API 路由入口 (Hono Proxy)
├── /src
│   ├── /components     # UI 基础组件
│   ├── /pages          # 页面逻辑 (主页、详情、管理后台)
│   ├── /server         # 核心后端逻辑 (AI 抓取、数据库交互)
│   ├── /lib            # 工具类与 API 客户端基础配置
│   └── App.tsx         # 路由配置
├── wrangler.toml       # Cloudflare 资源绑定声明
└── package.json        # 依赖与构建脚本
```

---

## 🚀 Cloudflare Pages 详细部署指南

本项目采用 Cloudflare 全家桶（Pages + D1 + R2）实现。请按照以下步骤操作：

### 第一步：创建核心资源
1.  **D1 数据库**:
    -   进入 Cloudflare 控制面板 -> **Workers & Pages** -> **D1**。
    -   点击 "Create database" -> "Dashboard"，命名为 `art_db`。
    -   **记录下 `Database ID`**，稍后需要填入 `wrangler.toml`。
2.  **R2 存储桶**:
    -   进入 **R2** -> **Create bucket**。
    -   命名为 `art-images`（保持与 `wrangler.toml` 一致）。

### 第二步：修改配置文件
1.  打开根目录下的 `wrangler.toml`。
2.  将 `[[d1_databases]]` 下的 `database_id` 替换为你刚刚获取的 ID。

### 第三步：在 Cloudflare Pages 上部署
1.  点击导航栏的 **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**。
2.  选择你的仓库。
3.  **构建设置 (Build Settings)**:
    -   Framework preset: `None` (或者 `Vite`)
    -   Build command: `npm run build`
    -   Build output directory: `dist`
4.  点击 **Save and Deploy**。

### 第四步：手动绑定资源（关键！）
在 Pages 项目部署成功后的设置页面，还需要手动完成绑定：
1.  进入 **Settings** -> **Functions**。
2.  **D1 database bindings**: 点击 "Add binding"。
    -   Variable name: `ART_GALLERY_DB`
    -   D1 database: 选择你创建的 `art_db`。
3.  **R2 bucket bindings**: 点击 "Add binding"。
    -   Variable name: `ART_GALLERY_IMAGES`
    -   R2 bucket: 选择你创建的 `art-images`。
4.  **环境变量 (Environment Variables)**:
    -   进入 **Settings** -> **Environment variables**。
    -   添加 `ADMIN_PASSWORD`（后台管理密码）。
    -   添加 `GEMINI_API_KEY`（Gemini API 密钥）。

### 第五步：重新部署
完成绑定后，你需要**重新部署一次**（在 "Deployments" 页面选择 "Retry deployment"），以便让新的绑定和变量生效。

---

## 💡 开发提示

-   **流式响应**: 本项目利用 Hono 的 Streaming 接口实时输出 AI 抓取进度，确保在处理大图或复杂分析时前端不超时。
-   **本地环境**: 在 AI Studio 中，应用会自动降级为本地模拟存储。若需真实测试 R2/D1，请使用 `wrangler dev`。
-   **SEO**: 详情页支持基础的静态渲染优化，方便艺术内容被搜索引擎索。

---

## 📜 开源协议
MIT License. 使用请标明来源。
