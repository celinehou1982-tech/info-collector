import Dexie, { Table } from 'dexie'
import type { Content, Category, AppSettings, Subscription } from '../types/index'

// 定义数据库类
class InfoCollectorDB extends Dexie {
  contents!: Table<Content, string>
  categories!: Table<Category, string>
  settings!: Table<AppSettings & { id: string }, string>
  subscriptions!: Table<Subscription, string>

  constructor() {
    super('InfoCollectorDB')

    // 定义数据库版本和表结构
    this.version(1).stores({
      contents: 'id, type, title, *categoryIds, *tags, createdAt, updatedAt',
      categories: 'id, name, parentId, order, createdAt',
      settings: 'id'
    })

    // 版本2：添加订阅表
    this.version(2).stores({
      contents: 'id, type, title, *categoryIds, *tags, createdAt, updatedAt',
      categories: 'id, name, parentId, order, createdAt',
      settings: 'id',
      subscriptions: 'id, name, company, enabled, frequency, lastFetchedAt, createdAt'
    })
  }
}

// 创建数据库实例
export const db = new InfoCollectorDB()

// 内容服务
export const contentService = {
  // 获取所有内容
  async getAll(): Promise<Content[]> {
    return await db.contents.toArray()
  },

  // 根据ID获取内容
  async getById(id: string): Promise<Content | undefined> {
    return await db.contents.get(id)
  },

  // 创建内容
  async create(content: Omit<Content, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = crypto.randomUUID()
    const now = new Date()
    await db.contents.add({
      ...content,
      id,
      createdAt: now,
      updatedAt: now
    })
    return id
  },

  // 更新内容
  async update(id: string, updates: Partial<Content>): Promise<void> {
    await db.contents.update(id, {
      ...updates,
      updatedAt: new Date()
    })
  },

  // 删除内容
  async delete(id: string): Promise<void> {
    await db.contents.delete(id)
  },

  // 按目录查询
  async getByCategory(categoryId: string): Promise<Content[]> {
    return await db.contents
      .where('categoryIds')
      .equals(categoryId)
      .toArray()
  },

  // 按标签查询
  async getByTag(tag: string): Promise<Content[]> {
    return await db.contents
      .where('tags')
      .equals(tag)
      .toArray()
  },

  // 搜索（简单实现）
  async search(keyword: string): Promise<Content[]> {
    const allContents = await db.contents.toArray()
    const lowercaseKeyword = keyword.toLowerCase()
    return allContents.filter(content =>
      content.title.toLowerCase().includes(lowercaseKeyword) ||
      content.content.toLowerCase().includes(lowercaseKeyword) ||
      content.summary?.toLowerCase().includes(lowercaseKeyword)
    )
  },

  // 批量删除
  async bulkDelete(ids: string[]): Promise<void> {
    await db.contents.bulkDelete(ids)
  }
}

// 目录服务
export const categoryService = {
  // 获取所有目录
  async getAll(): Promise<Category[]> {
    return await db.categories.orderBy('order').toArray()
  },

  // 根据ID获取目录
  async getById(id: string): Promise<Category | undefined> {
    return await db.categories.get(id)
  },

  // 创建目录
  async create(category: Omit<Category, 'id' | 'createdAt' | 'order'>): Promise<string> {
    const id = crypto.randomUUID()
    const allCategories = await db.categories.toArray()
    const maxOrder = Math.max(0, ...allCategories.map(c => c.order))

    await db.categories.add({
      ...category,
      id,
      order: maxOrder + 1,
      createdAt: new Date()
    })
    return id
  },

  // 更新目录
  async update(id: string, updates: Partial<Category>): Promise<void> {
    await db.categories.update(id, updates)
  },

  // 删除目录
  async delete(id: string): Promise<void> {
    // 同时删除该目录下的所有内容
    const contents = await contentService.getByCategory(id)
    await contentService.bulkDelete(contents.map(c => c.id))
    await db.categories.delete(id)

    // 删除子目录
    const children = await db.categories.where('parentId').equals(id).toArray()
    for (const child of children) {
      await this.delete(child.id)
    }
  },

  // 获取子目录
  async getChildren(parentId: string | null): Promise<Category[]> {
    if (parentId === null) {
      return await db.categories.where('parentId').equals(undefined as any).toArray()
    }
    return await db.categories.where('parentId').equals(parentId).toArray()
  },

  // 更新排序
  async updateOrder(updates: { id: string; order: number }[]): Promise<void> {
    await db.transaction('rw', db.categories, async () => {
      for (const { id, order } of updates) {
        await db.categories.update(id, { order })
      }
    })
  },

  // 获取根目录
  async getRoots(): Promise<Category[]> {
    return await this.getChildren(null)
  }
}

// 设置服务
export const settingsService = {
  // 获取设置
  async get(): Promise<AppSettings | null> {
    const result = await db.settings.get('default')
    if (!result) return null
    const { id, ...settings } = result
    return settings as AppSettings
  },

  // 保存设置
  async save(settings: AppSettings): Promise<void> {
    await db.settings.put({ ...settings, id: 'default' })
  },

  // 获取默认设置
  getDefault(): AppSettings {
    return {
      ai: {
        provider: 'openai',
        enabled: false
      },
      scraping: {
        downloadImages: false,
        timeout: 30
      },
      display: {
        viewMode: 'card',
        itemsPerPage: 20,
        theme: 'auto'
      },
      backup: {
        autoBackup: true,
        backupInterval: 24,
        maxBackups: 5
      }
    }
  },

  // 初始化默认设置
  async init(): Promise<void> {
    const existing = await this.get()
    if (!existing) {
      await this.save(this.getDefault())
    }
  }
}

// 数据导出/导入
export const backupService = {
  // 导出所有数据
  async exportData(): Promise<string> {
    const contents = await contentService.getAll()
    const categories = await categoryService.getAll()
    const settings = await settingsService.get()

    const data = {
      version: 1,
      exportDate: new Date().toISOString(),
      contents,
      categories,
      settings
    }

    return JSON.stringify(data, null, 2)
  },

  // 导入数据
  async importData(jsonData: string, merge: boolean = false): Promise<void> {
    try {
      const data = JSON.parse(jsonData)

      if (!merge) {
        // 清空现有数据
        await db.contents.clear()
        await db.categories.clear()
      }

      // 导入目录
      if (data.categories && Array.isArray(data.categories)) {
        for (const category of data.categories) {
          await db.categories.add(category)
        }
      }

      // 导入内容
      if (data.contents && Array.isArray(data.contents)) {
        for (const content of data.contents) {
          await db.contents.add(content)
        }
      }

      // 导入设置
      if (data.settings && !merge) {
        await settingsService.save(data.settings)
      }
    } catch (error) {
      console.error('导入数据失败:', error)
      throw new Error('数据格式不正确')
    }
  },

  // 下载为JSON文件
  downloadJSON(jsonData: string, filename: string = 'info-collector-backup.json'): void {
    const blob = new Blob([jsonData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}

// 初始化数据库
export async function initDatabase(): Promise<void> {
  try {
    await db.open()
    await settingsService.init()
    console.log('数据库初始化成功')
  } catch (error) {
    console.error('数据库初始化失败:', error)
    throw error
  }
}
