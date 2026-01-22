import { Box, Typography, Button } from '@mui/material'

function App() {
  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h3" gutterBottom>
        测试页面
      </Typography>
      <Typography variant="body1" gutterBottom>
        如果您能看到这段文字，说明React和Material-UI正常工作！
      </Typography>
      <Button variant="contained" sx={{ mt: 2 }}>
        测试按钮
      </Button>
    </Box>
  )
}

export default App
