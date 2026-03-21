import axios from 'axios'

// LLM API service - LLM API 服务
// Handles all AI model interactions - 处理所有 AI 模型交互

/**
 * Build request config for different LLM providers
 * 为不同 LLM 提供商构建请求配置
 */
function buildRequestConfig(config, prompt, stream = false) {
  const { channel, baseUrl, apiKey, model, temperature, maxTokens, timeout } = config
  
  // Azure OpenAI 特殊处理
  if (channel === 'azure') {
    const { resourceName, deploymentId, apiVersion } = config
    const azureUrl = `https://${resourceName}.openai.azure.com/openai/deployments/${deploymentId}/chat/completions?api-version=${apiVersion}`
    
    return {
      url: azureUrl,
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json'
      },
      data: {
        messages: [{ role: 'user', content: prompt }],
        temperature,
        max_tokens: maxTokens,
        stream
      }
    }
  }
  
  // Anthropic Claude 特殊处理
  if (channel === 'anthropic') {
    return {
      url: `${baseUrl}/messages`,
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      data: {
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        stream
      }
    }
  }
  
  // 标准 OpenAI 兼容格式（Gemini/Kimi/DeepSeek/百川/智谱等）
  return {
    url: `${baseUrl}/chat/completions`,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    data: {
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_tokens: maxTokens,
      stream
    }
  }
}

/**
 * Create chat completion request
 * 创建聊天补全请求
 */
export async function chatCompletion(config, prompt, onStream = null) {
  const { timeout, channel } = config
  const requestConfig = buildRequestConfig(config, prompt, !!onStream)

  if (onStream) {
    // Streaming response - 流式响应
    return streamCompletion(channel, requestConfig, timeout, onStream)
  }

  // Non-streaming response - 非流式响应
  const response = await axios.post(
    requestConfig.url,
    requestConfig.data,
    {
      headers: requestConfig.headers,
      timeout: timeout * 1000
    }
  )

  // 不同平台的响应格式处理
  if (channel === 'anthropic') {
    return response.data.content[0].text
  }
  
  return response.data.choices[0].message.content
}

/**
 * Stream completion with callback
 * 流式补全并回调
 */
async function streamCompletion(channel, requestConfig, timeout, onStream) {
  const response = await fetch(requestConfig.url, {
    method: 'POST',
    headers: requestConfig.headers,
    body: JSON.stringify(requestConfig.data),
    signal: AbortSignal.timeout(timeout * 1000)
  })

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let fullContent = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    const lines = chunk.split('\n').filter(line => line.trim() !== '')

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') continue
        
        try {
          const parsed = JSON.parse(data)
          
          // 不同平台的流式响应格式处理
          let content = ''
          if (channel === 'anthropic') {
            // Anthropic SSE 格式
            if (parsed.type === 'content_block_delta') {
              content = parsed.delta?.text || ''
            }
          } else {
            // OpenAI 兼容格式
            content = parsed.choices?.[0]?.delta?.content || ''
          }
          
          if (content) {
            fullContent += content
            onStream(content, fullContent)
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
  }

  return fullContent
}

/**
 * Clean AI response - remove markdown formatting
 * 清理 AI 响应 - 移除 markdown 格式
 */
export function cleanResponse(text) {
  if (!text) return ''
  
  // Remove markdown code blocks - 移除 markdown 代码块
  let cleaned = text.replace(/```[\s\S]*?```/g, '')
  cleaned = cleaned.replace(/`/g, '')
  
  // Trim whitespace - 去除空白
  cleaned = cleaned.trim()
  
  return cleaned
}
