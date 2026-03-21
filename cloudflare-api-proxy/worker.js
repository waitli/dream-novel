/**
 * Cloudflare Workers - API 代理
 * 作用：隐藏 API Key，避免前端直接暴露
 * 
 * 部署命令：
 * 1. wrangler login
 * 2. wrangler secret put API_KEY
 * 3. wrangler deploy
 */

export default {
  async fetch(request, env, ctx) {
    // 只允许 POST 请求
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    // 获取请求体
    const body = await request.json()
    
    // 验证 API Key（从环境变量读取）
    const apiKey = env.API_KEY
    if (!apiKey) {
      return new Response('API_KEY not configured', { status: 500 })
    }

    // 目标 API 地址（可配置）
    const targetUrl = env.API_BASE_URL || 'https://api.chatfire.site/v1/chat/completions'

    // 转发请求到 LLM API
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    // 处理流式响应
    if (body.stream && response.body) {
      return new Response(response.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      })
    }

    // 返回普通响应
    const data = await response.json()
    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }
}
