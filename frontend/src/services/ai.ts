import axios from 'axios'
import { AISummaryResponse } from '../types'

// 统一使用相对路径，开发环境通过 Vite 代理到本地后端
const API_BASE_URL = '/api'

export interface GenerateSummaryRequest {
  content: string
  title: string
  provider?: 'openai' | 'anthropic'
  apiKey?: string
  model?: string
  baseUrl?: string
}

/**
 * 生成AI摘要和核心观点
 */
export async function generateAISummary(
  req: GenerateSummaryRequest
): Promise<AISummaryResponse> {
  try {
    const response = await axios.post<AISummaryResponse>(
      `${API_BASE_URL}/ai/summary`,
      req,
      {
        timeout: 60000 // 60秒超时
      }
    )
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        return {
          success: false,
          error: '无法连接到AI服务，请确保后端服务正在运行'
        }
      }
      if (error.response?.data) {
        return error.response.data
      }
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : '生成摘要失败'
    }
  }
}
