import { UserSession, UserActivity, AnalyticsSummary } from '../types/analytics'

// 内存存储（生产环境应该使用数据库）
class AnalyticsStore {
  private sessions: Map<string, UserSession> = new Map()
  private activities: UserActivity[] = []

  // 记录会话开始
  recordSessionStart(ip: string, userAgent: string): void {
    const session = this.sessions.get(ip)
    if (session) {
      session.visitCount++
      session.lastVisit = new Date()
    } else {
      this.sessions.set(ip, {
        ip,
        userAgent,
        firstVisit: new Date(),
        lastVisit: new Date(),
        totalDuration: 0,
        visitCount: 1,
        apiCallCount: 0
      })
    }

    this.activities.push({
      ip,
      timestamp: new Date(),
      action: 'session_start',
      userAgent
    })
  }

  // 记录会话结束（更新停留时长）
  recordSessionEnd(ip: string, duration: number): void {
    const session = this.sessions.get(ip)
    if (session) {
      session.totalDuration += duration
      session.lastVisit = new Date()
    }

    this.activities.push({
      ip,
      timestamp: new Date(),
      action: 'session_end',
      duration
    })
  }

  // 记录页面访问
  recordPageView(ip: string, userAgent: string): void {
    this.recordSessionStart(ip, userAgent)

    this.activities.push({
      ip,
      timestamp: new Date(),
      action: 'page_view',
      userAgent
    })
  }

  // 记录API调用
  recordApiCall(ip: string, endpoint: string): void {
    const session = this.sessions.get(ip)
    if (session) {
      session.apiCallCount++
    }

    this.activities.push({
      ip,
      timestamp: new Date(),
      action: 'api_call',
      endpoint
    })
  }

  // 获取统计摘要
  getSummary(): AnalyticsSummary {
    const users = Array.from(this.sessions.values())
    const totalVisits = users.reduce((sum, user) => sum + user.visitCount, 0)
    const totalApiCalls = users.reduce((sum, user) => sum + user.apiCallCount, 0)
    const totalDuration = users.reduce((sum, user) => sum + user.totalDuration, 0)

    return {
      totalUsers: users.length,
      totalVisits,
      totalApiCalls,
      averageDuration: users.length > 0 ? totalDuration / users.length : 0,
      users: users.sort((a, b) => b.lastVisit.getTime() - a.lastVisit.getTime())
    }
  }

  // 获取特定用户的会话数据
  getUserSession(ip: string): UserSession | undefined {
    return this.sessions.get(ip)
  }

  // 获取所有活动记录
  getActivities(limit: number = 100): UserActivity[] {
    return this.activities.slice(-limit).reverse()
  }

  // 清空数据（测试用）
  clear(): void {
    this.sessions.clear()
    this.activities = []
  }
}

// 导出单例
export const analyticsStore = new AnalyticsStore()
