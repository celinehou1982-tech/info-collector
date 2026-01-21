import axios from 'axios'
import { JSDOM } from 'jsdom'
import { Readability } from '@mozilla/readability'
import TurndownService from 'turndown'

export interface ScrapeResult {
  success: boolean
  data?: {
    title: string
    content: string
    author?: string
    publishDate?: Date
    excerpt?: string
  }
  error?: string
}

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
 * 抓取网页内容
 */
export async function scrapeWebPage(url: string): Promise<ScrapeResult> {
  try {
    console.log(`开始抓取: ${url}`)

    // 检查是否是微信公众号文章
    if (url.includes('mp.weixin.qq.com')) {
      return await scrapeWechatArticle(url)
    }

    // 检查是否是飞书文档
    if (url.includes('feishu.cn') || url.includes('larksuite.com')) {
      return await scrapeFeishuDoc(url)
    }

    // 获取网页内容
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'max-age=0',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="131", "Google Chrome";v="131"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"macOS"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'Referer': 'https://www.google.com/'
      },
      timeout: 30000,
      maxRedirects: 5
    })

    const html = response.data

    // 使用 JSDOM 解析 HTML
    const dom = new JSDOM(html, { url })
    const reader = new Readability(dom.window.document)
    const article = reader.parse()

    if (!article) {
      return {
        success: false,
        error: '无法解析网页内容'
      }
    }

    // 转换为 Markdown
    const markdown = turndownService.turndown(article.content)

    console.log(`抓取成功: ${article.title}`)

    return {
      success: true,
      data: {
        title: article.title || '无标题',
        content: markdown,
        author: article.byline || undefined,
        excerpt: article.excerpt || undefined
      }
    }
  } catch (error) {
    console.error('抓取失败:', error)

    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        return {
          success: false,
          error: '请求超时，请检查网络连接或URL是否正确'
        }
      }
      if (error.response) {
        return {
          success: false,
          error: `HTTP错误: ${error.response.status} ${error.response.statusText}`
        }
      }
      if (error.request) {
        return {
          success: false,
          error: '无法连接到目标网站'
        }
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

/**
 * 抓取微信公众号文章
 */
async function scrapeWechatArticle(url: string): Promise<ScrapeResult> {
  try {
    console.log('抓取微信公众号文章')

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
        'Accept': 'text/html,application/xhtml+xml'
      },
      timeout: 30000
    })

    const html = response.data
    const dom = new JSDOM(html)
    const document = dom.window.document

    // 提取标题
    const titleElement = document.querySelector('#activity-name, .rich_media_title')
    const title = titleElement?.textContent?.trim() || '无标题'

    // 提取作者
    const authorElement = document.querySelector('#js_name, .rich_media_meta_text')
    const author = authorElement?.textContent?.trim()

    // 提取正文
    const contentElement = document.querySelector('#js_content, .rich_media_content')

    if (!contentElement) {
      return {
        success: false,
        error: '无法找到文章内容'
      }
    }

    // 清理一些微信特有的元素
    const elementsToRemove = contentElement.querySelectorAll('script, style, .js_video_channel_container')
    elementsToRemove.forEach(el => el.remove())

    // 转换为 Markdown
    const markdown = turndownService.turndown(contentElement.innerHTML)

    return {
      success: true,
      data: {
        title,
        content: markdown,
        author
      }
    }
  } catch (error) {
    console.error('抓取微信文章失败:', error)
    return {
      success: false,
      error: '抓取微信公众号文章失败，可能需要在微信中打开'
    }
  }
}

/**
 * 抓取飞书文档
 */
async function scrapeFeishuDoc(url: string): Promise<ScrapeResult> {
  try {
    console.log('抓取飞书文档')

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      timeout: 30000
    })

    const html = response.data
    const dom = new JSDOM(html)
    const document = dom.window.document

    // 尝试多种方式提取标题
    let title =
      document.querySelector('title')?.textContent?.trim() ||
      document.querySelector('h1')?.textContent?.trim() ||
      document.querySelector('[data-testid="title"]')?.textContent?.trim() ||
      document.querySelector('.doc-title')?.textContent?.trim() ||
      '无标题'

    // 清理标题（飞书通常会在标题后加 " - 飞书云文档"）
    title = title.replace(/\s*[-–—]\s*(飞书|Feishu|Lark).*$/i, '').trim()

    // 尝试多种方式提取正文内容
    const contentSelectors = [
      '[data-testid="docx-content"]',
      '[data-testid="doc-content"]',
      '.doc-content',
      '.docx-content',
      '[class*="content"]',
      'article',
      'main',
      '[role="main"]'
    ]

    let contentElement = null
    for (const selector of contentSelectors) {
      contentElement = document.querySelector(selector)
      if (contentElement && contentElement.textContent && contentElement.textContent.trim().length > 100) {
        break
      }
    }

    if (!contentElement || !contentElement.textContent || contentElement.textContent.trim().length < 50) {
      // 如果找不到合适的内容容器，尝试提取body中的文本
      const bodyText = document.body.textContent?.trim() || ''

      if (bodyText.length < 100) {
        return {
          success: false,
          error: '无法提取飞书文档内容。可能的原因：\n1. 文档需要登录访问\n2. 文档未公开分享\n3. 文档内容是动态加载的\n\n建议：在飞书中打开文档，复制内容后使用"文本"模式粘贴'
        }
      }

      // 使用body文本作为降级方案
      return {
        success: true,
        data: {
          title,
          content: bodyText.substring(0, 5000), // 限制长度
          author: undefined
        }
      }
    }

    // 清理一些飞书特有的元素
    const elementsToRemove = contentElement.querySelectorAll('script, style, [class*="comment"], [class*="toolbar"]')
    elementsToRemove.forEach(el => el.remove())

    // 转换为 Markdown
    const markdown = turndownService.turndown(contentElement.innerHTML)

    console.log(`飞书文档抓取成功: ${title}`)

    return {
      success: true,
      data: {
        title,
        content: markdown,
        author: undefined
      }
    }
  } catch (error) {
    console.error('抓取飞书文档失败:', error)

    if (axios.isAxiosError(error)) {
      if (error.response?.status === 403 || error.response?.status === 401) {
        return {
          success: false,
          error: '无法访问飞书文档，可能需要登录或权限。\n\n建议：\n1. 确保文档已设置为"获得链接的任何人可阅读"\n2. 或在飞书中打开文档，复制内容后使用"文本"模式粘贴'
        }
      }
    }

    return {
      success: false,
      error: '抓取飞书文档失败，建议手动复制内容'
    }
  }
}

/**
 * 批量抓取多个URL
 */
export async function scrapeMultiple(urls: string[]): Promise<ScrapeResult[]> {
  return Promise.all(urls.map(url => scrapeWebPage(url)))
}
