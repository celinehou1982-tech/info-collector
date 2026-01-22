import { useState, useEffect } from 'react'
import {
  Box,
  CssBaseline,
  ThemeProvider,
  createTheme,
  useMediaQuery
} from '@mui/material'
import { zhCN } from '@mui/material/locale'
import MainLayout from './components/Layout/MainLayout'
import { initDatabase } from './services/storage'
import { useSettingsStore } from './store/settingsStore'
import { useCategoryStore } from './store/categoryStore'
import { useContentStore } from './store/contentStore'

function App() {
  const [dbInitialized, setDbInitialized] = useState(false)
  const { settings, loadSettings } = useSettingsStore()
  const { loadCategories } = useCategoryStore()
  const { loadContents } = useContentStore()

  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)')

  // 创建主题
  const theme = createTheme(
    {
      palette: {
        mode: settings?.display?.theme === 'auto'
          ? (prefersDarkMode ? 'dark' : 'light')
          : settings?.display?.theme === 'dark'
          ? 'dark'
          : 'light',
        primary: {
          main: '#1976d2',
        },
        secondary: {
          main: '#dc004e',
        },
      },
      typography: {
        fontFamily: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ].join(','),
      },
    },
    zhCN
  )

  // 初始化数据库
  useEffect(() => {
    const init = async () => {
      try {
        await initDatabase()
        await loadSettings()
        await loadCategories()
        await loadContents()
        setDbInitialized(true)
      } catch (error) {
        console.error('初始化失败:', error)
      }
    }
    init()
  }, [loadSettings, loadCategories, loadContents])

  if (!dbInitialized) {
    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
      >
        加载中...
      </Box>
    )
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <MainLayout />
    </ThemeProvider>
  )
}

export default App
