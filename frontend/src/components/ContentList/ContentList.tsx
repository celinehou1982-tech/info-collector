import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Chip,
  Stack,
  IconButton,
  Grid,
  Checkbox,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Toolbar,
  Snackbar,
  Alert
} from '@mui/material'
import {
  MoreVert as MoreIcon,
  PictureAsPdf as PdfIcon,
  Delete as DeleteIcon,
  SelectAll as SelectAllIcon,
  Deselect as DeselectIcon
} from '@mui/icons-material'
import { useContentStore } from '../../store/contentStore'
import { useCategoryStore } from '../../store/categoryStore'
import { useState } from 'react'

export default function ContentList() {
  const {
    filteredContents,
    selectContent,
    selectedIds,
    batchMode,
    toggleBatchMode,
    toggleSelectContent,
    selectAllContents,
    clearSelection,
    bulkDeleteContents
  } = useContentStore()
  const { selectedCategoryId, categories } = useCategoryStore()

  // 本地状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  })

  // 如果选中了目录，进一步过滤
  const displayContents = selectedCategoryId
    ? filteredContents.filter(c => c.categoryIds && c.categoryIds.includes(selectedCategoryId))
    : filteredContents

  // 分离图片类型和非图片类型的内容
  const imageContents = displayContents.filter(c => c.type === 'image')
  const nonImageContents = displayContents.filter(c => c.type !== 'image')

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId)
    return category?.name || '未分类'
  }

  // 批量删除处理
  const handleBulkDeleteClick = () => {
    if (selectedIds.length === 0) return
    setDeleteDialogOpen(true)
  }

  const handleBulkDeleteConfirm = async () => {
    try {
      await bulkDeleteContents(selectedIds)
      setSnackbar({
        open: true,
        message: `成功删除 ${selectedIds.length} 条内容`,
        severity: 'success'
      })
      setDeleteDialogOpen(false)
    } catch (error) {
      setSnackbar({
        open: true,
        message: '删除失败',
        severity: 'error'
      })
    }
  }

  const handleBulkDeleteCancel = () => {
    setDeleteDialogOpen(false)
  }

  // 处理卡片点击
  const handleCardClick = (content: typeof displayContents[0], event: React.MouseEvent) => {
    // 如果点击的是 checkbox，不触发卡片选择
    if ((event.target as HTMLElement).closest('.batch-checkbox')) {
      return
    }
    selectContent(content)
  }

  // 处理checkbox点击
  const handleCheckboxClick = (id: string, event: React.MouseEvent) => {
    event.stopPropagation()
    toggleSelectContent(id)
  }

  // 处理拖拽开始
  const handleDragStart = (content: typeof displayContents[0], event: React.DragEvent) => {
    // 设置拖拽数据
    event.dataTransfer.effectAllowed = 'copy'
    event.dataTransfer.setData('application/content-id', content.id)
    event.dataTransfer.setData('text/plain', content.title)

    // 如果是批量模式且有选中内容，拖拽所有选中的内容
    if (batchMode && selectedIds.length > 0 && selectedIds.includes(content.id)) {
      event.dataTransfer.setData('application/content-ids', JSON.stringify(selectedIds))
    }
  }

  if (displayContents.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          {selectedCategoryId ? '该目录下没有匹配的内容' : '没有找到匹配的内容'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          尝试调整搜索条件或添加新内容
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 2 }}>
      {/* 批量操作工具栏 - 固定在顶部 */}
      {batchMode && selectedIds.length > 0 ? (
        <Toolbar
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 1000,
            mb: 2,
            bgcolor: 'primary.light',
            color: 'primary.contrastText',
            borderRadius: 1,
            boxShadow: 2
          }}
        >
          <Typography variant="subtitle1" sx={{ flex: 1 }}>
            已选择 {selectedIds.length} 项
          </Typography>
          <Button
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleBulkDeleteClick}
            sx={{ mr: 1 }}
          >
            删除选中
          </Button>
          <Button
            variant="outlined"
            startIcon={<DeselectIcon />}
            onClick={clearSelection}
            sx={{ bgcolor: 'white', mr: 1 }}
          >
            取消选择
          </Button>
          <Button
            variant="outlined"
            onClick={toggleBatchMode}
            sx={{ bgcolor: 'white' }}
          >
            退出批量选择
          </Button>
        </Toolbar>
      ) : (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            {selectedCategoryId
              ? `${getCategoryName(selectedCategoryId)} (${displayContents.length})`
              : `所有内容 (${displayContents.length})`}
          </Typography>
          {displayContents.length > 0 && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              {batchMode && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<SelectAllIcon />}
                  onClick={selectAllContents}
                >
                  全选
                </Button>
              )}
              <Button
                variant={batchMode ? "contained" : "outlined"}
                size="small"
                onClick={toggleBatchMode}
                color={batchMode ? "primary" : "inherit"}
              >
                {batchMode ? '退出批量选择' : '批量选择'}
              </Button>
            </Box>
          )}
        </Box>
      )}

      {/* 图片类型：横向网格排列 */}
      {imageContents.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 2 }}>
          {imageContents.map((content) => (
            <Grid item key={content.id}>
              <Card
                sx={{
                  cursor: 'grab',
                  '&:hover': { boxShadow: 3 },
                  '&:active': { cursor: 'grabbing' },
                  position: 'relative',
                  width: 200,
                  height: 200,
                  border: selectedIds.includes(content.id) ? '3px solid' : 'none',
                  borderColor: 'primary.main'
                }}
                onClick={(e) => handleCardClick(content, e)}
                draggable
                onDragStart={(e) => handleDragStart(content, e)}
              >
                {/* Checkbox - 只在批量模式下显示 */}
                {batchMode && (
                  <Checkbox
                    className="batch-checkbox"
                    checked={selectedIds.includes(content.id)}
                    onClick={(e) => handleCheckboxClick(content.id, e)}
                    sx={{
                      position: 'absolute',
                      top: 8,
                      left: 8,
                      bgcolor: 'rgba(255, 255, 255, 0.9)',
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 1)'
                      },
                      zIndex: 1
                    }}
                  />
                )}
                {content.imageData && (
                  <>
                    <CardMedia
                      component="img"
                      sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                      image={content.imageData}
                      alt={content.title}
                    />
                    {/* 标题和日期覆盖层 */}
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        bgcolor: 'rgba(0, 0, 0, 0.6)',
                        color: 'white',
                        p: 1
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 'bold',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {content.title}
                      </Typography>
                      <Typography variant="caption">
                        {new Date(content.createdAt).toLocaleDateString('zh-CN')}
                      </Typography>
                    </Box>
                  </>
                )}
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* 非图片类型：垂直堆叠排列 */}
      {nonImageContents.length > 0 && (
        <Stack spacing={2}>
          {nonImageContents.map((content) => (
            <Card
              key={content.id}
              sx={{
                cursor: 'grab',
                '&:hover': { boxShadow: 3 },
                '&:active': { cursor: 'grabbing' },
                border: selectedIds.includes(content.id) ? '2px solid' : 'none',
                borderColor: 'primary.main'
              }}
              onClick={(e) => handleCardClick(content, e)}
              draggable
              onDragStart={(e) => handleDragStart(content, e)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                    {/* Checkbox - 只在批量模式下显示 */}
                    {batchMode && (
                      <Checkbox
                        className="batch-checkbox"
                        checked={selectedIds.includes(content.id)}
                        onClick={(e) => handleCheckboxClick(content.id, e)}
                        sx={{ mr: 1 }}
                      />
                    )}
                    {content.type === 'pdf' && (
                      <PdfIcon sx={{ mr: 1, color: 'error.main' }} />
                    )}
                    <Typography variant="h6" component="div">
                      {content.title}
                    </Typography>
                  </Box>
                  <IconButton size="small">
                    <MoreIcon />
                  </IconButton>
                </Box>

                {content.summary && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {content.summary.substring(0, 150)}
                    {content.summary.length > 150 ? '...' : ''}
                  </Typography>
                )}

                {!content.summary && content.content && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {content.content.substring(0, 150)}
                    {content.content.length > 150 ? '...' : ''}
                  </Typography>
                )}

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                  {content.tags.map((tag, index) => (
                    <Chip key={index} label={tag} size="small" />
                  ))}
                </Box>

                <Typography variant="caption" color="text.secondary">
                  {new Date(content.createdAt).toLocaleDateString('zh-CN')}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {/* 删除确认对话框 */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleBulkDeleteCancel}
      >
        <DialogTitle>批量删除确认</DialogTitle>
        <DialogContent>
          <DialogContentText>
            确定要删除选中的 {selectedIds.length} 条内容吗？此操作无法撤销。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleBulkDeleteCancel}>取消</Button>
          <Button onClick={handleBulkDeleteConfirm} color="error" variant="contained">
            删除
          </Button>
        </DialogActions>
      </Dialog>

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
