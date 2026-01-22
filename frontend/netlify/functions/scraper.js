const https = require('https')
const http = require('http')
const { URL } = require('url')
const cheerio = require('cheerio')
const TurndownService = require('turndown')

// 使用原生https/http模块发起请求
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url)
    const protocol = parsedUrl.protocol === 'https:' ? https : http

    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 30000
    }

    protocol.get(url, options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => resolve(data))
    }).on('error', reject).on('timeout', () => reject(new Error('Request timeout')))
  })
}

exports.handler = async (event, context) => {
  // 只允许 POST 请求
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { url } = JSON.parse(event.body)

    if (!url) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: '缺少URL参数'
        })
      }
    }

    console.log(`抓取URL: ${url}`)

    // 发起HTTP请求
    const html = await fetchUrl(url)
    const $ = cheerio.load(html)

    // 提取标题
    let title = $('title').text().trim()
    if (!title) {
      title = $('h1').first().text().trim() || '无标题'
    }

    // 提取正文内容
    // 移除不需要的元素
    $('script, style, nav, header, footer, aside, .ad, .advertisement').remove()

    // 尝试找到主要内容区域
    let content = ''
    const mainSelectors = ['article', 'main', '.content', '.post', '#content', '.article']

    for (const selector of mainSelectors) {
      const element = $(selector).first()
      if (element.length > 0 && element.text().trim().length > 100) {
        content = element.html()
        break
      }
    }

    // 如果没有找到主要内容，使用body
    if (!content) {
      content = $('body').html()
    }

    // 转换为Markdown
    const turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced'
    })

    const markdown = turndownService.turndown(content || '')

    // 提取作者和发布日期（尝试常见的meta标签）
    const author = $('meta[name="author"]').attr('content') ||
                   $('meta[property="article:author"]').attr('content') ||
                   $('.author').first().text().trim() ||
                   undefined

    const publishDate = $('meta[property="article:published_time"]').attr('content') ||
                       $('meta[name="date"]').attr('content') ||
                       $('.publish-date').first().text().trim() ||
                       undefined

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        data: {
          title: title.substring(0, 200), // 限制标题长度
          content: markdown.substring(0, 50000), // 限制内容长度
          author: author,
          publishDate: publishDate
        }
      })
    }
  } catch (error) {
    console.error('抓取失败:', error.message)

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: error.message || '抓取失败'
      })
    }
  }
}
