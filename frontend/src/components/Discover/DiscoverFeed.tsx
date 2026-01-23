import { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Stack,
  IconButton,
  CircularProgress,
  Button,
  Avatar,
  Snackbar,
  Alert
} from '@mui/material'
import {
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Visibility as ViewIcon,
  BookmarkAdd as SaveIcon
} from '@mui/icons-material'
import { getShareFeed, likeShare } from '../../services/share'
import type { SharedContent } from '../../types'
import { useContentStore } from '../../store/contentStore'

export default function DiscoverFeed() {
  const [shares, setShares] = useState<SharedContent[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [total, setTotal] = useState(0)
  const [likedShares, setLikedShares] = useState<Set<string>>(new Set())
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  })

  const { addContent } = useContentStore()

  // 加载推荐内容
  const loadFeed = async (pageNum: number = 1) => {
    try {
      setLoading(true)
      const response = await getShareFeed(pageNum, 20)

      if (response.success && response.data) {
        if (pageNum === 1) {
          setShares(response.data.items)
        } else {
          setShares(prev => [...prev, ...response.data!.items])
        }
        setTotal(response.data.total)
        setHasMore(response.data.hasMore)
      } else {
        setSnackbar({
          open: true,
          message: response.error || '加载失败',
          severity: 'error'
        })
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: '网络错误',
        severity: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFeed(1)
  }, [])

  // 点赞
  const handleLike = async (shareId: string) => {
    try {
      const response = await likeShare(shareId)
      if (response.success && response.data) {
        // 更新UI中的点赞数
        setShares(prev => prev.map(share =>
          share.id === shareId
            ? { ...share, likeCount: response.data!.likeCount }
            : share
        ))
        // 标记为已点赞
        setLikedShares(prev => new Set(prev).add(shareId))
        setSnackbar({
          open: true,
          message: '点赞成功',
          severity: 'success'
        })
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: '点赞失败',
        severity: 'error'
      })
    }
  }

  // 保存到我的库
  const handleSaveToLibrary = async (share: SharedContent) => {
    try {
      await addContent({
        ...share.content,
        // 添加来源标记
        tags: [...(share.content.tags || []), `来自@${share.userName}`]
      })
      setSnackbar({
        open: true,
        message: '已保存到我的库',
        severity: 'success'
      })
    } catch (error) {
      setSnackbar({
        open: true,
        message: '保存失败',
        severity: 'error'
      })
    }
  }

  // 加载更多
  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadFeed(page + 1)
      setPage(page + 1)
    }
  }

  if (loading && shares.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (shares.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          暂无推荐内容
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          快来分享第一个内容吧！
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          推荐广场 ({total})
        </Typography>
      </Box>

      <Stack spacing={2}>
        {shares.map((share) => (
          <Card key={share.id} sx={{ '&:hover': { boxShadow: 3 } }}>
            <CardContent>
              {/* 用户信息 */}
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 1 }}>
                  {share.userName.substring(0, 1)}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2">
                    {share.userName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(share.createdAt).toLocaleDateString('zh-CN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Typography>
                </Box>
              </Box>

              {/* 内容标题 */}
              <Typography variant="h6" component="div" sx={{ mb: 1 }}>
                {share.content.title}
              </Typography>

              {/* 摘要 */}
              {share.content.summary && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {share.content.summary.substring(0, 200)}
                  {share.content.summary.length > 200 ? '...' : ''}
                </Typography>
              )}

              {/* 标签 */}
              {share.content.tags && share.content.tags.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                  {share.content.tags.map((tag, index) => (
                    <Chip key={index} label={tag} size="small" />
                  ))}
                </Box>
              )}

              {/* 操作按钮 */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <IconButton
                    size="small"
                    onClick={() => handleLike(share.id)}
                    color={likedShares.has(share.id) ? 'error' : 'default'}
                    disabled={likedShares.has(share.id)}
                  >
                    {likedShares.has(share.id) ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                  </IconButton>
                  <Typography variant="body2" color="text.secondary">
                    {share.likeCount}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <ViewIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    {share.viewCount}
                  </Typography>
                </Box>

                <Box sx={{ flex: 1 }} />

                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<SaveIcon />}
                  onClick={() => handleSaveToLibrary(share)}
                >
                  保存到我的库
                </Button>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {/* 加载更多按钮 */}
      {hasMore && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Button
            variant="outlined"
            onClick={handleLoadMore}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : '加载更多'}
          </Button>
        </Box>
      )}

      {/* 消息提示 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
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
    </Box>
  )
}
