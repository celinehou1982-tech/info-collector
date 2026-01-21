# Railway 部署指南 - Catch4You 后端

本指南帮助您将 Catch4You 后端部署到 Railway，以便在生产环境使用管理员面板功能。

## 📋 前置要求

1. [Railway 账号](https://railway.app/) - 免费套餐即可
2. GitHub 账号（用于连接 Railway）
3. 将代码推送到 GitHub 仓库

## 🚀 部署步骤

### 1. 准备 GitHub 仓库

```bash
# 如果还没有初始化 git
cd /Users/houjie5/info-collector
git init
git add .
git commit -m "Initial commit"

# 创建 GitHub 仓库并推送
# 在 GitHub 上创建新仓库 info-collector
git remote add origin https://github.com/你的用户名/info-collector.git
git branch -M main
git push -u origin main
```

### 2. 在 Railway 创建项目

1. 访问 https://railway.app/
2. 点击 "New Project"
3. 选择 "Deploy from GitHub repo"
4. 授权 Railway 访问你的 GitHub
5. 选择 `info-collector` 仓库
6. Railway 会自动检测到这是一个 monorepo

### 3. 配置后端服务

由于这是 monorepo（前后端在一个仓库），需要特别配置：

1. 在 Railway 项目中，点击你的服务
2. 进入 "Settings" 标签
3. 设置以下配置：

**Root Directory**
```
backend
```

**Start Command**
```
npm start
```

**Environment Variables** （环境变量）
```
NODE_ENV=production
FRONTEND_URL=https://catch4you.netlify.app
PORT=3001
```

### 4. 部署后端

点击 "Deploy" 按钮，Railway 会自动：
- 检测到 Node.js 项目
- 安装依赖 (`npm install`)
- 启动服务 (`npm start`)

等待部署完成（通常需要 1-2 分钟）。

### 5. 获取后端 URL

部署成功后：
1. 在 Railway 项目页面，点击你的服务
2. 进入 "Settings" 标签
3. 找到 "Networking" 部分
4. 点击 "Generate Domain" 生成公共域名
5. 复制生成的 URL（例如：`https://your-app.up.railway.app`）

### 6. 配置 Netlify 环境变量

1. 访问 https://app.netlify.com
2. 选择 `catch4you` 项目
3. 进入 "Site configuration" → "Environment variables"
4. 添加新环境变量：

**变量名**: `VITE_API_URL`
**值**: `https://your-app.up.railway.app/api/analytics`

注意：要加上 `/api/analytics` 路径！

### 7. 重新部署前端

环境变量更新后，需要重新部署 Netlify：

```bash
cd /Users/houjie5/info-collector/frontend
netlify deploy --prod
```

或者在 Netlify 网站上点击 "Trigger deploy" → "Deploy site"

### 8. 测试管理员面板

1. 访问 https://catch4you.netlify.app
2. 点击顶部工具栏的管理员图标（盾牌图标）
3. 应该能看到用户统计数据

## 🔒 安全建议

### 添加简单的密码保护（可选）

编辑 `/Users/houjie5/info-collector/backend/src/routes/analytics.ts`：

```typescript
// 在 admin 路由前添加简单认证中间件
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'your-secret-password'

const adminAuth = (req: Request, res: Response, next: NextFunction) => {
  const auth = req.headers.authorization
  if (auth !== `Bearer ${ADMIN_PASSWORD}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
}

// 应用到 admin 路由
router.get('/admin/summary', adminAuth, (req: Request, res: Response) => {
  // ... existing code
})
```

然后在 Railway 添加环境变量：
```
ADMIN_PASSWORD=你的强密码
```

## 💰 费用说明

Railway 免费套餐包括：
- $5 免费额度/月
- 500 小时运行时间
- 8GB 内存
- 100GB 网络流量

对于个人项目，免费套餐完全够用。

## 📊 监控和日志

### 查看日志
1. 在 Railway 项目页面，点击你的服务
2. 查看 "Deployments" 标签可以看到部署日志
3. 实时日志会显示服务器运行状态

### 检查健康状态
访问：`https://your-app.up.railway.app/health`

应该看到：
```json
{
  "status": "ok",
  "message": "Server is running"
}
```

## 🔧 常见问题

### 问题 1: 管理员面板显示"加载统计数据失败"

**解决方案**:
1. 检查 Netlify 环境变量 `VITE_API_URL` 是否正确设置
2. 确保 Railway URL 末尾加了 `/api/analytics`
3. 检查 Railway 服务是否正常运行

### 问题 2: Railway 服务无法启动

**解决方案**:
1. 检查 Railway 日志查看错误信息
2. 确认 "Root Directory" 设置为 `backend`
3. 确认 package.json 中有 "start" 脚本

### 问题 3: CORS 错误

**解决方案**:
在 Railway 环境变量中设置：
```
FRONTEND_URL=https://catch4you.netlify.app
```

## 🎯 下一步

部署完成后，您可以：
1. ✅ 在生产环境使用管理员面板
2. ✅ 查看实时用户统计
3. ✅ 监控 API 调用情况

---

**需要帮助？**
- Railway 文档：https://docs.railway.app/
- Netlify 文档：https://docs.netlify.com/

**注意**: 请勿将 Railway URL 和管理员密码公开分享！
