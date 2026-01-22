import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Chip
} from '@mui/material'
import { getAnalyticsSummary } from '../../services/analytics'

interface UserSession {
  ip: string
  userAgent: string
  firstVisit: Date
  lastVisit: Date
  totalDuration: number
  visitCount: number
  apiCallCount: number
}

interface AnalyticsSummary {
  totalUsers: number
  totalVisits: number
  totalApiCalls: number
  averageDuration: number
  users: UserSession[]
}

interface AdminPanelProps {
  open: boolean
  onClose: () => void
}

export default function AdminPanel({ open, onClose }: AdminPanelProps) {
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      loadAnalytics()
    }
  }, [open])

  const loadAnalytics = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await getAnalyticsSummary()
      if (response.success) {
        setSummary(response.data)
      } else {
        setError(response.error || '加载失败')
      }
    } catch (err) {
      setError('加载统计数据失败')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}秒`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟`
    return `${Math.floor(seconds / 3600)}小时${Math.floor((seconds % 3600) / 60)}分钟`
  }

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleString('zh-CN')
  }

  if (!open) return null

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">管理员面板 - 用户统计</Typography>
          <Button variant="outlined" size="small" onClick={loadAnalytics} disabled={loading}>
            刷新
          </Button>
        </Box>
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : summary ? (
          <>
            {/* 总览统计 */}
            <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Paper sx={{ p: 2, flex: 1, minWidth: 150 }}>
                <Typography variant="caption" color="text.secondary">
                  总用户数
                </Typography>
                <Typography variant="h4">{summary.totalUsers}</Typography>
              </Paper>
              <Paper sx={{ p: 2, flex: 1, minWidth: 150 }}>
                <Typography variant="caption" color="text.secondary">
                  总访问次数
                </Typography>
                <Typography variant="h4">{summary.totalVisits}</Typography>
              </Paper>
              <Paper sx={{ p: 2, flex: 1, minWidth: 150 }}>
                <Typography variant="caption" color="text.secondary">
                  总API调用
                </Typography>
                <Typography variant="h4">{summary.totalApiCalls}</Typography>
              </Paper>
              <Paper sx={{ p: 2, flex: 1, minWidth: 150 }}>
                <Typography variant="caption" color="text.secondary">
                  平均停留时长
                </Typography>
                <Typography variant="h4">{formatDuration(Math.floor(summary.averageDuration))}</Typography>
              </Paper>
            </Box>

            {/* 用户详细列表 */}
            <Typography variant="h6" gutterBottom>
              用户详情
            </Typography>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>IP地址</TableCell>
                    <TableCell>首次访问</TableCell>
                    <TableCell>最后访问</TableCell>
                    <TableCell align="right">访问次数</TableCell>
                    <TableCell align="right">停留时长</TableCell>
                    <TableCell align="right">API调用</TableCell>
                    <TableCell>状态</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {summary.users.map((user) => (
                    <TableRow key={user.ip}>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {user.ip}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{formatDate(user.firstVisit)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{formatDate(user.lastVisit)}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Chip label={user.visitCount} size="small" color="primary" />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">{formatDuration(user.totalDuration)}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Chip label={user.apiCallCount} size="small" color="secondary" />
                      </TableCell>
                      <TableCell>
                        {Date.now() - new Date(user.lastVisit).getTime() < 5 * 60 * 1000 ? (
                          <Chip label="在线" color="success" size="small" />
                        ) : (
                          <Chip label="离线" size="small" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {summary.users.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                <Typography variant="body2">还没有用户访问数据</Typography>
              </Box>
            )}
          </>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>关闭</Button>
      </DialogActions>
    </Dialog>
  )
}
