import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Chip,
  Stack,
  Autocomplete,
  CircularProgress
} from '@mui/material'
import { Content, Category } from '../../types'
import { useCategoryStore } from '../../store/categoryStore'

interface ContentEditDialogProps {
  open: boolean
  content: Content | null
  onClose: () => void
  onSave: (updates: Partial<Content>) => Promise<void>
}

export default function ContentEditDialog({ open, content, onClose, onSave }: ContentEditDialogProps) {
  const [title, setTitle] = useState('')
  const [contentText, setContentText] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)

  const { categories } = useCategoryStore()

  // 当内容变化时，更新表单
  useEffect(() => {
    if (content && open) {
      setTitle(content.title)
      setContentText(content.content)
      setTags(content.tags)

      // 根据 categoryIds 找到对应的 Category 对象
      const selectedCats = categories.filter(cat => content.categoryIds.includes(cat.id))
      setSelectedCategories(selectedCats)
    }
  }, [content, open, categories])

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag('')
    }
  }

  const handleDeleteTag = (tagToDelete: string) => {
    setTags(tags.filter(tag => tag !== tagToDelete))
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const categoryIds = selectedCategories.map(cat => cat.id)
      await onSave({
        title,
        content: contentText,
        tags,
        categoryIds
      })
      onClose()
    } catch (error) {
      console.error('保存失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      onClose()
    }
  }

  if (!content) return null

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>编辑内容</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <TextField
            label="标题"
            fullWidth
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={loading}
          />

          <TextField
            label="内容"
            fullWidth
            multiline
            rows={10}
            value={contentText}
            onChange={(e) => setContentText(e.target.value)}
            disabled={loading || content.type === 'image'}
            helperText={content.type === 'image' ? '图片内容不可编辑' : ''}
          />

          {/* 目录选择器 */}
          <Autocomplete
            multiple
            options={categories}
            getOptionLabel={(option) => option.name}
            value={selectedCategories}
            onChange={(_, newValue) => setSelectedCategories(newValue)}
            disabled={loading}
            renderInput={(params) => (
              <TextField
                {...params}
                label="选择目录"
                placeholder="选择一个或多个目录"
              />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  label={option.name}
                  {...getTagProps({ index })}
                  size="small"
                />
              ))
            }
          />

          {/* 标签 */}
          <TextField
            label="标签"
            fullWidth
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
            placeholder="按回车添加标签"
            disabled={loading}
          />

          <Stack direction="row" spacing={1} flexWrap="wrap">
            {tags.map((tag, index) => (
              <Chip
                key={index}
                label={tag}
                onDelete={() => handleDeleteTag(tag)}
                size="small"
                disabled={loading}
              />
            ))}
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          取消
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={loading}
          startIcon={loading && <CircularProgress size={16} />}
        >
          保存
        </Button>
      </DialogActions>
    </Dialog>
  )
}
