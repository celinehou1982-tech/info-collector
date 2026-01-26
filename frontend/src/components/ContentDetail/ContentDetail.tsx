import { useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Chip,
  Stack,
  Divider,
  Button,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material'
import {
  Close as CloseIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AutoAwesome as AIIcon,
  PictureAsPdf as PdfIcon,
  Share as ShareIcon,
  Folder as FolderIcon
} from '@mui/icons-material'
import ReactMarkdown from 'react-markdown'
import { useContentStore } from '../../store/contentStore'
import { useCategoryStore } from '../../store/categoryStore'
import { useSettingsStore } from '../../store/settingsStore'
import { generateAISummary } from '../../services/ai'
import { createShare } from '../../services/share'
import ContentEditDialog from './ContentEditDialog'

export default function ContentDetail() {
  const { selectedContent, selectContent, deleteContent, updateContent } = useContentStore()
  const { categories } = useCategoryStore()
  const { settings } = useSettingsStore()
  const [generating, setGenerating] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [error, setError] = useState('')
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState('')

  if (!selectedContent) {
    return null
  }

  const handleClose = () => {
    selectContent(null)
  }

  const handleDelete = async () => {
    if (confirm('确定要删除这条内容吗？')) {
      await deleteContent(selectedContent.id)
    }
  }

  const handleEdit = () => {
    setEditDialogOpen(true)
  }

  const handleSaveEdit = async (updates: Partial<typeof selectedContent>) => {
    await updateContent(selectedContent.id, updates)
  }

  const handleGenerateSummary = async () => {
    // 检查AI配置
    if (!settings.ai.enabled || !settings.ai.apiKey) {
      setError('请先在设置中配置AI服务（需要API Key）')
      return
    }

    setGenerating(true)
    setError('')

    try {
      const result = await generateAISummary({
        content: selectedContent.content,
        title: selectedContent.title,
        provider: settings.ai.provider,
        apiKey: settings.ai.apiKey,
        model: settings.ai.model,
        baseUrl: settings.ai.baseUrl
      })

      if (result.success && result.data) {
        await updateContent(selectedContent.id, {
          summary: result.data.summary,
          keyPoints: result.data.keyPoints
        })
        setError('')
      } else {
        setError(result.error || '生成摘要失败')
      }
    } catch (err) {
      console.error('生成摘要失败:', err)
      const errorMessage = err instanceof Error ? err.message : '生成摘要时发生错误'
      setError(errorMessage)
    } finally {
      setGenerating(false)
    }
  }

  const handleShareToCommunity = async () => {
    setSharing(true)
    setError('')

    try {
      // 获取用户名（可以从设置或localStorage读取，这里默认使用匿名）
      const userName = localStorage.getItem('userName') || '匿名用户'

      const result = await createShare(selectedContent, userName)

      if (result.success && result.data) {
        setShareUrl(result.data.shareUrl)
        setShareDialogOpen(true)
        setError('')
      } else {
        setError(result.error || '分享失败')
      }
    } catch (err) {
      console.error('分享失败:', err)
      const errorMessage = err instanceof Error ? err.message : '分享时发生错误'
      setError(errorMessage)
    } finally {
      setSharing(false)
    }
  }

  const handleCopyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      alert('链接已复制到剪贴板！')
    } catch (err) {
      console.error('复制失败:', err)
      // 降级方案：选中文本让用户手动复制
      const textField = document.querySelector('#share-url-input') as HTMLInputElement
      if (textField) {
        textField.select()
        alert('请手动复制分享链接（Ctrl+C 或 Cmd+C）')
      }
    }
  }

  return (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
      <Paper sx={{ p: 3 }}>
        {/* 标题栏 */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography variant="h5" component="h1" sx={{ flex: 1, mr: 2 }}>
            {selectedContent.title}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton size="small" onClick={handleEdit}>
              <EditIcon />
            </IconButton>
            <IconButton size="small" onClick={handleDelete}>
              <DeleteIcon />
            </IconButton>
            <IconButton size="small" onClick={handleClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        {/* 元信息 */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary">
            创建时间: {new Date(selectedContent.createdAt).toLocaleString('zh-CN')}
          </Typography>
          {selectedContent.sourceUrl && (
            <>
              {' • '}
              <Typography
                variant="caption"
                color="primary"
                component="a"
                href={selectedContent.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                查看原文
              </Typography>
            </>
          )}
          {selectedContent.author && (
            <>
              {' • '}
              <Typography variant="caption" color="text.secondary">
                作者: {selectedContent.author}
              </Typography>
            </>
          )}
        </Box>

        {/* 目录和标签 */}
        {(selectedContent.categoryIds.length > 0 || selectedContent.tags.length > 0) && (
          <Box sx={{ mb: 2 }}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {/* 显示目录名称 */}
              {selectedContent.categoryIds.map((categoryId) => {
                const category = categories.find(c => c.id === categoryId)
                if (!category) return null
                return (
                  <Chip
                    key={categoryId}
                    icon={<FolderIcon />}
                    label={category.name}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                )
              })}
              {/* 显示标签 */}
              {selectedContent.tags.map((tag, index) => (
                <Chip key={index} label={tag} size="small" />
              ))}
            </Stack>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* 推荐到社区按钮 */}
        <Box sx={{ mb: 2 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={sharing ? <CircularProgress size={16} /> : <ShareIcon />}
            onClick={handleShareToCommunity}
            disabled={sharing}
            fullWidth
          >
            {sharing ? '分享中...' : '推荐到社区'}
          </Button>
        </Box>

        {/* 生成摘要按钮 */}
        {!selectedContent.summary && !selectedContent.keyPoints && (
          <Box sx={{ mb: 3 }}>
            <Button
              variant="outlined"
              startIcon={generating ? <CircularProgress size={16} /> : <AIIcon />}
              onClick={handleGenerateSummary}
              disabled={generating}
              fullWidth
            >
              {generating ? '正在生成摘要...' : '生成AI摘要和核心观点'}
            </Button>
          </Box>
        )}

        {/* 摘要 */}
        {selectedContent.summary && (
          <Box sx={{ mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2">
                摘要
              </Typography>
              <Button
                size="small"
                startIcon={generating ? <CircularProgress size={12} /> : <AIIcon />}
                onClick={handleGenerateSummary}
                disabled={generating}
              >
                重新生成
              </Button>
            </Box>
            <Typography variant="body2">{selectedContent.summary}</Typography>
          </Box>
        )}

        {/* 核心观点 */}
        {selectedContent.keyPoints && selectedContent.keyPoints.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              核心观点
            </Typography>
            <Stack spacing={1}>
              {selectedContent.keyPoints.map((point, index) => (
                <Box key={index} sx={{ display: 'flex' }}>
                  <Typography variant="body2" sx={{ mr: 1 }}>
                    {index + 1}.
                  </Typography>
                  <Typography variant="body2">{point}</Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {/* 图片内容 */}
        {selectedContent.type === 'image' && selectedContent.imageData && (
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            <Box
              component="img"
              src={selectedContent.imageData}
              alt={selectedContent.title}
              sx={{
                maxWidth: '100%',
                maxHeight: '70vh',
                height: 'auto',
                borderRadius: 1,
                boxShadow: 2
              }}
            />
            {selectedContent.content && selectedContent.content !== '图片内容' && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'left' }}>
                {selectedContent.content}
              </Typography>
            )}
          </Box>
        )}

        {/* PDF内容 */}
        {selectedContent.type === 'pdf' && (
          <Box sx={{ mb: 3 }}>
            <Paper sx={{ p: 2, bgcolor: 'grey.50', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PdfIcon sx={{ mr: 1, color: 'error.main', fontSize: 32 }} />
                <Box>
                  <Typography variant="subtitle1" fontWeight="medium">
                    {selectedContent.pdfFileName || 'PDF文档'}
                  </Typography>
                  {selectedContent.pdfPageCount && (
                    <Typography variant="caption" color="text.secondary">
                      共 {selectedContent.pdfPageCount} 页
                    </Typography>
                  )}
                </Box>
              </Box>
            </Paper>

            {selectedContent.content && selectedContent.content !== 'PDF文档' && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  提取的文本内容
                </Typography>
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography
                    variant="body2"
                    sx={{
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      maxHeight: '60vh',
                      overflow: 'auto'
                    }}
                  >
                    {selectedContent.content}
                  </Typography>
                </Paper>
              </Box>
            )}
          </Box>
        )}

        {/* 正文内容（非图片和PDF类型） */}
        {selectedContent.type !== 'image' && selectedContent.type !== 'pdf' && (
          <Box
            sx={{
              '& h1, & h2, & h3, & h4, & h5, & h6': { mt: 2, mb: 1 },
              '& p': { mb: 1 },
              '& pre': {
                bgcolor: 'grey.100',
                p: 2,
                borderRadius: 1,
                overflow: 'auto'
              },
              '& code': {
                bgcolor: 'grey.100',
                px: 0.5,
                borderRadius: 0.5
              },
              '& img': { maxWidth: '100%', height: 'auto' },
              '& a': { color: 'primary.main' }
            }}
          >
            <ReactMarkdown>{selectedContent.content}</ReactMarkdown>
          </Box>
        )}
      </Paper>

      {/* 编辑对话框 */}
      <ContentEditDialog
        open={editDialogOpen}
        content={selectedContent}
        onClose={() => setEditDialogOpen(false)}
        onSave={handleSaveEdit}
      />

      {/* 分享链接对话框 */}
      <Dialog
        open={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>分享成功</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            内容已成功分享到社区！复制下方链接分享给其他人：
          </Typography>
          <TextField
            id="share-url-input"
            fullWidth
            value={shareUrl}
            variant="outlined"
            InputProps={{
              readOnly: true,
            }}
            onClick={(e) => {
              const input = e.target as HTMLInputElement
              input.select()
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareDialogOpen(false)}>
            关闭
          </Button>
          <Button onClick={handleCopyShareUrl} variant="contained">
            复制链接
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
