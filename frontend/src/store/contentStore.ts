import { create } from 'zustand'
import { Content } from '../types'
import { contentService } from '../services/storage'
import { useCategoryStore } from './categoryStore'

interface SearchFilters {
  searchText: string
  categoryIds: string[]
  tags: string[]
  dateRange?: {
    start?: Date
    end?: Date
  }
}

interface ContentState {
  contents: Content[]
  filteredContents: Content[]
  selectedContent: Content | null
  selectedIds: string[]
  batchMode: boolean
  loading: boolean
  error: string | null
  filters: SearchFilters

  // Actions
  loadContents: () => Promise<void>
  addContent: (content: Omit<Content, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>
  updateContent: (id: string, updates: Partial<Content>) => Promise<void>
  deleteContent: (id: string) => Promise<void>
  bulkDeleteContents: (ids: string[]) => Promise<void>
  selectContent: (content: Content | null) => void
  refreshContents: () => Promise<void>

  // Batch selection
  toggleBatchMode: () => void
  toggleSelectContent: (id: string) => void
  selectAllContents: () => void
  clearSelection: () => void

  // Search & Filter
  setSearchText: (text: string) => void
  setCategoryFilter: (categoryIds: string[]) => void
  setTagFilter: (tags: string[]) => void
  setDateRangeFilter: (range?: { start?: Date; end?: Date }) => void
  clearFilters: () => void
  applyFilters: () => void
}

export const useContentStore = create<ContentState>((set, get) => ({
  contents: [],
  filteredContents: [],
  selectedContent: null,
  selectedIds: [],
  batchMode: false,
  loading: false,
  error: null,
  filters: {
    searchText: '',
    categoryIds: [],
    tags: [],
    dateRange: undefined
  },

  loadContents: async () => {
    set({ loading: true, error: null })
    try {
      const contents = await contentService.getAll()
      set({ contents, loading: false })
      get().applyFilters()
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  addContent: async (content) => {
    set({ loading: true, error: null })
    try {
      const id = await contentService.create(content)
      await get().refreshContents()
      return id
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
      throw error
    }
  },

  updateContent: async (id, updates) => {
    set({ loading: true, error: null })
    try {
      await contentService.update(id, updates)
      await get().refreshContents()

      // 如果更新的是当前选中的内容，也更新选中状态
      if (get().selectedContent?.id === id) {
        const updated = await contentService.getById(id)
        set({ selectedContent: updated || null })
      }
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  deleteContent: async (id) => {
    set({ loading: true, error: null })
    try {
      await contentService.delete(id)
      await get().refreshContents()

      // 如果删除的是当前选中的内容，清除选中状态
      if (get().selectedContent?.id === id) {
        set({ selectedContent: null })
      }
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  bulkDeleteContents: async (ids) => {
    set({ loading: true, error: null })
    try {
      await contentService.bulkDelete(ids)
      await get().refreshContents()

      // 清除批量选择状态
      set({ selectedIds: [] })

      // 如果当前选中的内容被删除，清除选中状态
      if (get().selectedContent && ids.includes(get().selectedContent!.id)) {
        set({ selectedContent: null })
      }
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
      throw error
    }
  },

  selectContent: (content) => {
    set({ selectedContent: content })
  },

  refreshContents: async () => {
    try {
      const contents = await contentService.getAll()
      set({ contents, loading: false })
      get().applyFilters()
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  // Batch selection methods
  toggleBatchMode: () => {
    const currentMode = get().batchMode
    set({
      batchMode: !currentMode,
      // 退出批量模式时清除选择
      selectedIds: currentMode ? [] : get().selectedIds
    })
  },

  toggleSelectContent: (id: string) => {
    const { selectedIds } = get()
    if (selectedIds.includes(id)) {
      set({ selectedIds: selectedIds.filter(sid => sid !== id) })
    } else {
      set({ selectedIds: [...selectedIds, id] })
    }
  },

  selectAllContents: () => {
    const { filteredContents } = get()
    set({ selectedIds: filteredContents.map(c => c.id) })
  },

  clearSelection: () => {
    set({ selectedIds: [] })
  },

  // Search & Filter methods
  setSearchText: (text: string) => {
    set({ filters: { ...get().filters, searchText: text } })
    get().applyFilters()
  },

  setCategoryFilter: (categoryIds: string[]) => {
    set({ filters: { ...get().filters, categoryIds } })
    get().applyFilters()
  },

  setTagFilter: (tags: string[]) => {
    set({ filters: { ...get().filters, tags } })
    get().applyFilters()
  },

  setDateRangeFilter: (range?: { start?: Date; end?: Date }) => {
    set({ filters: { ...get().filters, dateRange: range } })
    get().applyFilters()
  },

  clearFilters: () => {
    set({
      filters: {
        searchText: '',
        categoryIds: [],
        tags: [],
        dateRange: undefined
      }
    })
    get().applyFilters()
  },

  applyFilters: () => {
    const { contents, filters } = get()
    const { selectedCategoryId } = useCategoryStore.getState()
    let filtered = [...contents]

    // 目录筛选 - 特殊处理
    if (selectedCategoryId === 'uncategorized') {
      // 未分类：没有任何目录ID的内容
      filtered = filtered.filter(content => !content.categoryIds || content.categoryIds.length === 0)
    } else if (selectedCategoryId) {
      // 特定目录
      filtered = filtered.filter(content =>
        content.categoryIds && content.categoryIds.includes(selectedCategoryId)
      )
    }
    // selectedCategoryId === null 时显示全部，不过滤

    // 搜索文本过滤
    if (filters.searchText.trim()) {
      const searchLower = filters.searchText.toLowerCase()
      filtered = filtered.filter(content =>
        content.title.toLowerCase().includes(searchLower) ||
        content.content.toLowerCase().includes(searchLower) ||
        (content.tags && content.tags.some(tag => tag.toLowerCase().includes(searchLower)))
      )
    }

    // 标签过滤
    if (filters.tags.length > 0) {
      filtered = filtered.filter(content =>
        content.tags && filters.tags.every(tag => content.tags.includes(tag))
      )
    }

    // 日期范围过滤
    if (filters.dateRange) {
      const { start, end } = filters.dateRange
      filtered = filtered.filter(content => {
        const contentDate = new Date(content.createdAt)
        if (start && contentDate < start) return false
        if (end && contentDate > end) return false
        return true
      })
    }

    set({ filteredContents: filtered })
  }
}))
