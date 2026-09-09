import { generateArchitecture, generateChapterBlueprint } from '../api/generator.js'
import { textRevision } from './chapter-memory.js'

const architectureFields = ['coreSeed', 'characterDynamics', 'characterState', 'worldBuilding', 'plotArchitecture']
const blueprintFields = ['chapterBlueprint', 'chapterBlueprintData']
const clone = value => JSON.parse(JSON.stringify(value))

export function generationInputRevision(project, kind) {
  const keys = ['topic', 'genre', 'numberOfChapters', 'wordNumber', 'userGuidance']
  if (kind === 'blueprint') keys.push('coreSeed', 'characterDynamics', 'worldBuilding', 'plotArchitecture')
  return textRevision(JSON.stringify(keys.map(key => project[key] ?? null)))
}

export function generationRunLabel(kind, run) {
  return kind === 'architecture'
    ? `架构：已保存 ${architectureFields.filter(key => run.values?.[key]).length} / 5 步`
    : `大纲：已保存 ${run.values?.chapterBlueprintData?.length || 0} 章`
}

// Persist each accepted stage separately. Active artifacts change only at completion.
export async function runGenerationPipeline(project, kind, options) {
  const { config, getLatest, save, onProgress = () => {}, restart = false } = options
  const fields = kind === 'architecture' ? architectureFields : blueprintFields
  const inputRevision = generationInputRevision(project, kind)
  const previous = project.generationRuns?.[kind]
  const reusable = !restart && previous?.inputRevision === inputRevision
  const values = reusable ? clone(previous.values) : Object.fromEntries(fields.map(key => [key,
    !restart && !previous ? clone(project[key] ?? (key === 'chapterBlueprintData' ? [] : '')) : (key === 'chapterBlueprintData' ? [] : '')
  ]))
  const runId = globalThis.crypto.randomUUID()
  const run = { runId, inputRevision, values, status: 'running', updatedAt: new Date().toISOString() }
  const assertCurrent = () => {
    config.signal?.throwIfAborted()
    const latest = getLatest(project.id)
    if (!latest || latest.generationRuns?.[kind]?.runId !== runId) throw new Error('生成任务已变更，已停止写入')
    if (generationInputRevision(latest, kind) !== inputRevision) throw new Error('生成条件已修改，请重新开始生成')
    for (const field of fields) {
      if (JSON.stringify(latest[field]) !== JSON.stringify(project[field])) throw new Error('原有内容已修改，请重新开始生成')
    }
    return latest
  }
  config.signal?.throwIfAborted()
  await save(project.id, { generationRuns: { ...project.generationRuns, [kind]: clone(run) } })
  try {
    const generate = options.generate || (kind === 'architecture' ? generateArchitecture : generateChapterBlueprint)
    const result = await generate({ ...clone(project), ...values }, config, onProgress, async checkpoint => {
      const latest = assertCurrent()
      run.values = clone(checkpoint)
      run.updatedAt = new Date().toISOString()
      await save(project.id, { generationRuns: { ...latest.generationRuns, [kind]: clone(run) } })
    })
    const latest = assertCurrent()
    const runs = { ...latest.generationRuns }
    delete runs[kind]
    await save(project.id, {
      ...result, generationRuns: runs,
      ...(kind === 'architecture' ? { architectureGenerated: true, blueprintGenerated: false, initialCharacterState: result.characterState } : { blueprintGenerated: true })
    })
    return result
  } catch (error) {
    const latest = getLatest(project.id)
    if (latest?.generationRuns?.[kind]?.runId === runId) {
      // Read persisted values, so a failed write cannot falsely claim a saved stage.
      try {
        await save(project.id, { generationRuns: { ...latest.generationRuns, [kind]: {
          ...latest.generationRuns[kind], status: 'paused', error: error.message, updatedAt: new Date().toISOString()
        } } })
      } catch { /* The last successful checkpoint remains recoverable. */ }
    }
    throw error
  }
}
