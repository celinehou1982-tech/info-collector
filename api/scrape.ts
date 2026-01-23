import type { VercelRequest, VercelResponse } from '@vercel/node'
import axios from 'axios'
import { JSDOM } from 'jsdom'
import { Readability } from '@mozilla/readability'
import TurndownService from 'turndown'

// Initialize Turndown service
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
})

// Custom rule for images
turndownService.addRule('images', {
  filter: 'img',
  replacement: (content, node: any) => {
    const alt = node.getAttribute('alt') || ''
    const src = node.getAttribute('src') || ''
    const title = node.getAttribute('title') || ''
    return src ? `![${alt}](${src}${title ? ` "${title}"` : ''})` : ''
  }
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
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
        error: '缺少URL参数'
      })
    }

    // Validate URL
    try {
      new URL(url)
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'URL格式不正确'
      })
    }

    console.log(`收到抓取请求: ${url}`)

    // Fetch webpage
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

    // 微信公众号特殊处理：优先使用直接提取，因为Readability会丢失大量内容
    if (url.includes('mp.weixin.qq.com')) {
      // 处理懒加载图片
      const images = document.querySelectorAll('img[data-src]')
      images.forEach(img => {
        const dataSrc = img.getAttribute('data-src')
        if (dataSrc && !img.getAttribute('src')) {
          img.setAttribute('src', dataSrc)
        }
      })

      const title = document.querySelector('#activity-name')?.textContent?.trim() ||
                   document.querySelector('.rich_media_title')?.textContent?.trim() ||
                   document.querySelector('title')?.textContent?.trim() ||
                   '无标题'

      const author = document.querySelector('#js_name')?.textContent?.trim() ||
                    document.querySelector('.rich_media_meta_text')?.textContent?.trim()

      const contentElement = document.querySelector('#js_content') ||
                            document.querySelector('.rich_media_content')

      if (contentElement && contentElement.innerHTML.trim().length > 50) {
        // 清理一些不需要的元素
        const elementsToRemove = contentElement.querySelectorAll('script, style, mpvoice')
        elementsToRemove.forEach(el => el.remove())

        // 只提取纯文本内容（不要Markdown格式）
        const plainText = contentElement.textContent?.trim() || ''

        // 清理多余的空白字符
        const cleanText = plainText
          .replace(/\n\s*\n\s*\n/g, '\n\n')  // 多个连续换行变成两个
          .replace(/[ \t]+/g, ' ')            // 多个连续空格变成一个
          .trim()

        console.log(`微信文章抓取成功: ${title}, 内容长度: ${cleanText.length}`)

        return res.json({
          success: true,
          data: {
            title,
            content: cleanText,
            author
          }
        })
      }
    }

    // 对于非微信网站，使用 Readability 解析文章
    const reader = new Readability(document)
    const article = reader.parse()

    if (!article) {
      return res.status(500).json({
        success: false,
        error: '无法解析网页内容'
      })
    }

    // Convert to Markdown
    const markdown = turndownService.turndown(article.content)

    console.log(`抓取成功: ${article.title}`)

    return res.json({
      success: true,
      data: {
        title: article.title || '无标题',
        content: markdown,
        author: article.byline || undefined,
        excerpt: article.excerpt || undefined
      }
    })
  } catch (error) {
    console.error('抓取错误:', error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '抓取失败'
    })
  }
}
