import { db } from './storage'
import type { Subscription } from '../types'

/**
 * 订阅管理服务
 */
export class SubscriptionService {
  /**
   * 获取所有订阅
   */
  async getAllSubscriptions(): Promise<Subscription[]> {
    return await db.subscriptions.toArray()
  }

  /**
   * 获取启用的订阅
   */
  async getEnabledSubscriptions(): Promise<Subscription[]> {
    const all = await db.subscriptions.toArray()
    return all.filter(sub => sub.enabled === true)
  }

  /**
   * 根据ID获取订阅
   */
  async getSubscription(id: string): Promise<Subscription | undefined> {
    return await db.subscriptions.get(id)
  }

  /**
   * 创建订阅
   */
  async createSubscription(subscription: Omit<Subscription, 'id' | 'createdAt'>): Promise<string> {
    const id = crypto.randomUUID()
    const newSubscription: Subscription = {
      ...subscription,
      id,
      createdAt: new Date()
    }
    await db.subscriptions.add(newSubscription)
    return id
  }

  /**
   * 更新订阅
   */
  async updateSubscription(id: string, updates: Partial<Subscription>): Promise<void> {
    await db.subscriptions.update(id, updates)
  }

  /**
   * 删除订阅
   */
  async deleteSubscription(id: string): Promise<void> {
    await db.subscriptions.delete(id)
  }

  /**
   * 标记订阅已抓取
   */
  async markAsFetched(id: string): Promise<void> {
    await db.subscriptions.update(id, {
      lastFetchedAt: new Date()
    })
  }

  /**
   * 检查是否需要抓取（根据频率判断）
   */
  async shouldFetch(subscription: Subscription): Promise<boolean> {
    if (!subscription.enabled) return false
    if (!subscription.lastFetchedAt) return true

    const now = Date.now()
    const lastFetch = new Date(subscription.lastFetchedAt).getTime()
    const diff = now - lastFetch

    switch (subscription.frequency) {
      case 'hourly':
        return diff > 60 * 60 * 1000 // 1小时
      case 'daily':
        return diff > 24 * 60 * 60 * 1000 // 1天
      case 'weekly':
        return diff > 7 * 24 * 60 * 60 * 1000 // 7天
      default:
        return false
    }
  }

  /**
   * 获取需要抓取的订阅列表
   */
  async getSubscriptionsToFetch(): Promise<Subscription[]> {
    const enabled = await this.getEnabledSubscriptions()
    const toFetch: Subscription[] = []

    for (const sub of enabled) {
      if (await this.shouldFetch(sub)) {
        toFetch.push(sub)
      }
    }

    return toFetch
  }
}

export const subscriptionService = new SubscriptionService()
