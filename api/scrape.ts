import type { VercelRequest, VercelResponse } from '@vercel/node'
import { scrapeWebPage } from '../backend/src/services/scraper'

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
        error: '缺少URL参数'
      })
    }

    // 验证URL格式
    try {
      new URL(url)
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'URL格式不正确'
      })
    }

    console.log(`收到抓取请求: ${url}`)

    // 执行抓取
    const result = await scrapeWebPage(url)

    if (result.success) {
      return res.json(result)
    } else {
      return res.status(500).json(result)
    }
  } catch (error) {
    console.error('API错误:', error)
    return res.status(500).json({
      success: false,
      error: '服务器内部错误'
    })
  }
}
