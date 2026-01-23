import type { VercelRequest, VercelResponse } from '@vercel/node'
import { kv } from '@vercel/kv'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const { id } = req.query

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        error: '缺少分享ID'
      })
    }

    // 从KV获取分享数据
    const shareDataStr = await kv.get<string>(`share:${id}`)

    if (!shareDataStr) {
      return res.status(404).json({
        success: false,
        error: '分享不存在或已过期'
      })
    }

    const shareData = JSON.parse(shareDataStr)

    // 增加浏览次数
    shareData.viewCount += 1
    const ttl = await kv.ttl(`share:${id}`)
    if (ttl > 0) {
      await kv.setex(`share:${id}`, ttl, JSON.stringify(shareData))
    }

    console.log(`分享查看: ${id}, 浏览次数: ${shareData.viewCount}`)

    return res.json({
      success: true,
      data: shareData
    })
  } catch (error) {
    console.error('获取分享失败:', error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取分享失败'
    })
  }
}
