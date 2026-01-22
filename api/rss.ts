import type { VercelRequest, VercelResponse } from '@vercel/node'
import Parser from 'rss-parser'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 设置CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const { url } = req.body

    if (!url) {
      return res.status(400).json({
        success: false,
        error: '缺少RSS URL'
      })
    }

    console.log(`收到RSS抓取请求: ${url}`)

    const parser = new Parser({
      timeout: 15000,
      customFields: {
        item: [
          ['content:encoded', 'contentEncoded'],
          ['description', 'description']
        ]
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; InfoCollector/1.0; +http://example.com)'
      }
    })

    const feed = await parser.parseURL(url)

    console.log(`RSS抓取成功: ${url}, 获取到 ${feed.items.length} 条内容`)

    // 转换为前端需要的格式
    const items = feed.items.map(item => ({
      title: item.title || '',
      content: item.contentEncoded || item.content || item.description || '',
      link: item.link || '',
      author: item.creator || item.author || undefined,
      publishDate: item.pubDate || item.isoDate || undefined,
      guid: item.guid || item.id || undefined
    }))

    return res.json({
      success: true,
      data: {
        feed: {
          title: feed.title || '',
          description: feed.description || '',
          link: feed.link || ''
        },
        items
      }
    })
  } catch (error) {
    console.error('RSS抓取错误:', error)
    const errorMessage = error instanceof Error ? error.message : 'RSS抓取失败'
    console.error('错误详情:', errorMessage)

    return res.status(500).json({
      success: false,
      error: errorMessage
    })
  }
}
