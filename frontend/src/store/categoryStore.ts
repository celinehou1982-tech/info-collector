import { create } from 'zustand'
import { Category } from '../types'
import { categoryService } from '../services/storage'

interface CategoryState {
  categories: Category[]
  selectedCategoryId: string | null
  loading: boolean
  error: string | null

  // Actions
  loadCategories: () => Promise<void>
  addCategory: (category: Omit<Category, 'id' | 'createdAt' | 'order'>) => Promise<string>
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  selectCategory: (id: string | null) => void
  refreshCategories: () => Promise<void>
  reorderCategories: (updates: { id: string; order: number }[]) => Promise<void>
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],
  selectedCategoryId: null,
  loading: false,
  error: null,

  loadCategories: async () => {
    set({ loading: true, error: null })
    try {
      const categories = await categoryService.getAll()
      set({ categories, loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  addCategory: async (category) => {
    set({ loading: true, error: null })
    try {
      const id = await categoryService.create(category)
      await get().refreshCategories()
      return id
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
      throw error
    }
  },

  updateCategory: async (id, updates) => {
    set({ loading: true, error: null })
    try {
      await categoryService.update(id, updates)
      await get().refreshCategories()
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  deleteCategory: async (id) => {
    set({ loading: true, error: null })
    try {
      await categoryService.delete(id)
      await get().refreshCategories()

      // 如果删除的是当前选中的目录，清除选中状态
      if (get().selectedCategoryId === id) {
        set({ selectedCategoryId: null })
      }
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  selectCategory: (id) => {
    set({ selectedCategoryId: id })
  },

  refreshCategories: async () => {
    try {
      const categories = await categoryService.getAll()
      set({ categories, loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  reorderCategories: async (updates) => {
    set({ loading: true, error: null })
    try {
      await categoryService.updateOrder(updates)
      await get().refreshCategories()
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  }
}))
