import { Content, Category } from '../types'

/**
 * 生成汇总文档
 */
export async function generateSummaryDocument(
  contents: Content[],
  categories: Category[]
): Promise<string> {
  const now = new Date().toLocaleDateString('zh-CN')

  // 按创建时间倒序排列
  const sortedContents = [...contents].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  // 生成文档
  let doc = `# 信息汇总文档\n\n`
  doc += `生成时间：${now}\n`
  doc += `内容数量：${sortedContents.length}\n\n`

  // 生成目录
  doc += `## 目录\n\n`
  sortedContents.forEach((content, index) => {
    doc += `${index + 1}. [${content.title}](#content-${index + 1})\n`
  })
  doc += `\n---\n\n`

  // 提取所有核心观点
  const allKeyPoints: string[] = []
  sortedContents.forEach(content => {
    if (content.keyPoints && content.keyPoints.length > 0) {
      allKeyPoints.push(...content.keyPoints)
    }
  })

  if (allKeyPoints.length > 0) {
    doc += `## 核心观点汇总\n\n`
    allKeyPoints.forEach((point, index) => {
      doc += `${index + 1}. ${point}\n`
    })
    doc += `\n---\n\n`
  }

  // 详细内容
  doc += `## 详细内容\n\n`

  sortedContents.forEach((content, index) => {
    doc += `### ${index + 1}. ${content.title} {#content-${index + 1}}\n\n`

    // 元信息
    doc += `**创建时间：** ${new Date(content.createdAt).toLocaleDateString('zh-CN')}\n\n`

    if (content.author) {
      doc += `**作者：** ${content.author}\n\n`
    }

    if (content.sourceUrl) {
      doc += `**来源：** ${content.sourceUrl}\n\n`
    }

    // 分类
    if (content.categoryIds.length > 0) {
      const categoryNames = content.categoryIds
        .map(id => categories.find(c => c.id === id)?.name)
        .filter(Boolean)
        .join('、')
      doc += `**分类：** ${categoryNames}\n\n`
    }

    // 标签
    if (content.tags.length > 0) {
      doc += `**标签：** ${content.tags.join('、')}\n\n`
    }

    // 摘要
    if (content.summary) {
      doc += `**摘要：**\n\n${content.summary}\n\n`
    }

    // 核心观点
    if (content.keyPoints && content.keyPoints.length > 0) {
      doc += `**核心观点：**\n\n`
      content.keyPoints.forEach(point => {
        doc += `- ${point}\n`
      })
      doc += `\n`
    }

    // 正文（可选：只显示前500字）
    const contentPreview = content.content.substring(0, 500)
    doc += `**正文预览：**\n\n${contentPreview}${content.content.length > 500 ? '...' : ''}\n\n`

    doc += `[查看完整内容](#content-${index + 1})\n\n`
    doc += `---\n\n`
  })

  // 引用来源
  if (sortedContents.some(c => c.sourceUrl)) {
    doc += `## 引用来源\n\n`
    sortedContents.forEach((content, index) => {
      if (content.sourceUrl) {
        doc += `${index + 1}. ${content.title} - ${content.sourceUrl}\n`
      }
    })
    doc += `\n`
  }

  return doc
}

/**
 * 导出为HTML格式
 */
export function convertMarkdownToHTML(markdown: string): string {
  // 简单的Markdown到HTML转换
  let html = markdown

  // 标题
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')

  // 粗体
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

  // 链接
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')

  // 列表
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>')
  html = html.replace(/(<li>.*<\/li>\n)+/g, '<ul>$&</ul>')

  // 段落
  html = html.split('\n\n').map(para => `<p>${para}</p>`).join('\n')

  // 分隔线
  html = html.replace(/---/g, '<hr />')

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>信息汇总文档</title>
  <style>
    body {
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.6;
    }
    h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 30px; }
    h3 { color: #666; margin-top: 20px; }
    a { color: #007bff; text-decoration: none; }
    a:hover { text-decoration: underline; }
    ul { padding-left: 20px; }
    hr { border: none; border-top: 1px solid #ddd; margin: 20px 0; }
  </style>
</head>
<body>
${html}
</body>
</html>`
}
