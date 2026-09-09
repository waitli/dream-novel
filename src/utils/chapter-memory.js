// Store one baseline and incremental changes, rather than a full database per chapter.
const defaults = {
  globalSummary: '', characterState: '', characterDB: '', foreshadowingDB: '',
  worldBuildingDB: '', chapterSummaries: [], arcSummaries: [], currentArcSummary: '',
  currentArcName: '', currentArcStart: 1, currentArcEnd: null,
  globalArcsSummary: '', memoryMigrated: true
}
const databaseFields = ['characterDB', 'foreshadowingDB', 'worldBuildingDB']
const clone = value => JSON.parse(JSON.stringify(value))

// A local change detector, not a security signature. No chapter text is duplicated.
export function textRevision(text = '') {
  text = String(text)
  let a = 2166136261, b = 5381
  for (let i = 0; i < text.length; i++) {
    a = Math.imul(a ^ text.charCodeAt(i), 16777619)
    b = Math.imul(b, 33) ^ text.charCodeAt(i)
  }
  return `${text.length}:${a >>> 0}:${b >>> 0}`
}

function pack(project) {
  const state = {}
  for (const [key, fallback] of Object.entries(defaults)) state[key] = clone(project[key] ?? fallback)
  for (const key of databaseFields) {
    if (typeof state[key] === 'string' && state[key]) {
      try { state[key] = JSON.parse(state[key]) } catch { /* Preserve legacy text. */ }
    }
  }
  return state
}

function unpack(state) {
  state = clone(state)
  for (const key of databaseFields) {
    if (typeof state[key] === 'object' && state[key] !== null) state[key] = JSON.stringify(state[key])
  }
  return state
}

export function emptyMemoryLedger(project = {}) {
  return {
    version: 1, validThrough: 0, entries: {},
    base: { throughChapter: 0, sourceRevisions: {}, state: pack({ characterState: project.initialCharacterState || '' }) }
  }
}

export function getMemoryLedger(project) {
  if (project.memoryLedger?.version === 1) return clone(project.memoryLedger)
  const ledger = emptyMemoryLedger(project)
  const summaries = project.chapterSummaries || []
  const last = Math.max(0, ...summaries.map(s => Number(s.chapter) || 0))
  if (!last) return ledger
  // Legacy memory has only a latest snapshot; never pretend it is historical.
  for (let n = 1; n <= last; n++) {
    const status = project.chapterMeta?.[n]?.status
    if (!project.chapters?.[n]?.trim() || !summaries.some(s => Number(s.chapter) === n) || (status && status !== 'finalized')) return ledger
    ledger.base.sourceRevisions[n] = textRevision(project.chapters[n])
  }
  ledger.base.throughChapter = ledger.validThrough = last
  ledger.base.state = pack(project)
  return ledger
}

function memoryError(from) {
  const error = new Error(`前文记忆需要从第 ${from} 章更新，请先点击“更新前文记忆”再继续。`)
  error.name = 'MemoryNeedsRebuildError'
  error.fromChapter = from
  return error
}

function applyPatch(state, patch) {
  for (const operation of patch) {
    const path = operation.path
    if (!Array.isArray(path) || !path.length || path.some(k => ['__proto__', 'prototype', 'constructor'].includes(String(k)))) throw new Error('记忆版本格式无效')
    let target = state
    for (const key of path.slice(0, -1)) target = target[key]
    const key = path.at(-1)
    if (operation.remove) delete target[key]
    else target[key] = clone(operation.value)
  }
  return state
}

function diff(before, after, path = [], operations = []) {
  if (JSON.stringify(before) === JSON.stringify(after)) return operations
  if (before && after && typeof before === 'object' && typeof after === 'object' && Array.isArray(before) === Array.isArray(after)) {
    for (const key of Object.keys(before)) {
      if (!(key in after) && !Array.isArray(before)) operations.push({ path: [...path, key], remove: true })
    }
    for (const key of Object.keys(after)) diff(before[key], after[key], [...path, key], operations)
    if (Array.isArray(after) && before.length !== after.length) operations.push({ path: [...path, 'length'], value: after.length })
  } else operations.push({ path, value: clone(after) })
  return operations
}

function stateThrough(project, through) {
  if (through === 0) return emptyMemoryLedger(project).base.state
  const ledger = getMemoryLedger(project)
  const base = ledger.base.throughChapter
  if (base > through) throw memoryError(1)
  let state = clone(ledger.base.state)
  for (let n = 1; n <= through; n++) {
    const revision = n <= base ? ledger.base.sourceRevisions[n] : ledger.entries[n]?.sourceRevision
    if (n > ledger.validThrough || !revision || revision !== textRevision(project.chapters?.[n] || '') || (project.chapterMeta?.[n]?.status && project.chapterMeta[n].status !== 'finalized')) throw memoryError(n <= base ? 1 : n)
    if (n > base) state = applyPatch(state, ledger.entries[n].patch)
  }
  return state
}

export function memoryContextBefore(project, chapterNumber) {
  const n = Number(chapterNumber)
  if (!Number.isInteger(n) || n < 1) throw new Error('章节号无效')
  return { ...clone(project), ...unpack(stateThrough(project, n - 1)) }
}

export function recordChapterMemory(project, chapterNumber, chapterText, results) {
  const n = Number(chapterNumber)
  const before = stateThrough(project, n - 1)
  const ledger = n === 1 ? emptyMemoryLedger(project) : getMemoryLedger(project)
  // Later entries describe an obsolete timeline. Keep the saved prose, rebuild memory as needed.
  for (const key of Object.keys(ledger.entries)) if (Number(key) >= n) delete ledger.entries[key]
  ledger.entries[n] = { sourceRevision: textRevision(chapterText), patch: diff(before, pack(results)) }
  ledger.validThrough = n
  return ledger
}

export function invalidateChapterMemory(project, fromChapter) {
  let ledger = getMemoryLedger(project)
  if (fromChapter <= ledger.base.throughChapter) ledger = emptyMemoryLedger(project)
  ledger.validThrough = Math.min(ledger.validThrough, fromChapter - 1)
  for (const key of Object.keys(ledger.entries)) if (Number(key) >= fromChapter) delete ledger.entries[key]
  return ledger
}

export function memoryRebuildStart(project, through) {
  try { stateThrough(project, through) } catch (error) { return error.fromChapter || 1 }
  return through + 1
}

export function assertMemorySourceUnchanged(snapshot, latest, through) {
  if (!latest) throw new Error('项目已不存在')
  for (let n = 1; n <= through; n++) {
    if ((snapshot.chapters?.[n] || '') !== (latest.chapters?.[n] || '')) throw new Error(`第 ${n} 章正文已变更，请重新更新记忆`)
  }
  for (const field of ['coreSeed', 'characterDynamics', 'worldBuilding', 'plotArchitecture', 'chapterBlueprint', 'chapterBlueprintData', 'numberOfChapters']) {
    if (JSON.stringify(snapshot[field]) !== JSON.stringify(latest[field])) throw new Error('小说设定或大纲已变更，请重新更新记忆')
  }
}

export function reconcileProjectMemory(previous, next, updates) {
  let from = Infinity
  if (updates.chapters) {
    for (const key of new Set([...Object.keys(previous.chapters || {}), ...Object.keys(updates.chapters)])) {
      if ((previous.chapters?.[key] || '') !== (updates.chapters[key] || '')) from = Math.min(from, Number(key))
    }
  }
  if (['coreSeed', 'characterDynamics', 'worldBuilding', 'plotArchitecture', 'initialCharacterState'].some(key => key in updates && updates[key] !== previous[key])) {
    from = 1
    next.blueprintGenerated = false
  }
  if (['chapterBlueprint', 'chapterBlueprintData'].some(key => key in updates && JSON.stringify(updates[key]) !== JSON.stringify(previous[key]))) from = 1
  if (Number.isFinite(from)) next.memoryLedger = invalidateChapterMemory(previous, from)
  const validThrough = next.memoryLedger?.validThrough
  if (validThrough !== undefined) {
    next.chapterMeta = clone(next.chapterMeta || {})
    for (const key of Object.keys(next.chapters || {})) {
      if (Number(key) > validThrough && next.chapters[key] && (next.chapterMeta[key]?.status === 'finalized' || (!next.chapterMeta[key]?.status && previous.chapterSummaries?.some(s => Number(s.chapter) === Number(key))) || Number(key) >= from)) {
        next.chapterMeta[key] = { ...next.chapterMeta[key], status: 'needs_refinalize' }
      }
    }
  }
  return next
}
