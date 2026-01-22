import OpenAI from 'openai'

export async function handler(event, context) {
  // 只允许 POST 请求
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { content, title, provider, apiKey, model, baseUrl } = JSON.parse(event.body)

    // 验证必需参数
    if (!content || !title || !apiKey) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: '缺少必需参数：content, title, apiKey'
        })
      }
    }

    // 目前只支持 OpenAI
    if (provider !== 'openai' && provider !== 'anthropic') {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: '暂不支持该 AI 服务商'
        })
      }
    }

    // 创建 OpenAI 客户端
    const openai = new OpenAI({
      apiKey: apiKey,
      ...(baseUrl && { baseURL: baseUrl })
    })

    const modelName = model || 'gpt-4o-mini'

    const prompt = `请分析以下文章，并提供：
1. 一个简洁的摘要（200字以内）
2. 3-5个核心观点

文章标题：${title}

文章内容：
${content}

请以JSON格式返回结果：
{
  "summary": "摘要内容",
  "keyPoints": ["观点1", "观点2", "观点3"]
}`

    const completion = await openai.chat.completions.create({
      model: modelName,
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
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        data: {
          summary: parsed.summary || '',
          keyPoints: parsed.keyPoints || []
        }
      })
    }
  } catch (error) {
    console.error('AI摘要生成失败:', error)

    // 处理OpenAI API错误
    let errorMessage = 'AI调用失败'
    let statusCode = 500

    if (error.status === 401) {
      errorMessage = 'API密钥无效，请检查设置中的API Key是否正确'
      statusCode = 401
    } else if (error.status === 429) {
      errorMessage = 'API调用次数超限，请稍后再试'
      statusCode = 429
    } else if (error.status === 403) {
      errorMessage = 'API密钥没有访问权限，请检查API Key的权限设置'
      statusCode = 403
    } else if (error.code === 'insufficient_quota') {
      errorMessage = 'API账户额度不足，请充值后重试'
      statusCode = 402
    } else if (error.message) {
      errorMessage = error.message
    }

    return {
      statusCode: statusCode,
      body: JSON.stringify({
        success: false,
        error: errorMessage
      })
    }
  }
}
