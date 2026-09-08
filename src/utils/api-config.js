export const DEFAULT_API_CONFIG = Object.freeze({
  channel: 'compatible', baseUrl: 'https://api.deepseek.com', apiKey: '',
  model: 'deepseek-v4-flash', temperature: 0.7, maxTokens: 32768, timeout: 600
})
export function normalizeBaseUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '').replace(/\/chat\/completions$/, '')
}
export function normalizeApiConfig(value = {}) {
  const config = { ...DEFAULT_API_CONFIG, ...value }
  config.channel = ['anthropic', 'azure'].includes(config.channel) ? config.channel : 'compatible'
  config.baseUrl = normalizeBaseUrl(config.baseUrl)
  config.apiKey = String(config.apiKey || '').trim()
  config.model = String(config.model || '').trim()
  return config
}
export function validateApiConfig(value) {
  const config = normalizeApiConfig(value)
  if (!config.apiKey) throw new Error('请填写 API Key / API key is required')
  if (config.channel === 'azure') {
    if (!/^[a-zA-Z0-9-]+$/.test(config.resourceName || '') || !/^[a-zA-Z0-9._-]+$/.test(config.deploymentId || '') || !config.apiVersion) {
      throw new Error('请完整填写 Azure 资源、部署名称和 API 版本')
    }
  } else {
    let url
    try { url = new URL(config.baseUrl) } catch { throw new Error('API 地址无效 / Invalid API URL') }
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) || url.username || url.password || url.search || url.hash) {
      throw new Error('请使用不含密码、查询参数的 HTTPS API 地址（本机可使用 HTTP）')
    }
    if (!config.model) throw new Error('请填写模型名称 / Model is required')
  }
  if (!Number.isInteger(config.maxTokens) || config.maxTokens < 1 || config.maxTokens > 384000) throw new Error('输出上限必须为 1–384000 的整数')
  if (!Number.isFinite(config.timeout) || config.timeout < 1 || config.timeout > 3600) throw new Error('超时必须为 1–3600 秒')
  if (!Number.isFinite(config.temperature) || config.temperature < 0 || config.temperature > 2) throw new Error('温度必须为 0–2')
  return config
}

