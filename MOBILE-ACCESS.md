# 手机访问指南 - 跨网络访问

当手机和电脑不在同一局域网时，可以使用以下方案访问应用。

## 方案1: 使用 ngrok（推荐，最简单）

### 1. 安装 ngrok

**Mac 用户：**
```bash
# 使用 Homebrew 安装
brew install ngrok/ngrok/ngrok

# 或者直接下载
# 访问 https://ngrok.com/download 下载 Mac 版本
```

**其他系统：**
访问 https://ngrok.com/download 下载对应版本

### 2. 注册并获取 token

1. 访问 https://dashboard.ngrok.com/signup 注册账号（免费）
2. 登录后访问 https://dashboard.ngrok.com/get-started/your-authtoken
3. 复制你的 authtoken

### 3. 配置 ngrok

```bash
ngrok config add-authtoken YOUR_TOKEN_HERE
```

### 4. 启动内网穿透

确保前端和后端开发服务器正在运行，然后：

**暴露前端服务（5173端口）：**
```bash
ngrok http 5173
```

**暴露后端服务（3000端口）：**
在另一个终端窗口运行：
```bash
ngrok http 3000
```

### 5. 获取公网URL

运行 ngrok 后，会显示类似这样的信息：
```
Forwarding   https://abc123.ngrok-free.app -> http://localhost:5173
```

使用手机浏览器访问 `https://abc123.ngrok-free.app` 即可。

### 注意事项

- **免费版限制**：
  - 每次重启 ngrok 会生成新的随机URL
  - 有连接数限制
  - 会显示 ngrok 警告页面（点击"Visit Site"即可访问）

- **后端API配置**：
  如果前端需要调用后端API，需要：
  1. 同时启动后端的 ngrok：`ngrok http 3000`
  2. 更新前端的API地址为后端的ngrok URL

---

## 方案2: 部署到云服务（长期使用）

如果需要长期稳定访问，建议部署到云服务：

### 前端部署选项：

1. **Vercel**（推荐，免费）
   - 访问 https://vercel.com
   - 连接 GitHub 仓库
   - 自动部署

2. **Netlify**（免费）
   - 访问 https://netlify.com
   - 拖拽构建后的 dist 文件夹上传

3. **GitHub Pages**（免费）
   - 推送到 GitHub 仓库
   - 启用 GitHub Pages

### 后端部署选项：

1. **Railway**（免费额度）
   - 访问 https://railway.app
   - 连接 GitHub 仓库
   - 自动部署

2. **Render**（免费）
   - 访问 https://render.com
   - 免费套餐有冷启动延迟

3. **Heroku**（需付费）

---

## 方案3: 使用 Cloudflare Tunnel（免费，稳定）

### 1. 安装 Cloudflare Tunnel

**Mac：**
```bash
brew install cloudflare/cloudflare/cloudflared
```

### 2. 登录 Cloudflare

```bash
cloudflared tunnel login
```

### 3. 创建隧道

```bash
cloudflared tunnel create info-collector
```

### 4. 配置隧道

创建配置文件 `~/.cloudflared/config.yml`：
```yaml
tunnel: YOUR_TUNNEL_ID
credentials-file: /Users/你的用户名/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: your-app.example.com
    service: http://localhost:5173
  - service: http_status:404
```

### 5. 运行隧道

```bash
cloudflared tunnel run info-collector
```

---

## 方案4: 使用手机热点（临时方案）

如果只是临时使用：

1. 打开手机热点
2. 电脑连接到手机热点
3. 手机和电脑就在同一网络了
4. 访问 http://电脑IP:5173

获取电脑IP：
```bash
# Mac/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# 或者
ipconfig getifaddr en0
```

---

## 快速开始（推荐流程）

### 开发阶段 - 使用 ngrok

```bash
# 1. 安装 ngrok
brew install ngrok/ngrok/ngrok

# 2. 注册并配置 token（只需要做一次）
ngrok config add-authtoken YOUR_TOKEN

# 3. 启动前端开发服务器
cd /Users/houjie5/info-collector/frontend
npm run dev

# 4. 在新终端启动 ngrok
ngrok http 5173

# 5. 使用显示的 https URL 在手机上访问
```

### 生产阶段 - 部署到 Vercel

```bash
# 1. 安装 Vercel CLI
npm install -g vercel

# 2. 构建项目
cd /Users/houjie5/info-collector/frontend
npm run build

# 3. 部署
vercel

# 4. 访问提供的 URL
```

---

## 故障排除

### ngrok 显示 "ERR_NGROK_108"
- 问题：未配置 authtoken
- 解决：运行 `ngrok config add-authtoken YOUR_TOKEN`

### ngrok 显示警告页面
- 这是免费版的正常行为
- 点击 "Visit Site" 按钮继续访问

### 手机无法访问 ngrok URL
- 检查手机是否能访问外网
- 确认 ngrok 进程正在运行
- 尝试使用 https 而不是 http

### CORS 错误
- 后端需要配置允许 ngrok 域名的 CORS
- 在后端 server.ts 中添加 ngrok URL 到 CORS 配置

---

## 推荐方案总结

| 场景 | 推荐方案 | 优点 |
|------|---------|------|
| 快速测试 | ngrok | 最简单，5分钟搞定 |
| 开发调试 | ngrok + 手机热点 | 灵活切换 |
| 长期使用 | Vercel部署 | 稳定、免费、CDN加速 |
| 企业使用 | 云服务器 | 完全控制 |
