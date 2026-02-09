import axios from 'axios'

// 统一使用相对路径，开发环境通过 Vite 代理到本地后端
// Analytics API 通过 /api/analytics 路由访问
const API_BASE_URL = '/api/analytics'

// 记录页面访问
export async function trackPageView() {
  try {
    await axios.post(`${API_BASE_URL}/track/page-view`)
  } catch (error) {
    // 静默失败，不影响用户体验
  }
}

// 记录会话结束（停留时长）
export async function trackSessionEnd(duration: number) {
  try {
    await axios.post(`${API_BASE_URL}/track/session-end`, { duration })
  } catch (error) {
    // 静默失败
  }
}

// 记录API调用
export async function trackApiCall(endpoint: string) {
  try {
    await axios.post(`${API_BASE_URL}/track/api-call`, { endpoint })
  } catch (error) {
    // 静默失败
  }
}

// 获取统计摘要（管理员接口）
export async function getAnalyticsSummary() {
  try {
    const response = await axios.get(`${API_BASE_URL}/admin/summary`)
    return response.data
  } catch (error) {
    console.error('Failed to get analytics summary:', error)
    throw error
  }
}

// 获取用户会话数据
export async function getUserSession(ip: string) {
  try {
    const response = await axios.get(`${API_BASE_URL}/admin/user/${ip}`)
    return response.data
  } catch (error) {
    console.error('Failed to get user session:', error)
    throw error
  }
}

// 获取活动记录
export async function getActivities(limit: number = 100) {
  try {
    const response = await axios.get(`${API_BASE_URL}/admin/activities`, {
      params: { limit }
    })
    return response.data
  } catch (error) {
    console.error('Failed to get activities:', error)
    throw error
  }
}
