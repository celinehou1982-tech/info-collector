import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Chip,
  IconButton
} from '@mui/material'
import { Close as CloseIcon, Add as AddIcon } from '@mui/icons-material'
import { Category, Keyword } from '../../types'
import { useCategoryStore } from '../../store/categoryStore'

interface CategoryDialogProps {
  open: boolean
  category: Category | null
  onClose: () => void
}

export default function CategoryDialog({ open, category, onClose }: CategoryDialogProps) {
  const { addCategory, updateCategory } = useCategoryStore()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [newKeyword, setNewKeyword] = useState('')

  useEffect(() => {
    if (category) {
      setName(category.name)
      setDescription(category.description || '')
      setKeywords(category.keywords || [])
    } else {
      setName('')
      setDescription('')
      setKeywords([])
    }
  }, [category, open])

  const handleAddKeyword = () => {
    if (newKeyword.trim()) {
      setKeywords([...keywords, { text: newKeyword.trim(), weight: 5 }])
      setNewKeyword('')
    }
  }

  const handleDeleteKeyword = (index: number) => {
    setKeywords(keywords.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!name.trim()) return

    try {
      if (category) {
        await updateCategory(category.id, { name, description, keywords })
      } else {
        await addCategory({ name, description, keywords })
      }
      onClose()
    } catch (error) {
      console.error('保存失败:', error)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {category ? '编辑目录' : '新建目录'}
        <IconButton
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <TextField
            label="目录名称"
            fullWidth
            variant="outlined"
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            label="描述"
            fullWidth
            multiline
            rows={2}
            variant="outlined"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            sx={{ mb: 2 }}
          />

          <TextField
            label="添加关键词"
            fullWidth
            variant="outlined"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleAddKeyword()
              }
            }}
            placeholder="输入关键词后按回车"
            helperText="用于自动分类的关键词"
            sx={{ mb: 2 }}
            InputProps={{
              endAdornment: (
                <IconButton onClick={handleAddKeyword} size="small" color="primary">
                  <AddIcon />
                </IconButton>
              )
            }}
          />

          {keywords.length > 0 && (
            <Box sx={{
              p: 2,
              bgcolor: 'grey.50',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'grey.300'
            }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {keywords.map((keyword, index) => (
                  <Chip
                    key={index}
                    label={keyword.text}
                    onDelete={() => handleDeleteKeyword(index)}
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button onClick={handleSave} variant="contained">
          保存
        </Button>
      </DialogActions>
    </Dialog>
  )
}
