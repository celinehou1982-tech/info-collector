import type { VercelRequest, VercelResponse } from '@vercel/node'
import RssParser from 'rss-parser'
import axios from 'axios'
import { JSDOM } from 'jsdom'
import { Readability } from '@mozilla/readability'
import TurndownService from 'turndown'

// 初始化 Turndown 服务
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
})

// 自定义规则：处理图片
turndownService.addRule('images', {
  filter: 'img',
  replacement: (content, node: any) => {
    const alt = node.getAttribute('alt') || ''
    const src = node.getAttribute('src') || ''
    const title = node.getAttribute('title') || ''
    return src ? `![${alt}](${src}${title ? ` "${title}"` : ''})` : ''
  }
})

/**
 * 抓取网页完整内容
 */
async function scrapeFullContent(url: string): Promise<string> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
      },
      timeout: 30000,
      maxRedirects: 5
    })

    const html = response.data
    const dom = new JSDOM(html, { url })
    const document = dom.window.document

    // 使用 Readability 解析文章
    const reader = new Readability(document)
    const article = reader.parse()

    if (!article || !article.content) {
      return '' // 返回空字符串，使用RSS原始内容
    }

    // 转换为 Markdown
    const markdown = turndownService.turndown(article.content)
    return markdown
  } catch (error) {
    console.error(`抓取完整内容失败 (${url}):`, error)
    return '' // 失败时返回空字符串
  }
}

/**
 * 检查内容是否需要抓取完整版本
 */
function needsFullContent(content: string): boolean {
  if (!content) return true

  // 如果内容太短（少于200字符），可能只是摘要
  if (content.length < 200) return true

  // 如果内容包含"阅读更多"、"继续阅读"等提示
  const readMorePatterns = /read more|continue reading|阅读更多|继续阅读|查看全文/i
  if (readMorePatterns.test(content)) return true

  return false
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 设置CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const { url } = req.body

    if (!url) {
      return res.status(400).json({
        success: false,
        error: '缺少RSS URL'
      })
    }

    console.log(`收到RSS抓取请求: ${url}`)

    const parser = new RssParser({
      timeout: 15000,
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

    // 转换为前端需要的格式，并在需要时抓取完整内容
    const items = await Promise.all(
      feed.items.slice(0, 10).map(async (item: any) => { // 限制最多处理10条
        let content = item.contentEncoded || item.content || item.description || ''

        // 如果内容不足，尝试抓取完整网页
        if (item.link && needsFullContent(content)) {
          console.log(`RSS项内容不足，尝试抓取完整内容: ${item.link}`)
          const fullContent = await scrapeFullContent(item.link)
          if (fullContent) {
            content = fullContent
            console.log(`成功抓取完整内容，长度: ${fullContent.length}`)
          } else {
            console.log(`抓取失败，使用RSS原始内容`)
          }
        }

        return {
          title: item.title || '',
          content,
          link: item.link || '',
          author: item.creator || item.author || undefined,
          publishDate: item.pubDate || item.isoDate || undefined,
          guid: item.guid || item.id || undefined
        }
      })
    )

    return res.json({
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

    return res.status(500).json({
      success: false,
      error: errorMessage
    })
  }
}
