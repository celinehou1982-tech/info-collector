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
    // 获取分页参数
    const page = parseInt(req.query.page as string) || 1
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
    const offset = (page - 1) * limit

    // 从有序集合获取最新的分享ID（按时间倒序）
    const shareIds = await kv.zrange('share:feed', offset + limit - 1, offset, { rev: true })

    if (!shareIds || shareIds.length === 0) {
      return res.json({
        success: true,
        data: {
          items: [],
          total: 0,
          page,
          limit,
          hasMore: false
        }
      })
    }

    // 批量获取分享数据
    const items = []
    for (const id of shareIds) {
      const shareDataStr = await kv.get<string>(`share:${id}`)
      if (shareDataStr) {
        try {
          // KV可能返回字符串或对象
          if (typeof shareDataStr === 'string') {
            items.push(JSON.parse(shareDataStr))
          } else {
            items.push(shareDataStr)
          }
        } catch (e) {
          console.error(`Failed to parse share data for ${id}:`, e)
        }
      }
    }

    // 获取总数
    const total = await kv.zcard('share:feed') || 0

    console.log(`推荐广场: 返回 ${items.length} 条，第 ${page} 页`)

    return res.json({
      success: true,
      data: {
        items,
        total,
        page,
        limit,
        hasMore: offset + limit < total
      }
    })
  } catch (error) {
    console.error('获取推荐列表失败:', error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取推荐列表失败'
    })
  }
}
