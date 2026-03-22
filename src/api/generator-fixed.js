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
    
    // 验证生成数量
    const generatedCount = (blueprint.match(/第\s*\d+\s*章/g) || []).length
    if (generatedCount < numberOfChapters) {
      console.warn(`大纲生成不完整：期望${numberOfChapters}章，实际${generatedCount}章`)
    }
  } else {
    // Chunked generation - 分块生成
    while (currentStart <= numberOfChapters) {
      const currentEnd = Math.min(currentStart + chunkSize - 1, numberOfChapters)
      const expectedCount = currentEnd - currentStart + 1
      onProgress(
        `正在生成章节大纲 (${currentStart}-${currentEnd})...`,
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
        const actualCount = (chunkResult.match(/第\s*\d+\s*章/g) || []).length
        if (actualCount < expectedCount) {
          console.warn(`第${currentStart}-${currentEnd}块生成不完整：期望${expectedCount}章，实际${actualCount}章`)
          // 尝试重试一次
          onProgress(`检测到生成不完整，重试中...`, currentStart - 1, numberOfChapters)
          const retryResult = cleanResponse(await chatCompletion(apiConfig, prompt))
          const retryCount = (retryResult.match(/第\s*\d+\s*章/g) || []).length
          if (retryCount > actualCount) {
            blueprint = blueprint ? `${blueprint}\n\n${retryResult}` : retryResult
          } else {
            blueprint = blueprint ? `${blueprint}\n\n${chunkResult}` : chunkResult
          }
        } else {
          blueprint = blueprint ? `${blueprint}\n\n${chunkResult}` : chunkResult
        }
      }

      currentStart = currentEnd + 1
    }
  }

  // 最终验证
  const finalCount = (blueprint.match(/第\s*\d+\s*章/g) || []).length
  if (finalCount < numberOfChapters) {
    console.error(`大纲生成完成但数量不足：期望${numberOfChapters}章，实际${finalCount}章`)
    onProgress(`⚠️ 大纲生成不完整：${finalCount}/${numberOfChapters}章`, numberOfChapters, numberOfChapters)
  } else {
    onProgress('章节大纲生成完成!', numberOfChapters, numberOfChapters)
  }
  
  return blueprint
}
