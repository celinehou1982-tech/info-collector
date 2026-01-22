import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tabs,
  Tab,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Typography,
  Divider,
  Alert,
  SelectChangeEvent,
  Paper,
  CircularProgress,
  RadioGroup,
  Radio,
  IconButton,
  InputAdornment
} from '@mui/material'
import {
  CloudUpload as UploadIcon,
  CloudDownload as DownloadIcon,
  CheckCircle as CheckIcon,
  Visibility,
  VisibilityOff
} from '@mui/icons-material'
import { useSettingsStore } from '../../store/settingsStore'
import { useCategoryStore } from '../../store/categoryStore'
import { useContentStore } from '../../store/contentStore'
import { exportAllData, downloadExportData, readImportFile, importData } from '../../services/exportImport'

interface SettingsDialogProps {
  open: boolean
  onClose: () => void
}

export default function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const { settings, updateSettings } = useSettingsStore()
  const { loadCategories } = useCategoryStore()
  const { loadContents } = useContentStore()
  const [tabValue, setTabValue] = useState(0)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // 导出/导入状态
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge')
  const [importSuccess, setImportSuccess] = useState<string>('')
  const [importError, setImportError] = useState<string>('')

  const [aiProvider, setAiProvider] = useState(settings.ai.provider)
  const [aiApiKey, setAiApiKey] = useState(settings.ai.apiKey || '')
  const [aiModel, setAiModel] = useState(settings.ai.model || '')
  const [aiBaseUrl, setAiBaseUrl] = useState(settings.ai.baseUrl || '')
  const [aiEnabled, setAiEnabled] = useState(settings.ai.enabled)
  const [showApiKey, setShowApiKey] = useState(false)
  const [testingApiKey, setTestingApiKey] = useState(false)
  const [apiKeyTestResult, setApiKeyTestResult] = useState<'success' | 'error' | ''>('')
  const [apiKeyTestMessage, setApiKeyTestMessage] = useState('')

  const handleSave = async () => {
    await updateSettings({
      ...settings,
      ai: {
        provider: aiProvider,
        apiKey: aiApiKey,
        model: aiModel,
        baseUrl: aiBaseUrl,
        enabled: aiEnabled
      }
    })
    setSaveSuccess(true)
    setTimeout(() => {
      setSaveSuccess(false)
      onClose()
    }, 1500)
  }

  // 测试API Key
  const handleTestApiKey = async () => {
    if (!aiApiKey.trim()) {
      setApiKeyTestResult('error')
      setApiKeyTestMessage('请先输入API Key')
      return
    }

    setTestingApiKey(true)
    setApiKeyTestResult('')
    setApiKeyTestMessage('')

    try {
      const { generateAISummary } = await import('../../services/ai')
      const result = await generateAISummary({
        content: '这是一个测试文本，用于验证API Key是否有效。',
        title: 'API Key测试',
        provider: aiProvider,
        apiKey: aiApiKey,
        model: aiModel || (aiProvider === 'openai' ? 'gpt-4o-mini' : 'claude-3-5-sonnet-20241022'),
        baseUrl: aiBaseUrl
      })

      if (result.success) {
        setApiKeyTestResult('success')
        setApiKeyTestMessage('✓ API Key有效！连接成功')
      } else {
        setApiKeyTestResult('error')
        setApiKeyTestMessage(result.error || 'API Key测试失败')
      }
    } catch (error) {
      setApiKeyTestResult('error')
      setApiKeyTestMessage(error instanceof Error ? error.message : 'API Key测试失败')
    } finally {
      setTestingApiKey(false)
    }
  }

  // 导出数据
  const handleExport = async () => {
    setExporting(true)
    try {
      const data = await exportAllData()
      downloadExportData(data)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch (error) {
      console.error('导出失败:', error)
      setImportError('导出数据失败')
      setTimeout(() => setImportError(''), 3000)
    } finally {
      setExporting(false)
    }
  }

  // 导入数据
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImporting(true)
    setImportError('')
    setImportSuccess('')

    try {
      const data = await readImportFile(file)
      const result = await importData(data, importMode)

      if (result.success) {
        setImportSuccess(result.message)
        // 重新加载数据
        await loadCategories()
        await loadContents()
        setTimeout(() => {
          setImportSuccess('')
          onClose()
        }, 2000)
      } else {
        setImportError(result.message)
      }
    } catch (error) {
      console.error('导入失败:', error)
      setImportError(error instanceof Error ? error.message : '导入数据失败')
    } finally {
      setImporting(false)
      // 重置文件输入
      event.target.value = ''
    }
  }

  const handleProviderChange = (event: SelectChangeEvent) => {
    const provider = event.target.value as 'openai' | 'anthropic' | 'local'
    setAiProvider(provider)

    // 根据不同provider设置默认模型
    if (provider === 'openai') {
      setAiModel('gpt-4o-mini')
    } else if (provider === 'anthropic') {
      setAiModel('claude-3-5-sonnet-20241022')
    } else {
      setAiModel('')
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>设置</DialogTitle>
      <DialogContent>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
            <Tab label="AI 设置" />
            <Tab label="数据管理" />
            <Tab label="抓取设置" />
            <Tab label="显示设置" />
          </Tabs>
        </Box>

        {saveSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            设置已保存！
          </Alert>
        )}

        {importSuccess && (
          <Alert severity="success" sx={{ mb: 2 }} icon={<CheckIcon />}>
            {importSuccess}
          </Alert>
        )}

        {importError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {importError}
          </Alert>
        )}

        {/* AI 设置 */}
        {tabValue === 0 && (
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={aiEnabled}
                  onChange={(e) => setAiEnabled(e.target.checked)}
                />
              }
              label="启用 AI 功能"
              sx={{ mb: 2 }}
            />

            <Divider sx={{ my: 2 }} />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>AI 服务商</InputLabel>
              <Select
                value={aiProvider}
                label="AI 服务商"
                onChange={handleProviderChange}
                disabled={!aiEnabled}
              >
                <MenuItem value="openai">OpenAI (ChatGPT)</MenuItem>
                <MenuItem value="anthropic">Anthropic (Claude)</MenuItem>
                <MenuItem value="local">本地模型（不可用）</MenuItem>
              </Select>
            </FormControl>

            {aiProvider !== 'local' && (
              <>
                <TextField
                  fullWidth
                  label="API Key"
                  type={showApiKey ? 'text' : 'password'}
                  value={aiApiKey}
                  onChange={(e) => setAiApiKey(e.target.value)}
                  disabled={!aiEnabled}
                  helperText="您的 API 密钥将被加密存储在本地"
                  sx={{ mb: 2 }}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={() => setShowApiKey(!showApiKey)}
                            edge="end"
                          >
                            {showApiKey ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      )
                    }
                  }}
                />

                <TextField
                  fullWidth
                  label="API Base URL（可选）"
                  value={aiBaseUrl}
                  onChange={(e) => setAiBaseUrl(e.target.value)}
                  disabled={!aiEnabled}
                  placeholder="https://api.openai.com/v1"
                  helperText="自定义API地址，留空使用默认地址"
                  sx={{ mb: 2 }}
                />

                <TextField
                  fullWidth
                  label="模型"
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  disabled={!aiEnabled}
                  helperText={
                    aiProvider === 'openai'
                      ? '推荐: gpt-4o-mini, gpt-4o, gpt-4-turbo'
                      : '推荐: claude-3-5-sonnet-20241022, claude-3-5-haiku-20241022'
                  }
                  sx={{ mb: 2 }}
                />

                {/* 测试API Key按钮 */}
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={handleTestApiKey}
                  disabled={!aiEnabled || !aiApiKey.trim() || testingApiKey}
                  startIcon={testingApiKey ? <CircularProgress size={16} /> : undefined}
                  sx={{ mb: 2 }}
                >
                  {testingApiKey ? '测试中...' : '测试 API Key'}
                </Button>

                {/* 测试结果显示 */}
                {apiKeyTestResult && (
                  <Alert
                    severity={apiKeyTestResult}
                    sx={{ mb: 2 }}
                    onClose={() => {
                      setApiKeyTestResult('')
                      setApiKeyTestMessage('')
                    }}
                  >
                    {apiKeyTestMessage}
                  </Alert>
                )}
              </>
            )}

            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              <strong>功能说明：</strong>
              <br />
              • 自动生成内容摘要
              <br />
              • 提取 3-5 个核心观点
              <br />
              • 生成汇总文档
              <br />
              <br />
              如果不启用 AI 功能，将使用简单的提取算法作为替代。
            </Typography>
          </Box>
        )}

        {/* 数据管理 */}
        {tabValue === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              数据导出与导入
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              在 PC 和手机之间同步数据，或备份你的数据
            </Typography>

            {/* 导出部分 */}
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                导出数据
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                将所有内容和目录导出为 JSON 文件，可以在其他设备上导入
              </Typography>
              <Button
                variant="contained"
                startIcon={exporting ? <CircularProgress size={16} /> : <DownloadIcon />}
                onClick={handleExport}
                disabled={exporting}
                fullWidth
              >
                {exporting ? '导出中...' : '导出所有数据'}
              </Button>
            </Paper>

            {/* 导入部分 */}
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                导入数据
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                从之前导出的 JSON 文件中导入数据
              </Typography>

              {/* 导入模式选择 */}
              <FormControl sx={{ mb: 2 }}>
                <Typography variant="body2" fontWeight="medium" gutterBottom>
                  导入模式
                </Typography>
                <RadioGroup
                  value={importMode}
                  onChange={(e) => setImportMode(e.target.value as 'merge' | 'replace')}
                >
                  <FormControlLabel
                    value="merge"
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography variant="body2">合并数据（推荐）</Typography>
                        <Typography variant="caption" color="text.secondary">
                          保留现有数据，只添加新数据或更新已存在的数据
                        </Typography>
                      </Box>
                    }
                  />
                  <FormControlLabel
                    value="replace"
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography variant="body2" color="error">
                          替换数据（慎用）
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          清空现有数据，完全替换为导入的数据
                        </Typography>
                      </Box>
                    }
                  />
                </RadioGroup>
              </FormControl>

              <input
                accept="application/json,.json"
                style={{ display: 'none' }}
                id="import-data-file"
                type="file"
                onChange={handleImport}
                disabled={importing}
              />
              <label htmlFor="import-data-file">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={importing ? <CircularProgress size={16} /> : <UploadIcon />}
                  disabled={importing}
                  fullWidth
                >
                  {importing ? '导入中...' : '选择文件并导入'}
                </Button>
              </label>
            </Paper>

            <Alert severity="info" sx={{ mt: 3 }}>
              <Typography variant="body2" fontWeight="medium" gutterBottom>
                使用说明
              </Typography>
              <Typography variant="body2" component="div">
                1. 在 PC 上点击"导出所有数据"，保存 JSON 文件
                <br />
                2. 将文件传到手机（如通过 AirDrop、邮件等）
                <br />
                3. 在手机上打开应用，点击"选择文件并导入"
                <br />
                4. 选择刚才的 JSON 文件即可完成同步
              </Typography>
            </Alert>
          </Box>
        )}

        {/* 抓取设置 */}
        {tabValue === 2 && (
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.scraping.downloadImages}
                  onChange={(e) =>
                    updateSettings({
                      ...settings,
                      scraping: {
                        ...settings.scraping,
                        downloadImages: e.target.checked
                      }
                    })
                  }
                />
              }
              label="下载并保存图片（暂不可用）"
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              type="number"
              label="超时时间（秒）"
              value={settings.scraping.timeout}
              onChange={(e) =>
                updateSettings({
                  ...settings,
                  scraping: {
                    ...settings.scraping,
                    timeout: parseInt(e.target.value)
                  }
                })
              }
              helperText="抓取网页的最长等待时间"
            />
          </Box>
        )}

        {/* 显示设置 */}
        {tabValue === 3 && (
          <Box>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>视图模式</InputLabel>
              <Select
                value={settings.display.viewMode}
                label="视图模式"
                onChange={(e) =>
                  updateSettings({
                    ...settings,
                    display: {
                      ...settings.display,
                      viewMode: e.target.value as 'list' | 'card'
                    }
                  })
                }
              >
                <MenuItem value="list">列表视图</MenuItem>
                <MenuItem value="card">卡片视图</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              type="number"
              label="每页显示条数"
              value={settings.display.itemsPerPage}
              onChange={(e) =>
                updateSettings({
                  ...settings,
                  display: {
                    ...settings.display,
                    itemsPerPage: parseInt(e.target.value)
                  }
                })
              }
              sx={{ mb: 2 }}
            />

            <FormControl fullWidth>
              <InputLabel>主题</InputLabel>
              <Select
                value={settings.display.theme}
                label="主题"
                onChange={(e) =>
                  updateSettings({
                    ...settings,
                    display: {
                      ...settings.display,
                      theme: e.target.value as 'light' | 'dark' | 'auto'
                    }
                  })
                }
              >
                <MenuItem value="light">浅色</MenuItem>
                <MenuItem value="dark">深色</MenuItem>
                <MenuItem value="auto">跟随系统</MenuItem>
              </Select>
            </FormControl>
          </Box>
        )}

        {/* 备份设置 */}
        {tabValue === 3 && (
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.backup.autoBackup}
                  onChange={(e) =>
                    updateSettings({
                      ...settings,
                      backup: {
                        ...settings.backup,
                        autoBackup: e.target.checked
                      }
                    })
                  }
                />
              }
              label="自动备份"
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              type="number"
              label="备份间隔（小时）"
              value={settings.backup.backupInterval}
              onChange={(e) =>
                updateSettings({
                  ...settings,
                  backup: {
                    ...settings.backup,
                    backupInterval: parseInt(e.target.value)
                  }
                })
              }
              disabled={!settings.backup.autoBackup}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              type="number"
              label="保留备份数量"
              value={settings.backup.maxBackups}
              onChange={(e) =>
                updateSettings({
                  ...settings,
                  backup: {
                    ...settings.backup,
                    maxBackups: parseInt(e.target.value)
                  }
                })
              }
              helperText="保留最近N个备份版本"
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        {tabValue === 0 && (
          <Button onClick={handleSave} variant="contained">
            保存
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
