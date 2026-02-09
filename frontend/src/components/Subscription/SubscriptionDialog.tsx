import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  IconButton,
  Box,
  Typography,
  Chip,
  SelectChangeEvent,
  Alert,
  CircularProgress,
  Snackbar,
  TextField,
  ListItemText,
  Divider,
  Paper
} from '@mui/material'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
  Close as CloseIcon
} from '@mui/icons-material'
import { Subscription, SubscriptionSource } from '../../types'
import { subscriptionService } from '../../services/subscription'
import { fetchSubscriptionContent, fetchAllSubscriptions } from '../../services/rssFetcher'
import { HN_POPULAR_BLOGS } from '../../data/hnPopularBlogs'

interface SubscriptionDialogProps {
  open: boolean
  onClose: () => void
}

// 预设的公司信息（包含 HN 热门博客）
const PRESET_COMPANIES = [
  {
    name: 'AK推荐',
    rss: 'BUNDLE:HN_POPULAR_BLOGS', // 特殊标识，表示这是一个批量订阅
    keywords: ['tech', 'blog', 'programming', 'ai', 'startup']
  },
  {
    name: 'HackerNews',
    rss: 'https://hnrss.org/frontpage',
    keywords: ['hackernews', 'technology', 'startup']
  },
  {
    name: 'TechCrunch',
    rss: 'https://techcrunch.com/feed/',
    keywords: ['techcrunch', 'tech', 'startup']
  },
  {
    name: 'Wired',
    rss: 'https://www.wired.com/feed/rss',
    keywords: ['wired', 'technology', 'science']
  },
  // Add all HN popular blogs
  ...HN_POPULAR_BLOGS
]

export default function SubscriptionDialog({ open, onClose }: SubscriptionDialogProps) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [selectedCompany, setSelectedCompany] = useState('')
  const [frequency, setFrequency] = useState<'hourly' | 'daily' | 'weekly'>('daily')
  const [loading, setLoading] = useState(false)
  const [fetchingId, setFetchingId] = useState<string | null>(null)
  const [fetchingAll, setFetchingAll] = useState(false)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  })

  // 自定义添加
  const [customMode, setCustomMode] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customRssUrl, setCustomRssUrl] = useState('')

  // 编辑订阅
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null)
  const [editName, setEditName] = useState('')
  const [editCompany, setEditCompany] = useState('')
  const [editSources, setEditSources] = useState<SubscriptionSource[]>([])
  const [editKeywords, setEditKeywords] = useState<string[]>([])
  const [newSourceUrl, setNewSourceUrl] = useState('')
  const [newKeyword, setNewKeyword] = useState('')

  // 加载订阅列表
  const loadSubscriptions = async () => {
    setLoading(true)
    try {
      const subs = await subscriptionService.getAllSubscriptions()
      setSubscriptions(subs)
    } catch (error) {
      console.error('加载订阅失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 组件打开时加载订阅
  useEffect(() => {
    if (open) {
      loadSubscriptions()
    }
  }, [open])

  const handleAddSubscription = async () => {
    let name: string
    let company: string
    let rssUrl: string
    let isBundleSubscription = false

    if (customMode) {
      // 自定义模式
      if (!customName.trim() || !customRssUrl.trim()) {
        setSnackbar({
          open: true,
          message: '请填写公司名称和RSS地址',
          severity: 'error'
        })
        return
      }
      name = `${customName.trim()} News`
      company = customName.trim()
      rssUrl = customRssUrl.trim()
    } else {
      // 预设模式
      if (!selectedCompany) return

      const presetCompany = PRESET_COMPANIES.find(c => c.name === selectedCompany)
      if (!presetCompany) return

      name = `${presetCompany.name}`
      company = presetCompany.name
      rssUrl = presetCompany.rss

      // 检查是否是批量订阅（AK推荐）
      isBundleSubscription = rssUrl.startsWith('BUNDLE:')
    }

    try {
      // 检查是否已存在同名公司的订阅
      const existingSubscription = subscriptions.find(sub => sub.company === company)

      if (existingSubscription) {
        setSnackbar({
          open: true,
          message: `${company} 订阅已存在`,
          severity: 'warning'
        })
        return
      }

      // 处理批量订阅（AK推荐）
      if (isBundleSubscription) {
        const bundleSources = HN_POPULAR_BLOGS.map(blog => ({
          type: 'rss' as const,
          url: blog.rss,
          enabled: true
        }))

        await subscriptionService.createSubscription({
          name,
          company,
          sources: bundleSources,
          keywords: ['tech', 'blog', 'programming', 'ai', 'startup'],
          enabled: true,
          frequency
        })

        setSnackbar({
          open: true,
          message: `已添加 ${company} 订阅（包含 ${HN_POPULAR_BLOGS.length} 个优质技术博客）`,
          severity: 'success'
        })
      } else {
        // 普通单源订阅
        await subscriptionService.createSubscription({
          name,
          company,
          sources: rssUrl ? [{
            type: 'rss' as const,
            url: rssUrl,
            enabled: true
          }] : [],
          enabled: true,
          frequency
        })

        setSnackbar({
          open: true,
          message: `已添加 ${company} 订阅`,
          severity: 'success'
        })
      }

      // 重置表单
      setSelectedCompany('')
      setCustomName('')
      setCustomRssUrl('')
      await loadSubscriptions()
    } catch (error) {
      console.error('添加订阅失败:', error)
      setSnackbar({
        open: true,
        message: '添加订阅失败',
        severity: 'error'
      })
    }
  }

  const handleDeleteSubscription = async (id: string) => {
    try {
      await subscriptionService.deleteSubscription(id)
      setSnackbar({
        open: true,
        message: '已删除订阅',
        severity: 'success'
      })
      await loadSubscriptions()
    } catch (error) {
      console.error('删除订阅失败:', error)
      setSnackbar({
        open: true,
        message: '删除订阅失败',
        severity: 'error'
      })
    }
  }

  const handleToggleSubscription = async (id: string, enabled: boolean) => {
    try {
      await subscriptionService.updateSubscription(id, { enabled: !enabled })
      await loadSubscriptions()
    } catch (error) {
      console.error('更新订阅失败:', error)
    }
  }

  const handleRunNow = async (sub: Subscription) => {
    setFetchingId(sub.id)
    try {
      const result = await fetchSubscriptionContent(sub)

      if (result.success) {
        setSnackbar({
          open: true,
          message: `抓取成功！新增 ${result.newItems} 条内容`,
          severity: 'success'
        })
        await loadSubscriptions()
      } else {
        setSnackbar({
          open: true,
          message: result.error || '抓取失败',
          severity: 'error'
        })
      }
    } catch (error) {
      console.error('抓取失败:', error)
      setSnackbar({
        open: true,
        message: '抓取失败',
        severity: 'error'
      })
    } finally {
      setFetchingId(null)
    }
  }

  const handleRefreshAll = async () => {
    setFetchingAll(true)
    try {
      const result = await fetchAllSubscriptions()

      setSnackbar({
        open: true,
        message: `刷新完成！共处理 ${result.total} 个订阅，成功 ${result.success} 个，新增 ${result.newItems} 条内容`,
        severity: result.failed > 0 ? 'error' : 'success'
      })
      await loadSubscriptions()
    } catch (error) {
      console.error('批量刷新失败:', error)
      setSnackbar({
        open: true,
        message: '批量刷新失败',
        severity: 'error'
      })
    } finally {
      setFetchingAll(false)
    }
  }

  const handleEditSubscription = (sub: Subscription) => {
    setEditingSubscription(sub)
    setEditName(sub.name)
    setEditCompany(sub.company)
    setEditSources([...sub.sources])
    setEditKeywords(sub.keywords || [])
    setNewSourceUrl('')
    setNewKeyword('')
    setEditDialogOpen(true)
  }

  const handleAddSource = () => {
    if (!newSourceUrl.trim()) {
      setSnackbar({
        open: true,
        message: '请输入RSS地址',
        severity: 'error'
      })
      return
    }

    setEditSources([
      ...editSources,
      {
        type: 'rss' as const,
        url: newSourceUrl.trim(),
        enabled: true
      }
    ])
    setNewSourceUrl('')
  }

  const handleRemoveSource = (index: number) => {
    setEditSources(editSources.filter((_, i) => i !== index))
  }

  const handleToggleSource = (index: number) => {
    const updated = [...editSources]
    updated[index] = { ...updated[index], enabled: !updated[index].enabled }
    setEditSources(updated)
  }

  // 关键词管理
  const handleAddKeyword = () => {
    if (!newKeyword.trim()) {
      setSnackbar({
        open: true,
        message: '请输入关键词',
        severity: 'error'
      })
      return
    }

    if (editKeywords.includes(newKeyword.trim())) {
      setSnackbar({
        open: true,
        message: '关键词已存在',
        severity: 'warning'
      })
      return
    }

    setEditKeywords([...editKeywords, newKeyword.trim()])
    setNewKeyword('')
  }

  const handleRemoveKeyword = (keyword: string) => {
    setEditKeywords(editKeywords.filter(k => k !== keyword))
  }

  const handleSaveEdit = async () => {
    if (!editingSubscription) return

    if (!editName.trim()) {
      setSnackbar({
        open: true,
        message: '请填写订阅名称',
        severity: 'error'
      })
      return
    }

    if (editSources.length === 0) {
      setSnackbar({
        open: true,
        message: '至少需要一个RSS源',
        severity: 'error'
      })
      return
    }

    try {
      await subscriptionService.updateSubscription(editingSubscription.id, {
        name: editName,
        company: editCompany,
        sources: editSources,
        keywords: editKeywords.length > 0 ? editKeywords : undefined
      })

      setSnackbar({
        open: true,
        message: '订阅已更新',
        severity: 'success'
      })

      setEditDialogOpen(false)
      setEditingSubscription(null)
      await loadSubscriptions()
    } catch (error) {
      console.error('更新订阅失败:', error)
      setSnackbar({
        open: true,
        message: '更新订阅失败',
        severity: 'error'
      })
    }
  }

  const handleCancelEdit = () => {
    setEditDialogOpen(false)
    setEditingSubscription(null)
    setEditName('')
    setEditCompany('')
    setEditSources([])
    setEditKeywords([])
    setNewSourceUrl('')
    setNewKeyword('')
  }

  const formatLastFetchTime = (date: Date | undefined) => {
    if (!date) return '从未抓取'

    const now = Date.now()
    const lastFetch = new Date(date).getTime()
    const diff = now - lastFetch

    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (days > 0) return `${days}天前`
    if (hours > 0) return `${hours}小时前`
    if (minutes > 0) return `${minutes}分钟前`
    return '刚刚'
  }

  if (!open) {
    return null
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>订阅管理 - 自动信息采集</span>
            <Button
              variant="outlined"
              size="small"
              startIcon={fetchingAll ? <CircularProgress size={16} /> : <RefreshIcon />}
              onClick={handleRefreshAll}
              disabled={fetchingAll || subscriptions.length === 0}
            >
              全部刷新
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            配置自动抓取公司动态和新闻，系统会定期检查并自动添加新内容
          </Typography>

          {/* 添加订阅 */}
          <Box sx={{ mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle2">
                添加新订阅
              </Typography>
              <Button
                size="small"
                onClick={() => {
                  setCustomMode(!customMode)
                  setSelectedCompany('')
                  setCustomName('')
                  setCustomRssUrl('')
                }}
              >
                {customMode ? '使用预设公司' : '自定义添加'}
              </Button>
            </Box>

            {customMode ? (
              // 自定义添加模式
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="公司名称"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="例如：Google、Microsoft"
                  fullWidth
                  size="small"
                />
                <TextField
                  label="RSS地址"
                  value={customRssUrl}
                  onChange={(e) => setCustomRssUrl(e.target.value)}
                  placeholder="例如：https://example.com/feed"
                  fullWidth
                  size="small"
                />
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <FormControl sx={{ flex: 1 }}>
                    <InputLabel>抓取频率</InputLabel>
                    <Select
                      value={frequency}
                      label="抓取频率"
                      size="small"
                      onChange={(e: SelectChangeEvent<'hourly' | 'daily' | 'weekly'>) =>
                        setFrequency(e.target.value as 'hourly' | 'daily' | 'weekly')
                      }
                    >
                      <MenuItem value="hourly">每小时</MenuItem>
                      <MenuItem value="daily">每天</MenuItem>
                      <MenuItem value="weekly">每周</MenuItem>
                    </Select>
                  </FormControl>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleAddSubscription}
                    disabled={!customName.trim() || !customRssUrl.trim()}
                  >
                    添加
                  </Button>
                </Box>
              </Box>
            ) : (
              // 预设公司模式
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
                <FormControl sx={{ flex: 1 }}>
                  <InputLabel>选择公司</InputLabel>
                  <Select
                    value={selectedCompany}
                    label="选择公司"
                    onChange={(e: SelectChangeEvent) => setSelectedCompany(e.target.value)}
                  >
                    {PRESET_COMPANIES.map(company => (
                      <MenuItem key={company.name} value={company.name}>
                        {company.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl sx={{ width: 150 }}>
                  <InputLabel>抓取频率</InputLabel>
                  <Select
                    value={frequency}
                    label="抓取频率"
                    onChange={(e: SelectChangeEvent<'hourly' | 'daily' | 'weekly'>) =>
                      setFrequency(e.target.value as 'hourly' | 'daily' | 'weekly')
                    }
                  >
                    <MenuItem value="hourly">每小时</MenuItem>
                    <MenuItem value="daily">每天</MenuItem>
                    <MenuItem value="weekly">每周</MenuItem>
                  </Select>
                </FormControl>

                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleAddSubscription}
                  disabled={!selectedCompany}
                >
                  添加
                </Button>
              </Box>
            )}
          </Box>

          {/* 订阅列表 */}
          <Typography variant="subtitle2" gutterBottom>
            当前订阅 ({subscriptions.length})
          </Typography>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : subscriptions.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
              <Typography variant="body2">
                还没有订阅，请添加要关注的公司
              </Typography>
            </Box>
          ) : (
            <List>
              {subscriptions.map(sub => (
                <ListItem
                  key={sub.id}
                  sx={{
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 1,
                    bgcolor: sub.enabled ? 'background.paper' : 'action.disabledBackground',
                    display: 'block',
                    p: 2
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="subtitle1">
                          {sub.name}
                        </Typography>
                        {sub.enabled ? (
                          <Chip label="启用" color="success" size="small" />
                        ) : (
                          <Chip label="已禁用" size="small" />
                        )}
                        <Chip
                          label={
                            sub.frequency === 'hourly' ? '每小时' :
                            sub.frequency === 'daily' ? '每天' : '每周'
                          }
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                      <Typography variant="caption" display="block" color="text.secondary">
                        信息源: {sub.sources.filter(s => s.enabled).length} 个RSS源
                      </Typography>
                      <Typography variant="caption" display="block" color="text.secondary">
                        最后抓取: {formatLastFetchTime(sub.lastFetchedAt)}
                      </Typography>
                      {sub.keywords && sub.keywords.length > 0 && (
                        <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
                            关键词:
                          </Typography>
                          {sub.keywords.map((keyword, idx) => (
                            <Chip
                              key={idx}
                              label={keyword}
                              size="small"
                              variant="outlined"
                              color="primary"
                              sx={{ height: 20, fontSize: '0.7rem' }}
                            />
                          ))}
                        </Box>
                      )}
                      <FormControlLabel
                        control={
                          <Switch
                            checked={sub.enabled}
                            onChange={() => handleToggleSubscription(sub.id, sub.enabled)}
                            size="small"
                          />
                        }
                        label="启用自动抓取"
                        sx={{ mt: 1 }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton
                        onClick={() => handleEditSubscription(sub)}
                        title="编辑订阅"
                        size="small"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => handleRunNow(sub)}
                        disabled={!sub.enabled || fetchingId === sub.id}
                        title="立即抓取"
                        size="small"
                      >
                        {fetchingId === sub.id ? (
                          <CircularProgress size={20} />
                        ) : (
                          <RefreshIcon />
                        )}
                      </IconButton>
                      <IconButton
                        onClick={() => handleDeleteSubscription(sub.id)}
                        title="删除订阅"
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* 编辑订阅对话框 */}
      <Dialog
        open={editDialogOpen}
        onClose={handleCancelEdit}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>编辑订阅</span>
            <IconButton onClick={handleCancelEdit} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              label="订阅名称"
              fullWidth
              variant="outlined"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              sx={{ mb: 2 }}
            />

            <TextField
              label="公司名称"
              fullWidth
              variant="outlined"
              value={editCompany}
              onChange={(e) => setEditCompany(e.target.value)}
              sx={{ mb: 3 }}
            />

            <Divider sx={{ mb: 2 }} />

            <Typography variant="subtitle2" gutterBottom>
              RSS信息源 ({editSources.length})
            </Typography>

            {editSources.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 2, color: 'text.secondary' }}>
                <Typography variant="body2">
                  还没有RSS源，请添加
                </Typography>
              </Box>
            ) : (
              <List sx={{ mb: 2 }}>
                {editSources.map((source, index) => (
                  <Paper key={index} sx={{ mb: 1, p: 2 }} variant="outlined">
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ flex: 1, mr: 2 }}>
                        <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                          {source.url}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                          <Chip
                            label={source.enabled ? '启用' : '已禁用'}
                            size="small"
                            color={source.enabled ? 'success' : 'default'}
                          />
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Switch
                          checked={source.enabled}
                          onChange={() => handleToggleSource(index)}
                          size="small"
                        />
                        <IconButton
                          onClick={() => handleRemoveSource(index)}
                          size="small"
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Box>
                  </Paper>
                ))}
              </List>
            )}

            <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
              <TextField
                label="新RSS源地址"
                fullWidth
                variant="outlined"
                value={newSourceUrl}
                onChange={(e) => setNewSourceUrl(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddSource()}
                placeholder="https://example.com/feed"
                size="small"
              />
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddSource}
                disabled={!newSourceUrl.trim()}
                size="small"
                sx={{ height: 40, minWidth: 80 }}
              >
                添加
              </Button>
            </Box>

            <Divider sx={{ mb: 2 }} />

            {/* 关键词过滤 */}
            <Typography variant="subtitle2" gutterBottom>
              关键词过滤（可选）
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
              添加关键词后，只会保存包含这些关键词的RSS内容。不添加关键词则保存所有内容。
            </Typography>

            {editKeywords.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {editKeywords.map((keyword, index) => (
                  <Chip
                    key={index}
                    label={keyword}
                    onDelete={() => handleRemoveKeyword(keyword)}
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                label="添加关键词"
                fullWidth
                variant="outlined"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
                placeholder="例如：AI, 人工智能, ChatGPT"
                size="small"
              />
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleAddKeyword}
                disabled={!newKeyword.trim()}
                size="small"
                sx={{ height: 40, minWidth: 80 }}
              >
                添加
              </Button>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelEdit}>取消</Button>
          <Button onClick={handleSaveEdit} variant="contained">
            保存更改
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  )
}
