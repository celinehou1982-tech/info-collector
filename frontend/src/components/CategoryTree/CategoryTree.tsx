import { useState } from 'react'
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Collapse,
  IconButton,
  Button,
  Typography,
  Menu,
  MenuItem,
  ListItemIcon as MenuItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material'
import {
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  ExpandMore,
  ChevronRight,
  Add as AddIcon,
  MoreVert as MoreIcon,
  Inbox as InboxIcon,
  FolderSpecial as AllFolderIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material'
import { useCategoryStore } from '../../store/categoryStore'
import { useContentStore } from '../../store/contentStore'
import { Category } from '../../types'
import CategoryDialog from './CategoryDialog'

export default function CategoryTree() {
  const { categories, selectedCategoryId, selectCategory, deleteCategory, reorderCategories } = useCategoryStore()
  const { loadContents } = useContentStore()
  const [expandedIds, setExpandedIds] = useState<string[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [menuCategory, setMenuCategory] = useState<Category | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const [draggedCategory, setDraggedCategory] = useState<Category | null>(null)
  const [dragOverCategory, setDragOverCategory] = useState<Category | null>(null)

  const handleToggle = (id: string) => {
    setExpandedIds(prev =>
      prev.includes(id)
        ? prev.filter(item => item !== id)
        : [...prev, id]
    )
  }

  const handleSelect = (id: string | null) => {
    selectCategory(id)
    loadContents()
  }

  const handleAddRoot = () => {
    setEditingCategory(null)
    setDialogOpen(true)
  }

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, category: Category) => {
    event.stopPropagation()
    setMenuAnchor(event.currentTarget)
    setMenuCategory(category)
  }

  const handleMenuClose = () => {
    setMenuAnchor(null)
    setMenuCategory(null)
  }

  const handleEdit = () => {
    if (menuCategory) {
      setEditingCategory(menuCategory)
      setDialogOpen(true)
    }
    handleMenuClose()
  }

  const handleDeleteClick = () => {
    if (menuCategory) {
      setDeletingCategory(menuCategory)
      setDeleteDialogOpen(true)
    }
    handleMenuClose()
  }

  const handleDeleteConfirm = async () => {
    if (deletingCategory) {
      await deleteCategory(deletingCategory.id)
      setDeleteDialogOpen(false)
      setDeletingCategory(null)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false)
    setDeletingCategory(null)
  }

  // 拖拽开始
  const handleDragStart = (e: React.DragEvent, category: Category) => {
    setDraggedCategory(category)
    e.dataTransfer.effectAllowed = 'move'
  }

  // 拖拽经过
  const handleDragOver = (e: React.DragEvent, category: Category) => {
    e.preventDefault()

    // 检查是否是内容拖拽
    const dragType = e.dataTransfer.types.includes('application/content-id') ? 'content' : 'category'

    if (dragType === 'content') {
      // 内容拖拽到目录，允许放置
      e.dataTransfer.dropEffect = 'copy'
      setDragOverCategory(category)
    } else {
      // 目录拖拽，只有同一层级才能互相拖拽
      e.dataTransfer.dropEffect = 'move'
      if (draggedCategory && draggedCategory.parentId === category.parentId && draggedCategory.id !== category.id) {
        setDragOverCategory(category)
      }
    }
  }

  // 拖拽离开
  const handleDragLeave = () => {
    setDragOverCategory(null)
  }

  // 放置
  const handleDrop = async (e: React.DragEvent, targetCategory: Category) => {
    e.preventDefault()

    // 检查是否是内容拖拽
    const contentId = e.dataTransfer.getData('application/content-id')
    const contentIdsStr = e.dataTransfer.getData('application/content-ids')

    if (contentId || contentIdsStr) {
      // 处理内容拖拽到目录
      const { updateContent } = useContentStore.getState()
      const { contents } = useContentStore.getState()

      // 获取要处理的内容ID列表
      let idsToProcess: string[] = []
      if (contentIdsStr) {
        // 批量拖拽
        idsToProcess = JSON.parse(contentIdsStr)
      } else if (contentId) {
        // 单个拖拽
        idsToProcess = [contentId]
      }

      // 批量更新所有内容
      for (const id of idsToProcess) {
        const content = contents.find(c => c.id === id)
        if (content) {
          // 添加目录ID到内容的categoryIds（如果还不存在）
          const updatedCategoryIds = content.categoryIds.includes(targetCategory.id)
            ? content.categoryIds
            : [...content.categoryIds, targetCategory.id]

          await updateContent(id, {
            categoryIds: updatedCategoryIds
          })
        }
      }

      console.log(`已将 ${idsToProcess.length} 个内容归类到 "${targetCategory.name}"`)

      setDragOverCategory(null)
      return
    }

    // 处理目录拖拽排序
    if (!draggedCategory || draggedCategory.id === targetCategory.id) {
      setDraggedCategory(null)
      setDragOverCategory(null)
      return
    }

    // 确保在同一层级
    if (draggedCategory.parentId !== targetCategory.parentId) {
      setDraggedCategory(null)
      setDragOverCategory(null)
      return
    }

    // 获取同级所有目录并排序
    const siblings = categories
      .filter(c => c.parentId === draggedCategory.parentId)
      .sort((a, b) => a.order - b.order)

    const draggedIndex = siblings.findIndex(c => c.id === draggedCategory.id)
    const targetIndex = siblings.findIndex(c => c.id === targetCategory.id)

    // 重新计算顺序
    const reorderedSiblings = [...siblings]
    const [removed] = reorderedSiblings.splice(draggedIndex, 1)
    reorderedSiblings.splice(targetIndex, 0, removed)

    // 生成新的order值
    const updates = reorderedSiblings.map((cat, index) => ({
      id: cat.id,
      order: index
    }))

    await reorderCategories(updates)

    setDraggedCategory(null)
    setDragOverCategory(null)
  }

  // 拖拽结束
  const handleDragEnd = () => {
    setDraggedCategory(null)
    setDragOverCategory(null)
  }

  const renderCategory = (category: Category, level: number = 0) => {
    const children = categories
      .filter(c => c.parentId === category.id)
      .sort((a, b) => a.order - b.order)
    const isExpanded = expandedIds.includes(category.id)
    const isSelected = selectedCategoryId === category.id
    const isDragging = draggedCategory?.id === category.id
    const isDragOver = dragOverCategory?.id === category.id

    return (
      <Box key={category.id}>
        <ListItem
          disablePadding
          secondaryAction={
            <IconButton
              edge="end"
              size="small"
              onClick={(e) => handleMenuOpen(e, category)}
            >
              <MoreIcon />
            </IconButton>
          }
          sx={{
            opacity: isDragging ? 0.5 : 1,
            borderTop: isDragOver ? '2px solid #1976d2' : 'none'
          }}
        >
          <ListItemButton
            selected={isSelected}
            onClick={() => handleSelect(category.id)}
            sx={{
              pl: level * 2,
              cursor: 'grab',
              bgcolor: isDragOver ? 'primary.light' : undefined,
              '&:hover': {
                bgcolor: isDragOver ? 'primary.light' : undefined
              }
            }}
            draggable
            onDragStart={(e) => handleDragStart(e, category)}
            onDragOver={(e) => handleDragOver(e, category)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, category)}
            onDragEnd={handleDragEnd}
          >
            {children.length > 0 && (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation()
                  handleToggle(category.id)
                }}
              >
                {isExpanded ? <ExpandMore /> : <ChevronRight />}
              </IconButton>
            )}
            <ListItemIcon>
              {isExpanded ? <FolderOpenIcon /> : <FolderIcon />}
            </ListItemIcon>
            <ListItemText primary={category.name} />
          </ListItemButton>
        </ListItem>

        {children.length > 0 && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {children.map(child => renderCategory(child, level + 1))}
            </List>
          </Collapse>
        )}
      </Box>
    )
  }

  const rootCategories = categories
    .filter(c => !c.parentId)
    .sort((a, b) => a.order - b.order)

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle2" color="text.secondary">
          我的目录
        </Typography>
        <IconButton size="small" onClick={handleAddRoot}>
          <AddIcon />
        </IconButton>
      </Box>

      <List>
        {/* 全部内容 */}
        <ListItem disablePadding>
          <ListItemButton
            selected={selectedCategoryId === null}
            onClick={() => handleSelect(null)}
          >
            <ListItemIcon>
              <AllFolderIcon />
            </ListItemIcon>
            <ListItemText primary="全部内容" />
          </ListItemButton>
        </ListItem>

        {/* 未分类 */}
        <ListItem disablePadding>
          <ListItemButton
            selected={selectedCategoryId === 'uncategorized'}
            onClick={() => handleSelect('uncategorized')}
          >
            <ListItemIcon>
              <InboxIcon />
            </ListItemIcon>
            <ListItemText primary="未分类" />
          </ListItemButton>
        </ListItem>
      </List>

      {rootCategories.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            还没有目录
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={handleAddRoot}
          >
            创建第一个目录
          </Button>
        </Box>
      ) : (
        <List>
          {rootCategories.map(category => renderCategory(category))}
        </List>
      )}

      <CategoryDialog
        open={dialogOpen}
        category={editingCategory}
        onClose={() => setDialogOpen(false)}
      />

      {/* 目录菜单 */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>
          <MenuItemIcon>
            <EditIcon fontSize="small" />
          </MenuItemIcon>
          编辑目录
        </MenuItem>
        <MenuItem onClick={handleDeleteClick}>
          <MenuItemIcon>
            <DeleteIcon fontSize="small" />
          </MenuItemIcon>
          删除目录
        </MenuItem>
      </Menu>

      {/* 删除确认对话框 */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
      >
        <DialogTitle>删除目录</DialogTitle>
        <DialogContent>
          <DialogContentText>
            确定要删除目录 "{deletingCategory?.name}" 吗？
            <br />
            该目录下的内容将变为未分类状态。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>取消</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            删除
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
