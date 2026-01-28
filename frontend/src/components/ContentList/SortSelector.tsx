import { useState } from 'react'
import { Button, Menu, MenuItem } from '@mui/material'
import { Sort as SortIcon, KeyboardArrowDown as ArrowDownIcon } from '@mui/icons-material'
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
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  // 获取当前选中的排序选项
  const currentOption = SORT_OPTIONS.find(
    option => option.field === sortConfig.field && option.order === sortConfig.order
  )

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleSelect = (field: SortConfig['field'], order: SortConfig['order']) => {
    setSortConfig({ field, order })
    handleClose()
  }

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        startIcon={<SortIcon />}
        endIcon={<ArrowDownIcon />}
        onClick={handleClick}
        aria-controls={open ? 'sort-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
      >
        {currentOption?.label || '最新创建'}
      </Button>
      <Menu
        id="sort-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'sort-button',
        }}
      >
        {SORT_OPTIONS.map(option => (
          <MenuItem
            key={`${option.field}-${option.order}`}
            selected={option.field === sortConfig.field && option.order === sortConfig.order}
            onClick={() => handleSelect(option.field, option.order)}
          >
            {option.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}
