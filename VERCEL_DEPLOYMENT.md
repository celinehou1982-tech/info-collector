# Vercel 部署指南

## 项目结构

```
info-collector/
├── api/                    # Vercel Serverless Functions
│   ├── scrape.ts          # 网页抓取 API
│   ├── rss.ts             # RSS 抓取 API
│   ├── ocr.ts             # OCR 识别 API
│   ├── analytics.ts       # 统计分析 API
│   ├── ai/
│   │   └── summary.ts     # AI 摘要 API
│   └── package.json       # API 依赖
├── frontend/              # React 前端应用
├── backend/               # 后端服务代码（被 API 目录引用）
└── vercel.json            # Vercel 配置文件
```

## 部署步骤

### 1. 安装 Vercel CLI

```bash
npm install -g vercel
```

### 2. 登录 Vercel

```bash
vercel login
```

### 3. 配置项目

在项目根目录运行：

```bash
vercel
```

首次运行会询问：
- **Set up and deploy**: 选择 `Y`
- **Which scope**: 选择你的账号
- **Link to existing project**: 选择 `N`（首次部署）
- **Project name**: 使用默认或输入 `info-collector`
- **Directory**: 使用默认 `./`

### 4. 设置环境变量（可选）

如果需要，可以在 Vercel Dashboard 中设置环境变量：
- `NODE_ENV=production`
- `FRONTEND_URL=https://your-domain.vercel.app`

### 5. 部署

```bash
# 部署到生产环境
vercel --prod

# 或者部署预览版本
vercel
```

## API 端点

部署后，API 将自动可用：

- **网页抓取**: `https://your-domain.vercel.app/api/scrape`
- **RSS 抓取**: `https://your-domain.vercel.app/api/rss`
- **AI 摘要**: `https://your-domain.vercel.app/api/ai/summary`
- **OCR 识别**: `https://your-domain.vercel.app/api/ocr`
- **统计分析**: `https://your-domain.vercel.app/api/analytics?action=summary`

## 前端配置

前端会自动检测环境并使用正确的 API 地址：
- 生产环境：使用相同域名的 `/api/*` 路径
- 开发环境：使用 `http://localhost:3001`

无需修改前端代码即可工作。

## 项目设置

在 Vercel Dashboard 中配置：

### Build & Development Settings

- **Framework Preset**: Vite
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### Functions

Vercel 会自动将 `api` 目录下的文件转换为 Serverless Functions。

每个 API 函数配置：
- Memory: 1024 MB
- Max Duration: 60 seconds

## 常见问题

### 1. API 路径问题

如果前端无法访问 API，检查：
- Vercel 配置的 routes 和 rewrites 设置
- 前端的 API_BASE_URL 环境变量检测逻辑

### 2. 依赖安装问题

确保 `api/package.json` 包含所有必要的依赖。

### 3. 函数超时

如果 API 调用超时，可能需要：
- 增加函数的 maxDuration 配置
- 优化代码性能
- 考虑升级 Vercel 计划

### 4. CORS 问题

所有 API 函数已配置 CORS 头，允许跨域访问。

## 监控和日志

- 访问 Vercel Dashboard 查看部署日志
- 在 Functions 标签页查看 API 调用日志
- 使用 Analytics 标签查看流量统计

## 更新部署

每次推送到 GitHub 主分支，Vercel 会自动部署：

```bash
git add .
git commit -m "Update"
git push
```

或手动部署：

```bash
vercel --prod
```

## 本地测试

测试 Vercel Functions：

```bash
# 安装 Vercel CLI
npm install -g vercel

# 在项目根目录运行
vercel dev
```

这会在本地启动 Vercel 开发服务器，模拟生产环境。

## 性能优化

1. **启用 Edge Functions**（如果需要更快的响应）
2. **使用 CDN**：静态资源自动通过 Vercel CDN 分发
3. **代码分割**：前端已配置 Vite 自动代码分割
4. **图片优化**：考虑使用 Vercel Image Optimization

## 费用估算

Vercel 免费套餐包括：
- 100 GB 带宽/月
- 100 GB-Hours Functions 执行时间/月
- 6,000 分钟 Build 时间/月

超出免费额度后按使用量计费。

## 技术支持

如遇问题：
1. 查看 [Vercel 文档](https://vercel.com/docs)
2. 检查 [Vercel 状态页](https://vercel-status.com/)
3. 访问 [Vercel 社区](https://github.com/vercel/vercel/discussions)
