import { chatCompletion, cleanResponse } from './llm'
import { compassPrompts } from '../prompts/compass'
import { parseJsonResponse, applyDelta, getSnapshotForChapter } from '../utils/graph-helpers'

const { extractGraph: extractGraphPrompt, extractChapterDelta: extractChapterDeltaPrompt, auditGraph: auditGraphPrompt, extractChapterGraph: extractChapterGraphPrompt } = compassPrompts

/**
 * 从架构数据生成基线图谱
 */
export async function generateBaseGraph(project, apiConfig, onProgress) {
  onProgress('正在分析小说架构，提取实体关系...', 1, 3)

  const prompt = extractGraphPrompt({
    characterDynamics: project.characterDynamics,
    characterState: project.characterState,
    worldBuilding: project.worldBuilding,
    plotArchitecture: project.plotArchitecture
  })

  const response = cleanResponse(await chatCompletion(apiConfig, prompt))
  const parsed = parseJsonResponse(response)

  if (!parsed || !parsed.nodes) {
    throw new Error('图谱提取失败：AI 返回的数据格式不正确')
  }

  // 确保每个 edge 有 id
  parsed.edges = (parsed.edges || []).map((e, i) => ({
    ...e,
    id: e.id || `edge_${e.source}_${e.target}_${i}`
  }))

  // 确保每个 node 有 firstAppearance
  parsed.nodes = parsed.nodes.map(n => ({
    ...n,
    firstAppearance: n.firstAppearance ?? 0
  }))

  onProgress('基线图谱生成完成', 3, 3)

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    snapshots: { '0': { nodes: parsed.nodes, edges: parsed.edges } },
    audit: { inconsistencies: [], lastAuditAt: null },
    graphGenerated: true
  }
}

/**
 * 从已写章节批量生成快照
 */
export async function generateChapterSnapshots(project, apiConfig, onProgress) {
  const graphData = { ...project.graphData }
  const chapterNums = Object.keys(project.chapters || {}).map(Number).sort((a, b) => a - b)

  if (chapterNums.length === 0) return graphData
  if (!graphData.snapshots['0']) {
    throw new Error('请先生成基线图谱')
  }

  // 找出还没有快照的章节
  const existingSnapshots = new Set(Object.keys(graphData.snapshots).map(Number))
  const pendingChapters = chapterNums.filter(n => !existingSnapshots.has(n))

  if (pendingChapters.length === 0) return graphData

  for (let i = 0; i < pendingChapters.length; i++) {
    const chapterNum = pendingChapters[i]
    onProgress(`正在分析第 ${chapterNum} 章关系变化...`, i + 1, pendingChapters.length)

    const currentSnapshot = getSnapshotForChapter(graphData.snapshots, chapterNum - 1)
    if (!currentSnapshot) continue

    const prompt = extractChapterDeltaPrompt({
      currentNodes: currentSnapshot.nodes,
      currentEdges: currentSnapshot.edges,
      chapterNumber: chapterNum,
      chapterText: project.chapters[chapterNum]
    })

    try {
      const response = cleanResponse(await chatCompletion(apiConfig, prompt))
      const delta = parseJsonResponse(response)

      if (delta) {
        const hasDelta = ['newNodes', 'updatedNodes', 'removedNodeIds', 'newEdges', 'updatedEdges', 'removedEdgeIds']
          .some(k => delta[k] && delta[k].length > 0)

        if (hasDelta) {
          graphData.snapshots[String(chapterNum)] = applyDelta(currentSnapshot, delta)
        }
      }
    } catch (err) {
      console.warn(`第 ${chapterNum} 章图谱分析失败:`, err.message)
    }
  }

  graphData.generatedAt = new Date().toISOString()
  return graphData
}

/**
 * 逻辑审计
 */
export async function auditCompassGraph(project, apiConfig, onProgress) {
  const graphData = project.graphData
  if (!graphData?.graphGenerated) {
    throw new Error('请先生成图谱')
  }

  onProgress('正在进行逻辑审计...', 1, 2)

  // 构建快照序列文本
  const snapshotKeys = Object.keys(graphData.snapshots).map(Number).sort((a, b) => a - b)
  const snapshotsText = snapshotKeys.map(k => {
    const s = graphData.snapshots[String(k)]
    return `--- 第 ${k} 章快照 ---\n节点: ${s.nodes.map(n => `${n.label}(${n.status})`).join(', ')}\n关系: ${s.edges.map(e => `${e.source}-[${e.relationType}]-${e.target}`).join(', ')}`
  }).join('\n\n')

  const chapterBlueprint = project.chapterBlueprintData?.length
    ? JSON.stringify({ chapters: project.chapterBlueprintData }, null, 2)
    : project.chapterBlueprint || '(暂无大纲)'

  const prompt = auditGraphPrompt({
    chapterBlueprint,
    snapshotsText
  })

  const response = cleanResponse(await chatCompletion(apiConfig, prompt))
  const parsed = parseJsonResponse(response)

  onProgress('逻辑审计完成', 2, 2)

  return {
    inconsistencies: parsed?.inconsistencies || [],
    lastAuditAt: new Date().toISOString()
  }
}

/**
 * 从单章内容生成独立的关系图谱
 */
export async function generateChapterGraph(project, chapterNum, chapterText, apiConfig, onProgress) {
  onProgress('正在提取本章人物关系...')

  const prompt = extractChapterGraphPrompt({
    chapterNumber: chapterNum,
    chapterText,
    characterState: project.characterState || ''
  })

  const response = cleanResponse(await chatCompletion(apiConfig, prompt))
  const parsed = parseJsonResponse(response)

  if (!parsed || !parsed.nodes) {
    throw new Error('本章关系提取失败：AI 返回的数据格式不正确')
  }

  // 确保 edge 有 id
  parsed.edges = (parsed.edges || []).map((e, i) => ({
    ...e,
    id: e.id || `edge_${e.source}_${e.target}_${i}`
  }))

  return { nodes: parsed.nodes, edges: parsed.edges }
}
