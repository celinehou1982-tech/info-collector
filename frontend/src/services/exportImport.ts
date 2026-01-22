import { db, contentService, categoryService } from './storage'

export interface ExportData {
  version: string
  exportDate: string
  contents: any[]
  categories: any[]
}

/**
 * 导出所有数据
 */
export async function exportAllData(): Promise<ExportData> {
  const contents = await contentService.getAll()
  const categories = await categoryService.getAll()

  return {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    contents,
    categories
  }
}

/**
 * 下载导出的数据为 JSON 文件
 */
export function downloadExportData(data: ExportData, filename?: string) {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename || `info-collector-backup-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

/**
 * 导入数据
 * @param data 导入的数据
 * @param mode 导入模式：'merge' 合并（保留现有数据），'replace' 替换（清空现有数据）
 */
export async function importData(data: ExportData, mode: 'merge' | 'replace' = 'merge'): Promise<{
  success: boolean
  message: string
  stats: {
    contentsImported: number
    categoriesImported: number
  }
}> {
  try {
    // 验证数据格式
    if (!data.version || !data.contents || !data.categories) {
      throw new Error('无效的数据格式')
    }

    let contentsImported = 0
    let categoriesImported = 0

    // 如果是替换模式，先清空数据
    if (mode === 'replace') {
      await db.contents.clear()
      await db.categories.clear()
    }

    // 导入目录
    for (const category of data.categories) {
      try {
        if (mode === 'merge') {
          // 检查是否已存在相同 ID 的目录
          const existing = await categoryService.getById(category.id)
          if (existing) {
            // 更新现有目录
            await categoryService.update(category.id, category)
          } else {
            // 添加新目录
            await db.categories.add(category)
          }
        } else {
          // 替换模式直接添加
          await db.categories.add(category)
        }
        categoriesImported++
      } catch (err) {
        console.error('导入目录失败:', category.name, err)
      }
    }

    // 导入内容
    for (const content of data.contents) {
      try {
        if (mode === 'merge') {
          // 检查是否已存在相同 ID 的内容
          const existing = await contentService.getById(content.id)
          if (existing) {
            // 更新现有内容
            await contentService.update(content.id, content)
          } else {
            // 添加新内容
            await db.contents.add(content)
          }
        } else {
          // 替换模式直接添加
          await db.contents.add(content)
        }
        contentsImported++
      } catch (err) {
        console.error('导入内容失败:', content.title, err)
      }
    }

    return {
      success: true,
      message: `成功导入 ${categoriesImported} 个目录和 ${contentsImported} 条内容`,
      stats: {
        contentsImported,
        categoriesImported
      }
    }
  } catch (error) {
    console.error('导入数据失败:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '导入数据失败',
      stats: {
        contentsImported: 0,
        categoriesImported: 0
      }
    }
  }
}

/**
 * 从文件读取导入数据
 */
export function readImportFile(file: File): Promise<ExportData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const data = JSON.parse(text)
        resolve(data)
      } catch (error) {
        reject(new Error('无法解析文件内容'))
      }
    }

    reader.onerror = () => {
      reject(new Error('读取文件失败'))
    }

    reader.readAsText(file)
  })
}
