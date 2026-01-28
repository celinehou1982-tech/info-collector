import { Select, MenuItem, FormControl, Box } from '@mui/material'
import { Sort as SortIcon } from '@mui/icons-material'
import { useContentStore, type SortConfig } from '../../store/contentStore'

// 排序选项配置
const SORT_OPTIONS: Array<{ field: SortConfig['field']; order: SortConfig['order']; label: string }> = [
  { field: 'createdAt', order: 'desc', label: '最新创建' },
  { field: 'createdAt', order: 'asc', label: '最早创建' },
  { field: 'updatedAt', order: 'desc', label: '最近更新' },
  { field: 'updatedAt', order: 'asc', label: '最早更新' },
  { field: 'title', order: 'asc', label: '标题 A-Z' }
]

export default function SortSelector() {
  const { sortConfig, setSortConfig } = useContentStore()

  // 将当前配置转换为选择值
  const currentValue = `${sortConfig.field}-${sortConfig.order}`

  const handleChange = (value: string) => {
    const [field, order] = value.split('-') as [SortConfig['field'], SortConfig['order']]
    setSortConfig({ field, order })
  }

  return (
    <FormControl size="small" sx={{ minWidth: 120 }}>
      <Select
        value={currentValue}
        onChange={(e) => handleChange(e.target.value)}
        displayEmpty
        startAdornment={
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 0.5 }}>
            <SortIcon fontSize="small" />
          </Box>
        }
        sx={{
          '& .MuiSelect-select': {
            py: 0.75
          }
        }}
      >
        {SORT_OPTIONS.map(option => (
          <MenuItem
            key={`${option.field}-${option.order}`}
            value={`${option.field}-${option.order}`}
          >
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}
