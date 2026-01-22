# Render 部署指南 - Catch4You 后端

由于Railway免费计划限制，我们改用Render.com部署后端服务。

## 📋 前置要求

1. [Render 账号](https://render.com/) - 免费套餐
2. GitHub账号（已完成）
3. 代码已推送到GitHub（已完成）

## 🚀 部署步骤

### 1. 创建Render账号

1. 访问 https://render.com/
2. 使用GitHub账号登录/注册

### 2. 创建Web Service

1. 登录Render后，点击 "New +" → "Web Service"
2. 选择 "Connect a repository"
3. 授权Render访问你的GitHub账号
4. 选择 `celinehou1982-tech/info-collector` 仓库

### 3. 配置Web Service

**基本信息**：
- **Name**: `info-collector-backend`（或任意名称）
- **Region**: 选择离你最近的区域（如 Singapore）
- **Branch**: `main`
- **Root Directory**: `backend`（重要！）

**构建配置**：
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

**实例类型**：
- 选择 **Free**（免费套餐）

### 4. 配置环境变量

在 "Environment" 部分添加以下环境变量：

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | `https://catch4you.netlify.app` |
| `PORT` | `3001` |

### 5. 创建服务

1. 点击 "Create Web Service"
2. Render会自动开始构建和部署
3. 等待部署完成（约2-5分钟）

### 6. 获取服务URL

部署成功后：
1. 在Render dashboard找到你的服务
2. 复制服务URL（例如：`https://info-collector-backend.onrender.com`）
3. 测试健康检查：`https://你的URL/health`

### 7. 更新Netlify环境变量

1. 打开终端，运行：
   ```bash
   cd /Users/houjie5/info-collector/frontend
   netlify env:set VITE_API_URL "https://你的render域名/api/analytics"
   ```

2. 重新部署前端：
   ```bash
   npm run build
   netlify deploy --prod
   ```

### 8. 测试管理员面板

1. 访问 https://catch4you.netlify.app
2. 点击管理员图标（盾牌图标）
3. 应该能看到统计数据

## 💰 Render免费套餐说明

**免费套餐包括**：
- 750小时/月的运行时间
- 512MB RAM
- 自动休眠（15分钟无活动后）
- 从休眠唤醒可能需要几秒钟

**限制**：
- 服务会在15分钟不活动后自动休眠
- 首次访问可能需要10-30秒唤醒
- 每月有运行时长限制

**优点**：
- 完全免费
- 不需要信用卡
- 支持HTTPS
- 自动部署（GitHub push后）

## 🔒 安全建议

与Railway相同，可以添加密码保护。编辑后端代码添加认证中间件。

## 🔧 常见问题

### 问题 1: 服务响应慢

**原因**: 免费套餐会自动休眠
**解决方案**:
- 首次访问需要等待10-30秒唤醒
- 可以使用定时ping服务保持活跃（如UptimeRobot）

### 问题 2: CORS错误

**解决方案**: 确保环境变量 `FRONTEND_URL` 正确设置

### 问题 3: 部署失败

**检查**:
1. Root Directory设置为 `backend`
2. package.json中有 `start` 脚本
3. 依赖安装成功

## 📊 监控和日志

- **部署日志**: 在Render dashboard的 "Logs" 标签查看
- **实时日志**: 显示服务器运行状态
- **健康检查**: 访问 `https://你的URL/health`

---

**需要帮助？**
- Render文档：https://render.com/docs
- 客服支持：Render提供免费账号的社区支持

## 🔄 Render vs Railway

| 特性 | Render Free | Railway Free |
|------|-------------|--------------|
| Web服务 | ✅ 支持 | ❌ 仅数据库 |
| 运行时间 | 750小时/月 | - |
| 休眠 | 15分钟后 | - |
| 唤醒时间 | 10-30秒 | - |
| 域名 | ✅ 免费HTTPS | - |

**结论**: 对于免费用户，Render是更好的选择。
