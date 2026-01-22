import express, { Request, Response } from 'express'
import cors from 'cors'
import Parser from 'rss-parser'
import { scrapeWebPage } from './services/scraper'
import { generateSummary, generateSimpleSummary, extractSimpleKeyPoints } from './services/ai'
import { recognizeImage } from './services/ocr'
import analyticsRouter from './routes/analytics'

const app = express()
const PORT = process.env.PORT || 3001

// CORS配置
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL || '*' // 生产环境使用环境变量指定的前端URL
    : '*', // 开发环境允许所有来源
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}

// 中间件
app.use(cors(corsOptions))
app.use(express.json({ limit: '100mb' })) // 增加请求体大小限制以支持图片上传
app.use(express.urlencoded({ limit: '100mb', extended: true }))

// 挂载路由
app.use('/api/analytics', analyticsRouter)

// 错误处理中间件 - 处理请求体过大错误
app.use((err: any, req: Request, res: Response, next: any) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: '上传的文件过大，请确保图片或PDF文件不超过100MB'
    })
  }
  next(err)
})

// 健康检查
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Server is running' })
})

// 抓取网页API
app.post('/api/scrape', async (req: Request, res: Response) => {
  try {
    const { url } = req.body

    if (!url) {
      return res.status(400).json({
        success: false,
        error: '缺少URL参数'
      })
    }

    // 验证URL格式
    try {
      new URL(url)
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'URL格式不正确'
      })
    }

    console.log(`收到抓取请求: ${url}`)

    // 执行抓取
    const result = await scrapeWebPage(url)

    if (result.success) {
      res.json(result)
    } else {
      res.status(500).json(result)
    }
  } catch (error) {
    console.error('API错误:', error)
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    })
  }
})

// 批量抓取API（可选）
app.post('/api/scrape/batch', async (req: Request, res: Response) => {
  try {
    const { urls } = req.body

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({
        success: false,
        error: '缺少URLs参数或格式不正确'
      })
    }

    if (urls.length > 10) {
      return res.status(400).json({
        success: false,
        error: '一次最多抓取10个URL'
      })
    }

    console.log(`收到批量抓取请求: ${urls.length}个URL`)

    const results = await Promise.all(
      urls.map(url => scrapeWebPage(url))
    )

    res.json({
      success: true,
      results
    })
  } catch (error) {
    console.error('批量抓取错误:', error)
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    })
  }
})

// AI摘要生成API
app.post('/api/ai/summary', async (req: Request, res: Response) => {
  try {
    const { content, title, provider, apiKey, model, baseUrl } = req.body

    console.log('收到AI摘要请求参数:', {
      title,
      provider,
      hasApiKey: !!apiKey,
      model: model || '(未指定)',
      baseUrl: baseUrl || '(未设置)'
    })

    if (!content || !title) {
      return res.status(400).json({
        success: false,
        error: '缺少content或title参数'
      })
    }

    if (!provider || !apiKey) {
      // 使用降级方案
      console.log('使用降级方案生成摘要')
      const summary = generateSimpleSummary(content)
      const keyPoints = extractSimpleKeyPoints(content)

      return res.json({
        success: true,
        data: {
          summary: summary || '无法生成摘要',
          keyPoints: keyPoints // 如果为空就是空数组，不强制添加默认值
        }
      })
    }

    console.log(`收到AI摘要请求: ${title} (使用${provider})`)

    // 使用AI生成摘要
    const result = await generateSummary({
      content,
      title,
      provider,
      apiKey,
      model,
      baseUrl
    })

    if (result.success) {
      res.json(result)
    } else {
      res.status(500).json(result)
    }
  } catch (error) {
    console.error('AI摘要API错误:', error)
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    })
  }
})

// OCR识别API
app.post('/api/ocr', async (req: Request, res: Response) => {
  try {
    const { imageBase64, provider, apiKey, language } = req.body

    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        error: '缺少图片数据'
      })
    }

    console.log(`收到OCR请求 (使用${provider || 'tesseract'})`)

    const result = await recognizeImage({
      imageBase64,
      provider,
      apiKey,
      language
    })

    if (result.success) {
      res.json(result)
    } else {
      res.status(500).json(result)
    }
  } catch (error) {
    console.error('OCR API错误:', error)
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    })
  }
})

// RSS抓取API
app.post('/api/rss', async (req: Request, res: Response) => {
  try {
    const { url } = req.body

    if (!url) {
      return res.status(400).json({
        success: false,
        error: '缺少RSS URL'
      })
    }

    console.log(`收到RSS抓取请求: ${url}`)

    const parser = new Parser({
      timeout: 15000, // 15秒超时
      customFields: {
        item: [
          ['content:encoded', 'contentEncoded'],
          ['description', 'description']
        ]
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; InfoCollector/1.0; +http://example.com)'
      }
    })

    const feed = await parser.parseURL(url)

    console.log(`RSS抓取成功: ${url}, 获取到 ${feed.items.length} 条内容`)

    // 转换为前端需要的格式
    const items = feed.items.map(item => ({
      title: item.title || '',
      content: item.contentEncoded || item.content || item.description || '',
      link: item.link || '',
      author: item.creator || item.author || undefined,
      publishDate: item.pubDate || item.isoDate || undefined,
      guid: item.guid || item.id || undefined
    }))

    res.json({
      success: true,
      data: {
        feed: {
          title: feed.title || '',
          description: feed.description || '',
          link: feed.link || ''
        },
        items
      }
    })
  } catch (error) {
    console.error('RSS抓取错误:', error)
    const errorMessage = error instanceof Error ? error.message : 'RSS抓取失败'
    console.error('错误详情:', errorMessage)

    res.status(500).json({
      success: false,
      error: errorMessage
    })
  }
})

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`)
  console.log(`📝 API端点:`)
  console.log(`   - POST http://localhost:${PORT}/api/scrape`)
  console.log(`   - POST http://localhost:${PORT}/api/scrape/batch`)
  console.log(`   - POST http://localhost:${PORT}/api/ai/summary`)
  console.log(`   - POST http://localhost:${PORT}/api/ocr`)
  console.log(`   - POST http://localhost:${PORT}/api/rss`)
  console.log(`   - GET  http://localhost:${PORT}/api/analytics/admin/summary`)
})

export default app
