import { useState, useEffect } from 'react'
import {
  Box,
  CssBaseline,
  ThemeProvider,
  createTheme,
  useMediaQuery,
  CircularProgress,
  Typography
} from '@mui/material'
import { zhCN } from '@mui/material/locale'
import MainLayout from './components/Layout/MainLayout'
import { initDatabase } from './services/storage'
import { useSettingsStore } from './store/settingsStore'
import { useCategoryStore } from './store/categoryStore'
import { useContentStore } from './store/contentStore'
import { trackPageView, trackSessionEnd } from './services/analytics'

function App() {
  const [dbInitialized, setDbInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
        console.log('开始初始化...')
        await initDatabase()
        console.log('数据库初始化成功')
        await loadSettings()
        console.log('设置加载成功')
        await loadCategories()
        console.log('目录加载成功')
        await loadContents()
        console.log('内容加载成功')
        setDbInitialized(true)
      } catch (err) {
        console.error('初始化失败:', err)
        setError(err instanceof Error ? err.message : '未知错误')
      }
    }
    init()
  }, [loadSettings, loadCategories, loadContents])

  // 追踪页面访问和停留时长
  useEffect(() => {
    // 记录页面访问
    trackPageView()

    // 记录会话开始时间
    const sessionStart = Date.now()

    // 页面关闭前记录停留时长
    const handleBeforeUnload = () => {
      const duration = Math.floor((Date.now() - sessionStart) / 1000) // 转换为秒
      trackSessionEnd(duration)
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  if (error) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        p={3}
      >
        <Typography variant="h5" color="error" gutterBottom>
          初始化失败
        </Typography>
        <Typography variant="body1">{error}</Typography>
      </Box>
    )
  }

  if (!dbInitialized) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        gap={2}
      >
        <CircularProgress />
        <Typography>加载中...</Typography>
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
