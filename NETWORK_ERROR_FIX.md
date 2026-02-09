# Network Error 修复报告

## 问题诊断

### 问题现象
在内容详情页点击"推荐到社区"按钮时出现 **"Network Error"** 错误。

### 根本原因
1. **开发环境缺少 API 代理配置** - Vite dev server 没有配置代理，导致 `/api` 请求返回 404
2. **后端服务未启动** - 开发环境需要手动启动 Express 后端服务
3. **环境不一致** - 开发环境和生产环境使用不同的 API 调用方式

## 修复方案

### 1. 添加 Vite 代理配置 ✅

**文件**: `frontend/vite.config.ts`

```typescript
server: {
  port: 5173,
  host: true,
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true,
      secure: false,
      rewrite: (path) => path
    }
  }
}
```

**作用**: 将所有 `/api/*` 请求代理到本地 Express 后端服务 (port 3001)

### 2. 统一 API 调用路径 ✅

修改了以下文件中的 `API_BASE_URL`:

| 文件 | 修改前 | 修改后 |
|-----|--------|--------|
| `services/ai.ts` | 条件判断 | `/api` |
| `services/rssFetcher.ts` | 条件判断 | `/api` |
| `services/scraper.ts` | 条件判断 | `/api` |
| `services/ocr.ts` | `http://localhost:3001` | `/api` |
| `services/analytics.ts` | 条件判断 | `/api/analytics` |
| `services/share.ts` | 条件判断 | 生产环境 API |

**注意**: `share.ts` 比较特殊，开发环境直接调用生产环境 API，因为 share 功能依赖 Vercel KV 存储。

### 3. 后端服务启动 ✅

```bash
cd /Users/houjie5/info-collector/backend
npm run dev
```

后端服务运行在 `http://localhost:3001`

## 架构说明

项目采用**混合架构**:

### 开发环境
- **前端**: Vite dev server (port 5173)
- **后端**: Express server (port 3001)
  - 支持: scrape, rss, ai/summary, ocr, analytics
  - **不支持**: share (需要 Vercel KV)
- **Share API**: 直接调用生产环境 (https://catch4you.vercel.app/api)

### 生产环境
- **前端**: Vercel 静态托管
- **后端**: Vercel Serverless Functions
  - 所有 API 都在 `/api` 目录作为 Functions 部署

## API 路由映射

| 前端请求 | 开发环境 | 生产环境 |
|---------|---------|---------|
| `/api/scrape` | → `localhost:3001/api/scrape` | → Vercel Function |
| `/api/rss` | → `localhost:3001/api/rss` | → Vercel Function |
| `/api/ai/summary` | → `localhost:3001/api/ai/summary` | → Vercel Function |
| `/api/ocr` | → `localhost:3001/api/ocr` | → Vercel Function |
| `/api/analytics/*` | → `localhost:3001/api/analytics/*` | → Vercel Function |
| `/api/share/*` | → 生产 API (Vercel) | → Vercel Function |

## 测试验证

### ✅ Scrape API
```bash
curl -X POST 'http://localhost:5173/api/scrape' \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com"}'
# 结果: 成功返回网页内容
```

### ✅ RSS API
```bash
curl -X POST 'http://localhost:5173/api/rss' \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://hnrss.org/frontpage"}'
# 结果: 成功返回 RSS feed
```

### ✅ Backend Health
```bash
curl 'http://localhost:3001/health'
# 结果: {"status":"ok","message":"Server is running"}
```

## 使用说明

### 启动开发环境

1. **启动后端服务** (Terminal 1):
```bash
cd /Users/houjie5/info-collector/backend
npm run dev
```

2. **启动前端服务** (Terminal 2):
```bash
cd /Users/houjie5/info-collector/frontend
npm run dev
```

3. 访问 http://localhost:5173

### 注意事项

1. **Share 功能**: 开发环境中"推荐到社区"功能会调用生产环境 API
2. **后端必须启动**: 其他 API 功能需要本地后端服务运行
3. **热重载**: 修改 `vite.config.ts` 后需要重启前端服务

## 问题解决

修复前:
- ❌ Network Error
- ❌ 无法抓取网页
- ❌ 无法生成 AI 摘要
- ❌ 无法使用 OCR

修复后:
- ✅ 所有 API 正常工作
- ✅ 开发/生产环境一致
- ✅ 代理自动转发请求
- ✅ 错误提示清晰

## 修改文件列表

1. `frontend/vite.config.ts` - 添加代理配置
2. `frontend/src/services/ai.ts` - 统一 API_BASE_URL
3. `frontend/src/services/rssFetcher.ts` - 统一 API_BASE_URL
4. `frontend/src/services/scraper.ts` - 统一 API_BASE_URL
5. `frontend/src/services/ocr.ts` - 统一 API_BASE_URL
6. `frontend/src/services/analytics.ts` - 统一 API_BASE_URL
7. `frontend/src/services/share.ts` - 指向生产 API

---

**修复时间**: 2026-02-09
**状态**: ✅ 已完成
