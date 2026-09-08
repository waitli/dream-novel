import test from 'node:test'
import assert from 'node:assert/strict'
import { chatCompletion } from '../src/api/llm.js'
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

