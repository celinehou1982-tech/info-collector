import type { VercelRequest, VercelResponse } from '@vercel/node'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'

// Inlined AI service code to avoid backend imports

async function generateWithOpenAI(req: {
  content: string
  title: string
  apiKey: string
  model?: string
  baseUrl?: string
}) {
  console.log('OpenAI配置 - API Key:', req.apiKey?.substring(0, 10) + '...', 'Base URL:', req.baseUrl || '(未设置)')

  const openai = new OpenAI({
    apiKey: req.apiKey,
    ...(req.baseUrl && { baseURL: req.baseUrl })
  })

  const model = req.model || 'gpt-4o-mini'

  const prompt = `请分析以下文章，并提供：
1. 一个简洁的摘要（200字以内）
2. 3-5个核心观点

文章标题：${req.title}

文章内容：
${req.content}

请以JSON格式返回结果：
{
  "summary": "摘要内容",
  "keyPoints": ["观点1", "观点2", "观点3"]
}`

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: '你是一个专业的内容分析助手，擅长提取文章的核心信息和观点。'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3
  })

  const result = completion.choices[0]?.message?.content
  if (!result) {
    throw new Error('AI返回空结果')
  }

  const parsed = JSON.parse(result)
  return {
    summary: parsed.summary || '',
    keyPoints: parsed.keyPoints || []
  }
}

async function generateWithAnthropic(req: {
  content: string
  title: string
  apiKey: string
  model?: string
  baseUrl?: string
}) {
  const anthropic = new Anthropic({
    apiKey: req.apiKey,
    ...(req.baseUrl && { baseURL: req.baseUrl })
  })

  const model = req.model || 'claude-3-5-sonnet-20241022'

  const prompt = `请分析以下文章，并提供：
1. 一个简洁的摘要（200字以内）
2. 3-5个核心观点

文章标题：${req.title}

文章内容：
${req.content}

请以JSON格式返回结果：
{
  "summary": "摘要内容",
  "keyPoints": ["观点1", "观点2", "观点3"]
}`

  const message = await anthropic.messages.create({
    model,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ]
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    throw new Error('返回格式错误')
  }

  let text = content.text
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    text = jsonMatch[0]
  }

  const parsed = JSON.parse(text)
  return {
    summary: parsed.summary || '',
    keyPoints: parsed.keyPoints || []
  }
}

function generateSimpleSummary(content: string, maxLength: number = 200): string {
  const cleaned = content.replace(/[#*\[\]`_~]/g, '').trim()
  const paragraphs = cleaned.split(/\n\n+/).filter(p => p.trim().length > 0)
  
  if (paragraphs.length === 0) {
    return content.substring(0, maxLength)
  }
  
  const firstParagraph = paragraphs[0]
  if (firstParagraph.length <= maxLength) {
    return firstParagraph
  }
  
  return firstParagraph.substring(0, maxLength) + '...'
}

function extractSimpleKeyPoints(content: string): string[] {
  const lines = content.split('\n')
  const points: string[] = []
  
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.match(/^#+\s+/) || trimmed.match(/^\d+\.\s+/) || trimmed.match(/^[-*]\s+/)) {
      const cleaned = trimmed.replace(/^#+\s+/, '').replace(/^\d+\.\s+/, '').replace(/^[-*]\s+/, '')
      if (cleaned.length > 10 && cleaned.length < 200) {
        points.push(cleaned)
        if (points.length >= 5) break
      }
    }
  }
  
  return points.length > 0 ? points : ['暂无核心观点']
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
    const { content, title, provider, apiKey, model, baseUrl } = req.body

    if (!content || !title) {
      return res.status(400).json({
        success: false,
        error: '缺少content或title参数'
      })
    }

    if (!provider || !apiKey) {
      console.log('使用降级方案生成摘要')
      const summary = generateSimpleSummary(content)
      const keyPoints = extractSimpleKeyPoints(content)

      return res.json({
        success: true,
        data: {
          summary: summary || '无法生成摘要',
          keyPoints: keyPoints
        }
      })
    }

    console.log(`收到AI摘要请求: ${title} (使用${provider})`)

    try {
      let data
      if (provider === 'openai') {
        data = await generateWithOpenAI({ content, title, apiKey, model, baseUrl })
      } else if (provider === 'anthropic') {
        data = await generateWithAnthropic({ content, title, apiKey, model, baseUrl })
      } else {
        return res.status(400).json({
          success: false,
          error: '不支持的AI服务商'
        })
      }

      return res.json({ success: true, data })
    } catch (error: any) {
      console.error('AI API错误:', error)

      let errorMessage = 'AI调用失败'
      if (error.status === 401) {
        errorMessage = 'API密钥无效，请检查设置'
      } else if (error.status === 429) {
        errorMessage = 'API调用次数超限，请稍后再试'
      } else if (error.status === 403) {
        errorMessage = 'API密钥没有访问权限'
      } else if (error.message) {
        errorMessage = error.message
      }

      return res.status(500).json({
        success: false,
        error: errorMessage
      })
    }
  } catch (error) {
    console.error('API错误:', error)
    return res.status(500).json({
      success: false,
      error: '服务器内部错误'
    })
  }
}
