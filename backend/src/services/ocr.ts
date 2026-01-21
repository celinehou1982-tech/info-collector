import OpenAI from 'openai'
import Tesseract from 'tesseract.js'
import { createWorker } from 'tesseract.js'

export interface OCRRequest {
  imageBase64: string
  provider?: 'openai' | 'tesseract'
  apiKey?: string
  language?: string // 'chi_sim' for Chinese, 'eng' for English
}

export interface OCRResult {
  success: boolean
  data?: {
    text: string
    confidence?: number
  }
  error?: string
}

/**
 * 使用OCR识别图片中的文字
 */
export async function recognizeImage(req: OCRRequest): Promise<OCRResult> {
  try {
    if (req.provider === 'openai' && req.apiKey) {
      return await recognizeWithOpenAI(req)
    } else {
      // 默认使用 Tesseract
      return await recognizeWithTesseract(req)
    }
  } catch (error) {
    console.error('OCR识别失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'OCR识别失败'
    }
  }
}

/**
 * 使用 OpenAI GPT-4 Vision 识别图片
 */
async function recognizeWithOpenAI(req: OCRRequest): Promise<OCRResult> {
  try {
    if (!req.apiKey) {
      throw new Error('缺少 OpenAI API Key')
    }

    const openai = new OpenAI({
      apiKey: req.apiKey
    })

    console.log('使用 GPT-4 Vision 识别图片...')

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: '请识别这张图片中的所有文字内容，并以纯文本形式返回。如果图片中有表格，请保持表格格式。保持原文的段落结构和格式。'
            },
            {
              type: 'image_url',
              image_url: {
                url: req.imageBase64
              }
            }
          ]
        }
      ],
      max_tokens: 4096
    })

    const text = response.choices[0]?.message?.content || ''

    console.log('GPT-4 Vision 识别成功')

    return {
      success: true,
      data: {
        text,
        confidence: 95 // GPT-4 Vision 通常有很高的准确度
      }
    }
  } catch (error) {
    console.error('GPT-4 Vision 识别失败:', error)

    // 降级到 Tesseract
    console.log('降级使用 Tesseract...')
    return await recognizeWithTesseract(req)
  }
}

/**
 * 使用 Tesseract.js 识别图片（降级方案）
 */
async function recognizeWithTesseract(req: OCRRequest): Promise<OCRResult> {
  try {
    console.log('使用 Tesseract 识别图片...')

    // 支持中英文
    const language = req.language || 'chi_sim+eng'

    // 将 base64 转换为 Buffer
    const base64Data = req.imageBase64.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')

    // 创建 worker
    const worker = await createWorker(language, 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`识别进度: ${Math.round(m.progress * 100)}%`)
        }
      }
    })

    // 执行识别
    const { data } = await worker.recognize(buffer)

    await worker.terminate()

    console.log(`Tesseract 识别成功，置信度: ${data.confidence.toFixed(2)}%`)

    return {
      success: true,
      data: {
        text: data.text,
        confidence: data.confidence
      }
    }
  } catch (error) {
    console.error('Tesseract 识别失败:', error)
    return {
      success: false,
      error: 'OCR识别失败，请确保图片清晰可读'
    }
  }
}
