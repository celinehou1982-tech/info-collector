import type { VercelRequest, VercelResponse } from '@vercel/node'
import { analyticsStore } from '../../backend/src/services/analytics'

function getClientIp(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim()
  }
  return 'unknown'
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 设置CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    const { action } = req.query

    if (req.method === 'POST') {
      const ip = getClientIp(req)

      switch (action) {
        case 'page-view':
          const userAgent = req.headers['user-agent'] || 'unknown'
          analyticsStore.recordPageView(ip, userAgent)
          return res.json({ success: true })

        case 'session-end':
          const { duration } = req.body
          if (typeof duration === 'number') {
            analyticsStore.recordSessionEnd(ip, duration)
          }
          return res.json({ success: true })

        case 'api-call':
          const { endpoint } = req.body
          if (endpoint) {
            analyticsStore.recordApiCall(ip, endpoint)
          }
          return res.json({ success: true })

        default:
          return res.status(400).json({ success: false, error: 'Invalid action' })
      }
    }

    if (req.method === 'GET') {
      switch (action) {
        case 'summary':
          const summary = analyticsStore.getSummary()
          return res.json({ success: true, data: summary })

        case 'activities':
          const limit = parseInt(req.query.limit as string) || 100
          const activities = analyticsStore.getActivities(limit)
          return res.json({ success: true, data: activities })

        default:
          return res.status(400).json({ success: false, error: 'Invalid action' })
      }
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' })
  } catch (error) {
    console.error('Analytics API错误:', error)
    return res.status(500).json({
      success: false,
      error: '服务器内部错误'
    })
  }
}
