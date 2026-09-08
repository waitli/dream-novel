import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ref, computed, shallowRef, watch, reactive, effectScope } from 'vue'
import { readChapterDraft, writeChapterDraft, removeChapterDraft } from '../src/utils/chapter-drafts.js'
const source = readFileSync(new URL('../src/components/ChapterWriterPanel.vue', import.meta.url), 'utf8')
  .split('<script setup>')[1].split('</script>')[0].replace(/^import .*$/gm, '')
function harness(t, overrides = {}) {
  const data = new Map(), listeners = new Map(), cleanup = [], notices = []
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) }
  const props = reactive({ isGenerating: false, project: {
    id: 'test-project', numberOfChapters: 2, wordNumber: 1000, blueprintGenerated: true,
    chapterBlueprintData: [{ number: 1, title: '一' }, { number: 2, title: '二' }],
    chapters: { 1: '旧第一章', 2: '旧第二章' }, chapterMeta: {}, chapterSummaries: []
  } })
  const store = {
    get projects() { return [props.project] },
    updateProject(id, updates) {
      assert.equal(id, props.project.id)
      const next = { ...props.project, ...updates }
      storage.setItem('novel_projects', JSON.stringify([next]))
      props.project = next
    }
  }
  let leave
  const env = {
    ref, computed, shallowRef, watch, defineProps: () => props,
    defineEmits: () => (name, value) => { if (name === 'update:isGenerating') props.isGenerating = value },
    useNovelStore: () => store, useSettingsStore: () => ({ apiConfig: { apiKey: 'test' }, getStageConfig: () => ({ apiKey: 'test' }) }),
    useI18n: () => ({ t: value => value }), useMessage: () => Object.fromEntries(['success', 'warning', 'error'].map(type => [type, text => notices.push({ type, text })])),
    useDialog: () => ({ warning: options => { options.onPositiveClick() } }),
    getProjectBlueprintChapters: project => project.chapterBlueprintData,
    generateChapterDraft: async () => '新正文', enrichChapter: async text => text + '扩写',
    finalizeChapter: async () => ({ chapterSummaries: [{ chapter: 1, summary: '摘要' }] }),
    checkChapterConsistency: async () => ({ passed: true, recommendedAction: 'finalize', issues: [] }),
    generateChapterGraph: async () => ({ nodes: [], edges: [] }),
    readChapterDraft, writeChapterDraft, removeChapterDraft,
    localStorage: storage, window: { addEventListener: (key, fn) => listeners.set(key, fn), removeEventListener: key => listeners.delete(key) },
    onBeforeUnmount: fn => cleanup.push(fn), onBeforeRouteLeave: fn => { leave = fn },
    ...overrides
  }
  const scope = effectScope()
  const api = scope.run(() => new Function(...Object.keys(env), source + '\nreturn { currentChapter, chapterContent, isWorking, draftError, flushDraft, loadChapter, handleGenerate, handleQuickSave, handleSaveAndFinalize, cancelTask };')(...Object.values(env)))
  t.after(() => { for (const fn of cleanup) fn(); scope.stop() })
  return { ...api, props, storage, notices, listeners, leave: () => leave() }
}
test('switching chapters immediately flushes and restores edited drafts', t => {
  const h = harness(t)
  h.chapterContent.value = '未手动保存的新稿'
  h.loadChapter(2)
  assert.equal(h.currentChapter.value, 2)
  h.loadChapter(1)
  assert.equal(h.chapterContent.value, '未手动保存的新稿')
  assert.equal(h.props.project.chapters[1], '旧第一章')
})
test('generation locks chapter identity and saves output to the original chapter', async t => {
  let finish, onChunk
  const h = harness(t, { generateChapterDraft: async (project, chapter, config, progress, stream) => {
    assert.equal(chapter, 1); onChunk = stream
    return new Promise(resolve => { finish = resolve })
  } })
  const pending = h.handleGenerate()
  h.loadChapter(2)
  assert.equal(h.currentChapter.value, 1)
  onChunk('第一章生成中', '第一章生成中')
  finish('第一章完整正文')
  await pending
  h.handleQuickSave()
  assert.equal(h.props.project.chapters[1], '第一章完整正文')
  assert.equal(h.props.project.chapters[2], '旧第二章')
})
test('cancelled generation retains partial draft and ignores late callbacks', async t => {
  let finish, onChunk
  const h = harness(t, { generateChapterDraft: async (p, n, c, progress, stream) => {
    onChunk = stream; return new Promise(resolve => { finish = resolve })
  } })
  const pending = h.handleGenerate()
  onChunk('已收到', '已收到')
  h.cancelTask()
  h.loadChapter(2)
  onChunk('迟到内容', '迟到内容')
  finish('迟到结果')
  await pending
  assert.equal(h.chapterContent.value, '旧第二章')
  h.loadChapter(1)
  assert.equal(h.chapterContent.value, '已收到')
})
test('failed memory update keeps saved text, marks failure and does not advance', async t => {
  const h = harness(t, { finalizeChapter: async () => { throw new Error('memory unavailable') } })
  h.chapterContent.value = '需要保存的新正文'
  await h.handleSaveAndFinalize()
  assert.equal(h.props.project.chapters[1], '需要保存的新正文')
  assert.equal(h.props.project.chapterMeta[1].status, 'memory_failed')
  assert.equal(h.currentChapter.value, 1)
  assert.equal(h.props.project.chapterMeta[1].memoryUpdatedAt, undefined)
  assert.ok(!h.notices.some(n => n.type === 'success' && n.text.includes('定稿')))
})
test('successful retry marks memory complete and restores the next saved chapter', async t => {
  const h = harness(t)
  h.props.project.chapterMeta[1] = { status: 'memory_failed' }
  await h.handleSaveAndFinalize()
  assert.equal(h.props.project.chapterMeta[1].status, 'finalized')
  assert.ok(h.props.project.chapterMeta[1].memoryUpdatedAt)
  assert.equal(h.currentChapter.value, 2)
  assert.equal(h.chapterContent.value, '旧第二章')
})
test('navigation flushes an edit that is still waiting for the autosave timer', t => {
  const h = harness(t)
  h.chapterContent.value = '立刻返回首页'
  h.leave()
  assert.equal(readChapterDraft(h.storage, 'test-project', 1).content, '立刻返回首页')
})
test('storage failure blocks a chapter switch and route leave', t => {
  const h = harness(t)
  h.storage.setItem = () => { throw new Error('quota') }
  h.chapterContent.value = '不能丢失'
  h.loadChapter(2)
  assert.equal(h.currentChapter.value, 1)
  assert.equal(h.leave(), false)
  assert.match(h.draftError.value, /暂存失败/)
})
test('beforeunload flushes pending text', t => {
  const h = harness(t)
  h.chapterContent.value = '刷新之前'
  h.listeners.get('beforeunload')({})
  assert.equal(readChapterDraft(h.storage, 'test-project', 1).content, '刷新之前')
})

