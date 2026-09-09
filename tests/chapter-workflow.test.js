import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ref, computed, shallowRef, watch, reactive, effectScope } from 'vue'
import { readChapterDraft, writeChapterDraft, removeChapterDraft } from '../src/utils/chapter-drafts.js'
import { memoryContextBefore, memoryRebuildStart, emptyMemoryLedger, assertMemorySourceUnchanged, reconcileProjectMemory, recordChapterMemory } from '../src/utils/chapter-memory.js'
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
      const next = reconcileProjectMemory(props.project, { ...props.project, ...updates }, updates)
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
    finalizeChapter: async (project, n, text) => {
      const result = { ...memoryContextBefore(project, n), chapterSummaries: [...memoryContextBefore(project, n).chapterSummaries, { chapter: n, summary: '摘要' }] }
      return { chapterSummaries: result.chapterSummaries, memoryLedger: recordChapterMemory(project, n, text, result) }
    },
    checkChapterConsistency: async () => ({ passed: true, recommendedAction: 'finalize', issues: [] }),
    generateChapterGraph: async () => ({ nodes: [], edges: [] }),
    readChapterDraft, writeChapterDraft, removeChapterDraft,
    memoryContextBefore, memoryRebuildStart, emptyMemoryLedger, assertMemorySourceUnchanged,
    localStorage: storage, window: { addEventListener: (key, fn) => listeners.set(key, fn), removeEventListener: key => listeners.delete(key) },
    onBeforeUnmount: fn => cleanup.push(fn), onBeforeRouteLeave: fn => { leave = fn },
    ...overrides
  }
  const scope = effectScope()
  const api = scope.run(() => new Function(...Object.keys(env), source + '\nreturn { currentChapter, chapterContent, isWorking, draftError, flushDraft, loadChapter, handleGenerate, handleQuickSave, handleSaveAndFinalize, handleRebuildMemory, memoryNeedsUpdate, cancelTask };')(...Object.values(env)))
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

test('missing prior memory blocks generation before any AI request', async t => {
  let calls = 0
  const h = harness(t, { generateChapterDraft: async () => { calls++; return '不应生成' } })
  h.loadChapter(2)
  await h.handleGenerate()
  assert.equal(calls, 0)
  assert.ok(h.memoryNeedsUpdate.value)
  assert.ok(h.notices.some(n => n.text.includes('更新前文记忆')))
})

test('memory rebuild saves each completed chapter and resumes after a later failure', async t => {
  let failSecond = true
  const calls = []
  const h = harness(t, { finalizeChapter: async (p, n, text) => {
    calls.push(n)
    if (n === 2 && failSecond) throw new Error('模拟断网')
    const state = memoryContextBefore(p, n)
    const result = { ...state, chapterSummaries: [...state.chapterSummaries, { chapter: n, summary: '摘要' }] }
    return { chapterSummaries: result.chapterSummaries, memoryLedger: recordChapterMemory(p, n, text, result) }
  } })
  h.props.project.numberOfChapters = 3
  h.props.project.chapterBlueprintData.push({ number: 3, title: '三' })
  h.loadChapter(3)
  await h.handleRebuildMemory()
  assert.equal(h.props.project.memoryLedger.validThrough, 1)
  assert.equal(h.props.project.chapterMeta[1].status, 'finalized')
  assert.equal(h.currentChapter.value, 3)
  failSecond = false
  await h.handleRebuildMemory()
  assert.deepEqual(calls, [1, 2, 2])
  assert.equal(h.props.project.memoryLedger.validThrough, 2)
  assert.equal(h.memoryNeedsUpdate.value, false)
  assert.equal(h.props.project.chapters[1], '旧第一章')
  assert.equal(h.props.project.chapters[2], '旧第二章')
})

test('memory rebuild refuses to ignore a newer unsaved prior draft', async t => {
  let calls = 0
  const h = harness(t, { finalizeChapter: async () => { calls++; throw new Error('unexpected') } })
  h.chapterContent.value = '第一章尚未保存的修改'
  h.loadChapter(2)
  await h.handleRebuildMemory()
  assert.equal(calls, 0)
  assert.ok(h.notices.some(n => n.text.includes('未保存的草稿')))
})
