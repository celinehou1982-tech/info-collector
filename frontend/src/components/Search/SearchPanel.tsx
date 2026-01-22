import { useState } from 'react'
import {
  Paper,
  TextField,
  Box,
  Chip,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  SelectChangeEvent
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import SearchIcon from '@mui/icons-material/Search'
import ClearIcon from '@mui/icons-material/Clear'
import { useContentStore } from '../../store/contentStore'
import { useCategoryStore } from '../../store/categoryStore'

export default function SearchPanel() {
  const {
    filters,
    setSearchText,
    setCategoryFilter,
    setTagFilter,
    setDateRangeFilter,
    clearFilters,
    contents
  } = useContentStore()

  const { categories } = useCategoryStore()

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // 获取所有可用标签
  const allTags = Array.from(
    new Set(contents.flatMap(content => content.tags))
  ).sort()

  const handleCategoryChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value
    setCategoryFilter(typeof value === 'string' ? value.split(',') : value)
  }

  const handleTagChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value
    setTagFilter(typeof value === 'string' ? value.split(',') : value)
  }

  const handleDateRangeChange = () => {
    if (startDate || endDate) {
      setDateRangeFilter({
        start: startDate ? new Date(startDate) : undefined,
        end: endDate ? new Date(endDate) : undefined
      })
    } else {
      setDateRangeFilter(undefined)
    }
  }

  const handleClearFilters = () => {
    clearFilters()
    setStartDate('')
    setEndDate('')
  }

  const hasActiveFilters =
    filters.searchText ||
    filters.categoryIds.length > 0 ||
    filters.tags.length > 0 ||
    filters.dateRange

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <SearchIcon color="action" />
        <TextField
          fullWidth
          placeholder="搜索标题、内容或标签..."
          value={filters.searchText}
          onChange={(e) => setSearchText(e.target.value)}
          size="small"
        />
        {hasActiveFilters && (
          <Button
            startIcon={<ClearIcon />}
            onClick={handleClearFilters}
            size="small"
          >
            清除
          </Button>
        )}
      </Box>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>高级筛选</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            {/* 目录筛选 */}
            <FormControl fullWidth size="small">
              <InputLabel>目录</InputLabel>
              <Select
                multiple
                value={filters.categoryIds}
                onChange={handleCategoryChange}
                label="目录"
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

            {/* 标签筛选 */}
            <FormControl fullWidth size="small">
              <InputLabel>标签</InputLabel>
              <Select
                multiple
                value={filters.tags}
                onChange={handleTagChange}
                label="标签"
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

            {/* 日期范围筛选 */}
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                日期范围
              </Typography>
              <Stack direction="row" spacing={1}>
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
                <Button
                  variant="outlined"
                  onClick={handleDateRangeChange}
                  size="small"
                  sx={{ minWidth: 80 }}
                >
                  应用
                </Button>
              </Stack>
            </Box>
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Paper>
  )
}
