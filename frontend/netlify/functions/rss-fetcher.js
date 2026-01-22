const Parser = require('rss-parser')

const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; Catch4You/1.0;)'
  },
  timeout: 15000
})

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

    console.log(`抓取RSS: ${url}`)

    // 解析RSS feed
    const feed = await parser.parseURL(url)

    // 提取最新的10条内容
    const items = (feed.items || []).slice(0, 10).map(item => ({
      title: item.title || '无标题',
      content: item.contentSnippet || item.summary || item.content || '',
      link: item.link || '',
      author: item.creator || item.author || undefined,
      publishDate: item.pubDate || item.isoDate || undefined,
      guid: item.guid || item.link
    }))

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        data: {
          feed: {
            title: feed.title,
            description: feed.description,
            link: feed.link
          },
          items
        }
      })
    }
  } catch (error) {
    console.error('RSS抓取失败:', error.message)

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: error.message || 'RSS抓取失败'
      })
    }
  }
}
