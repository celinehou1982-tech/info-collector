import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Tabs,
  Tab,
  Chip,
  Stack,
  CircularProgress,
  Alert,
  LinearProgress,
  Paper,
  Typography,
  Snackbar,
  Autocomplete
} from '@mui/material'
import { CloudUpload as UploadIcon, Image as ImageIcon, PictureAsPdf as PdfIcon } from '@mui/icons-material'
import { useContentStore } from '../../store/contentStore'
import { useCategoryStore } from '../../store/categoryStore'
import { useSettingsStore } from '../../store/settingsStore'
import { scrapeUrl } from '../../services/scraper'
import { recognizeImage, fileToBase64 } from '../../services/ocr'
import { extractTextFromPDF } from '../../services/pdf'
import { Category } from '../../types'

interface InputPanelProps {
  open: boolean
  onClose: () => void
}

export default function InputPanel({ open, onClose }: InputPanelProps) {
  const [tabValue, setTabValue] = useState(0)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [url, setUrl] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [scraping, setScraping] = useState(false)
  const [recognizing, setRecognizing] = useState(false)
  const [extracting, setExtracting] = useState(false) // PDF文本提取中
  const [extractProgress, setExtractProgress] = useState({ current: 0, total: 0 }) // PDF提取进度
  const [error, setError] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfPageCount, setPdfPageCount] = useState<number>(0)
  const [successMessage, setSuccessMessage] = useState('')

  const { addContent } = useContentStore()
  const { categories, selectCategory } = useCategoryStore()
  const { settings } = useSettingsStore()

  // 处理粘贴事件
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // 只在图片标签页且对话框打开时处理粘贴
      if (!open || tabValue !== 0) return

      const items = e.clipboardData?.items
      if (!items) return

      // 查找图片项
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.type.startsWith('image/')) {
          e.preventDefault()

          const blob = item.getAsFile()
          if (blob) {
            // 创建File对象
            const file = new File([blob], `pasted-image-${Date.now()}.png`, {
              type: blob.type
            })

            // 检查文件大小
            if (file.size > 10 * 1024 * 1024) {
              setError('图片文件不能超过10MB')
              return
            }

            setImageFile(file)
            setError('')

            // 生成预览
            const reader = new FileReader()
            reader.onload = (e) => {
              setImagePreview(e.target?.result as string)
            }
            reader.readAsDataURL(file)
          }
          break
        }
      }
    }

    // 只在对话框打开时添加监听器
    if (open) {
      document.addEventListener('paste', handlePaste)
      return () => {
        document.removeEventListener('paste', handlePaste)
      }
    }
  }, [open, tabValue])

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag('')
    }
  }

  const handleDeleteTag = (tagToDelete: string) => {
    setTags(tags.filter(tag => tag !== tagToDelete))
  }

  // 抓取URL内容
  const handleScrapeUrl = async () => {
    if (!url.trim()) {
      setError('请输入URL')
      return
    }

    setScraping(true)
    setError('')

    try {
      const result = await scrapeUrl(url)

      if (result.success && result.data) {
        // 自动填充表单
        setTitle(result.data.title)
        setContent(result.data.content)

        // 如果有作者信息，可以添加为标签
        if (result.data.author) {
          setTags(prev => [...new Set([...prev, result.data.author!])])
        }

        setError('')
        // 显示成功消息
        setTimeout(() => {
          setError('')
        }, 3000)
      } else {
        setError(result.error || '抓取失败')
      }
    } catch (err) {
      setError('抓取时发生错误')
    } finally {
      setScraping(false)
    }
  }

  // 处理图片上传
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件')
      return
    }

    // 检查文件大小 (限制10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('图片文件不能超过10MB')
      return
    }

    setImageFile(file)
    setError('')

    // 生成预览
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  // 处理PDF上传
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 检查文件类型
    if (file.type !== 'application/pdf') {
      setError('请选择PDF文件')
      return
    }

    // 检查文件大小 (限制10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('PDF文件不能超过10MB')
      return
    }

    setPdfFile(file)
    setError('')
  }

  // 提取PDF文本
  const handleExtractPdfText = async () => {
    if (!pdfFile) {
      setError('请先上传PDF文件')
      return
    }

    setExtracting(true)
    setError('')
    setExtractProgress({ current: 0, total: 0 })

    try {
      const result = await extractTextFromPDF(pdfFile, (current, total) => {
        setExtractProgress({ current, total })
      })

      if (result.success && result.data) {
        setContent(result.data.text)
        setPdfPageCount(result.data.pageCount || 0)
        if (!title) {
          // 从文本的第一行提取标题
          const firstLine = result.data.text.split('\n')[0]
          setTitle(firstLine.substring(0, 100))
        }
        setError('')
      } else {
        setError(result.error || 'PDF文本提取失败')
      }
    } catch (err) {
      setError('PDF处理时发生错误')
    } finally {
      setExtracting(false)
      setExtractProgress({ current: 0, total: 0 })
    }
  }

  // OCR识别图片
  const handleRecognizeImage = async () => {
    if (!imageFile) {
      setError('请先上传图片')
      return
    }

    setRecognizing(true)
    setError('')

    try {
      const imageBase64 = await fileToBase64(imageFile)

      const result = await recognizeImage({
        imageBase64,
        provider: settings.ai.enabled ? 'openai' : 'tesseract',
        apiKey: settings.ai.enabled ? settings.ai.apiKey : undefined,
        language: 'chi_sim+eng'
      })

      if (result.success && result.data) {
        setContent(result.data.text)
        if (!title) {
          // 从文本的第一行提取标题
          const firstLine = result.data.text.split('\n')[0]
          setTitle(firstLine.substring(0, 100))
        }
        setError('')
      } else {
        setError(result.error || 'OCR识别失败')
      }
    } catch (err) {
      setError('图片识别时发生错误')
    } finally {
      setRecognizing(false)
    }
  }

  const handleSave = async () => {
    if (!title.trim()) {
      setError('请输入标题')
      return
    }

    if (tabValue === 2 && !content.trim()) {
      setError('请输入内容')
      return
    }

    if (tabValue === 1 && !content.trim()) {
      setError('请先抓取URL内容')
      return
    }

    if (tabValue === 0 && !imageFile) {
      setError('请先上传或粘贴图片')
      return
    }

    if (tabValue === 3 && !pdfFile) {
      setError('请先上传PDF文件')
      return
    }

    setLoading(true)
    setError('')

    try {
      // 简单的自动分类（基于标题和内容）
      const textToMatch = `${title} ${content}`.toLowerCase()
      const matchedCategories: string[] = []

      for (const category of categories) {
        for (const keyword of category.keywords) {
          if (textToMatch.includes(keyword.text.toLowerCase())) {
            matchedCategories.push(category.id)
            break
          }
        }
      }

      // 合并手动选择的目录和自动匹配的目录
      const manualCategoryIds = selectedCategories.map(cat => cat.id)
      const allCategoryIds = [...new Set([...manualCategoryIds, ...matchedCategories])]

      // 准备图片数据（如果是图片类型）
      let imageData: string | undefined
      let imageType: string | undefined

      if (tabValue === 0 && imageFile) {
        // 将图片转换为base64
        const reader = new FileReader()
        imageData = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(imageFile)
        })
        imageType = imageFile.type
      }

      // 准备PDF数据（如果是PDF类型）
      let pdfData: string | undefined
      let pdfFileName: string | undefined

      if (tabValue === 3 && pdfFile) {
        // 将PDF转换为base64
        const reader = new FileReader()
        pdfData = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(pdfFile)
        })
        pdfFileName = pdfFile.name
      }

      await addContent({
        type: tabValue === 2 ? 'text' : tabValue === 1 ? 'url' : tabValue === 0 ? 'image' : 'pdf',
        title,
        content: content || (tabValue === 0 ? '图片内容' : tabValue === 3 ? 'PDF文档' : ''),
        sourceUrl: tabValue === 1 ? url : undefined,
        categoryIds: allCategoryIds,
        tags,
        imageData,
        imageType,
        pdfData,
        pdfFileName,
        pdfPageCount: tabValue === 3 ? pdfPageCount : undefined
      })

      // 如果没有匹配到任何目录，切换到"未分类"视图
      if (allCategoryIds.length === 0) {
        selectCategory('uncategorized')
      } else {
        // 否则切换到"全部内容"视图
        selectCategory(null)
      }

      // 显示成功消息
      setSuccessMessage('内容保存成功！')

      // 重置表单
      setTitle('')
      setContent('')
      setUrl('')
      setTags([])
      setSelectedCategories([])
      setImagePreview(null)
      setImageFile(null)
      setPdfFile(null)
      setPdfPageCount(0)
      setTabValue(0)
      onClose()
    } catch (err) {
      setError('保存失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading && !scraping && !recognizing && !extracting) {
      setTitle('')
      setContent('')
      setUrl('')
      setTags([])
      setSelectedCategories([])
      setImagePreview(null)
      setImageFile(null)
      setPdfFile(null)
      setPdfPageCount(0)
      setError('')
      onClose()
    }
  }

  // 处理键盘事件 - 标题输入框按回车保存
  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !loading && !scraping && !recognizing && !extracting) {
      e.preventDefault()
      handleSave()
    }
  }

  // 处理键盘事件 - 内容输入框按Ctrl/Cmd+Enter保存
  const handleContentKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !loading && !scraping && !recognizing && !extracting) {
      e.preventDefault()
      handleSave()
    }
  }

  return (
    <>
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>添加内容</DialogTitle>
      {(scraping || recognizing || extracting) && <LinearProgress />}
      <DialogContent>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
            <Tab label="图片" />
            <Tab label="链接" />
            <Tab label="文本" />
            <Tab label="PDF" />
          </Tabs>
        </Box>

        {error && (
          <Alert severity={error.includes('成功') ? 'success' : 'error'} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {tabValue === 0 ? (
          <>
            {/* 目录选择器 - 放在最上方 */}
            <Autocomplete
              multiple
              options={categories}
              getOptionLabel={(option) => option.name}
              value={selectedCategories}
              onChange={(_, newValue) => setSelectedCategories(newValue)}
              disabled={recognizing}
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="outlined"
                  label="选择目录（可选）"
                  placeholder="选择一个或多个目录"
                  helperText="自动分类会基于关键词匹配，手动选择的目录会被合并"
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
              sx={{ mb: 2 }}
            />

            <Box sx={{ mb: 2 }}>
              <input
                accept="image/*"
                style={{ display: 'none' }}
                id="image-upload-input"
                type="file"
                onChange={handleImageUpload}
                disabled={recognizing}
              />
              <label htmlFor="image-upload-input">
                <Button
                  variant="outlined"
                  component="span"
                  fullWidth
                  startIcon={<UploadIcon />}
                  disabled={recognizing}
                  sx={{ mb: 1 }}
                >
                  选择图片文件
                </Button>
              </label>

              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mb: 2 }}>
                点击上方按钮选择图片，或直接按 Ctrl/Cmd+V 粘贴图片
              </Typography>

              {imagePreview && (
                <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    图片预览
                  </Typography>
                  <Box
                    component="img"
                    src={imagePreview}
                    alt="预览"
                    sx={{
                      width: '100%',
                      maxHeight: 300,
                      objectFit: 'contain',
                      borderRadius: 1
                    }}
                  />
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={handleRecognizeImage}
                    disabled={recognizing}
                    startIcon={recognizing ? <CircularProgress size={16} /> : <ImageIcon />}
                    sx={{ mt: 2 }}
                  >
                    {recognizing ? '正在识别...' : '识别图片文字（可选）'}
                  </Button>
                </Paper>
              )}
            </Box>

            <TextField
              label="标题"
              fullWidth
              variant="outlined"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleTitleKeyDown}
              disabled={recognizing}
              sx={{ mb: 2 }}
            />

            <TextField
              label="图片说明（可选）"
              fullWidth
              multiline
              rows={10}
              variant="outlined"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleContentKeyDown}
              placeholder="可以添加图片的文字说明，或点击【识别图片文字】按钮自动识别（Ctrl/Cmd+Enter 保存）"
              disabled={recognizing}
              sx={{ mb: 2 }}
            />

            {/* 标签输入 */}
            <TextField
              label="标签"
              fullWidth
              variant="outlined"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
              placeholder="按回车添加标签"
              disabled={recognizing}
              sx={{ mb: 2 }}
            />

            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
              {tags.map((tag, index) => (
                <Chip
                  key={index}
                  label={tag}
                  onDelete={() => handleDeleteTag(tag)}
                  size="small"
                  disabled={recognizing}
                />
              ))}
            </Stack>
          </>
        ) : tabValue === 1 ? (
          <>
            <TextField
              label="标题"
              fullWidth
              variant="outlined"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleTitleKeyDown}
              disabled={scraping}
              sx={{ mb: 2 }}
            />
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                label="URL"
                fullWidth
                variant="outlined"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={handleTitleKeyDown}
                placeholder="https://example.com/article"
                disabled={scraping}
              />
              <Button
                variant="contained"
                onClick={handleScrapeUrl}
                disabled={scraping || !url.trim()}
                sx={{ minWidth: 100 }}
              >
                {scraping ? <CircularProgress size={24} /> : '抓取'}
              </Button>
            </Box>
            <TextField
              label="抓取的内容"
              fullWidth
              multiline
              rows={10}
              variant="outlined"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleContentKeyDown}
              placeholder="点击【抓取】按钮自动获取内容（Ctrl/Cmd+Enter 保存）"
              sx={{ mb: 2 }}
            />

            {/* 目录选择器 */}
            <Autocomplete
              multiple
              options={categories}
              getOptionLabel={(option) => option.name}
              value={selectedCategories}
              onChange={(_, newValue) => setSelectedCategories(newValue)}
              disabled={scraping}
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="outlined"
                  label="选择目录（可选）"
                  placeholder="选择一个或多个目录"
                  helperText="自动分类会基于关键词匹配，手动选择的目录会被合并"
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
              sx={{ mb: 2 }}
            />

            {/* 标签输入 */}
            <TextField
              label="标签"
              fullWidth
              variant="outlined"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
              placeholder="按回车添加标签"
              disabled={scraping}
              sx={{ mb: 2 }}
            />

            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
              {tags.map((tag, index) => (
                <Chip
                  key={index}
                  label={tag}
                  onDelete={() => handleDeleteTag(tag)}
                  size="small"
                  disabled={scraping}
                />
              ))}
            </Stack>
          </>
        ) : tabValue === 2 ? (
          <>
            <TextField
              label="标题"
              fullWidth
              variant="outlined"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleTitleKeyDown}
              sx={{ mb: 2 }}
            />
            <TextField
              label="内容"
              fullWidth
              multiline
              rows={10}
              variant="outlined"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleContentKeyDown}
              placeholder="支持 Markdown 格式（Ctrl/Cmd+Enter 保存）"
              sx={{ mb: 2 }}
            />

            {/* 目录选择器 */}
            <Autocomplete
              multiple
              options={categories}
              getOptionLabel={(option) => option.name}
              value={selectedCategories}
              onChange={(_, newValue) => setSelectedCategories(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="outlined"
                  label="选择目录（可选）"
                  placeholder="选择一个或多个目录"
                  helperText="自动分类会基于关键词匹配，手动选择的目录会被合并"
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
              sx={{ mb: 2 }}
            />

            {/* 标签输入 */}
            <TextField
              label="标签"
              fullWidth
              variant="outlined"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
              placeholder="按回车添加标签"
              sx={{ mb: 2 }}
            />

            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
              {tags.map((tag, index) => (
                <Chip
                  key={index}
                  label={tag}
                  onDelete={() => handleDeleteTag(tag)}
                  size="small"
                />
              ))}
            </Stack>
          </>
        ) : (
          <>
            {/* PDF标签页 */}
            {/* 目录选择器 - 放在最上方 */}
            <Autocomplete
              multiple
              options={categories}
              getOptionLabel={(option) => option.name}
              value={selectedCategories}
              onChange={(_, newValue) => setSelectedCategories(newValue)}
              disabled={extracting}
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="outlined"
                  label="选择目录（可选）"
                  placeholder="选择一个或多个目录"
                  helperText="自动分类会基于关键词匹配，手动选择的目录会被合并"
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
              sx={{ mb: 2 }}
            />

            <Box sx={{ mb: 2 }}>
              <input
                accept="application/pdf"
                style={{ display: 'none' }}
                id="pdf-upload-input"
                type="file"
                onChange={handlePdfUpload}
                disabled={extracting}
              />
              <label htmlFor="pdf-upload-input">
                <Button
                  variant="outlined"
                  component="span"
                  fullWidth
                  startIcon={<UploadIcon />}
                  disabled={extracting}
                  sx={{ mb: 2 }}
                >
                  选择PDF文件
                </Button>
              </label>

              {pdfFile && (
                <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    已选择文件
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <PdfIcon sx={{ mr: 1, color: 'error.main' }} />
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {pdfFile.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                        {pdfPageCount > 0 && ` • ${pdfPageCount} 页`}
                      </Typography>
                    </Box>
                  </Box>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={handleExtractPdfText}
                    disabled={extracting}
                    startIcon={extracting ? <CircularProgress size={16} /> : <PdfIcon />}
                  >
                    {extracting
                      ? `正在提取文本... (${extractProgress.current}/${extractProgress.total} 页)`
                      : '提取PDF文本（可选）'}
                  </Button>
                  {extracting && extractProgress.total > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={(extractProgress.current / extractProgress.total) * 100}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 0.5 }}>
                        {Math.round((extractProgress.current / extractProgress.total) * 100)}%
                      </Typography>
                    </Box>
                  )}
                </Paper>
              )}
            </Box>

            <TextField
              label="标题"
              fullWidth
              variant="outlined"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleTitleKeyDown}
              disabled={extracting}
              sx={{ mb: 2 }}
            />

            <TextField
              label="提取的文本"
              fullWidth
              multiline
              rows={10}
              variant="outlined"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleContentKeyDown}
              placeholder="点击【提取PDF文本】按钮自动提取内容（Ctrl/Cmd+Enter 保存）"
              disabled={extracting}
              sx={{ mb: 2 }}
            />

            {/* 标签输入 */}
            <TextField
              label="标签"
              fullWidth
              variant="outlined"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
              placeholder="按回车添加标签"
              disabled={extracting}
              sx={{ mb: 2 }}
            />

            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
              {tags.map((tag, index) => (
                <Chip
                  key={index}
                  label={tag}
                  onDelete={() => handleDeleteTag(tag)}
                  size="small"
                  disabled={extracting}
                />
              ))}
            </Stack>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading || scraping || recognizing || extracting}>
          取消
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={loading || scraping || recognizing || extracting}
          startIcon={loading && <CircularProgress size={16} />}
        >
          保存
        </Button>
      </DialogActions>
    </Dialog>

    {/* 成功消息提示 */}
    <Snackbar
      open={!!successMessage}
      autoHideDuration={3000}
      onClose={() => setSuccessMessage('')}
      message={successMessage}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    />
  </>
  )
}
