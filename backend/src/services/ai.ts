import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'

export interface AISummaryRequest {
  content: string
  title: string
  provider: 'openai' | 'anthropic'
  apiKey: string
  model?: string
  baseUrl?: string
}

export interface AISummaryResult {
  success: boolean
  data?: {
    summary: string
    keyPoints: string[]
  }
  error?: string
}

/**
 * 使用AI生成摘要和核心观点
 */
export async function generateSummary(req: AISummaryRequest): Promise<AISummaryResult> {
  try {
    if (req.provider === 'openai') {
      return await generateWithOpenAI(req)
    } else if (req.provider === 'anthropic') {
      return await generateWithAnthropic(req)
    } else {
      return {
        success: false,
        error: '不支持的AI服务商'
      }
    }
  } catch (error) {
    console.error('AI摘要生成失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '生成摘要失败'
    }
  }
}

/**
 * 使用OpenAI生成摘要
 */
async function generateWithOpenAI(req: AISummaryRequest): Promise<AISummaryResult> {
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

  try {
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
      success: true,
      data: {
        summary: parsed.summary || '',
        keyPoints: parsed.keyPoints || []
      }
    }
  } catch (error) {
    console.error('OpenAI API错误:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'OpenAI调用失败'
    }
  }
}

/**
 * 使用Anthropic Claude生成摘要
 */
async function generateWithAnthropic(req: AISummaryRequest): Promise<AISummaryResult> {
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

  try {
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

    // Claude返回的可能包含```json ```标记，需要提取
    let text = content.text
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      text = jsonMatch[0]
    }

    const parsed = JSON.parse(text)
    return {
      success: true,
      data: {
        summary: parsed.summary || '',
        keyPoints: parsed.keyPoints || []
      }
    }
  } catch (error) {
    console.error('Anthropic API错误:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Claude调用失败'
    }
  }
}

/**
 * 降级方案：简单提取摘要
 */
export function generateSimpleSummary(content: string, maxLength: number = 200): string {
  // 移除Markdown标记
  let text = content
    .replace(/[#*`\[\]()]/g, '')
    .replace(/\n+/g, ' ')
    .trim()

  // 截取前maxLength个字符
  if (text.length > maxLength) {
    text = text.substring(0, maxLength) + '...'
  }

  return text
}

/**
 * 降级方案：提取标题作为观点
 */
export function extractSimpleKeyPoints(content: string): string[] {
  const lines = content.split('\n')
  const keyPoints: string[] = []

  // 1. 首先尝试提取Markdown标题
  for (const line of lines) {
    const match = line.match(/^#{1,3}\s+(.+)/)
    if (match && keyPoints.length < 5) {
      const point = match[1].trim()
      // 过滤掉太短或太长的标题
      if (point.length > 5 && point.length < 100) {
        keyPoints.push(point)
      }
    }
  }

  // 2. 如果没有找到标题，尝试提取列表项
  if (keyPoints.length === 0) {
    for (const line of lines) {
      const match = line.match(/^[-*•]\s+(.+)/)
      if (match && keyPoints.length < 5) {
        const point = match[1].trim()
        if (point.length > 10 && point.length < 100) {
          keyPoints.push(point)
        }
      }
    }
  }

  // 3. 如果还是没有，尝试提取以数字开头的列表
  if (keyPoints.length === 0) {
    for (const line of lines) {
      const match = line.match(/^\d+[.、]\s+(.+)/)
      if (match && keyPoints.length < 5) {
        const point = match[1].trim()
        if (point.length > 10 && point.length < 100) {
          keyPoints.push(point)
        }
      }
    }
  }

  // 4. 如果依然没有，提取段落的第一句话作为观点
  if (keyPoints.length === 0) {
    const paragraphs = content.split('\n\n').filter(p => p.trim().length > 50)
    for (const para of paragraphs.slice(0, 5)) {
      // 提取第一句话（以句号、问号、感叹号结尾）
      const firstSentence = para.match(/^([^。！？\n]+[。！？])/)?.[1]
      if (firstSentence && firstSentence.length > 15 && firstSentence.length < 100) {
        keyPoints.push(firstSentence.trim())
      }
      if (keyPoints.length >= 5) break
    }
  }

  return keyPoints
}
