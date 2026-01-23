import { useState } from 'react'
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  Fab,
  useTheme,
  useMediaQuery,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material'
import {
  Menu as MenuIcon,
  Add as AddIcon,
  Settings as SettingsIcon,
  Search as SearchIcon,
  Summarize as SummarizeIcon,
  RssFeed as RssIcon,
  Explore as ExploreIcon,
  ViewList as ListIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material'
import CategoryTree from '../CategoryTree/CategoryTree'
import ContentList from '../ContentList/ContentList'
import ContentDetail from '../ContentDetail/ContentDetail'
import InputPanel from '../InputPanel/InputPanel'
import SearchPanel from '../Search/SearchPanel'
import TagCloud from '../Search/TagCloud'
import SettingsDialog from '../Settings/SettingsDialog'
import SummaryDialog from '../Summary/SummaryDialog'
import SubscriptionDialog from '../Subscription/SubscriptionDialog'
import DiscoverFeed from '../Discover/DiscoverFeed'
import { useContentStore } from '../../store/contentStore'

const DRAWER_WIDTH = 280

export default function MainLayout() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [inputPanelOpen, setInputPanelOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [subscriptionOpen, setSubscriptionOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'library' | 'discover'>('library')
  const [moreMenuAnchor, setMoreMenuAnchor] = useState<null | HTMLElement>(null)
  const { selectedContent } = useContentStore()

  const handleDrawerToggle = () => {
    setMobileDrawerOpen(!mobileDrawerOpen)
  }

  const handleMoreMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMoreMenuAnchor(event.currentTarget)
  }

  const handleMoreMenuClose = () => {
    setMoreMenuAnchor(null)
  }

  const handleMenuAction = (action: () => void) => {
    action()
    handleMoreMenuClose()
  }

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          目录
        </Typography>
      </Toolbar>
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
        <CategoryTree />
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* 顶部导航栏 */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Catch4You
          </Typography>

          {/* 移动端：只显示新增和更多菜单 */}
          {isMobile ? (
            <>
              <IconButton color="inherit" onClick={() => setInputPanelOpen(true)} title="新增内容">
                <AddIcon />
              </IconButton>
              <IconButton color="inherit" onClick={handleMoreMenuOpen} title="更多">
                <MoreVertIcon />
              </IconButton>
            </>
          ) : (
            /* 桌面端：显示所有按钮 */
            <>
              <IconButton color="inherit" onClick={() => setInputPanelOpen(true)} title="新增内容">
                <AddIcon />
              </IconButton>
              <IconButton
                color="inherit"
                onClick={() => setViewMode(viewMode === 'library' ? 'discover' : 'library')}
                title={viewMode === 'library' ? '社区分享' : '我的库'}
              >
                {viewMode === 'library' ? <ExploreIcon /> : <ListIcon />}
              </IconButton>
              <IconButton color="inherit" onClick={() => setSubscriptionOpen(true)} title="RSS订阅">
                <RssIcon />
              </IconButton>
              <IconButton color="inherit" onClick={() => setSummaryOpen(true)} title="汇总生成">
                <SummarizeIcon />
              </IconButton>
              <IconButton color="inherit" onClick={() => setSearchOpen(!searchOpen)} title="搜索">
                <SearchIcon />
              </IconButton>
              <IconButton color="inherit" onClick={() => setSettingsOpen(true)} title="设置">
                <SettingsIcon />
              </IconButton>
            </>
          )}
        </Toolbar>
      </AppBar>

      {/* 左侧边栏 - 目录树 */}
      {!isMobile && (
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
            },
          }}
        >
          <Toolbar />
          {drawerContent}
        </Drawer>
      )}

      {/* 移动端抽屉 */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={mobileDrawerOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* 主内容区 */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          overflow: 'hidden',
        }}
      >
        <Toolbar />

        {/* 内容列表和详情 */}
        <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
          {/* 内容列表或推荐广场 */}
          <Box
            sx={{
              width: selectedContent && !isMobile && viewMode === 'library' ? '40%' : '100%',
              borderRight: selectedContent && !isMobile && viewMode === 'library' ? 1 : 0,
              borderColor: 'divider',
              overflow: 'auto',
            }}
          >
            {/* 搜索和标签云 - 仅在我的库模式显示 */}
            {searchOpen && viewMode === 'library' && (
              <Box sx={{ p: 2 }}>
                <SearchPanel />
                <TagCloud />
              </Box>
            )}
            {viewMode === 'library' ? <ContentList /> : <DiscoverFeed />}
          </Box>

          {/* 内容详情 - 仅在我的库模式显示 */}
          {selectedContent && !isMobile && viewMode === 'library' && (
            <Box sx={{ width: '60%', overflow: 'auto' }}>
              <ContentDetail />
            </Box>
          )}

          {/* 移动端全屏详情 - 仅在我的库模式显示 */}
          {selectedContent && isMobile && viewMode === 'library' && (
            <Box
              sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                bgcolor: 'background.default',
                zIndex: theme.zIndex.appBar - 1,
              }}
            >
              <Toolbar />
              <ContentDetail />
            </Box>
          )}
        </Box>
      </Box>

      {/* 添加内容按钮 */}
      <Fab
        color="primary"
        aria-label="add"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
        }}
        onClick={() => setInputPanelOpen(true)}
      >
        <AddIcon />
      </Fab>

      {/* 输入面板 */}
      <InputPanel
        open={inputPanelOpen}
        onClose={() => setInputPanelOpen(false)}
      />

      {/* 设置对话框 */}
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      {/* 汇总文档对话框 */}
      <SummaryDialog
        open={summaryOpen}
        onClose={() => setSummaryOpen(false)}
      />

      {/* 订阅管理对话框 */}
      <SubscriptionDialog
        open={subscriptionOpen}
        onClose={() => setSubscriptionOpen(false)}
      />

      {/* 移动端更多菜单 */}
      <Menu
        anchorEl={moreMenuAnchor}
        open={Boolean(moreMenuAnchor)}
        onClose={handleMoreMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={() => handleMenuAction(() => setViewMode(viewMode === 'library' ? 'discover' : 'library'))}>
          <ListItemIcon>
            {viewMode === 'library' ? <ExploreIcon fontSize="small" /> : <ListIcon fontSize="small" />}
          </ListItemIcon>
          <ListItemText>{viewMode === 'library' ? '社区分享' : '我的库'}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleMenuAction(() => setSubscriptionOpen(true))}>
          <ListItemIcon>
            <RssIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>RSS订阅</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleMenuAction(() => setSummaryOpen(true))}>
          <ListItemIcon>
            <SummarizeIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>汇总生成</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => handleMenuAction(() => setSearchOpen(!searchOpen))}>
          <ListItemIcon>
            <SearchIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>搜索</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleMenuAction(() => setSettingsOpen(true))}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>设置</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  )
}
