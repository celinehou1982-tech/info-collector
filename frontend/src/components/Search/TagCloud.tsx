import { Paper, Box, Chip, Typography } from '@mui/material'
import { useContentStore } from '../../store/contentStore'

export default function TagCloud() {
  const { contents, filters, setTagFilter } = useContentStore()

  // 统计标签使用次数
  const tagCounts = contents.reduce((acc, content) => {
    content.tags.forEach(tag => {
      acc[tag] = (acc[tag] || 0) + 1
    })
    return acc
  }, {} as Record<string, number>)

  // 按使用次数排序
  const sortedTags = Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20) // 只显示前20个标签

  if (sortedTags.length === 0) {
    return null
  }

  const maxCount = Math.max(...sortedTags.map(([, count]) => count))
  const minCount = Math.min(...sortedTags.map(([, count]) => count))

  // 计算标签大小（基于使用频率）
  const getTagSize = (count: number) => {
    if (maxCount === minCount) return 'medium'
    const ratio = (count - minCount) / (maxCount - minCount)
    if (ratio > 0.66) return 'medium'
    if (ratio > 0.33) return 'small'
    return 'small'
  }

  const handleTagClick = (tag: string) => {
    // 切换标签筛选
    if (filters.tags.includes(tag)) {
      setTagFilter(filters.tags.filter(t => t !== tag))
    } else {
      setTagFilter([...filters.tags, tag])
    }
  }

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        标签云
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {sortedTags.map(([tag, count]) => (
          <Chip
            key={tag}
            label={`${tag} (${count})`}
            size={getTagSize(count)}
            onClick={() => handleTagClick(tag)}
            color={filters.tags.includes(tag) ? 'primary' : 'default'}
            sx={{ cursor: 'pointer' }}
          />
        ))}
      </Box>
    </Paper>
  )
}
