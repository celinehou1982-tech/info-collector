import axios from 'axios'

const API_BASE_URL = 'http://localhost:3001'

export interface OCRRequest {
  imageBase64: string
  provider?: 'openai' | 'tesseract'
  apiKey?: string
  language?: string
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
 * 识别图片中的文字
 */
export async function recognizeImage(req: OCRRequest): Promise<OCRResult> {
  try {
    const response = await axios.post<OCRResult>(`${API_BASE_URL}/api/ocr`, req)
    return response.data
  } catch (error) {
    console.error('OCR识别失败:', error)
    return {
      success: false,
      error: '图片识别失败，请重试'
    }
  }
}

/**
 * 将文件转换为Base64
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('读取文件失败'))
      }
    }
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsDataURL(file)
  })
}
