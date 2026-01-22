import { create } from 'zustand'
import { AppSettings } from '../types'
import { settingsService } from '../services/storage'

interface SettingsState {
  settings: AppSettings | null
  loading: boolean
  error: string | null

  // Actions
  loadSettings: () => Promise<void>
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>
  resetSettings: () => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  loading: false,
  error: null,

  loadSettings: async () => {
    set({ loading: true, error: null })
    try {
      const settings = await settingsService.get()
      set({ settings: settings || settingsService.getDefault(), loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  updateSettings: async (updates) => {
    set({ loading: true, error: null })
    try {
      const current = get().settings || settingsService.getDefault()
      const newSettings = {
        ...current,
        ...updates,
        // 深度合并嵌套对象
        ai: { ...current.ai, ...(updates.ai || {}) },
        scraping: { ...current.scraping, ...(updates.scraping || {}) },
        display: { ...current.display, ...(updates.display || {}) },
        backup: { ...current.backup, ...(updates.backup || {}) }
      }
      await settingsService.save(newSettings)
      set({ settings: newSettings, loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  resetSettings: async () => {
    set({ loading: true, error: null })
    try {
      const defaultSettings = settingsService.getDefault()
      await settingsService.save(defaultSettings)
      set({ settings: defaultSettings, loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  }
}))
