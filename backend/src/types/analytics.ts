// 用户会话类型
export interface UserSession {
  ip: string
  userAgent: string
  firstVisit: Date
  lastVisit: Date
  totalDuration: number // 总停留时长（秒）
  visitCount: number // 访问次数
  apiCallCount: number // API调用次数
}

// 用户活动记录
export interface UserActivity {
  ip: string
  timestamp: Date
  action: 'page_view' | 'api_call' | 'session_start' | 'session_end'
  duration?: number // 停留时长（秒）
  endpoint?: string // API端点
  userAgent?: string
}

// 统计摘要
export interface AnalyticsSummary {
  totalUsers: number
  totalVisits: number
  totalApiCalls: number
  averageDuration: number
  users: UserSession[]
}
