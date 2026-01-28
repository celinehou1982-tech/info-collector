# 内容排序功能需求文档

## 1. 功能概述

### 1.1 需求背景
用户希望在内容列表区域能够按照时间排序，默认降序排列（最新的内容排在最前面），以便快速查看最近添加的内容。

### 1.2 功能目标
- 提供内容排序功能，支持按时间排序
- 默认排序方式：按创建时间降序（最新→最旧）
- 用户可手动切换排序方式
- 保证现有功能不受影响

## 2. 详细需求

### 2.1 核心功能

#### 2.1.1 排序选项
支持以下排序方式：
1. **按创建时间降序**（默认） - 最新内容在前
2. **按创建时间升序** - 最旧内容在前
3. **按更新时间降序** - 最近更新的在前
4. **按更新时间升序** - 最早更新的在前
5. **按标题升序** - A-Z排序

#### 2.1.2 UI设计
- 在内容列表顶部工具栏添加排序下拉菜单
- 位置：标题统计区域右侧，批量操作按钮左侧
- 图标：使用 `Sort` 或 `SwapVert` Material-UI 图标
- 显示当前排序方式

#### 2.1.3 交互设计
- 点击排序下拉菜单显示所有排序选项
- 选择排序方式后立即生效
- 排序状态保存在 localStorage，页面刷新后保持
- 排序不影响搜索和筛选结果（先筛选，再排序）

### 2.2 技术实现

#### 2.2.1 数据结构
```typescript
// 排序配置类型
type SortField = 'createdAt' | 'updatedAt' | 'title'
type SortOrder = 'asc' | 'desc'

interface SortConfig {
  field: SortField
  order: SortOrder
}

// 默认配置
const DEFAULT_SORT: SortConfig = {
  field: 'createdAt',
  order: 'desc'
}
```

#### 2.2.2 Store 扩展
在 `contentStore.ts` 中添加：
```typescript
interface ContentState {
  // ... 现有属性
  sortConfig: SortConfig

  // 新增 actions
  setSortConfig: (config: SortConfig) => void
  applySorting: (contents: Content[]) => Content[]
}
```

#### 2.2.3 排序逻辑
```typescript
applySorting: (contents: Content[]) => {
  const { sortConfig } = get()
  const sorted = [...contents]

  sorted.sort((a, b) => {
    let compareValue = 0

    switch (sortConfig.field) {
      case 'createdAt':
      case 'updatedAt':
        compareValue = new Date(a[sortConfig.field]).getTime() -
                      new Date(b[sortConfig.field]).getTime()
        break
      case 'title':
        compareValue = a.title.localeCompare(b.title, 'zh-CN')
        break
    }

    return sortConfig.order === 'asc' ? compareValue : -compareValue
  })

  return sorted
}
```

#### 2.2.4 执行顺序
数据处理流程：
1. 从数据库加载所有内容
2. 应用筛选条件（目录、搜索、标签、日期范围）
3. **应用排序**（新增步骤）
4. 显示在列表中

### 2.3 UI组件

#### 2.3.1 排序选择器组件位置
文件：`/Users/houjie5/info-collector/frontend/src/components/ContentList/ContentList.tsx`

在第183-211行的工具栏区域添加排序选择器：
```tsx
<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
  <Typography variant="h6">
    {/* ... 现有标题 */}
  </Typography>
  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
    {/* 新增：排序选择器 */}
    <SortSelector />

    {/* 现有：批量操作按钮 */}
    {displayContents.length > 0 && (
      // ... 现有批量操作按钮
    )}
  </Box>
</Box>
```

#### 2.3.2 SortSelector 组件设计
```tsx
// 新建文件：frontend/src/components/ContentList/SortSelector.tsx
import { Select, MenuItem, FormControl, InputLabel, Box } from '@mui/material'
import { Sort as SortIcon } from '@mui/icons-material'
import { useContentStore } from '../../store/contentStore'

const SORT_OPTIONS = [
  { field: 'createdAt', order: 'desc', label: '最新创建' },
  { field: 'createdAt', order: 'asc', label: '最早创建' },
  { field: 'updatedAt', order: 'desc', label: '最近更新' },
  { field: 'updatedAt', order: 'asc', label: '最早更新' },
  { field: 'title', order: 'asc', label: '标题 A-Z' }
]

export default function SortSelector() {
  const { sortConfig, setSortConfig } = useContentStore()

  const currentValue = `${sortConfig.field}-${sortConfig.order}`

  return (
    <FormControl size="small" sx={{ minWidth: 120 }}>
      <Select
        value={currentValue}
        onChange={(e) => {
          const [field, order] = e.target.value.split('-')
          setSortConfig({ field, order })
        }}
        startAdornment={<SortIcon fontSize="small" sx={{ mr: 1 }} />}
        displayEmpty
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
```

## 3. 影响分析

### 3.1 受影响的功能模块

#### ✅ 不受影响（无需修改）
1. **内容添加/编辑/删除**
   - 原因：操作完成后会调用 `refreshContents()`，会自动重新排序

2. **目录筛选**
   - 原因：排序在筛选之后执行，互不干扰

3. **搜索功能**
   - 原因：排序在搜索筛选之后执行

4. **批量操作**
   - 原因：选择逻辑基于 ID，与顺序无关

5. **拖拽分类**
   - 原因：拖拽数据传输使用 ID，与显示顺序无关

6. **内容详情页**
   - 原因：直接通过 ID 获取，与列表排序无关

#### ⚠️ 需要适配的地方

1. **filteredContents 的使用**
   - 位置：`contentStore.ts` 第258行
   - 修改：在 `applyFilters()` 方法最后添加排序步骤
   ```typescript
   applyFilters: () => {
     // ... 现有筛选逻辑

     // 新增：应用排序
     const sorted = get().applySorting(filtered)
     set({ filteredContents: sorted })
   }
   ```

2. **初始加载**
   - 位置：`contentStore.ts` 第65-74行
   - 确保：`loadContents()` 调用 `applyFilters()` 会自动应用排序
   - 无需修改：已经调用了 `applyFilters()`

3. **localStorage 持久化**
   - 新增：保存/读取排序配置
   - 位置：初始化 store 时从 localStorage 读取
   ```typescript
   // 读取保存的排序配置
   const savedSort = localStorage.getItem('content-sort-config')
   const initialSort = savedSort ? JSON.parse(savedSort) : DEFAULT_SORT
   ```

### 3.2 性能影响分析

#### 3.2.1 排序性能
- 数据量：预计 < 1000 条内容
- 排序算法：JavaScript 原生 `Array.sort()`，时间复杂度 O(n log n)
- 性能影响：可忽略不计（< 10ms）

#### 3.2.2 优化建议
- 排序在客户端进行，不增加服务器负担
- 仅在筛选结果变化时重新排序
- 排序配置变化时立即排序，无需重新加载数据

### 3.3 用户体验影响

#### 3.3.1 积极影响
✅ 最新内容默认在最前面，符合用户期望
✅ 可自定义排序方式，满足不同使用场景
✅ 排序状态持久化，减少重复操作

#### 3.3.2 潜在问题及解决方案

**问题1：用户习惯的原有顺序被改变**
- 风险：低
- 原因：当前没有明确的排序逻辑（IndexedDB 返回顺序不确定）
- 解决：默认降序排列是最符合直觉的方式

**问题2：排序后批量选择可能困惑**
- 风险：低
- 原因：用户可能在某个排序下选择了内容，切换排序后位置变化
- 解决：保持选中状态，但内容位置会变化（这是正常行为）

**问题3：图片类型和非图片类型分开显示**
- 当前实现：ContentList 将内容分为 `imageContents` 和 `nonImageContents` 两组
- 解决方案：对两组分别应用排序
  ```typescript
  const imageContents = displayContents.filter(c => c.type === 'image')
  const nonImageContents = displayContents.filter(c => c.type !== 'image')
  ```
- 影响：排序会在各自组内生效，不影响图片和非图片的分组展示

## 4. 实施计划

### 4.1 开发步骤

#### Phase 1: 核心功能 (30分钟)
1. 扩展 `contentStore.ts`
   - 添加 `sortConfig` 状态
   - 实现 `applySorting()` 方法
   - 实现 `setSortConfig()` 方法
   - 在 `applyFilters()` 中调用排序

#### Phase 2: UI组件 (20分钟)
2. 创建 `SortSelector.tsx` 组件
3. 集成到 `ContentList.tsx`

#### Phase 3: 持久化 (10分钟)
4. 添加 localStorage 读写逻辑

#### Phase 4: 测试 (20分钟)
5. 测试各种排序方式
6. 测试与筛选功能的配合
7. 测试批量操作的兼容性
8. 测试刷新后状态保持

### 4.2 测试用例

#### 功能测试
- [ ] 默认按创建时间降序排列
- [ ] 切换到创建时间升序
- [ ] 切换到更新时间降序/升序
- [ ] 切换到标题排序
- [ ] 排序配置保存到 localStorage
- [ ] 刷新页面后排序状态保持

#### 兼容性测试
- [ ] 排序 + 目录筛选
- [ ] 排序 + 搜索
- [ ] 排序 + 标签筛选
- [ ] 排序 + 批量选择
- [ ] 排序 + 拖拽分类
- [ ] 添加新内容后自动按当前排序插入正确位置
- [ ] 更新内容后重新排序
- [ ] 删除内容后列表正确更新

#### 性能测试
- [ ] 100条内容排序响应时间 < 10ms
- [ ] 500条内容排序响应时间 < 50ms
- [ ] 切换排序无明显卡顿

### 4.3 回滚方案
如果发现严重问题：
1. 通过 Git 回滚相关提交
2. 或临时禁用排序功能（显示原始顺序）

## 5. 后续优化建议

### 5.1 可选增强功能
1. 支持多字段排序（如：先按目录，再按时间）
2. 在表格视图中支持点击列标题排序
3. 记住每个目录的独立排序设置
4. 添加"反转顺序"快捷按钮

### 5.2 数据分析
- 统计用户最常用的排序方式
- 根据使用数据优化默认排序

## 6. 总结

### 6.1 改动范围
- **新增文件**：1个（`SortSelector.tsx`）
- **修改文件**：2个（`contentStore.ts`、`ContentList.tsx`）
- **影响范围**：仅内容列表显示顺序，不影响数据存储和其他功能
- **风险等级**：低

### 6.2 保证现有体验
✅ 所有现有功能继续正常工作
✅ 用户界面保持一致性
✅ 性能无明显影响
✅ 数据完整性不受影响
✅ 可随时回滚

### 6.3 用户价值
- 快速查看最新内容
- 灵活的内容浏览方式
- 更好的内容管理体验
