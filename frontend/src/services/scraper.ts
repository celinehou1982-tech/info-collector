import axios from 'axios'

// 根据环境选择API地址
const API_BASE_URL = import.meta.env.PROD
  ? '/.netlify/functions' // 生产环境使用Netlify Functions
  : 'http://localhost:3001' // 开发环境使用本地后端

export interface ScrapeResponse {
  success: boolean
  data?: {
    title: string
    content: string
    author?: string
    publishDate?: Date
    excerpt?: string
  }
  error?: string
}

/**
 * 抓取网页内容
 */
export async function scrapeUrl(url: string): Promise<ScrapeResponse> {
  try {
    const endpoint = import.meta.env.PROD
      ? `${API_BASE_URL}/scraper` // Netlify Function
      : `${API_BASE_URL}/api/scrape` // 本地后端

    const response = await axios.post<ScrapeResponse>(
      endpoint,
      { url },
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
          error: '无法连接到抓取服务，请确保后端服务正在运行'
        }
      }
      if (error.response?.data) {
        return error.response.data
      }
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : '抓取失败'
    }
  }
}

/**
 * 检查后端服务是否可用
 */
export async function checkServerHealth(): Promise<boolean> {
  if (import.meta.env.PROD) {
    // 生产环境假设服务总是可用
    return true
  }
  try {
    const response = await axios.get(`${API_BASE_URL}/health`, {
      timeout: 5000
    })
    return response.data.status === 'ok'
  } catch (error) {
    return false
  }
}
