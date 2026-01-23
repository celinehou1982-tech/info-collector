import type { VercelRequest, VercelResponse } from '@vercel/node'
import { kv } from '@vercel/kv'
import { randomBytes } from 'crypto'

// 生成短ID的函数（替代nanoid）
function generateId(length: number = 10): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = randomBytes(length)
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length]
  }
  return result
}

interface ShareRequest {
  content: {
    id: string
    type: 'text' | 'url'
    title: string
    content: string
    sourceUrl?: string
    author?: string
    publishDate?: string
    tags: string[]
    summary?: string
    keyPoints?: string[]
  }
  userName?: string
  expiresIn?: number  // 过期时间（秒），默认30天
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const { content, userName, expiresIn } = req.body as ShareRequest

    if (!content || !content.title || !content.content) {
      return res.status(400).json({
        success: false,
        error: '缺少必要的内容信息'
      })
    }

    // 生成唯一ID
    const shareId = generateId(10)
    const now = Date.now()
    const ttl = expiresIn || 30 * 24 * 60 * 60 // 默认30天

    // 构造分享数据
    const shareData = {
      id: shareId,
      contentId: content.id,
      userName: userName || '匿名用户',
      content: content,
      shareUrl: `${process.env.VERCEL_URL || 'https://catch4you.vercel.app'}/share/${shareId}`,
      viewCount: 0,
      likeCount: 0,
      createdAt: now,
      expiresAt: now + ttl * 1000
    }

    // 存储到KV
    await kv.setex(`share:${shareId}`, ttl, JSON.stringify(shareData))

    // 添加到推荐列表（有序集合，按时间排序）
    await kv.zadd('share:feed', { score: now, member: shareId })

    // 只保留最近1000条推荐 - 删除旧的
    const total = await kv.zcard('share:feed')
    if (total && total > 1000) {
      await kv.zpopmin('share:feed', total - 1000)
    }

    console.log(`分享创建成功: ${shareId}`)

    return res.json({
      success: true,
      data: {
        shareId,
        shareUrl: shareData.shareUrl
      }
    })
  } catch (error) {
    console.error('创建分享失败:', error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '创建分享失败'
    })
  }
}
