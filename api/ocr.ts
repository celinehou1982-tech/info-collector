import type { VercelRequest, VercelResponse } from '@vercel/node'
import { recognizeImage } from '../backend/src/services/ocr'

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
    const { imageBase64, provider, apiKey, language } = req.body

    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        error: '缺少图片数据'
      })
    }

    console.log(`收到OCR请求 (使用${provider || 'tesseract'})`)

    const result = await recognizeImage({
      imageBase64,
      provider,
      apiKey,
      language
    })

    if (result.success) {
      return res.json(result)
    } else {
      return res.status(500).json(result)
    }
  } catch (error) {
    console.error('OCR API错误:', error)
    return res.status(500).json({
      success: false,
      error: '服务器内部错误'
    })
  }
}
