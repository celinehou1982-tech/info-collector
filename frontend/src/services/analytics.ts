import axios from 'axios'

// 生产环境使用Railway后端，开发环境使用本地后端
// 在Netlify部署时，需要设置环境变量 VITE_API_URL
const API_BASE_URL = import.meta.env.PROD
  ? (import.meta.env.VITE_API_URL || '') // 生产环境从环境变量获取Railway URL
  : 'http://localhost:3001/api/analytics'

// 记录页面访问
export async function trackPageView() {
  if (!API_BASE_URL) return // 生产环境跳过
  try {
    await axios.post(`${API_BASE_URL}/track/page-view`)
  } catch (error) {
    // 静默失败，不影响用户体验
  }
}

// 记录会话结束（停留时长）
export async function trackSessionEnd(duration: number) {
  if (!API_BASE_URL) return // 生产环境跳过
  try {
    await axios.post(`${API_BASE_URL}/track/session-end`, { duration })
  } catch (error) {
    // 静默失败
  }
}

// 记录API调用
export async function trackApiCall(endpoint: string) {
  if (!API_BASE_URL) return // 生产环境跳过
  try {
    await axios.post(`${API_BASE_URL}/track/api-call`, { endpoint })
  } catch (error) {
    // 静默失败
  }
}

// 获取统计摘要（管理员接口）
export async function getAnalyticsSummary() {
  if (!API_BASE_URL) {
    throw new Error('Analytics API在生产环境不可用')
  }
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
  if (!API_BASE_URL) {
    throw new Error('Analytics API在生产环境不可用')
  }
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
  if (!API_BASE_URL) {
    throw new Error('Analytics API在生产环境不可用')
  }
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
