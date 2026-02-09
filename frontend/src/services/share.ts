import axios from 'axios'
import type {
  Content,
  CreateShareResponse,
  GetShareResponse,
  ShareFeedResponse,
  LikeShareResponse
} from '../types'

// Share API 在开发环境不可用（需要Vercel KV），使用生产环境API
// 其他API通过Vite代理到本地后端
const API_BASE_URL = import.meta.env.PROD
  ? '/api'
  : 'https://catch4you.vercel.app/api'  // 开发环境使用生产API

/**
 * 创建分享
 */
export async function createShare(
  content: Content,
  userName?: string
): Promise<CreateShareResponse> {
  try {
    const response = await axios.post<CreateShareResponse>(
      `${API_BASE_URL}/share/create`,
      {
        content: {
          id: content.id,
          type: content.type,
          title: content.title,
          content: content.content,
          sourceUrl: content.sourceUrl,
          author: content.author,
          publishDate: content.publishDate,
          tags: content.tags,
          summary: content.summary,
          keyPoints: content.keyPoints
        },
        userName,
        expiresIn: 30 * 24 * 60 * 60 // 30天
      },
      {
        timeout: 10000
      }
    )
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.data) {
        return error.response.data
      }
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : '创建分享失败'
    }
  }
}

/**
 * 获取分享内容
 */
export async function getSharedContent(shareId: string): Promise<GetShareResponse> {
  try {
    const response = await axios.get<GetShareResponse>(
      `${API_BASE_URL}/share/get?id=${shareId}`,
      {
        timeout: 10000
      }
    )
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        return {
          success: false,
          error: '分享不存在或已过期'
        }
      }
      if (error.response?.data) {
        return error.response.data
      }
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : '获取分享失败'
    }
  }
}

/**
 * 获取推荐广场列表
 */
export async function getShareFeed(
  page: number = 1,
  limit: number = 20
): Promise<ShareFeedResponse> {
  try {
    const response = await axios.get<ShareFeedResponse>(
      `${API_BASE_URL}/share/feed`,
      {
        params: { page, limit },
        timeout: 10000
      }
    )
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.data) {
        return error.response.data
      }
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : '获取推荐列表失败'
    }
  }
}

/**
 * 点赞分享
 */
export async function likeShare(shareId: string): Promise<LikeShareResponse> {
  try {
    const response = await axios.post<LikeShareResponse>(
      `${API_BASE_URL}/share/like?id=${shareId}`,
      {},
      {
        timeout: 10000
      }
    )
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.data) {
        return error.response.data
      }
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : '点赞失败'
    }
  }
}
