// 临时简化的App来测试
import { Box, Typography } from '@mui/material'

function App() {
  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4">
        应用正在运行！
      </Typography>
      <Typography variant="body1" sx={{ mt: 2 }}>
        如果您能看到这个消息，说明基础配置是正常的。
      </Typography>
    </Box>
  )
}

export default App
