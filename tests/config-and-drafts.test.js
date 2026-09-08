import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeApiConfig, validateApiConfig, DEFAULT_API_CONFIG } from '../src/utils/api-config.js'
import { readChapterDraft, writeChapterDraft, removeChapterDraft } from '../src/utils/chapter-drafts.js'
const storage = () => {
  const values = new Map()
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }
}
test('legacy compatible config preserves endpoint, key, model and limits', () => {
  const result = normalizeApiConfig({ channel: 'moonshot', baseUrl: ' https://example.com/v1/ ', apiKey: 'existing', model: 'custom-model', maxTokens: 2048 })
  assert.equal(result.channel, 'compatible')
  assert.equal(result.baseUrl, 'https://example.com/v1')
  assert.equal(result.apiKey, 'existing')
  assert.equal(result.model, 'custom-model')
  assert.equal(result.maxTokens, 2048)
})
test('native legacy configurations are not silently converted', () => {
  for (const channel of ['azure', 'anthropic']) assert.equal(normalizeApiConfig({ channel }).channel, channel)
})
test('full completion URLs and trailing slashes normalize once', () => {
  assert.equal(normalizeApiConfig({ baseUrl: 'https://example.com/v1/chat/completions/' }).baseUrl, 'https://example.com/v1')
})
test('invalid keys, model, URLs and numeric settings are rejected', () => {
  for (const change of [{ apiKey: '' }, { model: '' }, { baseUrl: 'javascript:alert(1)' }, { baseUrl: 'https://user:pass@example.com' }, { maxTokens: null }, { temperature: -1 }, { timeout: 0 }]) {
    assert.throws(() => validateApiConfig({ ...DEFAULT_API_CONFIG, apiKey: 'test', ...change }))
  }
})
test('drafts are isolated by project and chapter and preserve deliberate empty edits', () => {
  const db = storage()
  writeChapterDraft(db, 'A', 1, '第一章')
  writeChapterDraft(db, 'A', 2, '第二章')
  writeChapterDraft(db, 'B', 1, '另一部')
  writeChapterDraft(db, 'A', 1, '')
  assert.equal(readChapterDraft(db, 'A', 1).content, '')
  assert.equal(readChapterDraft(db, 'A', 2).content, '第二章')
  assert.equal(readChapterDraft(db, 'B', 1).content, '另一部')
  removeChapterDraft(db, 'A', 1)
  assert.equal(readChapterDraft(db, 'A', 1), null)
})
test('storage failures are propagated instead of reporting a saved draft', () => {
  assert.throws(() => writeChapterDraft({ setItem() { throw new Error('quota') } }, 'A', 1, 'text'), /quota/)
})

