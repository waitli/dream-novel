import test from 'node:test'
import assert from 'node:assert/strict'
import { memoryContextBefore, recordChapterMemory, reconcileProjectMemory, memoryRebuildStart, assertMemorySourceUnchanged } from '../src/utils/chapter-memory.js'

function append(project, n, facts) {
  const result = { ...memoryContextBefore(project, n), ...facts }
  return reconcileProjectMemory(project, { ...project, ...result,
    chapters: { ...project.chapters, [n]: `正文${n}` },
    memoryLedger: recordChapterMemory(project, n, `正文${n}`, result),
    chapterMeta: { ...project.chapterMeta, [n]: { status: 'finalized' } }
  }, {})
}
function timeline() {
  let p = { chapters: {}, chapterMeta: {}, initialCharacterState: '初始状态' }
  p = append(p, 1, { chapterSummaries: [{ chapter: 1, summary: '过去' }], characterDB: JSON.stringify({ characters: [{ name: '主角', items: ['宝剑'], hp: 100 }] }), currentArcSummary: '第一章弧', globalArcsSummary: '' })
  p = append(p, 2, { chapterSummaries: [...p.chapterSummaries, { chapter: 2, summary: '未来秘密' }], characterDB: JSON.stringify({ characters: [{ name: '主角', items: [], hp: 0 }, { name: '未来人物' }] }), currentArcSummary: '未来弧', globalArcsSummary: '未来全局' })
  return p
}
test('rewriting chapter two sees only chapter one across every memory layer', () => {
  const p = timeline(), before = JSON.stringify(p)
  const context = memoryContextBefore(p, 2)
  assert.deepEqual(context.chapterSummaries, [{ chapter: 1, summary: '过去' }])
  assert.deepEqual(JSON.parse(context.characterDB).characters, [{ name: '主角', items: ['宝剑'], hp: 100 }])
  assert.equal(context.currentArcSummary, '第一章弧')
  assert.equal(context.globalArcsSummary, '')
  assert.equal(memoryContextBefore(p, 1).characterState, '初始状态')
  assert.equal(JSON.stringify(p), before)
})
test('incremental replay preserves removal, empty arrays, zero and null', () => {
  let p = timeline()
  p = append(p, 3, { characterDB: JSON.stringify({ characters: [{ name: '主角', items: [], hp: null }] }), chapterSummaries: [] })
  const c = memoryContextBefore(p, 4)
  assert.deepEqual(JSON.parse(c.characterDB), { characters: [{ name: '主角', items: [], hp: null }] })
  assert.deepEqual(c.chapterSummaries, [])
})
test('saving an old chapter invalidates it and all later finalized chapters', () => {
  const p = timeline(), updates = { chapters: { ...p.chapters, 1: '重写正文' } }
  const next = reconcileProjectMemory(p, { ...p, ...updates }, updates)
  assert.equal(next.memoryLedger.validThrough, 0)
  assert.equal(next.chapterMeta[1].status, 'needs_refinalize')
  assert.equal(next.chapterMeta[2].status, 'needs_refinalize')
  assert.equal(next.chapters[2], p.chapters[2])
  assert.throws(() => memoryContextBefore(next, 2), /第 1 章/)
})
test('rewriting earlier facts removes the abandoned future timeline', () => {
  const p = timeline()
  const rewritten = append(p, 1, { chapterSummaries: [{ chapter: 1, summary: '新路线' }], characterDB: '{"characters":[]}' })
  assert.equal(rewritten.memoryLedger.validThrough, 1)
  assert.equal(rewritten.memoryLedger.entries[2], undefined)
  assert.equal(rewritten.chapterMeta[2].status, 'needs_refinalize')
  assert.equal(memoryContextBefore(rewritten, 2).chapterSummaries[0].summary, '新路线')
  assert.throws(() => memoryContextBefore(rewritten, 3), /第 2 章/)
})
test('text revision catches changes made outside the normal save path', () => {
  const p = timeline()
  p.chapters[1] = '外部导入的修改'
  assert.throws(() => memoryContextBefore(p, 3), /第 1 章/)
})
test('legacy latest memory is usable for continuation but not historical rewrites', () => {
  const p = timeline()
  delete p.memoryLedger
  assert.equal(memoryContextBefore(p, 3).currentArcSummary, '未来弧')
  assert.throws(() => memoryContextBefore(p, 2), /第 1 章/)
  assert.equal(memoryRebuildStart(p, 2), 3)
  assert.equal(memoryRebuildStart(p, 1), 1)
  p.chapters[3] = '第三章'
  assert.equal(memoryRebuildStart(p, 3), 3)
})
test('ambiguous legacy summaries require rebuilding instead of guessing chronology', () => {
  const p = timeline()
  delete p.memoryLedger
  p.chapterMeta[1].status = 'draft'
  assert.throws(() => memoryContextBefore(p, 3), /第 1 章/)
})
test('an in-flight result is rejected if preceding prose or outline changed', () => {
  const p = timeline()
  assert.throws(() => assertMemorySourceUnchanged(p, { ...p, chapters: { ...p.chapters, 1: '变更' } }, 1), /正文已变更/)
  assert.throws(() => assertMemorySourceUnchanged(p, { ...p, chapterBlueprintData: ['变更'] }, 1), /大纲已变更/)
})
test('large unchanged databases are not copied into each chapter entry', () => {
  let p = { chapters: {}, chapterMeta: {} }
  const db = JSON.stringify({ characters: [{ name: '主角', biography: '很长的背景资料'.repeat(1000) }] })
  p = append(p, 1, { characterDB: db, currentArcSummary: '第一章' })
  p = append(p, 2, { currentArcSummary: '第二章' })
  assert.ok(JSON.stringify(p.memoryLedger.entries[2]).length < 500)
  assert.equal(memoryContextBefore(p, 3).characterDB, db)
})

test('architecture changes invalidate memory and require explicit outline review', () => {
  const p = { ...timeline(), blueprintGenerated: true, coreSeed: '原核心' }
  const updates = { coreSeed: '新核心' }
  const next = reconcileProjectMemory(p, { ...p, ...updates }, updates)
  assert.equal(next.blueprintGenerated, false)
  assert.equal(next.memoryLedger.validThrough, 0)
  assert.equal(next.chapters[2], p.chapters[2])
})

test('new outline arc boundaries invalidate old memory versions', () => {
  const p = timeline(), updates = { chapterBlueprintData: [{ number: 1, arc: '新卷' }] }
  const next = reconcileProjectMemory(p, { ...p, ...updates }, updates)
  assert.equal(next.memoryLedger.validThrough, 0)
  assert.equal(next.chapterMeta[2].status, 'needs_refinalize')
})
