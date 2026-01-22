import type { VercelRequest, VercelResponse } from '@vercel/node'
import { generateSummary, generateSimpleSummary, extractSimpleKeyPoints } from '../backend/src/services/ai'

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
    const { content, title, provider, apiKey, model, baseUrl } = req.body

    console.log('收到AI摘要请求参数:', {
      title,
      provider,
      hasApiKey: !!apiKey,
      model: model || '(未指定)',
      baseUrl: baseUrl || '(未设置)'
    })

    if (!content || !title) {
      return res.status(400).json({
        success: false,
        error: '缺少content或title参数'
      })
    }

    if (!provider || !apiKey) {
      // 使用降级方案
      console.log('使用降级方案生成摘要')
      const summary = generateSimpleSummary(content)
      const keyPoints = extractSimpleKeyPoints(content)

      return res.json({
        success: true,
        data: {
          summary: summary || '无法生成摘要',
          keyPoints: keyPoints
        }
      })
    }

    console.log(`收到AI摘要请求: ${title} (使用${provider})`)

    // 使用AI生成摘要
    const result = await generateSummary({
      content,
      title,
      provider,
      apiKey,
      model,
      baseUrl
    })

    if (result.success) {
      return res.json(result)
    } else {
      return res.status(500).json(result)
    }
  } catch (error) {
    console.error('AI摘要API错误:', error)
    return res.status(500).json({
      success: false,
      error: '服务器内部错误'
    })
  }
}
