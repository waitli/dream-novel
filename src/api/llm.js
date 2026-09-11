import { validateApiConfig } from '../utils/api-config.js'

export class LLMError extends Error {
  constructor(message, code) { super(message); this.name = 'LLMError'; this.code = code }
}
function buildRequest(config, prompt, stream, probe = false) {
  const { channel, baseUrl, apiKey, model, temperature, maxTokens } = config
  const data = { model, messages: [{ role: 'user', content: prompt }], temperature, max_tokens: maxTokens, stream }
  // A connectivity check should not depend on the provider's creative parameter limits.
  if (probe) { data.max_tokens = Math.min(maxTokens, 128); delete data.temperature }
  if (channel === 'azure') {
    delete data.model
    return { url: `https://${config.resourceName}.openai.azure.com/openai/deployments/${config.deploymentId}/chat/completions?api-version=${encodeURIComponent(config.apiVersion)}`,
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json' }, data }
  }
  if (channel === 'anthropic') {
    return { url: `${baseUrl}/messages`, headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01' }, data }
  }
  return { url: `${baseUrl}/chat/completions`, headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, data }
}
function checkFinishReason(reason) {
  if (!reason) return
  if (reason === 'length' || reason === 'max_tokens') {
    throw new LLMError('生成达到输出上限，内容尚未完成。已保留收到的正文，请提高上限后重试。', 'OUTPUT_TRUNCATED')
  }
  if (!['stop', 'end_turn', 'stop_sequence'].includes(reason)) throw new LLMError(`模型未正常完成文本生成（${reason}）`, 'UNEXPECTED_FINISH')
}
function checkApiError(data) {
  if (data?.error || data?.type === 'error') throw new LLMError(String(data.error?.message || data.message || 'AI 接口返回错误').slice(0, 500), 'API_ERROR')
}
async function readStream(response, channel, onStream) {
  if (!response.body) throw new LLMError('接口没有返回响应流', 'INVALID_RESPONSE')
  const reader = response.body.getReader(), decoder = new TextDecoder()
  let buffer = '', fullContent = '', completed = false
  function event(raw) {
    const data = raw.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).replace(/^ /, '')).join('\n')
    if (!data) return
    if (data.trim() === '[DONE]') { completed = true; return }
    let parsed
    try { parsed = JSON.parse(data) } catch { throw new LLMError('接口返回的流式消息格式不完整', 'INVALID_STREAM') }
    checkApiError(parsed)
    const choice = parsed.choices?.[0]
    const content = channel === 'anthropic' ? (parsed.type === 'content_block_delta' ? parsed.delta?.text : '') : choice?.delta?.content
    if (typeof content === 'string' && content) { fullContent += content; onStream(content, fullContent) }
    const reason = channel === 'anthropic' ? (parsed.type === 'message_delta' ? parsed.delta?.stop_reason : null) : choice?.finish_reason
    checkFinishReason(reason)
    if (reason || (channel === 'anthropic' && parsed.type === 'message_stop')) completed = true
  }
  function drain() {
    let boundary
    while ((boundary = /\r?\n\r?\n/.exec(buffer))) {
      const raw = buffer.slice(0, boundary.index)
      buffer = buffer.slice(boundary.index + boundary[0].length)
      event(raw)
    }
  }
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      drain()
      if (completed) break
    }
    buffer += decoder.decode()
    drain()
    if (buffer.trim()) event(buffer)
    if (!completed) throw new LLMError('连接提前结束，正文尚未生成完整，已保留收到的内容。', 'INCOMPLETE_STREAM')
    if (!fullContent.trim()) throw new LLMError('模型没有返回正文，请检查模型或输出上限。', 'EMPTY_RESPONSE')
    return fullContent
  } finally {
    try { await reader.cancel() } catch { /* Connection may already be closed. */ }
    reader.releaseLock()
  }
}
export async function chatCompletion(value, prompt, onStream = null) {
  return requestCompletion(value, prompt, onStream)
}
export async function testApiConnection(value) {
  await requestCompletion(value, 'Reply only with OK.', null, true)
}
async function requestCompletion(value, prompt, onStream, probe = false) {
  const config = validateApiConfig(value), request = buildRequest(config, prompt, Boolean(onStream), probe)
  const controller = new AbortController()
  const abort = () => controller.abort(value.signal?.reason)
  if (value.signal?.aborted) abort()
  else value.signal?.addEventListener('abort', abort, { once: true })
  const timer = setTimeout(() => controller.abort(new DOMException('请求超时', 'TimeoutError')), config.timeout * 1000)
  try {
    let response
    try {
      response = await fetch(request.url, { method: 'POST', headers: request.headers, body: JSON.stringify(request.data), signal: controller.signal })
    } catch (error) {
      if (error instanceof TypeError && !controller.signal.aborted) {
        throw new LLMError(`无法连接 AI 接口：${request.url}。可能是网络、TLS 证书或浏览器跨域（CORS）限制。本网站由浏览器直接请求接口，请确认服务商允许本站跨域访问，或使用你信任且支持跨域的兼容接口。`, 'NETWORK_ERROR')
      }
      throw error
    }
    if (!response.ok) {
      let detail = ''
      try { const body = await response.json(); detail = body.error?.message || body.message || '' } catch { /* Non-JSON error page. */ }
      const hints = {
        400: '请检查模型支持的请求参数。', 401: '请检查 API Key 是否正确、有效。',
        403: '请检查密钥权限或服务商的访问限制。', 404: '请检查 API 地址路径（例如 /v1）及模型名称。',
        429: '请检查额度、余额或请求频率限制。'
      }
      throw new LLMError(`AI 请求失败（HTTP ${response.status}）${detail ? ': ' + String(detail).slice(0, 300) : ''} ${hints[response.status] || ''} 请求地址：${request.url}`, 'HTTP_ERROR')
    }
    if (onStream) return await readStream(response, config.channel, onStream)
    let data
    try { data = await response.json() } catch { throw new LLMError(`接口返回了无效 JSON，请确认填写的是 API 地址而非网站首页。请求地址：${request.url}`, 'INVALID_RESPONSE') }
    checkApiError(data)
    if (!data || (config.channel === 'anthropic' ? !Array.isArray(data.content) : !data.choices?.[0]?.message)) {
      throw new LLMError('接口响应不是所选协议的消息格式，请检查 API 地址和接口协议。', 'INVALID_RESPONSE')
    }
    const content = config.channel === 'anthropic'
      ? data.content?.filter(block => block.type === 'text').map(block => block.text).join('')
      : data.choices?.[0]?.message?.content
    const reason = config.channel === 'anthropic' ? data.stop_reason : data.choices?.[0]?.finish_reason
    // Reasoning models may spend the entire small probe budget before producing text.
    // This still verifies connectivity; real writing must continue to reject truncation.
    if (probe && ['length', 'max_tokens'].includes(reason)) return content || ''
    checkFinishReason(reason)
    if (typeof content !== 'string' || !content.trim()) throw new LLMError('模型没有返回正文，请检查模型或输出上限。', 'EMPTY_RESPONSE')
    return content
  } catch (error) {
    if (controller.signal.aborted) {
      if (controller.signal.reason?.name === 'TimeoutError') {
        throw new DOMException(`请求超时（${config.timeout} 秒），请检查网络、服务商响应速度，或在高级设置中增加超时。`, 'TimeoutError')
      }
      throw controller.signal.reason || error
    }
    throw error
  } finally {
    clearTimeout(timer)
    value.signal?.removeEventListener('abort', abort)
  }
}
export function cleanResponse(text) {
  if (!text) return ''
  
  // Remove markdown fences but keep their content. JSON prompts often return fenced blocks.
  let cleaned = text.replace(/```[a-zA-Z0-9_-]*\s*\n?([\s\S]*?)```/g, '$1')
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1')
  cleaned = cleaned.replace(/`/g, '')
  
  // Trim whitespace - 去除空白
  cleaned = cleaned.trim()
  
  return cleaned
}
