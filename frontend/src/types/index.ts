// 内容类型
export interface Content {
  id: string
  type: 'text' | 'url' | 'image' | 'pdf'
  title: string
  content: string // Markdown格式 or 图片说明 or PDF提取的文本
  rawContent?: string // 原始内容
  sourceUrl?: string
  author?: string
  publishDate?: Date
  categoryIds: string[]
  tags: string[]
  summary?: string
  keyPoints?: string[]
  imageData?: string // Base64编码的图片数据
  imageType?: string // 图片MIME类型 (image/png, image/jpeg等)
  pdfData?: string // Base64编码的PDF数据
  pdfFileName?: string // PDF文件名
  pdfPageCount?: number // PDF页数
  createdAt: Date
  updatedAt: Date
}

// 目录类型
export interface Category {
  id: string
  name: string
  description?: string
  parentId?: string // 父目录ID，null表示根目录
  keywords: Keyword[]
  color?: string
  icon?: string
  order: number
  createdAt: Date
}

// 关键词类型
export interface Keyword {
  text: string
  weight: number // 权重 1-10
  synonyms?: string[] // 同义词
}

// 分类建议
export interface CategorySuggestion {
  categoryId: string
  categoryName: string
  score: number // 0-100
  matchedKeywords: string[]
}

// 搜索过滤器
export interface SearchFilter {
  keyword?: string
  categoryIds?: string[]
  tags?: string[]
  dateRange?: {
    start: Date
    end: Date
  }
  type?: 'text' | 'url' | 'image' | 'pdf' | 'all'
}

// 汇总文档配置
export interface SummaryConfig {
  categoryIds?: string[]
  tags?: string[]
  dateRange?: {
    start: Date
    end: Date
  }
  limit?: number
  includeFullContent?: boolean
}

// AI配置
export interface AIConfig {
  provider: 'openai' | 'anthropic' | 'local'
  apiKey?: string
  model?: string
  baseUrl?: string // 自定义API地址
  enabled: boolean
}

// 应用设置
export interface AppSettings {
  ai: AIConfig
  scraping: {
    downloadImages: boolean
    timeout: number // 秒
  }
  display: {
    viewMode: 'list' | 'card'
    itemsPerPage: number
    theme: 'light' | 'dark' | 'auto'
  }
  backup: {
    autoBackup: boolean
    backupInterval: number // 小时
    maxBackups: number
  }
}

// 导出格式
export type ExportFormat = 'markdown' | 'html' | 'pdf' | 'json'

// 订阅源类型
export interface Subscription {
  id: string
  name: string // 订阅名称，如 "Tesla News"
  company: string // 公司名称，如 "Tesla"
  sources: SubscriptionSource[] // 信息源列表
  keywords?: string[] // 关键词过滤（可选），只保存包含这些关键词的内容
  categoryId?: string // 自动归类到的目录
  enabled: boolean // 是否启用
  frequency: 'hourly' | 'daily' | 'weekly' // 抓取频率
  lastFetchedAt?: Date // 最后抓取时间
  createdAt: Date
}

// 信息源
export interface SubscriptionSource {
  type: 'rss' | 'hackernews' | 'reddit' | 'twitter'
  url: string // RSS URL 或 搜索关键词
  enabled: boolean
}

// API响应类型
export interface ScraperResponse {
  success: boolean
  data?: {
    title: string
    content: string
    author?: string
    publishDate?: Date
    images?: string[]
  }
  error?: string
}

export interface AISummaryResponse {
  success: boolean
  data?: {
    summary: string
    keyPoints: string[]
  }
  error?: string
}

// 分享内容类型
export interface SharedContent {
  id: string
  contentId: string
  userName: string
  content: Content
  shareUrl: string
  viewCount: number
  likeCount: number
  createdAt: number
  expiresAt: number
}

// 推荐广场响应
export interface ShareFeedResponse {
  success: boolean
  data?: {
    items: SharedContent[]
    total: number
    page: number
    limit: number
    hasMore: boolean
  }
  error?: string
}

// 创建分享响应
export interface CreateShareResponse {
  success: boolean
  data?: {
    shareId: string
    shareUrl: string
  }
  error?: string
}

// 获取分享响应
export interface GetShareResponse {
  success: boolean
  data?: SharedContent
  error?: string
}

// 点赞响应
export interface LikeShareResponse {
  success: boolean
  data?: {
    likeCount: number
  }
  error?: string
}
