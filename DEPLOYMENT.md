# 信息收集工具 - 部署指南

本文档介绍如何将信息收集工具部署到云服务，并在手机上使用。

## 部署架构

- **前端**: Vercel (免费)
- **后端**: Railway 或 Render (免费层)
- **PWA**: 支持安装到手机主屏幕

## 快速开始 - 本地测试手机访问

如果您想在部署前先在手机上测试：

1. **启动开发服务器**
   ```bash
   # 启动后端
   cd backend
   npm run dev

   # 启动前端（新终端）
   cd frontend
   npm run dev
   ```

2. **获取您的局域网IP地址**
   ```bash
   # Mac/Linux
   ifconfig | grep "inet " | grep -v 127.0.0.1

   # Windows
   ipconfig
   ```

   找到类似 `192.168.x.x` 的地址

3. **在手机上访问**
   - 确保手机和电脑在同一个WiFi网络
   - 在手机浏览器访问: `http://你的IP地址:5173`
   - 例如: `http://192.168.1.100:5173`

## 方案一：部署到 Vercel (前端) + Railway (后端)

### 1. 部署后端到 Railway

Railway是最简单的Node.js部署平台，有免费层。

#### 步骤：

1. 访问 [railway.app](https://railway.app/)
2. 使用GitHub账号登录
3. 点击 "New Project" -> "Deploy from GitHub repo"
4. 选择您的项目仓库
5. Railway会自动检测后端项目
6. 配置环境变量（可选）：
   - `PORT`: 3001（自动设置）
   - `NODE_ENV`: production
   - `FRONTEND_URL`: 您的前端URL（稍后填写）
7. 部署完成后，记录后端URL，例如：`https://your-app.railway.app`

### 2. 部署前端到 Vercel

Vercel是最适合React应用的部署平台。

#### 准备工作：

1. 修改前端代码，配置后端API地址：

创建 `/frontend/.env.production` 文件：
```
VITE_API_URL=https://your-app.railway.app
```

2. 修改API调用代码，使用环境变量：
```typescript
// frontend/src/services/*.ts
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
```

#### 部署步骤：

1. 访问 [vercel.com](https://vercel.com/)
2. 使用GitHub账号登录
3. 点击 "Add New Project"
4. 选择您的项目仓库
5. 配置构建设置：
   - Framework Preset: Vite
   - Root Directory: frontend
   - Build Command: `npm run build`
   - Output Directory: dist
6. 添加环境变量：
   - `VITE_API_URL`: 您的Railway后端URL
7. 点击 "Deploy"
8. 部署完成后，您会获得一个URL，例如：`https://your-app.vercel.app`

### 3. 更新CORS配置

回到Railway，更新后端环境变量：
- `FRONTEND_URL`: `https://your-app.vercel.app`

重新部署后端使配置生效。

## 方案二：部署到 Render（前后端都部署）

Render提供免费的静态站点和Web服务托管。

### 1. 部署后端

1. 访问 [render.com](https://render.com/)
2. 使用GitHub登录
3. 点击 "New +" -> "Web Service"
4. 选择您的仓库
5. 配置：
   - Name: info-collector-backend
   - Root Directory: backend
   - Environment: Node
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
6. 添加环境变量（同Railway）
7. 点击 "Create Web Service"

### 2. 部署前端

1. 点击 "New +" -> "Static Site"
2. 选择您的仓库
3. 配置：
   - Name: info-collector-frontend
   - Root Directory: frontend
   - Build Command: `npm install && npm run build`
   - Publish Directory: dist
4. 添加环境变量：
   - `VITE_API_URL`: 您的后端URL
5. 点击 "Create Static Site"

## 创建应用图标

您需要生成不同尺寸的PNG图标。使用以下在线工具：

1. 访问 [realfavicongenerator.net](https://realfavicongenerator.net/)
2. 上传 `/frontend/public/icon.svg`
3. 下载生成的图标包
4. 将所有 `icon-*.png` 文件放入 `/frontend/public/` 目录

或者使用命令行工具：
```bash
npm install -g svg2png-cli
cd frontend/public
svg2png icon.svg --output icon-192x192.png --width 192
svg2png icon.svg --output icon-512x512.png --width 512
# ... 生成其他尺寸
```

## 在手机上安装PWA

### iOS (Safari):

1. 在Safari中打开您的应用URL
2. 点击底部"分享"按钮
3. 滚动找到"添加到主屏幕"
4. 点击"添加"
5. 应用图标会出现在主屏幕上

### Android (Chrome):

1. 在Chrome中打开您的应用URL
2. 点击右上角"⋮"菜单
3. 点击"添加到主屏幕"或"安装应用"
4. 确认安装
5. 应用图标会出现在主屏幕上

## 环境变量说明

### 后端环境变量

| 变量名 | 说明 | 必需 | 默认值 |
|--------|------|------|--------|
| PORT | 服务器端口 | 否 | 3001 |
| NODE_ENV | 运行环境 | 否 | development |
| FRONTEND_URL | 前端URL（CORS） | 生产环境建议 | * |

### 前端环境变量

| 变量名 | 说明 | 必需 | 默认值 |
|--------|------|------|--------|
| VITE_API_URL | 后端API地址 | 是 | http://localhost:3001 |

## 性能优化建议

1. **启用Gzip压缩**：大多数平台默认启用
2. **配置CDN**：Vercel和Render都自带CDN
3. **图片优化**：上传的图片会以Base64存储在IndexedDB中，建议控制图片大小
4. **Service Worker缓存**：已配置，首次访问后可离线使用

## 故障排除

### 跨域错误
- 检查后端的CORS配置
- 确保`FRONTEND_URL`环境变量正确设置

### API调用失败
- 检查前端的`VITE_API_URL`环境变量
- 在浏览器开发者工具查看网络请求

### PWA无法安装
- 确保使用HTTPS（部署后自动提供）
- 检查manifest.json是否正确加载
- 查看浏览器控制台的PWA相关错误

### 手机端样式问题
- 应用已使用Material-UI的响应式设计
- 如有问题，检查viewport设置

## 成本估算

使用免费层级：
- Vercel: 免费（每月100GB带宽）
- Railway: 免费$5额度/月（约500小时运行时间）
- Render: 免费（服务会在15分钟无活动后休眠）

对于个人使用，完全免费。

## 下一步

- [x] 完成PWA配置
- [x] 配置构建脚本
- [ ] 生成应用图标（多种尺寸）
- [ ] 推送代码到GitHub
- [ ] 部署后端
- [ ] 部署前端
- [ ] 手机端测试

## 需要帮助？

如果遇到问题，请检查：
1. GitHub仓库是否公开
2. 环境变量是否正确配置
3. 构建日志中的错误信息
