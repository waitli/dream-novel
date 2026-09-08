import test from 'node:test'
import assert from 'node:assert/strict'
import { finalizeChapter } from '../src/api/generator.js'
import { DEFAULT_API_CONFIG } from '../src/utils/api-config.js'
const config = { ...DEFAULT_API_CONFIG, apiKey: 'test-only' }
const project = () => ({ title: '测试', numberOfChapters: 2, chapterSummaries: [], chapters: { 1: '正文' },
  characterDB: JSON.stringify({ characters: [], relationships: [] }), foreshadowingDB: '{"foreshadowing":[]}', worldBuildingDB: '{"entries":[]}' })
const facts = () => ({ chapterSummary: { chapter: 1, title: '第一章', summary: '主角启程。' }, characters: [], relationships: [], factions: [], foreshadowing: [], worldBuilding: [] })
function replies(t, values) {
  let count = 0
  t.mock.method(globalThis, 'fetch', async () => {
    const next = values[count++]
    if (next instanceof Error || next === undefined) throw next || new Error('unexpected request')
    return Response.json({ choices: [{ message: { content: typeof next === 'string' ? next : JSON.stringify(next) }, finish_reason: 'stop' }] })
  })
  return () => count
}
test('primary and fallback failures reject without changing project memory', async t => {
  const original = project(), before = JSON.stringify(original), progress = []
  replies(t, [new Error('primary failed'), new Error('fallback failed')])
  await assert.rejects(finalizeChapter(original, 1, '正文', config, step => progress.push(step)), /记忆更新失败/)
  assert.equal(JSON.stringify(original), before)
  assert.ok(!progress.includes('章节定稿完成'))
})
test('empty JSON is not treated as a valid fact extraction or fallback summary', async t => {
  replies(t, [{}, {}])
  await assert.rejects(finalizeChapter(project(), 1, '正文', config, () => {}), /记忆更新失败/)
})
test('malformed fallback databases reject instead of retaining stale state as success', async t => {
  replies(t, [new Error('primary'), { chapter: 1, summary: '摘要' }, {}])
  await assert.rejects(finalizeChapter(project(), 1, '正文', config, () => {}), /数据库格式无效/)
})
test('arc summary failure cannot mark finalization complete', async t => {
  replies(t, [facts(), new Error('arc failed')])
  await assert.rejects(finalizeChapter(project(), 1, '正文', config, () => {}), /弧摘要更新失败/)
})
test('successful finalization returns detached complete memory', async t => {
  const original = project(), before = JSON.stringify(original), progress = []
  replies(t, [facts(), '主角踏上旅途，新的冲突开始。'])
  const result = await finalizeChapter(original, 1, '正文', config, step => progress.push(step))
  assert.equal(result.chapterSummaries[0].summary, '主角启程。')
  assert.equal(JSON.stringify(original), before)
  assert.equal(progress.at(-1), '章节定稿完成')
})
test('cancelled finalization does not run a fallback request', async t => {
  const controller = new AbortController()
  let requests = 0
  t.mock.method(globalThis, 'fetch', async () => { requests++; controller.abort(); throw controller.signal.reason })
  await assert.rejects(finalizeChapter(project(), 1, '正文', { ...config, signal: controller.signal }, () => {}), { name: 'AbortError' })
  assert.equal(requests, 1)
})

