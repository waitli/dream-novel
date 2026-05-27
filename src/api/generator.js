// Get current locale
function getLocale() {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('locale') || 'zh-CN'
  }
  return 'zh-CN'
}

// Progress text mapping
const progressTexts = {
  'zh-CN': {
    generatingCoreSeed: '正在生成核心种子...',
    generatingCharacterDynamics: '正在生成角色体系...',
    generatingCharacterState: '正在生成角色状态...',
    generatingWorldBuilding: '正在构建世界观...',
    generatingPlotArchitecture: '正在设计情节架构...',
    generatingChapterBlueprint: '正在生成章节大纲...',
    generatingChapterBlueprintChunk: '正在生成章节大纲',
    generatingChapterDraft: '正在生成第 {chapter} 章草稿...',
    enrichingChapter: '正在扩写第 {chapter} 章...',
    finalizingChapter: '正在定稿第 {chapter} 章...',
    updatingCharacterState: '正在更新角色状态...',
    trackingForeshadowing: '正在追踪伏笔...',
    updatingCharacterDB: '正在更新角色数据库...',
    updatingForeshadowingDB: '正在更新伏笔数据库...',
    updatingWorldBuildingDB: '正在更新世界观数据库...',
      generationIncomplete: '⚠️ 检测到生成不完整 ({actual}/{expected})，重试中...',
      retrySuccess: '✓ 重试成功：{count}/{expected}章',
      generationComplete: '✓ 生成完成'
  },
  'en-US': {
    generatingCoreSeed: 'Generating core seed...',
    generatingCharacterDynamics: 'Generating character dynamics...',
    generatingCharacterState: 'Generating character state...',
    generatingWorldBuilding: 'Building world...',
    generatingPlotArchitecture: 'Designing plot architecture...',
    generatingChapterBlueprint: 'Generating chapter blueprint...',
    generatingChapterBlueprintChunk: 'Generating chapter blueprint',
    generatingChapterDraft: 'Generating chapter {chapter} draft...',
    enrichingChapter: 'Enriching chapter {chapter}...',
    finalizingChapter: 'Finalizing chapter {chapter}...',
    updatingCharacterState: 'Updating character state...',
    trackingForeshadowing: 'Tracking foreshadowing...',
      generationIncomplete: '⚠️ Generation incomplete ({actual}/{expected}), retrying...',
      retrySuccess: '✓ Retry successful: {count}/{expected} chapters',
      generationComplete: '✓ Generation complete'
  }
}

// Get progress text
function getProgressText(key, params = {}) {
  const locale = getLocale()
  const texts = progressTexts[locale] || progressTexts['zh-CN']
  let text = texts[key] || key
  Object.keys(params).forEach(k => {
    text = text.replace(`{${k}}`, params[k])
  })
  return text
}

import { chatCompletion, cleanResponse } from './llm'
import { architecturePrompts } from '../prompts'
// 使用优化版 prompts（详细大纲 + 严格遵循 + 防截断）
import { chapterPrompts as chapterPromptsOptimized } from '../prompts/chapter-optimized'
import {
  estimateTokens,
  generateChapterSummary, extractChapterFacts, generateArcSummary,
  updateCharacterDB, updateForeshadowingDB, updateWorldBuildingDB,
  assembleChapterContext, compressGlobalSummary, migrateOldSummary
} from '../prompts/utility-v3'

// 解构提示词
const { coreSeed: coreSeedPrompt, characterDynamics: characterDynamicsPrompt, worldBuilding: worldBuildingPrompt, plotArchitecture: plotArchitecturePrompt, characterState: createCharacterStatePrompt } = architecturePrompts

// 使用 v3 三层记忆架构 prompts
const chapterPromptsToUse = chapterPromptsOptimized

const { blueprint: chapterBlueprintPrompt, blueprintChunked: chunkedChapterBlueprintPrompt, firstDraft: firstChapterDraftPrompt, nextDraft: nextChapterDraftPrompt, enrich: enrichChapterPrompt } = chapterPromptsToUse

const DEFAULT_ARC_SIZE = 10
const GLOBAL_SUMMARY_TOKEN_LIMIT = 4500

function formatGenre(genre) {
  if (Array.isArray(genre)) return genre.join(' / ')
  return genre || ''
}

// Novel generator service - 小说生成服务
// Orchestrates the generation process - 编排生成流程

/**
 * Generate novel architecture - 生成小说架构
 * Steps: Core seed → Character dynamics → World building → Plot architecture
 */
export async function generateArchitecture(project, apiConfig, onProgress) {
  const results = {
    coreSeed: project.coreSeed || '',
    characterDynamics: project.characterDynamics || '',
    worldBuilding: project.worldBuilding || '',
    plotArchitecture: project.plotArchitecture || '',
    characterState: project.characterState || ''
  }

  const params = {
    topic: project.topic,
    genre: formatGenre(project.genre),
    numberOfChapters: project.numberOfChapters,
    wordNumber: project.wordNumber,
    userGuidance: project.userGuidance || ''
  }

  // Step 1: Core seed - 核心种子
  if (!results.coreSeed) {
    onProgress(getProgressText('generatingCoreSeed'), 1, 5)
    const prompt = coreSeedPrompt(params)
    results.coreSeed = cleanResponse(await chatCompletion(apiConfig, prompt))
  }

  // Step 2: Character dynamics - 角色动力学
  if (!results.characterDynamics) {
    onProgress(getProgressText('generatingCharacterDynamics'), 2, 5)
    const prompt = characterDynamicsPrompt({
      ...params,
      coreSeed: results.coreSeed
    })
    results.characterDynamics = cleanResponse(await chatCompletion(apiConfig, prompt))
  }

  // Step 2.5: Character state - 角色状态
  if (!results.characterState && results.characterDynamics) {
    onProgress(getProgressText('generatingCharacterState'), 2.5, 5)
    const prompt = createCharacterStatePrompt({
      characterDynamics: results.characterDynamics
    })
    results.characterState = cleanResponse(await chatCompletion(apiConfig, prompt))
  }

  // Step 3: World building - 世界观
  if (!results.worldBuilding) {
    onProgress(getProgressText('generatingWorldBuilding'), 3, 5)
    const prompt = worldBuildingPrompt({
      ...params,
      coreSeed: results.coreSeed
    })
    results.worldBuilding = cleanResponse(await chatCompletion(apiConfig, prompt))
  }

  // Step 4: Plot architecture - 情节架构
  if (!results.plotArchitecture) {
    onProgress(getProgressText('generatingPlotArchitecture'), 4, 5)
    const prompt = plotArchitecturePrompt({
      ...params,
      coreSeed: results.coreSeed,
      characterDynamics: results.characterDynamics,
      worldBuilding: results.worldBuilding
    })
    results.plotArchitecture = cleanResponse(await chatCompletion(apiConfig, prompt))
  }

  onProgress('架构生成完成!', 5, 5)
  return results
}

/**
 * Generate chapter blueprint - 生成章节大纲
 * 修复：添加章节数量验证和重试机制
 */
export async function generateChapterBlueprint(project, apiConfig, onProgress) {
  const { numberOfChapters, userGuidance } = project
  
  // Build novel architecture text - 构建小说架构文本
  const novelArchitecture = `
#=== 0) 小说设定 ===
主题：${project.topic}，类型：${formatGenre(project.genre)}，篇幅：约${numberOfChapters}章（每章${project.wordNumber}字）

#=== 1) 核心种子 ===
${project.coreSeed}

#=== 2) 角色动力学 ===
${project.characterDynamics}

#=== 3) 世界观 ===
${project.worldBuilding}

#=== 4) 三幕式情节架构 ===
${project.plotArchitecture}
`

  // Calculate chunk size based on max tokens - 根据最大 token 数计算分块大小
  // 修改：降低每批章节数，从 30 章降至 20 章，减少生成失败概率
  const tokensPerChapter = 200
  const maxTokens = apiConfig.maxTokens || 8192
  let chunkSize = Math.floor(maxTokens / tokensPerChapter / 10) * 10 - 10
  // 限制最大 chunkSize 为 20 章/批，防止生成不完整
  chunkSize = Math.max(1, Math.min(chunkSize, 20, numberOfChapters))

  let blueprint = project.chapterBlueprint || ''
  
  // Parse existing chapters - 解析已有章节
  const existingChapters = parseChapterBlueprint(blueprint)
  const maxExistingChapter = existingChapters.length > 0
    ? Math.max(...existingChapters.map(chapter => chapter.number))
    : 0

  let currentStart = maxExistingChapter + 1

  if (chunkSize >= numberOfChapters && !blueprint) {
    // Single shot generation - 一次性生成
    onProgress(getProgressText('generatingChapterBlueprint') + ` (1-${numberOfChapters})...`, 0, 1)
    const prompt = chapterBlueprintPrompt({
      userGuidance,
      novelArchitecture,
      numberOfChapters
    })
    blueprint = cleanResponse(await chatCompletion(apiConfig, prompt))
    
    // 验证生成数量
    const generatedCount = parseChapterBlueprint(blueprint).length
    if (generatedCount < numberOfChapters) {
      console.warn(`大纲生成不完整：期望${numberOfChapters}章，实际${generatedCount}章`)
    }
  } else {
    // Chunked generation - 分块生成（带验证和重试）
    while (currentStart <= numberOfChapters) {
      const currentEnd = Math.min(currentStart + chunkSize - 1, numberOfChapters)
      const expectedCount = currentEnd - currentStart + 1
      onProgress(
        getProgressText('generatingChapterBlueprintChunk') + ` (${currentStart}-${currentEnd})...`,
        currentStart - 1,
        numberOfChapters
      )

      // Limit existing blueprint to last 100 chapters - 限制已有大纲到最近 100 章
      const limitedBlueprint = limitChapterBlueprint(blueprint, 100)

      const prompt = chunkedChapterBlueprintPrompt({
        userGuidance,
        novelArchitecture,
        numberOfChapters,
        chapterList: limitedBlueprint,
        startChapter: currentStart,
        endChapter: currentEnd
      })

      const chunkResult = cleanResponse(await chatCompletion(apiConfig, prompt))
      
      if (chunkResult) {
        // 验证本块生成的章节数量
        const actualCount = parseChapterBlueprint(chunkResult).length
        if (actualCount < expectedCount) {
          console.warn(`第${currentStart}-${currentEnd}块生成不完整：期望${expectedCount}章，实际${actualCount}章`)
          // 尝试重试一次
          onProgress(getProgressText('generationIncomplete', { actual: actualCount, expected: expectedCount }), currentStart - 1, numberOfChapters)
          const retryResult = cleanResponse(await chatCompletion(apiConfig, prompt))
          const retryCount = parseChapterBlueprint(retryResult).length
          if (retryCount > actualCount) {
            blueprint = blueprint ? `${blueprint}\n\n${retryResult}` : retryResult
            onProgress(getProgressText('retrySuccess', { count: retryCount, expected: expectedCount }), currentStart - 1, numberOfChapters)
          } else {
            blueprint = blueprint ? `${blueprint}\n\n${chunkResult}` : chunkResult
            onProgress(`⚠️ 重试未改善：${actualCount}/${expectedCount}章`, currentStart - 1, numberOfChapters)
          }
        } else {
          blueprint = blueprint ? `${blueprint}\n\n${chunkResult}` : chunkResult
        }
      }

      currentStart = currentEnd + 1
    }
  }

  // 最终验证
  const finalCount = parseChapterBlueprint(blueprint).length
  if (finalCount < numberOfChapters) {
    console.error(`大纲生成完成但数量不足：期望${numberOfChapters}章，实际${finalCount}章`)
    onProgress(`⚠️ 大纲生成不完整：${finalCount}/${numberOfChapters}章`, numberOfChapters, numberOfChapters)
  } else {
    onProgress('章节大纲生成完成!', numberOfChapters, numberOfChapters)
  }
  
  return blueprint
}

/**
 * Limit chapter blueprint to recent chapters - 限制章节大纲到最近章节
 */
function limitChapterBlueprint(blueprint, limit) {
  if (!blueprint) return ''
  
  const chapters = getChapterBlocks(blueprint).map(chapter => chapter.rawText)
  
  if (chapters.length <= limit) return blueprint
  
  return chapters.slice(-limit).join('\n\n').trim()
}

function getChapterBlocks(blueprint) {
  const text = String(blueprint || '')
  const headerPattern = /(^|\n)\s*(?:第\s*(\d+)\s*章|Chapter\s+(\d+))\s*(?:[-–—:：]\s*(.*?))?\s*(?=\r?\n|$)/gi
  const matches = [...text.matchAll(headerPattern)]

  return matches.map((match, index) => {
    const leading = match[1] || ''
    const headerStart = match.index + leading.length
    const headerEnd = match.index + match[0].length
    const nextStart = matches[index + 1]?.index ?? text.length
    const number = Number.parseInt(match[2] || match[3], 10)
    const title = cleanBlueprintValue(match[4] || '')

    return {
      number,
      title,
      header: text.slice(headerStart, headerEnd).trim(),
      body: text.slice(headerEnd, nextStart).trim(),
      rawText: text.slice(headerStart, nextStart).trim()
    }
  }).filter(chapter => Number.isFinite(chapter.number))
}

function cleanBlueprintValue(value) {
  return String(value || '')
    .replace(/^\[|\]$/g, '')
    .trim()
}

function compactBlueprintValue(value) {
  return cleanBlueprintValue(value)
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join(' ')
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function extractBlueprintSection(text, labels) {
  const labelPattern = labels.map(escapeRegExp).join('|')
  const startPattern = new RegExp(
    `(?:^|\\n)\\s*(?:【(?:${labelPattern})】|\\[(?:${labelPattern})\\]|(?:${labelPattern})[：:])\\s*`,
    'i'
  )
  const match = startPattern.exec(text)
  if (!match) return ''

  const sectionStart = match.index + match[0].length
  const rest = text.slice(sectionStart)
  const nextFieldPattern = /\n\s*(?:【[^】]+】|\[[^\]]+\]|(?:Chapter Position|Core Role|Emotional Tone|Characters|Scene Design|Plot Points|Foreshadowing|Suspense Density|Plot Tension|Chapter Summary)\s*[：:]?)/i
  const nextFieldIndex = rest.search(nextFieldPattern)

  return (nextFieldIndex >= 0 ? rest.slice(0, nextFieldIndex) : rest).trim()
}

function extractBlueprintPoint(text, labels) {
  if (!text) return ''

  const labelPattern = labels.map(escapeRegExp).join('|')
  const pointPattern = new RegExp(
    `(?:^|\\n)\\s*(?:[-*]\\s*)?(?:\\d+[.、]\\s*)?(?:${labelPattern})[：:]\\s*([\\s\\S]*?)(?=\\n\\s*(?:[-*]\\s*)?(?:\\d+[.、]\\s*)?(?:开场|发展|转折|收尾|Opening|Development|Turning Point|Conclusion|埋设|强化|回收|Plant|Strengthen|Recover)[：:]|$)`,
    'i'
  )
  const match = text.match(pointPattern)
  return match ? compactBlueprintValue(match[1]) : ''
}

function normalizeForeshadowing(section) {
  const raw = compactBlueprintValue(section)

  return {
    plant: extractBlueprintPoint(section, ['埋设', 'Plant']),
    strengthen: extractBlueprintPoint(section, ['强化', 'Strengthen']),
    recover: extractBlueprintPoint(section, ['回收', 'Recover']),
    raw
  }
}

function normalizePlotPoints(section) {
  return {
    opening: extractBlueprintPoint(section, ['开场', 'Opening']),
    development: extractBlueprintPoint(section, ['发展', 'Development']),
    turningPoint: extractBlueprintPoint(section, ['转折', 'Turning Point']),
    conclusion: extractBlueprintPoint(section, ['收尾', 'Conclusion'])
  }
}

function stringifyForeshadowing(foreshadowing) {
  if (!foreshadowing) return ''
  if (typeof foreshadowing === 'string') return foreshadowing
  return foreshadowing.raw || [
    foreshadowing.plant ? `埋设：${foreshadowing.plant}` : '',
    foreshadowing.strengthen ? `强化：${foreshadowing.strengthen}` : '',
    foreshadowing.recover ? `回收：${foreshadowing.recover}` : ''
  ].filter(Boolean).join('\n')
}

function stringifyPlotPoints(plotPoints) {
  if (!plotPoints) return ''
  if (typeof plotPoints === 'string') return plotPoints
  return [
    plotPoints.opening ? `开场：${plotPoints.opening}` : '',
    plotPoints.development ? `发展：${plotPoints.development}` : '',
    plotPoints.turningPoint ? `转折：${plotPoints.turningPoint}` : '',
    plotPoints.conclusion ? `收尾：${plotPoints.conclusion}` : ''
  ].filter(Boolean).join('\n')
}

function normalizeChapterBlueprintItem(item) {
  const foreshadowingPlan = normalizeForeshadowing(stringifyForeshadowing(item.foreshadowing ?? item.foreshadowingPlan ?? ''))
  const plotPointsText = item.plotPointsText || stringifyPlotPoints(item.plotPoints)
  const plotPoints = item.plotPoints || normalizePlotPoints(plotPointsText)

  return {
    number: Number.parseInt(item.number ?? item.chapter ?? item.chapterNumber, 10),
    title: cleanBlueprintValue(item.title || item.chapterTitle || ''),
    position: compactBlueprintValue(item.position || item.chapterPosition || item.role || ''),
    purpose: compactBlueprintValue(item.purpose || item.coreRole || item.corePurpose || ''),
    emotionalTone: compactBlueprintValue(item.emotionalTone || item.tone || ''),
    characters: compactBlueprintValue(item.characters || item.characterList || ''),
    sceneDesign: compactBlueprintValue(item.sceneDesign || item.scenes || ''),
    plotPoints,
    plotPointsText: compactBlueprintValue(plotPointsText),
    foreshadowing: stringifyForeshadowing(foreshadowingPlan),
    foreshadowingPlan,
    suspense: compactBlueprintValue(item.suspense || item.suspenseDensity || ''),
    tension: compactBlueprintValue(item.tension || item.plotTension || ''),
    twistLevel: compactBlueprintValue(item.twistLevel || item.plotTwistLevel || item.tension || item.plotTension || ''),
    summary: compactBlueprintValue(item.summary || item.chapterSummary || ''),
    rawText: item.rawText || ''
  }
}

function parseChapterBlueprintJson(blueprint) {
  try {
    const parsed = JSON.parse(blueprint)
    const chapters = Array.isArray(parsed) ? parsed : parsed.chapters
    if (!Array.isArray(chapters)) return []
    return chapters
      .map(normalizeChapterBlueprintItem)
      .filter(chapter => Number.isFinite(chapter.number))
      .sort((a, b) => a.number - b.number)
  } catch (error) {
    return []
  }
}

/**
 * Parse chapter blueprint into structured data - 解析章节大纲为结构化数据
 */
export function parseChapterBlueprint(blueprint) {
  if (Array.isArray(blueprint)) {
    return blueprint
      .map(normalizeChapterBlueprintItem)
      .filter(chapter => Number.isFinite(chapter.number))
      .sort((a, b) => a.number - b.number)
  }

  if (!blueprint) return []

  const jsonChapters = parseChapterBlueprintJson(blueprint)
  if (jsonChapters.length > 0) return jsonChapters

  const chapters = []
  const blocks = getChapterBlocks(blueprint)

  for (const block of blocks) {
    const chapterText = block.rawText
    const plotPointsText = extractBlueprintSection(chapterText, ['情节要点', 'Plot Points'])
    const foreshadowingSection = extractBlueprintSection(chapterText, ['伏笔操作', '伏笔设计', 'Foreshadowing'])
    const foreshadowingPlan = normalizeForeshadowing(foreshadowingSection)
    const tension = compactBlueprintValue(extractBlueprintSection(chapterText, ['情节张力', 'Plot Tension']))

    chapters.push({
      number: block.number,
      title: block.title,
      position: compactBlueprintValue(extractBlueprintSection(chapterText, ['本章定位', 'Chapter Position'])),
      purpose: compactBlueprintValue(extractBlueprintSection(chapterText, ['核心作用', 'Core Role'])),
      emotionalTone: compactBlueprintValue(extractBlueprintSection(chapterText, ['情感基调', 'Emotional Tone'])),
      characters: compactBlueprintValue(extractBlueprintSection(chapterText, ['出场角色', 'Characters'])),
      sceneDesign: compactBlueprintValue(extractBlueprintSection(chapterText, ['场景设计', 'Scene Design'])),
      plotPoints: normalizePlotPoints(plotPointsText),
      plotPointsText: compactBlueprintValue(plotPointsText),
      foreshadowing: foreshadowingPlan.raw,
      foreshadowingPlan,
      suspense: compactBlueprintValue(extractBlueprintSection(chapterText, ['悬念密度', 'Suspense Density'])),
      tension,
      twistLevel: compactBlueprintValue(extractBlueprintSection(chapterText, ['认知颠覆', '转折程度', 'Plot Twist', 'Plot Twist Level'])) || tension,
      summary: compactBlueprintValue(extractBlueprintSection(chapterText, ['本章简述', '章节简述', 'Chapter Summary'])),
      rawText: chapterText
    })
  }

  return chapters
}

export function getProjectBlueprintChapters(project) {
  const structuredBlueprint = project?.chapterBlueprintData
  if (Array.isArray(structuredBlueprint) && structuredBlueprint.length > 0) {
    return parseChapterBlueprint(structuredBlueprint)
  }

  return parseChapterBlueprint(project?.chapterBlueprint)
}

/**
 * Generate a single chapter draft - 生成单章草稿
 */
export async function generateChapterDraft(project, chapterNumber, apiConfig, onProgress) {
  const chapters = getProjectBlueprintChapters(project)
  const chapterInfo = chapters.find(c => c.number === chapterNumber)
  
  if (!chapterInfo) {
    throw new Error(`章节 ${chapterNumber} 不存在于大纲中`)
  }

  const nextChapterInfo = chapters.find(c => c.number === chapterNumber + 1) || {
    title: '(未定)',
    position: '过渡章节',
    purpose: '承上启下',
    suspense: '中等',
    foreshadowing: '无特殊伏笔',
    twistLevel: '★☆☆☆☆',
    summary: '衔接过渡内容'
  }

  let prompt
  if (chapterNumber === 1) {
    // First chapter - 第一章
    onProgress(`正在生成第 ${chapterNumber} 章草稿...`, 0, 3)
    
    const novelSetting = `
小说类型：${formatGenre(project.genre)}

核心种子：${project.coreSeed}

角色体系：${project.characterDynamics}

世界观：${project.worldBuilding}

情节架构：${project.plotArchitecture}
`
    prompt = firstChapterDraftPrompt({
      chapterNumber,
      chapterTitle: chapterInfo.title,
      chapterRole: chapterInfo.position,
      chapterPurpose: chapterInfo.purpose,
      emotionalTone: chapterInfo.emotionalTone,
      charactersInvolved: chapterInfo.characters,
      sceneDesign: chapterInfo.sceneDesign,
      plotPoints: chapterInfo.plotPointsText,
      suspenseLevel: chapterInfo.suspense,
      foreshadowing: chapterInfo.foreshadowing,
      plotTwistLevel: chapterInfo.twistLevel,
      plotTension: chapterInfo.tension,
      chapterSummary: chapterInfo.summary,
      novelSetting,
      wordNumber: project.wordNumber,
      userGuidance: project.userGuidance
    })
  } else {
    // Subsequent chapters - 后续章节
    onProgress(`正在生成第 ${chapterNumber} 章草稿...`, 0, 3)
    
    // Get previous chapter excerpt - 获取前章结尾段
    const prevChapter = project.chapters?.[chapterNumber - 1] || ''
    const previousChapterExcerpt = prevChapter.slice(-800) || '(无前章内容)'

    // ========== v3 三层记忆架构：组装精简上下文 ==========
    const hasV3Data = project.chapterSummaries && project.chapterSummaries.length > 0
    let contextForDraft = ''
    let characterStateForDraft = ''

    if (hasV3Data) {
      // 使用 v3 组装器，取最近 20 章 + 相关角色 + 活跃伏笔 + 世界观
      try {
        // 解析角色数据库
        let relevantCharacters = []
        if (project.characterDB) {
          try {
            const charDB = JSON.parse(project.characterDB)
            // 取活跃的、重要度 >= 3 的角色（最近 20 章内出现过的）
            relevantCharacters = (charDB.characters || []).filter(c => {
              const isRecent = (chapterNumber - (c.lastSeen || 0)) <= 20
              const isImportant = (c.importance || 0) >= 3
              return c.status === 'active' && (isRecent || isImportant)
            })
          } catch (e) {
            console.warn('角色数据库解析失败，降级处理')
          }
        }

        // 解析伏笔数据库
        let activeForeshadowing = []
        if (project.foreshadowingDB) {
          try {
            const fDB = JSON.parse(project.foreshadowingDB)
            activeForeshadowing = (fDB.foreshadowing || []).filter(f => 
              f.status !== 'resolved' && f.status !== 'expired'
            )
          } catch (e) {
            console.warn('伏笔数据库解析失败，降级处理')
          }
        }

        // 解析世界观数据库
        let relevantWorldEntries = []
        if (project.worldBuildingDB) {
          try {
            const wDB = JSON.parse(project.worldBuildingDB)
            relevantWorldEntries = (wDB.entries || []).filter(w => {
              const isRecent = (chapterNumber - (w.lastMentioned || 0)) <= 20
              const isImportant = (w.importance || 0) >= 3
              return isRecent || isImportant
            })
          } catch (e) {
            console.warn('世界观数据库解析失败，降级处理')
          }
        }

        // 用 assembleChapterContext 组装精简上下文
        contextForDraft = assembleChapterContext({
          chapterNumber,
          chapterOutline: chapterInfo.rawText || chapterInfo.summary,
          novelTitle: project.title,
          genre: formatGenre(project.genre),
          recentSummaries: project.chapterSummaries,
          recentCount: 20,
          currentArcSummary: project.currentArcSummary || '',
          globalArcsSummary: project.globalArcsSummary || '',
          relevantCharacters,
          activeForeshadowing,
          relevantWorldEntries,
          previousChapterEnding: previousChapterExcerpt,
          styleGuide: project.userGuidance || '',
          writerPrompt: '' // 不在这里加写作指令，交给 nextChapterDraftPrompt
        })

        // 从角色数据库生成角色状态文本（兼容 nextChapterDraftPrompt）
        characterStateForDraft = relevantCharacters.map(c => {
          const lines = [`【${c.name}】(${c.role}) - ${c.currentState?.physical || ''} ${c.currentState?.mental || ''}`]
          if (c.abilities?.length) lines.push(`  能力：${c.abilities.map(a => `${a.name}(${a.level})`).join('、')}`)
          if (c.items?.length) lines.push(`  物品：${c.items.map(i => i.name).join('、')}`)
          if (c.goals?.shortTerm) lines.push(`  目标：${c.goals.shortTerm}`)
          return lines.join('\n')
        }).join('\n\n')

      } catch (e) {
        console.error('v3 上下文组装失败，降级到旧版:', e)
      }
    }

    // 降级：如果没有 v3 数据，使用旧版 globalSummary 和 characterState
    const globalSummaryText = contextForDraft || project.globalSummary || '(这是第一章，暂无前文摘要)'
    const characterStateText = characterStateForDraft || project.characterState || '(暂无角色状态)'

    prompt = nextChapterDraftPrompt({
      chapterNumber,
      chapterTitle: chapterInfo.title,
      chapterRole: chapterInfo.position,
      chapterPurpose: chapterInfo.purpose,
      emotionalTone: chapterInfo.emotionalTone,
      charactersInvolved: chapterInfo.characters,
      sceneDesign: chapterInfo.sceneDesign,
      plotPoints: chapterInfo.plotPointsText,
      suspenseLevel: chapterInfo.suspense,
      foreshadowing: chapterInfo.foreshadowing,
      plotTwistLevel: chapterInfo.twistLevel,
      plotTension: chapterInfo.tension,
      chapterSummary: chapterInfo.summary,
      wordNumber: project.wordNumber,
      globalSummary: globalSummaryText,
      previousChapterExcerpt,
      characterState: characterStateText,
      userGuidance: project.userGuidance,
      shortSummary: '',
      nextChapterNumber: chapterNumber + 1,
      nextChapterTitle: nextChapterInfo.title,
      nextChapterRole: nextChapterInfo.position,
      nextChapterPurpose: nextChapterInfo.purpose,
      nextSuspenseLevel: nextChapterInfo.suspense,
      nextForeshadowing: nextChapterInfo.foreshadowing,
      nextPlotTwistLevel: nextChapterInfo.twistLevel,
      nextChapterSummary: nextChapterInfo.summary
    })
  }

  const chapterText = cleanResponse(await chatCompletion(apiConfig, prompt))
  onProgress(`第 ${chapterNumber} 章草稿生成完成`, 1, 3)

  return chapterText
}

function parseJsonResponse(response, fallback = null) {
  const text = cleanResponse(response || '')
  if (!text) return fallback

  try {
    return JSON.parse(text)
  } catch (error) {
    const objectStart = text.indexOf('{')
    const objectEnd = text.lastIndexOf('}')
    if (objectStart >= 0 && objectEnd > objectStart) {
      try {
        return JSON.parse(text.slice(objectStart, objectEnd + 1))
      } catch (innerError) {
        // Continue to array fallback.
      }
    }

    const arrayStart = text.indexOf('[')
    const arrayEnd = text.lastIndexOf(']')
    if (arrayStart >= 0 && arrayEnd > arrayStart) {
      try {
        return JSON.parse(text.slice(arrayStart, arrayEnd + 1))
      } catch (innerError) {
        // Fall through to fallback.
      }
    }
  }

  return fallback
}

function normalizeChapterSummary(summary, chapterNumber) {
  if (!summary || typeof summary !== 'object') return null

  const chapter = Number.parseInt(summary.chapter ?? summary.chapterNumber ?? chapterNumber, 10)
  if (!Number.isFinite(chapter)) return null

  return {
    ...summary,
    chapter,
    title: summary.title || `第${chapter}章`,
    summary: summary.summary || ''
  }
}

function upsertChapterSummary(chapterSummaries, nextSummary) {
  const normalized = normalizeChapterSummary(nextSummary)
  if (!normalized) return chapterSummaries || []

  const existing = Array.isArray(chapterSummaries) ? chapterSummaries : []
  const withoutCurrent = existing.filter(summary => Number(summary?.chapter) !== normalized.chapter)

  return [...withoutCurrent, normalized]
    .filter(summary => Number.isFinite(Number(summary?.chapter)))
    .sort((a, b) => Number(a.chapter) - Number(b.chapter))
}

function getProjectArcSize(project) {
  const configured = Number.parseInt(project?.arcSize, 10)
  if (Number.isFinite(configured) && configured > 0) return configured
  return DEFAULT_ARC_SIZE
}

function getArcRange(project, chapterNumber) {
  const arcSize = getProjectArcSize(project)
  const configuredStart = Number.parseInt(project?.currentArcStart, 10)
  const inferredStart = Math.floor((chapterNumber - 1) / arcSize) * arcSize + 1
  const start = Number.isFinite(configuredStart) &&
    configuredStart > 0 &&
    configuredStart <= chapterNumber &&
    chapterNumber < configuredStart + arcSize
      ? configuredStart
      : inferredStart

  const novelEnd = Number.parseInt(project?.numberOfChapters, 10)
  const end = Math.min(
    start + arcSize - 1,
    Number.isFinite(novelEnd) && novelEnd > 0 ? novelEnd : start + arcSize - 1
  )

  return { start, end, size: arcSize }
}

function getArcName(project, start, end) {
  return project?.currentArcName || `第${start}-${end}章剧情弧`
}

function upsertArcSummary(arcSummaries, arcSummary) {
  const existing = Array.isArray(arcSummaries) ? arcSummaries : []
  const withoutCurrent = existing.filter(item => Number(item?.startChapter) !== Number(arcSummary.startChapter))

  return [...withoutCurrent, arcSummary]
    .filter(item => Number.isFinite(Number(item?.startChapter)))
    .sort((a, b) => Number(a.startChapter) - Number(b.startChapter))
}

function buildGlobalArcsSummary(arcSummaries) {
  return (arcSummaries || [])
    .map(arc => `【${arc.name || `第${arc.startChapter}-${arc.endChapter}章`}】\n${arc.summary || ''}`)
    .filter(Boolean)
    .join('\n\n')
    .trim()
}

function buildCompatibilitySummary({ chapterSummaries, currentArcSummary, globalArcsSummary }) {
  const recentSummaryText = (chapterSummaries || [])
    .slice(-8)
    .map(summary => `第${summary.chapter}章「${summary.title || ''}」：${summary.summary || ''}`)
    .join('\n\n')

  return [
    globalArcsSummary ? `# 已完成剧情弧\n${globalArcsSummary}` : '',
    currentArcSummary ? `# 当前剧情弧\n${currentArcSummary}` : '',
    recentSummaryText ? `# 最近章节\n${recentSummaryText}` : ''
  ].filter(Boolean).join('\n\n').trim()
}

function parseJsonDb(value, fallback) {
  if (!value) return { ...fallback }
  if (typeof value === 'object') return value

  return parseJsonResponse(value, { ...fallback }) || { ...fallback }
}

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function hasValue(value) {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim() !== ''
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value).length > 0
  return true
}

function mergeUniqueStrings(existing = [], incoming = []) {
  const seen = new Set()
  return [...asArray(existing), ...asArray(incoming)]
    .filter(item => hasValue(item))
    .filter(item => {
      const key = String(item).trim()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

function mergeObjectList(existing = [], incoming = [], keyFields = ['id', 'name']) {
  const result = [...asArray(existing)]

  for (const item of asArray(incoming)) {
    if (!item || typeof item !== 'object') continue
    const index = result.findIndex(existingItem => keyFields.some(field =>
      hasValue(item[field]) && existingItem?.[field] === item[field]
    ))

    if (index >= 0) {
      result[index] = mergePlainObject(result[index], item)
    } else {
      result.push(item)
    }
  }

  return result
}

function mergeCompositeObjectList(existing = [], incoming = [], keyFields = []) {
  const result = [...asArray(existing)]

  for (const item of asArray(incoming)) {
    if (!item || typeof item !== 'object') continue
    const index = result.findIndex(existingItem =>
      keyFields.length > 0 &&
      keyFields.every(field => hasValue(item[field]) && existingItem?.[field] === item[field])
    )

    if (index >= 0) {
      result[index] = mergePlainObject(result[index], item)
    } else {
      result.push(item)
    }
  }

  return result
}

function mergePlainObject(existing = {}, incoming = {}) {
  const result = { ...(existing || {}) }

  for (const [key, value] of Object.entries(incoming || {})) {
    if (!hasValue(value)) continue

    if (Array.isArray(value)) {
      const current = asArray(result[key])
      const hasObjectItems = [...current, ...value].some(item => item && typeof item === 'object')
      result[key] = hasObjectItems
        ? mergeObjectList(current, value)
        : mergeUniqueStrings(current, value)
    } else if (typeof value === 'object') {
      result[key] = mergePlainObject(result[key], value)
    } else {
      result[key] = value
    }
  }

  return result
}

function findCharacter(characters, character) {
  return characters.find(existing =>
    (hasValue(character.id) && existing.id === character.id) ||
    (hasValue(character.name) && existing.name === character.name)
  )
}

function normalizeCharacterFact(character, chapterNumber, existingCharacters, index) {
  if (!character || typeof character !== 'object') return null

  const existing = findCharacter(existingCharacters, character)
  const id = character.id || existing?.id || character.name || `character-${chapterNumber}-${index + 1}`
  const firstSeen = Number.isFinite(Number(existing?.firstSeen))
    ? Number(existing.firstSeen)
    : chapterNumber

  return {
    ...character,
    id,
    name: character.name || existing?.name || id,
    status: character.status || existing?.status || 'active',
    firstSeen,
    lastSeen: chapterNumber,
    importance: Number.parseInt(character.importance ?? existing?.importance ?? 1, 10)
  }
}

function mergeCharacterDB(currentDB, facts, chapterNumber) {
  const db = parseJsonDb(currentDB, { characters: [], relationships: [], factions: [], metadata: {} })
  const characters = asArray(db.characters)

  for (const rawCharacter of asArray(facts.characters)) {
    const character = normalizeCharacterFact(rawCharacter, chapterNumber, characters, characters.length)
    if (!character) continue

    const existingIndex = characters.findIndex(existing => existing.id === character.id || existing.name === character.name)
    if (existingIndex >= 0) {
      characters[existingIndex] = mergePlainObject(characters[existingIndex], character)
    } else {
      characters.push(character)
    }
  }

  const relationships = asArray(db.relationships)
  for (const relationship of asArray(facts.relationships)) {
    if (!relationship?.from || !relationship?.to) continue
    const existingIndex = relationships.findIndex(existing =>
      existing.from === relationship.from &&
      existing.to === relationship.to &&
      existing.type === relationship.type
    )
    const historyEntry = relationship.event
      ? { chapter: chapterNumber, event: relationship.event }
      : null
    const normalized = {
      ...relationship,
      history: historyEntry ? [historyEntry] : asArray(relationship.history)
    }

    if (existingIndex >= 0) {
      const previous = relationships[existingIndex]
      relationships[existingIndex] = {
        ...mergePlainObject(previous, normalized),
        history: mergeCompositeObjectList(previous.history, normalized.history, ['chapter', 'event'])
      }
    } else {
      relationships.push(normalized)
    }
  }

  const factions = mergeObjectList(db.factions, facts.factions, ['name'])
  const activeCharacters = characters.filter(character => character.status === 'active').length

  return {
    ...db,
    characters,
    relationships,
    factions,
    metadata: {
      ...(db.metadata || {}),
      totalCharacters: characters.length,
      activeCharacters,
      lastUpdated: chapterNumber
    }
  }
}

function findForeshadowing(items, item) {
  return items.find(existing =>
    (hasValue(item.id) && existing.id === item.id) ||
    (hasValue(item.name) && existing.name === item.name)
  )
}

function mergeForeshadowingDB(currentDB, facts, chapterNumber) {
  const db = parseJsonDb(currentDB, { foreshadowing: [], statistics: {} })
  const foreshadowing = asArray(db.foreshadowing)

  for (const rawItem of asArray(facts.foreshadowing)) {
    if (!rawItem || typeof rawItem !== 'object') continue
    const existing = findForeshadowing(foreshadowing, rawItem)
    const action = rawItem.action || rawItem.status || 'reinforced'
    const id = rawItem.id || existing?.id || rawItem.name || `foreshadowing-${chapterNumber}-${foreshadowing.length + 1}`
    const timelineEntry = {
      chapter: chapterNumber,
      action,
      detail: rawItem.detail || rawItem.plantedDescription || rawItem.resolvedDescription || rawItem.name || ''
    }
    const normalized = {
      ...rawItem,
      id,
      name: rawItem.name || existing?.name || id,
      plantedChapter: rawItem.plantedChapter || existing?.plantedChapter || chapterNumber,
      status: rawItem.status || action,
      resolvedChapter: action === 'resolved' ? (rawItem.resolvedChapter || chapterNumber) : rawItem.resolvedChapter,
      timeline: [timelineEntry],
      importance: Number.parseInt(rawItem.importance ?? existing?.importance ?? 1, 10)
    }
    delete normalized.action
    delete normalized.detail

    const existingIndex = foreshadowing.findIndex(item => item.id === id || item.name === normalized.name)
    if (existingIndex >= 0) {
      const previous = foreshadowing[existingIndex]
      foreshadowing[existingIndex] = {
        ...mergePlainObject(previous, normalized),
        timeline: mergeCompositeObjectList(previous.timeline, normalized.timeline, ['chapter', 'action', 'detail'])
      }
    } else {
      foreshadowing.push(normalized)
    }
  }

  for (const item of foreshadowing) {
    if (item.status !== 'resolved' && item.status !== 'expired' && chapterNumber - Number(item.plantedChapter || chapterNumber) > 35) {
      item.status = 'expired'
    }
  }

  const active = foreshadowing.filter(item => item.status !== 'resolved' && item.status !== 'expired').length
  const resolved = foreshadowing.filter(item => item.status === 'resolved').length
  const overdue = foreshadowing.filter(item => item.status === 'expired').length

  return {
    ...db,
    foreshadowing,
    statistics: {
      total: foreshadowing.length,
      active,
      resolved,
      overdue
    }
  }
}

function mergeWorldBuildingDB(currentDB, facts, chapterNumber) {
  const db = parseJsonDb(currentDB, { entries: [] })
  const entries = asArray(db.entries)

  for (const rawEntry of asArray(facts.worldBuilding)) {
    if (!rawEntry || typeof rawEntry !== 'object') continue
    const existing = entries.find(entry =>
      (hasValue(rawEntry.id) && entry.id === rawEntry.id) ||
      (hasValue(rawEntry.name) && entry.name === rawEntry.name)
    )
    const id = rawEntry.id || existing?.id || rawEntry.name || `world-${chapterNumber}-${entries.length + 1}`
    const normalized = {
      ...rawEntry,
      id,
      name: rawEntry.name || existing?.name || id,
      firstMentioned: rawEntry.firstMentioned || existing?.firstMentioned || chapterNumber,
      lastMentioned: chapterNumber,
      importance: Number.parseInt(rawEntry.importance ?? existing?.importance ?? 1, 10)
    }

    const existingIndex = entries.findIndex(entry => entry.id === id || entry.name === normalized.name)
    if (existingIndex >= 0) {
      entries[existingIndex] = mergePlainObject(entries[existingIndex], normalized)
    } else {
      entries.push(normalized)
    }
  }

  return { ...db, entries }
}

function buildCharacterStateFromDB(characterDB, fallback = '') {
  try {
    const db = typeof characterDB === 'string' ? JSON.parse(characterDB) : characterDB
    const stateLines = (db.characters || [])
      .filter(c => c.status === 'active' && c.importance >= 4)
      .map(c => {
        const parts = [`【${c.name}】${c.currentState?.physical || ''} ${c.currentState?.mental || ''}`]
        if (c.abilities?.length) parts.push(`  能力：${c.abilities.map(a => `${a.name}(${a.level})`).join('、')}`)
        if (c.goals?.shortTerm) parts.push(`  目标：${c.goals.shortTerm}`)
        return parts.join('\n')
      })
    return stateLines.join('\n\n') || fallback
  } catch (e) {
    return fallback
  }
}

/**
 * Finalize chapter - 章节定稿（v3 三层记忆架构）
 * 更新：章节摘要（JSON）、角色数据库、伏笔数据库、世界观数据库
 */
export async function finalizeChapter(project, chapterNumber, chapterText, apiConfig, onProgress) {
  const results = {
    globalSummary: project.globalSummary,
    characterState: project.characterState,
    characterDB: project.characterDB,
    foreshadowingDB: project.foreshadowingDB,
    worldBuildingDB: project.worldBuildingDB,
    chapterSummaries: Array.isArray(project.chapterSummaries) ? project.chapterSummaries : [],
    arcSummaries: Array.isArray(project.arcSummaries) ? project.arcSummaries : [],
    currentArcSummary: project.currentArcSummary || '',
    currentArcName: project.currentArcName || '',
    currentArcStart: project.currentArcStart || 1,
    currentArcEnd: project.currentArcEnd || null,
    globalArcsSummary: project.globalArcsSummary || '',
    memoryMigrated: project.memoryMigrated || false
  }

  // 0. 旧摘要迁移：已有项目如果只有 globalSummary，先拆入 v3 分章/弧结构。
  if (!results.memoryMigrated && results.chapterSummaries.length === 0 && project.globalSummary && chapterNumber > 1) {
    onProgress('正在迁移旧摘要...', 1, 6)
    try {
      const migrationResponse = await chatCompletion(apiConfig, migrateOldSummary({
        oldSummary: project.globalSummary,
        currentChapter: chapterNumber - 1
      }))
      const migrated = parseJsonResponse(migrationResponse)

      if (migrated) {
        if (Array.isArray(migrated.chapterSummaries)) {
          results.chapterSummaries = migrated.chapterSummaries
            .map(summary => normalizeChapterSummary(summary))
            .filter(Boolean)
            .sort((a, b) => Number(a.chapter) - Number(b.chapter))
        }
        if (Array.isArray(migrated.arcSummaries)) {
          results.arcSummaries = migrated.arcSummaries
            .map((arc, index) => ({
              id: arc.id || `arc-${arc.startChapter || index + 1}`,
              name: arc.name || `剧情弧 ${index + 1}`,
              startChapter: Number.parseInt(arc.startChapter || arc.start || 1, 10),
              endChapter: Number.parseInt(arc.endChapter || arc.end || arc.startChapter || 1, 10),
              summary: arc.summary || arc.description || '',
              updatedAt: new Date().toISOString()
            }))
            .filter(arc => Number.isFinite(arc.startChapter))
            .sort((a, b) => a.startChapter - b.startChapter)
        }
        results.globalArcsSummary = migrated.globalSummary || buildGlobalArcsSummary(results.arcSummaries)
      }
      results.memoryMigrated = true
    } catch (e) {
      console.error('旧摘要迁移失败，继续使用现有摘要:', e)
    }
  }

  // 1. 单次提取本章事实包，并在本地合并到各类记忆库。
  onProgress('正在提取章节事实...', 2, 6)
  try {
    const previousChapterSummary = results.chapterSummaries.length > 0
      ? JSON.stringify(results.chapterSummaries[results.chapterSummaries.length - 1])
      : ''
    const chapterOutline = getProjectBlueprintChapters(project).find(chapter => chapter.number === chapterNumber)?.rawText || ''

    const factsResponse = await chatCompletion(apiConfig, extractChapterFacts({
      chapterText,
      chapterNumber,
      previousChapterSummary,
      arcSummary: results.currentArcSummary || '',
      chapterOutline,
      currentCharacterDB: results.characterDB || '{"characters": [], "relationships": []}',
      currentForeshadowingDB: results.foreshadowingDB || '{"foreshadowing": []}',
      currentWorldDB: results.worldBuildingDB || '{"entries": []}'
    }))
    const chapterFacts = parseJsonResponse(factsResponse)
    if (!chapterFacts) throw new Error('章节事实 JSON 解析失败')

    const summaryJson = normalizeChapterSummary(chapterFacts.chapterSummary, chapterNumber)
    if (summaryJson) {
      results.chapterSummaries = upsertChapterSummary(results.chapterSummaries, summaryJson)
    }

    onProgress('正在合并章节事实...', 3, 6)
    const characterDB = mergeCharacterDB(results.characterDB, chapterFacts, chapterNumber)
    results.characterDB = JSON.stringify(characterDB, null, 2)
    results.characterState = buildCharacterStateFromDB(characterDB, project.characterState)

    const foreshadowingDB = mergeForeshadowingDB(results.foreshadowingDB, chapterFacts, chapterNumber)
    results.foreshadowingDB = JSON.stringify(foreshadowingDB, null, 2)

    const worldBuildingDB = mergeWorldBuildingDB(results.worldBuildingDB, chapterFacts, chapterNumber)
    results.worldBuildingDB = JSON.stringify(worldBuildingDB, null, 2)
  } catch (e) {
    console.error('章节事实提取失败，降级到旧版多步更新:', e)
    try {
      const previousChapterSummary = results.chapterSummaries.length > 0
        ? JSON.stringify(results.chapterSummaries[results.chapterSummaries.length - 1])
        : ''
      const summaryResponse = cleanResponse(await chatCompletion(apiConfig, generateChapterSummary({
        chapterText,
        chapterNumber,
        previousChapterSummary,
        arcSummary: results.currentArcSummary || '',
        chapterOutline: getProjectBlueprintChapters(project).find(chapter => chapter.number === chapterNumber)?.rawText || ''
      })))
      const summaryJson = normalizeChapterSummary(parseJsonResponse(summaryResponse), chapterNumber)
      if (summaryJson) {
        results.chapterSummaries = upsertChapterSummary(results.chapterSummaries, summaryJson)
      }

      const charDBResponse = cleanResponse(await chatCompletion(apiConfig, updateCharacterDB({
        chapterText,
        currentCharacterDB: results.characterDB || '{"characters": [], "relationships": []}',
        chapterNumber
      })))
      results.characterDB = JSON.stringify(parseJsonResponse(charDBResponse, parseJsonDb(results.characterDB, { characters: [], relationships: [] })), null, 2)
      results.characterState = buildCharacterStateFromDB(results.characterDB, project.characterState)

      const foreshadowingResponse = cleanResponse(await chatCompletion(apiConfig, updateForeshadowingDB({
        chapterText,
        currentForeshadowingDB: results.foreshadowingDB || '{"foreshadowing": []}',
        chapterNumber
      })))
      results.foreshadowingDB = JSON.stringify(parseJsonResponse(foreshadowingResponse, parseJsonDb(results.foreshadowingDB, { foreshadowing: [] })), null, 2)

      const worldResponse = cleanResponse(await chatCompletion(apiConfig, updateWorldBuildingDB({
        chapterText,
        currentWorldDB: results.worldBuildingDB || '{"entries": []}',
        chapterNumber
      })))
      results.worldBuildingDB = JSON.stringify(parseJsonResponse(worldResponse, parseJsonDb(results.worldBuildingDB, { entries: [] })), null, 2)
    } catch (e2) {
      console.error('旧版多步记忆更新也失败:', e2)
    }
  }

  // 2. 维护弧/卷级摘要：当前弧持续更新，弧结束后归档并生成跨弧摘要。
  onProgress('正在更新弧摘要...', 4, 6)
  try {
    const { start: arcStart, end: arcEnd } = getArcRange(project, chapterNumber)
    const currentArcName = getArcName(project, arcStart, arcEnd)
    const currentArcChapterSummaries = results.chapterSummaries
      .filter(summary => Number(summary.chapter) >= arcStart && Number(summary.chapter) <= chapterNumber)

    if (currentArcChapterSummaries.length > 0) {
      const previousArcsSummary = results.globalArcsSummary || buildGlobalArcsSummary(results.arcSummaries)
      const arcSummary = cleanResponse(await chatCompletion(apiConfig, generateArcSummary({
        chapterSummaries: currentArcChapterSummaries,
        currentArcName,
        currentArcStart: arcStart,
        currentArcEnd: chapterNumber,
        previousArcsSummary
      })))

      const isArcComplete = chapterNumber >= arcEnd || chapterNumber >= Number(project.numberOfChapters || Infinity)
      if (isArcComplete) {
        results.arcSummaries = upsertArcSummary(results.arcSummaries, {
          id: `arc-${arcStart}-${chapterNumber}`,
          name: currentArcName,
          startChapter: arcStart,
          endChapter: chapterNumber,
          summary: arcSummary,
          updatedAt: new Date().toISOString()
        })
        results.globalArcsSummary = buildGlobalArcsSummary(results.arcSummaries)
        results.currentArcSummary = ''
        results.currentArcName = ''
        results.currentArcStart = chapterNumber + 1
        results.currentArcEnd = null
      } else {
        results.currentArcSummary = arcSummary
        results.currentArcName = currentArcName
        results.currentArcStart = arcStart
        results.currentArcEnd = arcEnd
        results.globalArcsSummary = previousArcsSummary
      }
    }
  } catch (e) {
    console.error('弧摘要更新失败:', e)
  }

  // 3. 更新兼容旧版的 globalSummary，但只保留跨弧摘要 + 当前弧 + 最近章节，避免无限累积。
  onProgress('正在压缩记忆摘要...', 5, 6)
  try {
    results.globalSummary = buildCompatibilitySummary({
      chapterSummaries: results.chapterSummaries,
      currentArcSummary: results.currentArcSummary,
      globalArcsSummary: results.globalArcsSummary
    }) || results.globalSummary

    if (estimateTokens(results.globalSummary) > GLOBAL_SUMMARY_TOKEN_LIMIT) {
      results.globalSummary = cleanResponse(await chatCompletion(apiConfig, compressGlobalSummary({
        globalSummary: results.globalSummary,
        maxChars: 6000
      })))
    }

    if (estimateTokens(results.globalArcsSummary) > GLOBAL_SUMMARY_TOKEN_LIMIT) {
      results.globalArcsSummary = cleanResponse(await chatCompletion(apiConfig, compressGlobalSummary({
        globalSummary: results.globalArcsSummary,
        maxChars: 5000
      })))
    }
  } catch (e) {
    console.error('摘要压缩失败:', e)
  }

  onProgress('章节定稿完成', 6, 6)

  return results
}

/**
 * Enrich chapter text - 扩写章节
 */
export async function enrichChapter(chapterText, wordNumber, apiConfig, onProgress) {
  onProgress('正在扩写章节...', 0, 1)
  
  const enrichedText = cleanResponse(await chatCompletion(apiConfig, enrichChapterPrompt({
    chapterText,
    wordNumber
  })))

  onProgress('扩写完成', 1, 1)
  return enrichedText || chapterText
}

/**
 * Export novel to text - 导出小说为文本
 */
export function exportNovelToText(project) {
  const lines = []
  
  // Title - 标题
  lines.push(`《${project.title}》`)
  lines.push('')
  lines.push(`类型：${formatGenre(project.genre)}`)
  lines.push(`主题：${project.topic}`)
  lines.push('')
  lines.push('=' .repeat(50))
  lines.push('')

  // Chapters - 章节内容
  const chapters = project.chapters || {}
  const chapterNums = Object.keys(chapters).map(Number).sort((a, b) => a - b)
  const blueprintChapters = getProjectBlueprintChapters(project)

  for (const num of chapterNums) {
    const info = blueprintChapters.find(c => c.number === num)
    const title = info?.title || `第${num}章`
    
    lines.push(`第${num}章 ${title}`)
    lines.push('')
    lines.push(chapters[num])
    lines.push('')
    lines.push('-'.repeat(30))
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Export novel to markdown - 导出小说为 Markdown
 */
export function exportNovelToMarkdown(project) {
  const lines = []
  
  // Title - 标题
  lines.push(`# ${project.title}`)
  lines.push('')
  lines.push(`> **类型**：${formatGenre(project.genre)}`)
  lines.push(`> **主题**：${project.topic}`)
  lines.push('')
  lines.push('---')
  lines.push('')

  // Chapters - 章节内容
  const chapters = project.chapters || {}
  const chapterNums = Object.keys(chapters).map(Number).sort((a, b) => a - b)
  const blueprintChapters = getProjectBlueprintChapters(project)

  for (const num of chapterNums) {
    const info = blueprintChapters.find(c => c.number === num)
    const title = info?.title || `第${num}章`
    
    lines.push(`## 第${num}章 ${title}`)
    lines.push('')
    lines.push(chapters[num])
    lines.push('')
  }

  return lines.join('\n')
}
