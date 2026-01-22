# Vercel 部署步骤详解

## 方法一：Vercel Dashboard 部署（推荐新手）

### 1. 登录 Vercel
- 访问: https://vercel.com
- 点击 "Login" → 选择 "Continue with GitHub"
- 授权 Vercel 访问你的 GitHub 账号

### 2. 导入项目
- 点击 "Add New..." → "Project"
- 在仓库列表中找到 `info-collector`
- 点击 "Import" 按钮

### 3. 配置项目（重要）

**项目设置：**
```
Framework Preset: Other (或 Vite)
Root Directory: ./ (根目录，不要选 frontend)
```

**构建设置：**
```
Build Command: (留空，使用 vercel.json 配置)
Output Directory: (留空，使用 vercel.json 配置)
Install Command: (留空，使用默认)
```

**环境变量（可选）：**
如果需要 AI 功能，添加：
- `OPENAI_API_KEY`: 你的 OpenAI API 密钥

### 4. 部署
- 点击 "Deploy" 按钮
- 等待构建完成（2-5分钟）
- 部署成功后会显示项目 URL

### 5. 验证部署
访问以下 URL 验证：
- 前端: `https://your-project.vercel.app`
- API测试: `https://your-project.vercel.app/api/scrape`

---

## 方法二：CLI 命令行部署

### 前提条件
```bash
# 安装 Vercel CLI（如果还没安装）
npm install -g vercel
```

### 1. 登录 Vercel
```bash
vercel login
```
- 会在浏览器中打开登录页面
- 使用 GitHub 账号登录
- 授权后返回命令行

### 2. 链接项目
```bash
# 在项目根目录执行
cd /Users/houjie5/info-collector
vercel
```

首次运行会提示：
```
? Set up and deploy "~/info-collector"? [Y/n] y
? Which scope do you want to deploy to? [选择你的账号]
? Link to existing project? [N/y] n
? What's your project's name? info-collector
? In which directory is your code located? ./
```

### 3. 部署到生产环境
```bash
# 部署到生产环境
vercel --prod
```

### 4. 查看部署状态
```bash
# 列出所有部署
vercel ls

# 查看项目详情
vercel inspect
```

---

## 常见问题排查

### 问题1: 构建失败 - "Cannot find module"
**原因**: 依赖未正确安装
**解决方案**:
1. 检查 `api/package.json` 是否包含所有依赖
2. 在 Vercel Dashboard → Settings → General → Install Command 设置为 `npm install`

### 问题2: API 返回 404
**原因**: API 路由配置错误
**解决方案**:
1. 确认 `vercel.json` 中的 rewrites 配置正确
2. 检查 API 文件是否在 `api/` 目录下
3. 确认文件名和路由匹配（如 `api/scrape.ts` → `/api/scrape`）

### 问题3: 前端页面空白
**原因**: 构建输出目录错误
**解决方案**:
1. 检查 `vercel.json` 中 `outputDirectory: "dist"`
2. 确认 `package.json` 的 `postbuild` 脚本复制了 `frontend/dist` 到 `./dist`

### 问题4: Function 超时
**原因**: API 处理时间过长（默认10秒）
**解决方案**:
1. 已在 `vercel.json` 中配置 `maxDuration: 60`
2. 如需更长时间，需要升级 Vercel 计划

---

## 部署后的配置

### 1. 自定义域名（可选）
1. 在 Vercel Dashboard → Settings → Domains
2. 点击 "Add" 输入你的域名
3. 按照提示配置 DNS 记录

### 2. 环境变量管理
1. 在 Vercel Dashboard → Settings → Environment Variables
2. 添加需要的环境变量：
   - `OPENAI_API_KEY`: OpenAI API 密钥
   - `NODE_ENV`: production

### 3. 自动部署设置
1. 在 Vercel Dashboard → Settings → Git
2. 配置：
   - ✅ Production Branch: `main`
   - ✅ Enable automatic deployments

每次推送到 `main` 分支，Vercel 会自动重新部署。

---

## 本地测试 Vercel 环境

在部署前，可以在本地测试 Vercel 配置：

```bash
# 安装依赖
cd /Users/houjie5/info-collector
npm install

# 启动 Vercel 开发服务器
vercel dev
```

这会在本地启动一个模拟 Vercel 生产环境的开发服务器。

---

## 监控和日志

### 查看部署日志
1. Vercel Dashboard → 项目 → Deployments
2. 点击具体部署查看详细日志

### 查看 Function 日志
1. Vercel Dashboard → 项目 → Functions
2. 选择具体 Function 查看调用日志和错误

### 查看性能分析
1. Vercel Dashboard → 项目 → Analytics
2. 查看流量、响应时间等数据

---

## 快速命令参考

```bash
# 登录
vercel login

# 部署预览版本
vercel

# 部署生产版本
vercel --prod

# 列出部署
vercel ls

# 查看项目信息
vercel inspect

# 查看环境变量
vercel env ls

# 添加环境变量
vercel env add OPENAI_API_KEY

# 查看日志
vercel logs
```

---

## 项目结构说明

```
info-collector/
├── vercel.json           # Vercel 配置（构建、路由、函数）
├── package.json          # 根目录构建脚本
├── .vercelignore         # 排除不需要部署的文件
├── api/                  # Serverless Functions
│   ├── package.json      # API 依赖
│   ├── scrape.ts         # 网页抓取 API
│   ├── rss.ts            # RSS 解析 API
│   ├── ocr.ts            # OCR 识别 API
│   ├── analytics.ts      # 统计分析 API
│   └── ai/
│       └── summary.ts    # AI 摘要 API
├── frontend/             # React 前端
│   └── dist/             # 构建输出（会被复制到根目录 dist）
└── dist/                 # 最终部署的静态文件

Vercel 部署流程：
1. 执行 `npm run build`（根目录 package.json）
2. 进入 frontend/ 目录安装依赖并构建
3. 复制 frontend/dist 到 ./dist
4. 将 api/ 目录下的 .ts 文件转换为 Serverless Functions
5. 将 dist/ 目录作为静态网站部署
6. 配置路由，/api/* 请求指向 Serverless Functions
```

---

## 成功部署的标志

部署成功后，你应该能够：

1. ✅ 访问前端页面: `https://your-project.vercel.app`
2. ✅ 测试 API: `https://your-project.vercel.app/api/scrape` 返回方法错误（说明 API 可用）
3. ✅ 在 Vercel Dashboard 看到 "Ready" 状态
4. ✅ Functions 标签页显示 5 个函数

如果遇到问题，请检查：
- 构建日志中的错误信息
- vercel.json 配置是否正确
- package.json 构建脚本是否正确
- API 依赖是否完整
