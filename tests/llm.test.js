import test from 'node:test'
import assert from 'node:assert/strict'
import { chatCompletion, testApiConnection } from '../src/api/llm.js'
import { DEFAULT_API_CONFIG } from '../src/utils/api-config.js'
const config = { ...DEFAULT_API_CONFIG, apiKey: 'test-only', timeout: 2 }
const encoder = new TextEncoder()
const frame = data => 'data: ' + JSON.stringify(data) + '\r\n\r\n'
const delta = text => frame({ choices: [{ delta: { content: text } }] })
const stop = frame({ choices: [{ delta: {}, finish_reason: 'stop' }] })
function mockStream(t, chunks) {
  t.mock.method(globalThis, 'fetch', async () => new Response(new ReadableStream({
    start(controller) { for (const chunk of chunks) controller.enqueue(typeof chunk === 'string' ? encoder.encode(chunk) : chunk); controller.close() }
  }), { headers: { 'Content-Type': 'text/event-stream' } }))
}
test('every byte boundary preserves Chinese, emoji and SSE events', async t => {
  const bytes = encoder.encode(delta('你好🌙') + stop + 'data: [DONE]\r\n\r\n')
  mockStream(t, [...bytes].map(value => Uint8Array.of(value)))
  let streamed = ''
  assert.equal(await chatCompletion(config, 'test', (_, text) => { streamed = text }), '你好🌙')
  assert.equal(streamed, '你好🌙')
})
test('truncated output publishes last text and rejects', async t => {
  mockStream(t, [frame({ choices: [{ delta: { content: '半章' }, finish_reason: 'length' }] })])
  let partial = ''
  await assert.rejects(chatCompletion(config, 'test', (_, text) => { partial = text }), { code: 'OUTPUT_TRUNCATED' })
  assert.equal(partial, '半章')
})
test('EOF without a completion marker is a failure', async t => {
  mockStream(t, [delta('半章')])
  await assert.rejects(chatCompletion(config, 'test', () => {}), { code: 'INCOMPLETE_STREAM' })
})
test('HTTP 200 stream errors are not silently swallowed', async t => {
  mockStream(t, [frame({ error: { message: 'quota exhausted' } })])
  await assert.rejects(chatCompletion(config, 'test', () => {}), { code: 'API_ERROR' })
})
test('malformed complete SSE message is rejected', async t => {
  mockStream(t, ['data: {broken}\n\n'])
  await assert.rejects(chatCompletion(config, 'test', () => {}), { code: 'INVALID_STREAM' })
})
test('empty completed output is rejected', async t => {
  mockStream(t, [stop])
  await assert.rejects(chatCompletion(config, 'test', () => {}), { code: 'EMPTY_RESPONSE' })
})
test('native Anthropic legacy stream remains supported', async t => {
  mockStream(t, [frame({ type: 'content_block_delta', delta: { text: '旧配置可用' } }), frame({ type: 'message_delta', delta: { stop_reason: 'end_turn' } })])
  assert.equal(await chatCompletion({ ...config, channel: 'anthropic' }, 'test', () => {}), '旧配置可用')
})
test('completion marker ends a connection that stays open', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response(new ReadableStream({
    start(controller) { controller.enqueue(encoder.encode(delta('完成') + stop)) }
  })))
  assert.equal(await chatCompletion(config, 'test', () => {}), '完成')
})
test('non-stream truncation is rejected', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ choices: [{ message: { content: 'half' }, finish_reason: 'length' }] }))
  await assert.rejects(chatCompletion(config, 'test'), { code: 'OUTPUT_TRUNCATED' })
})
test('external cancellation reaches the transport', async t => {
  t.mock.method(globalThis, 'fetch', async (_, options) => {
    options.signal.throwIfAborted()
    return new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true }))
  })
  const controller = new AbortController()
  const request = chatCompletion({ ...config, signal: controller.signal }, 'test')
  controller.abort()
  await assert.rejects(request, { name: 'AbortError' })
})
test('HTTP errors report the provider message without credentials', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ error: { message: 'invalid model' } }, { status: 400 }))
  await assert.rejects(chatCompletion(config, 'test'), error => error.code === 'HTTP_ERROR' && error.message.includes('invalid model') && !error.message.includes(config.apiKey))
})
test('connection probe works with providers that reject large writing limits and temperature', async t => {
  const calls = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    const body = JSON.parse(options.body)
    calls.push({ url, body })
    if (body.max_tokens > 8192 || 'temperature' in body) {
      return Response.json({ error: { message: 'unsupported writing parameters' } }, { status: 400 })
    }
    return Response.json({ choices: [{ message: { content: 'OK' }, finish_reason: 'stop' }] })
  })
  const input = { ...config, baseUrl: 'https://example.com/api/v1/chat/completions/' }
  await testApiConnection(input)
  assert.equal(calls[0].url, 'https://example.com/api/v1/chat/completions')
  assert.equal(calls[0].body.model, input.model)
  assert.equal(calls[0].body.max_tokens, 128)
  assert.equal(calls[0].body.stream, false)
  assert.equal(input.maxTokens, 32768)
  await assert.rejects(chatCompletion(input, 'write'), { code: 'HTTP_ERROR' })
  assert.equal(calls[1].body.max_tokens, input.maxTokens)
  assert.equal(calls[1].body.temperature, input.temperature)
})
test('a reasoning response that exhausts the probe budget verifies connectivity only', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ choices: [{
    message: { content: null, reasoning_content: 'Thinking' }, finish_reason: 'length'
  }] }))
  await testApiConnection(config)
  await assert.rejects(chatCompletion(config, 'write'), { code: 'OUTPUT_TRUNCATED' })
})
test('native probe permits its small budget to end at max_tokens', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ content: [], stop_reason: 'max_tokens' }))
  await testApiConnection({ ...config, channel: 'anthropic' })
  await assert.rejects(chatCompletion({ ...config, channel: 'anthropic' }, 'write'), { code: 'OUTPUT_TRUNCATED' })
})
test('connection probe rejects API errors, malformed responses and empty messages', async t => {
  for (const [data, code] of [
    [{ error: { message: 'invalid key' } }, 'API_ERROR'],
    [null, 'INVALID_RESPONSE'], [{ status: 'ok' }, 'INVALID_RESPONSE'],
    [{ choices: [{ finish_reason: 'length' }] }, 'INVALID_RESPONSE'],
    [{ choices: [{ message: { content: '' }, finish_reason: 'stop' }] }, 'EMPTY_RESPONSE']
  ]) {
    t.mock.method(globalThis, 'fetch', async () => Response.json(data))
    await assert.rejects(testApiConnection(config), { code })
  }
})
test('network failures explain possible CORS restrictions without claiming certainty', async t => {
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('Failed to fetch') })
  await assert.rejects(testApiConnection(config), error => error.code === 'NETWORK_ERROR'
    && error.message.includes('可能') && error.message.includes('CORS') && !error.message.includes(config.apiKey))
})
test('404 and HTML responses identify the actual endpoint', async t => {
  for (const [response, code] of [
    [new Response('Not Found', { status: 404 }), 'HTTP_ERROR'],
    [new Response('<html>Website home</html>'), 'INVALID_RESPONSE']
  ]) {
    t.mock.method(globalThis, 'fetch', async () => response)
    await assert.rejects(testApiConnection(config), error => error.code === code
      && error.message.includes(config.baseUrl + '/chat/completions'))
  }
})
test('connection probe uses configured timeout and reports it clearly', async t => {
  let expire, delay
  t.mock.method(globalThis, 'setTimeout', (callback, ms) => { expire = callback; delay = ms; return 123 })
  t.mock.method(globalThis, 'clearTimeout', () => {})
  t.mock.method(globalThis, 'fetch', async (_, options) => {
    expire()
    options.signal.throwIfAborted()
  })
  await assert.rejects(testApiConnection({ ...config, timeout: 75 }), error => error.name === 'TimeoutError' && error.message.includes('75 秒'))
  assert.equal(delay, 75000)
})
