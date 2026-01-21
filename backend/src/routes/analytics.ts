import { Router, Request, Response } from 'express'
import { analyticsStore } from '../services/analytics'

const router = Router()

// 获取客户端IP地址
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim()
  }
  return req.ip || req.socket.remoteAddress || 'unknown'
}

// 记录页面访问
router.post('/track/page-view', (req: Request, res: Response) => {
  const ip = getClientIp(req)
  const userAgent = req.headers['user-agent'] || 'unknown'

  analyticsStore.recordPageView(ip, userAgent)

  res.json({ success: true })
})

// 记录会话结束（停留时长）
router.post('/track/session-end', (req: Request, res: Response) => {
  const ip = getClientIp(req)
  const { duration } = req.body

  if (typeof duration === 'number') {
    analyticsStore.recordSessionEnd(ip, duration)
  }

  res.json({ success: true })
})

// 记录API调用（中间件会自动调用）
router.post('/track/api-call', (req: Request, res: Response) => {
  const ip = getClientIp(req)
  const { endpoint } = req.body

  if (endpoint) {
    analyticsStore.recordApiCall(ip, endpoint)
  }

  res.json({ success: true })
})

// 获取统计摘要（管理员接口）
router.get('/admin/summary', (req: Request, res: Response) => {
  // TODO: 添加管理员认证
  const summary = analyticsStore.getSummary()
  res.json({ success: true, data: summary })
})

// 获取特定用户的数据
router.get('/admin/user/:ip', (req: Request, res: Response) => {
  // TODO: 添加管理员认证
  const { ip } = req.params
  const session = analyticsStore.getUserSession(ip)

  if (session) {
    res.json({ success: true, data: session })
  } else {
    res.status(404).json({ success: false, error: 'User not found' })
  }
})

// 获取活动记录
router.get('/admin/activities', (req: Request, res: Response) => {
  // TODO: 添加管理员认证
  const limit = parseInt(req.query.limit as string) || 100
  const activities = analyticsStore.getActivities(limit)
  res.json({ success: true, data: activities })
})

export default router
