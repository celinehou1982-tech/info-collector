import axios from 'axios'
import { subscriptionService } from './subscription'
import { contentService } from './storage'
import { scrapeUrl } from './scraper'
import type { Subscription } from '../types'

// 统一使用相对路径，开发环境通过 Vite 代理到本地后端
const API_BASE_URL = '/api'

export interface RSSItem {
  title: string
  content: string
  link: string
  author?: string
  publishDate?: string
  guid?: string
}

export interface RSSFetchResponse {
  success: boolean
  data?: {
    feed: {
      title: string
      description?: string
      link?: string
    }
    items: RSSItem[]
  }
  error?: string
}

/**
 * 抓取RSS Feed
 */
export async function fetchRSS(url: string): Promise<RSSFetchResponse> {
  try {
    const endpoint = `${API_BASE_URL}/rss`

    const response = await axios.post<RSSFetchResponse>(
      endpoint,
      { url },
      { timeout: 30000 }
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
      error: error instanceof Error ? error.message : 'RSS抓取失败'
    }
  }
}

/**
 * 抓取订阅并保存到内容库
 */
export async function fetchSubscriptionContent(subscription: Subscription): Promise<{
  success: boolean
  newItems: number
  error?: string
}> {
  try {
    console.log(`[RSS] 开始抓取订阅: ${subscription.name}`)

    // 找到RSS源
    const rssSources = subscription.sources.filter(s => s.type === 'rss' && s.enabled)
    console.log(`[RSS] 找到 ${rssSources.length} 个启用的RSS源`)

    if (rssSources.length === 0) {
      console.warn(`[RSS] 订阅 ${subscription.name} 没有启用的RSS源`)
      return {
        success: false,
        newItems: 0,
        error: '没有启用的RSS源'
      }
    }

    let totalNewItems = 0
    let hasError = false
    let lastError = ''

    // 遍历所有RSS源
    for (const source of rssSources) {
      console.log(`[RSS] 正在抓取: ${source.url}`)
      const result = await fetchRSS(source.url)

      if (!result.success || !result.data) {
        console.error(`[RSS] 抓取失败: ${source.url}`, result.error)
        hasError = true
        lastError = result.error || '抓取失败'
        continue
      }

      console.log(`[RSS] 成功获取 ${result.data.items.length} 条内容`)

      // 保存每个item到内容库
      for (const item of result.data.items) {
        // 关键词过滤
        if (subscription.keywords && subscription.keywords.length > 0) {
          const searchText = `${item.title} ${item.content}`.toLowerCase()
          const hasKeyword = subscription.keywords.some(keyword =>
            searchText.includes(keyword.toLowerCase())
          )

          if (!hasKeyword) {
            console.log(`[RSS] 跳过不包含关键词的内容: ${item.title}`)
            continue
          }
        }

        // 检查是否已存在（通过URL或guid）
        const existing = await contentService.getAll()
        const isDuplicate = existing.some(c =>
          c.sourceUrl === item.link ||
          (item.guid && c.sourceUrl === item.guid)
        )

        if (isDuplicate) {
          console.log(`[RSS] 跳过重复内容: ${item.title}`)
          continue // 跳过重复内容
        }

        // 判断RSS内容是否太短，如果是则抓取全文
        let finalContent = item.content
        let finalSummary = item.content.substring(0, 200) + '...'

        // 如果RSS内容少于500字符，尝试抓取全文
        if (item.content.length < 500 && item.link) {
          console.log(`[RSS] RSS内容较短(${item.content.length}字符)，尝试抓取全文: ${item.link}`)
          try {
            const scrapeResult = await scrapeUrl(item.link)
            if (scrapeResult.success && scrapeResult.data?.content) {
              console.log(`[RSS] 成功抓取全文，长度: ${scrapeResult.data.content.length}字符`)
              finalContent = scrapeResult.data.content
              finalSummary = scrapeResult.data.excerpt || finalContent.substring(0, 200) + '...'

              // 如果抓取到了更多信息，也更新这些字段
              if (scrapeResult.data.author && !item.author) {
                item.author = scrapeResult.data.author
              }
              if (scrapeResult.data.publishDate && !item.publishDate) {
                item.publishDate = new Date(scrapeResult.data.publishDate).toISOString()
              }
            } else {
              console.warn(`[RSS] 全文抓取失败，使用RSS内容: ${scrapeResult.error}`)
            }
          } catch (error) {
            console.error(`[RSS] 全文抓取异常，使用RSS内容:`, error)
          }
        }

        // 创建新内容
        console.log(`[RSS] 保存新内容: ${item.title}`)
        await contentService.create({
          type: 'url',
          title: item.title,
          content: finalContent,
          sourceUrl: item.link,
          author: item.author,
          publishDate: item.publishDate ? new Date(item.publishDate) : undefined,
          categoryIds: subscription.categoryId ? [subscription.categoryId] : [],
          tags: [subscription.company, '订阅', 'RSS'],
          summary: finalSummary
        })

        totalNewItems++
      }
    }

    console.log(`[RSS] 订阅 ${subscription.name} 抓取完成，新增 ${totalNewItems} 条内容`)

    // 更新订阅的最后抓取时间
    await subscriptionService.markAsFetched(subscription.id)

    // 如果所有源都失败了，返回错误
    if (hasError && totalNewItems === 0) {
      return {
        success: false,
        newItems: 0,
        error: lastError
      }
    }

    return {
      success: true,
      newItems: totalNewItems
    }
  } catch (error) {
    console.error('[RSS] 抓取异常:', error)
    return {
      success: false,
      newItems: 0,
      error: error instanceof Error ? error.message : '抓取失败'
    }
  }
}

/**
 * 抓取所有需要更新的订阅
 */
export async function fetchAllSubscriptions(): Promise<{
  total: number
  success: number
  failed: number
  newItems: number
}> {
  console.log('[RSS] 开始批量抓取所有订阅')
  const toFetch = await subscriptionService.getSubscriptionsToFetch()
  console.log(`[RSS] 找到 ${toFetch.length} 个需要抓取的订阅`)

  let successCount = 0
  let failedCount = 0
  let totalNewItems = 0

  for (const subscription of toFetch) {
    console.log(`[RSS] 处理订阅: ${subscription.name}`)
    const result = await fetchSubscriptionContent(subscription)
    if (result.success) {
      successCount++
      totalNewItems += result.newItems
      console.log(`[RSS] ✓ ${subscription.name} 成功，新增 ${result.newItems} 条`)
    } else {
      failedCount++
      console.error(`[RSS] ✗ ${subscription.name} 失败: ${result.error}`)
    }
  }

  console.log(`[RSS] 批量抓取完成: 成功 ${successCount}, 失败 ${failedCount}, 新增 ${totalNewItems} 条`)

  return {
    total: toFetch.length,
    success: successCount,
    failed: failedCount,
    newItems: totalNewItems
  }
}
