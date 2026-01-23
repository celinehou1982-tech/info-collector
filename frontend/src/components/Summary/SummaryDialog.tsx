import { useState } from 'react'
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
  TextField,
  Box,
  Chip,
  Typography,
  SelectChangeEvent,
  Alert
} from '@mui/material'
import { useContentStore } from '../../store/contentStore'
import { useCategoryStore } from '../../store/categoryStore'
import { generateSummaryDocument } from '../../services/summary'

interface SummaryDialogProps {
  open: boolean
  onClose: () => void
}

export default function SummaryDialog({ open, onClose }: SummaryDialogProps) {
  const { contents } = useContentStore()
  const { categories } = useCategoryStore()

  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [limit, setLimit] = useState(20)
  const [generating, setGenerating] = useState(false)
  const [generatedDoc, setGeneratedDoc] = useState('')
  const [error, setError] = useState('')

  // 获取所有可用标签
  const allTags = Array.from(
    new Set(contents.flatMap(content => content.tags))
  ).sort()

  const handleCategoryChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value
    setSelectedCategoryIds(typeof value === 'string' ? value.split(',') : value)
  }

  const handleTagChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value
    setSelectedTags(typeof value === 'string' ? value.split(',') : value)
  }

  const handleGenerate = async () => {
    setGenerating(true)
    setError('')

    try {
      // 过滤内容
      let filtered = [...contents]

      // 按目录过滤
      if (selectedCategoryIds.length > 0) {
        filtered = filtered.filter(c =>
          c.categoryIds && c.categoryIds.some(catId => selectedCategoryIds.includes(catId))
        )
      }

      // 按标签过滤
      if (selectedTags.length > 0) {
        filtered = filtered.filter(c =>
          c.tags && selectedTags.every(tag => c.tags.includes(tag))
        )
      }

      // 按日期过滤
      if (startDate || endDate) {
        filtered = filtered.filter(c => {
          const contentDate = new Date(c.createdAt)
          if (startDate && contentDate < new Date(startDate)) return false
          if (endDate && contentDate > new Date(endDate)) return false
          return true
        })
      }

      // 限制数量
      filtered = filtered.slice(0, limit)

      if (filtered.length === 0) {
        setError('没有匹配的内容')
        return
      }

      // 生成汇总文档
      const doc = await generateSummaryDocument(filtered, categories)
      setGeneratedDoc(doc)
    } catch (err) {
      setError('生成汇总文档失败')
    } finally {
      setGenerating(false)
    }
  }

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(generatedDoc)
    alert('已复制到剪贴板')
  }

  const handleDownloadMarkdown = () => {
    const blob = new Blob([generatedDoc], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `汇总文档_${new Date().toISOString().split('T')[0]}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleReset = () => {
    setSelectedCategoryIds([])
    setSelectedTags([])
    setStartDate('')
    setEndDate('')
    setLimit(20)
    setGeneratedDoc('')
    setError('')
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>生成汇总文档</DialogTitle>
      <DialogContent>
        {!generatedDoc ? (
          <>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {/* 目录选择 */}
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>选择目录（可选）</InputLabel>
              <Select
                multiple
                value={selectedCategoryIds}
                onChange={handleCategoryChange}
                label="选择目录（可选）"
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((id) => {
                      const category = categories.find(c => c.id === id)
                      return category ? (
                        <Chip key={id} label={category.name} size="small" />
                      ) : null
                    })}
                  </Box>
                )}
              >
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* 标签选择 */}
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>选择标签（可选）</InputLabel>
              <Select
                multiple
                value={selectedTags}
                onChange={handleTagChange}
                label="选择标签（可选）"
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((tag) => (
                      <Chip key={tag} label={tag} size="small" />
                    ))}
                  </Box>
                )}
              >
                {allTags.map((tag) => (
                  <MenuItem key={tag} value={tag}>
                    {tag}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* 日期范围 */}
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              日期范围（可选）
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                type="date"
                label="开始日期"
                size="small"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                type="date"
                label="结束日期"
                size="small"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Box>

            {/* 限制数量 */}
            <TextField
              fullWidth
              type="number"
              label="最大内容数量"
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value))}
              helperText="最多包含多少条内容"
              sx={{ mb: 2 }}
            />
          </>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              汇总文档已生成，共 {generatedDoc.split('###').length - 1} 条内容
            </Typography>
            <Box
              sx={{
                maxHeight: 400,
                overflow: 'auto',
                p: 2,
                bgcolor: 'grey.50',
                borderRadius: 1,
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                whiteSpace: 'pre-wrap'
              }}
            >
              {generatedDoc}
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        {!generatedDoc ? (
          <>
            <Button onClick={onClose}>取消</Button>
            <Button onClick={handleReset}>重置</Button>
            <Button
              onClick={handleGenerate}
              variant="contained"
              disabled={generating}
            >
              {generating ? '生成中...' : '生成汇总'}
            </Button>
          </>
        ) : (
          <>
            <Button onClick={handleReset}>重新配置</Button>
            <Button onClick={handleCopyToClipboard}>复制到剪贴板</Button>
            <Button onClick={handleDownloadMarkdown} variant="contained">
              下载 Markdown
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  )
}
