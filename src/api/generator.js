import { chatCompletion, cleanResponse } from './llm'
import { architecturePrompts, chapterPrompts, utilityPrompts } from '../prompts'
// 使用优化版 prompts（详细大纲 + 严格遵循 + 防截断）
import { chapterPrompts as chapterPromptsOptimized } from '../prompts/chapter-optimized'
import { utilityPrompts as utilityPromptsOptimized } from '../prompts/utility-optimized'

// 解构提示词
const { coreSeed: coreSeedPrompt, characterDynamics: characterDynamicsPrompt, worldBuilding: worldBuildingPrompt, plotArchitecture: plotArchitecturePrompt, characterState: createCharacterStatePrompt } = architecturePrompts

// 使用优化版 prompts
const chapterPromptsToUse = chapterPromptsOptimized
const utilityPromptsToUse = utilityPromptsOptimized

const { blueprint: chapterBlueprintPrompt, blueprintChunked: chunkedChapterBlueprintPrompt, firstDraft: firstChapterDraftPrompt, nextDraft: nextChapterDraftPrompt, enrich: enrichChapterPrompt } = chapterPromptsToUse
const { summary: summaryPrompt, updateCharacterState: updateCharacterStatePrompt, trackForeshadowing: trackForeshadowingPrompt } = utilityPromptsToUse

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
    onProgress('正在生成核心种子...', 1, 5)
    const prompt = coreSeedPrompt(params)
    results.coreSeed = cleanResponse(await chatCompletion(apiConfig, prompt))
  }

  // Step 2: Character dynamics - 角色动力学
  if (!results.characterDynamics) {
    onProgress('正在生成角色体系...', 2, 5)
    const prompt = characterDynamicsPrompt({
      ...params,
      coreSeed: results.coreSeed
    })
    results.characterDynamics = cleanResponse(await chatCompletion(apiConfig, prompt))
  }

  // Step 2.5: Character state - 角色状态
  if (!results.characterState && results.characterDynamics) {
    onProgress('正在生成角色状态...', 2.5, 5)
    const prompt = createCharacterStatePrompt({
      characterDynamics: results.characterDynamics
    })
    results.characterState = cleanResponse(await chatCompletion(apiConfig, prompt))
  }

  // Step 3: World building - 世界观
  if (!results.worldBuilding) {
    onProgress('正在构建世界观...', 3, 5)
    const prompt = worldBuildingPrompt({
      ...params,
      coreSeed: results.coreSeed
    })
    results.worldBuilding = cleanResponse(await chatCompletion(apiConfig, prompt))
  }

  // Step 4: Plot architecture - 情节架构
  if (!results.plotArchitecture) {
    onProgress('正在设计情节架构...', 4, 5)
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
  const tokensPerChapter = 200
  const maxTokens = apiConfig.maxTokens || 8192
  let chunkSize = Math.floor(maxTokens / tokensPerChapter / 10) * 10 - 10
  chunkSize = Math.max(1, Math.min(chunkSize, numberOfChapters))

  let blueprint = project.chapterBlueprint || ''
  
  // Parse existing chapters - 解析已有章节
  const existingChapters = blueprint.match(/第\s*(\d+)\s*章/g) || []
  const maxExistingChapter = existingChapters.length > 0
    ? Math.max(...existingChapters.map(c => parseInt(c.match(/\d+/)[0])))
    : 0

  let currentStart = maxExistingChapter + 1

  if (chunkSize >= numberOfChapters && !blueprint) {
    // Single shot generation - 一次性生成
    onProgress(`正在生成章节大纲 (1-${numberOfChapters})...`, 0, 1)
    const prompt = chapterBlueprintPrompt({
      userGuidance,
      novelArchitecture,
      numberOfChapters
    })
    blueprint = cleanResponse(await chatCompletion(apiConfig, prompt))
  } else {
    // Chunked generation - 分块生成
    while (currentStart <= numberOfChapters) {
      const currentEnd = Math.min(currentStart + chunkSize - 1, numberOfChapters)
      onProgress(
        `正在生成章节大纲 (${currentStart}-${currentEnd})...`,
        currentStart - 1,
        numberOfChapters
      )

      // Limit existing blueprint to last 100 chapters - 限制已有大纲到最近100章
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
        blueprint = blueprint ? `${blueprint}\n\n${chunkResult}` : chunkResult
      }

      currentStart = currentEnd + 1
    }
  }

  onProgress('章节大纲生成完成!', numberOfChapters, numberOfChapters)
  return blueprint
}

/**
 * Limit chapter blueprint to recent chapters - 限制章节大纲到最近章节
 */
function limitChapterBlueprint(blueprint, limit) {
  if (!blueprint) return ''
  
  const pattern = /(第\s*\d+\s*章.*?)(?=第\s*\d+\s*章|$)/gs
  const chapters = blueprint.match(pattern) || []
  
  if (chapters.length <= limit) return blueprint
  
  return chapters.slice(-limit).join('\n\n').trim()
}

/**
 * Parse chapter blueprint into structured data - 解析章节大纲为结构化数据
 */
export function parseChapterBlueprint(blueprint) {
  if (!blueprint) return []

  const chapters = []
  const pattern = /第\s*(\d+)\s*章\s*[-–—]\s*(.+?)(?=\n|$)/g
  let match

  while ((match = pattern.exec(blueprint)) !== null) {
    const chapterNum = parseInt(match[1])
    const title = match[2].trim()
    
    // Extract chapter details - 提取章节详情
    const startIndex = match.index
    const endIndex = blueprint.indexOf(`第 ${chapterNum + 1} 章`, startIndex)
    const chapterText = endIndex > -1 
      ? blueprint.substring(startIndex, endIndex)
      : blueprint.substring(startIndex)

    chapters.push({
      number: chapterNum,
      title,
      position: extractField(chapterText, '本章定位'),
      purpose: extractField(chapterText, '核心作用'),
      suspense: extractField(chapterText, '悬念密度'),
      foreshadowing: extractField(chapterText, '伏笔操作'),
      twistLevel: extractField(chapterText, '认知颠覆'),
      summary: extractField(chapterText, '本章简述')
    })
  }

  return chapters
}

/**
 * Extract field value from text - 从文本中提取字段值
 */
function extractField(text, fieldName) {
  const pattern = new RegExp(`${fieldName}[：:]\\s*(.+?)(?=\\n|$)`)
  const match = text.match(pattern)
  return match ? match[1].trim() : ''
}

/**
 * Generate a single chapter draft - 生成单章草稿
 */
export async function generateChapterDraft(project, chapterNumber, apiConfig, onProgress) {
  const chapters = parseChapterBlueprint(project.chapterBlueprint)
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

  // Build novel setting text - 构建小说设定文本
  const novelSetting = `
小说类型：${formatGenre(project.genre)}

核心种子：${project.coreSeed}

角色体系：${project.characterDynamics}

世界观：${project.worldBuilding}

情节架构：${project.plotArchitecture}
`

  let prompt
  if (chapterNumber === 1) {
    // First chapter - 第一章
    onProgress(`正在生成第 ${chapterNumber} 章草稿...`, 0, 3)
    prompt = firstChapterDraftPrompt({
      chapterNumber,
      chapterTitle: chapterInfo.title,
      chapterRole: chapterInfo.position,
      chapterPurpose: chapterInfo.purpose,
      suspenseLevel: chapterInfo.suspense,
      foreshadowing: chapterInfo.foreshadowing,
      plotTwistLevel: chapterInfo.twistLevel,
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

    prompt = nextChapterDraftPrompt({
      chapterNumber,
      chapterTitle: chapterInfo.title,
      chapterRole: chapterInfo.position,
      chapterPurpose: chapterInfo.purpose,
      suspenseLevel: chapterInfo.suspense,
      foreshadowing: chapterInfo.foreshadowing,
      plotTwistLevel: chapterInfo.twistLevel,
      chapterSummary: chapterInfo.summary,
      wordNumber: project.wordNumber,
      globalSummary: project.globalSummary || '(这是第一章，暂无前文摘要)',
      previousChapterExcerpt,
      characterState: project.characterState || '(暂无角色状态)',
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

/**
 * Finalize chapter - 章节定稿（更新摘要和角色状态）
 */
export async function finalizeChapter(project, chapterNumber, chapterText, apiConfig, onProgress) {
  onProgress('正在更新前文摘要...', 1, 3)
  
  // Update global summary - 更新前文摘要
  const newSummary = cleanResponse(await chatCompletion(apiConfig, summaryPrompt({
    chapterText,
    globalSummary: project.globalSummary || ''
  })))

  onProgress('正在更新角色状态...', 2, 3)
  
  // Update character state - 更新角色状态
  const newCharacterState = cleanResponse(await chatCompletion(apiConfig, updateCharacterStatePrompt({
    chapterText,
    oldState: project.characterState || ''
  })))

  onProgress('章节定稿完成', 3, 3)

  return {
    globalSummary: newSummary || project.globalSummary,
    characterState: newCharacterState || project.characterState
  }
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
  const blueprintChapters = parseChapterBlueprint(project.chapterBlueprint)

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
  const blueprintChapters = parseChapterBlueprint(project.chapterBlueprint)

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
