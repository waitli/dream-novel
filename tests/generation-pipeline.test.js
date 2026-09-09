import test from 'node:test'
import assert from 'node:assert/strict'
import { runGenerationPipeline } from '../src/utils/generation-pipeline.js'
import { DEFAULT_API_CONFIG } from '../src/utils/api-config.js'
const config = { ...DEFAULT_API_CONFIG, apiKey: 'test-only', maxTokens: 3600 }
const clone = value => JSON.parse(JSON.stringify(value))
function fixture() {
  let project = { id: 'p', topic: '测试主题', numberOfChapters: 6, wordNumber: 1000,
    coreSeed: '原核心', characterDynamics: '原角色', characterState: '原状态', worldBuilding: '原世界', plotArchitecture: '原情节',
    architectureGenerated: true, chapterBlueprint: '原大纲', chapterBlueprintData: [], blueprintGenerated: true }
  return {
    get project() { return project },
    getLatest: () => project,
    save: (id, updates) => { assert.equal(id, 'p'); project = clone({ ...project, ...updates }) },
    reload: () => { project = JSON.parse(JSON.stringify(project)) }
  }
}
function replies(t, values) {
  const requests = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    requests.push(JSON.parse(options.body))
    const value = values.shift()
    if (value instanceof Error || value === undefined) throw value || new Error('unexpected request')
    return Response.json({ choices: [{ message: { content: typeof value === 'string' ? value : JSON.stringify(value) }, finish_reason: 'stop' }] })
  })
  return requests
}
const chapters = (from, to) => ({ chapters: Array.from({ length: to - from + 1 }, (_, i) => ({ number: from + i, title: `标题${from + i}`, summary: `有效情节${from + i}` })) })

test('architecture checkpoints survive failure and reload without replacing active content', async t => {
  const h = fixture()
  const values = ['新核心', '新角色', new Error('断网')]
  const requests = replies(t, values)
  await assert.rejects(runGenerationPipeline(h.project, 'architecture', { ...h, config, restart: true }), /断网/)
  assert.equal(h.project.coreSeed, '原核心')
  assert.equal(h.project.generationRuns.architecture.values.coreSeed, '新核心')
  assert.equal(h.project.generationRuns.architecture.values.characterDynamics, '新角色')
  assert.equal(h.project.generationRuns.architecture.status, 'paused')
  assert.ok(!JSON.stringify(h.project.generationRuns).includes('test-only'))
  h.reload()
  values.push('新状态', '新世界', '新情节')
  await runGenerationPipeline(h.project, 'architecture', { ...h, config })
  assert.equal(requests.length, 6)
  assert.equal(h.project.coreSeed, '新核心')
  assert.equal(h.project.initialCharacterState, '新状态')
  assert.equal(h.project.blueprintGenerated, false)
  assert.equal(h.project.chapterBlueprint, '原大纲')
  assert.equal(h.project.generationRuns.architecture, undefined)
})
test('blueprint saves one chapter per request and resumes the failed chapter after reload', async t => {
  const h = fixture(), values = [chapters(1, 1), chapters(2, 2), chapters(3, 3), { chapters: [] }, { chapters: [] }, { chapters: [] }]
  const requests = replies(t, values)
  const saved = []
  const save = (id, updates) => {
    h.save(id, updates)
    const run = updates.generationRuns?.blueprint
    if (run?.status === 'running') saved.push(run.values.chapterBlueprintData.length)
  }
  const largeConfig = { ...config, maxTokens: 64000 }
  await assert.rejects(runGenerationPipeline(h.project, 'blueprint', { ...h, save, config: largeConfig, restart: true }), /第 4 章/)
  assert.deepEqual(saved, [0, 1, 2, 3])
  assert.equal(h.project.chapterBlueprint, '原大纲')
  assert.deepEqual(h.project.generationRuns.blueprint.values.chapterBlueprintData.map(c => c.number), [1, 2, 3])
  h.reload()
  values.push(chapters(4, 4), chapters(5, 5), chapters(6, 6))
  await runGenerationPipeline(h.project, 'blueprint', { ...h, config: largeConfig })
  assert.equal(requests.length, 9)
  const prompts = requests.map(r => r.messages.at(-1).content)
  assert.deepEqual(prompts.map(p => Number(p.match(/现在只设计第(\d+)章/)[1])), [1, 2, 3, 4, 4, 4, 4, 5, 6])
  assert.ok(prompts.every(p => p.includes('必须且只能包含一个完整章节对象')))
  assert.match(prompts[1], /有效情节1/)
  assert.equal(h.project.chapterBlueprintData.length, 6)
  assert.equal(h.project.generationRuns.blueprint, undefined)
})

test('blueprint fills isolated missing chapters without regenerating complete chapters', async t => {
  const h = fixture()
  h.save('p', { chapterBlueprint: '', chapterBlueprintData: [
    ...chapters(1, 1).chapters, ...chapters(3, 3).chapters, ...chapters(5, 6).chapters
  ] })
  const requests = replies(t, [chapters(2, 2), chapters(4, 4)])
  await runGenerationPipeline(h.project, 'blueprint', { ...h, config })
  assert.deepEqual(requests.map(r => Number(r.messages.at(-1).content.match(/现在只设计第(\d+)章/)[1])), [2, 4])
  assert.deepEqual(h.project.chapterBlueprintData.map(c => c.number), [1, 2, 3, 4, 5, 6])
})

test('blueprint rejects extra or duplicate chapters and retries only the current chapter', async t => {
  const h = fixture()
  h.save('p', { numberOfChapters: 1 })
  const requests = replies(t, [chapters(1, 2), { chapters: [...chapters(1, 1).chapters, ...chapters(1, 1).chapters] }, chapters(1, 1)])
  await runGenerationPipeline(h.project, 'blueprint', { ...h, config, restart: true })
  assert.equal(requests.length, 3)
  assert.ok(requests.every(r => r.messages.at(-1).content.includes('现在只设计第1章')))
  assert.deepEqual(h.project.chapterBlueprintData.map(c => c.number), [1])
})

test('blueprint waits for each chapter checkpoint before making the next request', async t => {
  const h = fixture(), requests = replies(t, [chapters(1, 1), chapters(2, 2)])
  await assert.rejects(runGenerationPipeline(h.project, 'blueprint', { ...h, config, restart: true,
    save: async (id, updates) => {
      if (updates.generationRuns?.blueprint?.values.chapterBlueprintData.length === 1) {
        await Promise.resolve()
        throw new Error('存储空间不足')
      }
      h.save(id, updates)
    }
  }), /存储空间不足/)
  assert.equal(requests.length, 1)
  assert.equal(h.project.generationRuns.blueprint.values.chapterBlueprintData.length, 0)
})

test('cancelling after a saved outline prevents the next chapter request and permits resuming', async t => {
  const h = fixture(), controller = new AbortController()
  const values = [chapters(1, 1)], requests = replies(t, values)
  h.save('p', { numberOfChapters: 2 })
  await assert.rejects(runGenerationPipeline(h.project, 'blueprint', { ...h, config: { ...config, signal: controller.signal }, restart: true,
    onProgress: text => { if (text.includes('已保存第 1 章')) controller.abort() }
  }), { name: 'AbortError' })
  assert.equal(requests.length, 1)
  assert.deepEqual(h.project.generationRuns.blueprint.values.chapterBlueprintData.map(c => c.number), [1])
  h.reload()
  values.push(chapters(2, 2))
  await runGenerationPipeline(h.project, 'blueprint', { ...h, config })
  assert.equal(requests.length, 2)
  assert.deepEqual(h.project.chapterBlueprintData.map(c => c.number), [1, 2])
})
test('changed generation inputs discard the obsolete checkpoint when resuming', async t => {
  const h = fixture(), values = ['旧条件核心', new Error('断网')]
  replies(t, values)
  await assert.rejects(runGenerationPipeline(h.project, 'architecture', { ...h, config, restart: true }))
  h.save('p', { topic: '新的主题' })
  values.push('新条件核心', '新角色', '新状态', '新世界', '新情节')
  await runGenerationPipeline(h.project, 'architecture', { ...h, config })
  assert.equal(h.project.coreSeed, '新条件核心')
})
test('cancelled stages keep the previous checkpoint and cannot publish late output', async () => {
  const h = fixture(), controller = new AbortController()
  await assert.rejects(runGenerationPipeline(h.project, 'architecture', { ...h, config: { ...config, signal: controller.signal }, restart: true,
    generate: async (p, c, progress, checkpoint) => {
      await checkpoint({ coreSeed: '已完成核心' })
      controller.abort()
      return { coreSeed: '迟到结果' }
    }
  }), { name: 'AbortError' })
  assert.equal(h.project.coreSeed, '原核心')
  assert.equal(h.project.generationRuns.architecture.values.coreSeed, '已完成核心')
})
test('changing original artifacts during generation prevents overwriting user edits', async () => {
  const h = fixture()
  await assert.rejects(runGenerationPipeline(h.project, 'architecture', { ...h, config, restart: true,
    generate: async () => { h.save('p', { coreSeed: '用户手动修改' }); return { coreSeed: '迟到结果' } }
  }), /原有内容已修改/)
  assert.equal(h.project.coreSeed, '用户手动修改')
})
test('checkpoint storage failure stops the pipeline instead of continuing paid requests', async t => {
  const h = fixture(), requests = replies(t, ['新核心', '不应请求'])
  let saves = 0
  await assert.rejects(runGenerationPipeline(h.project, 'architecture', { ...h, config, restart: true,
    save: (id, updates) => { if (++saves === 2) throw new Error('存储空间不足'); h.save(id, updates) }
  }), /存储空间不足/)
  assert.equal(requests.length, 1)
  assert.equal(h.project.generationRuns.architecture.values.coreSeed, '')
  assert.equal(h.project.coreSeed, '原核心')
})
