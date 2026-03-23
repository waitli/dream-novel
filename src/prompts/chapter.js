/**
 * Chapter Prompts - 章节类提示词
 * 支持中英文双语生成
 */

// Get current language setting
function getLocale() {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('locale') || 'zh-CN'
  }
  return 'zh-CN'
}

// Check if current language is English
function isEnglish() {
  return getLocale() === 'en-US'
}

/**
 * Chapter blueprint prompt (single generation)
 * Suspense rhythm curve design
 */
export const blueprint = (params) => {
  if (isEnglish()) {
    return `
Based on the following elements:
- Content Guidance: ${params.userGuidance || 'None'}
- Novel Architecture:
${params.novelArchitecture}

Design the rhythm distribution for ${params.numberOfChapters} chapters (adjust style based on genre):

1. Chapter Cluster Division:
- Every 3-5 chapters form a plot unit with a complete mini-climax
- Arrange emotional rhythm reasonably between units (balance tension and relaxation)
- Reserve foreshadowing for key turning point chapters

2. Each chapter should clarify:
- Chapter Position (character/event/theme/etc.)
- Core Content (plot progression/emotional development/character growth/etc.)
- Emotional Tone (matching the genre's emotional color)
- Foreshadowing Operations (plant/strengthen/recover)
- Plot Tension (★☆☆☆☆ to ★★★★★)

Output format example:
Chapter n - [Title]
Chapter Position: [character/event/theme/...]
Core Role: [progression/turning point/development/warming/...]
Emotional Intensity: [calm/gradual/climax/...]
Foreshadowing: Plant(A clue)→Strengthen(B relationship)...
Plot Tension: ★☆☆☆☆
Chapter Summary: [One sentence summary]

Requirements:
- Use concise language, keep each chapter description under 150 words.
- Arrange rhythm reasonably to ensure coherence of the overall emotional curve.
- Do not include ending chapters before generating all ${params.numberOfChapters} chapters.
- **Plot design should match the style and emotional tone of the genre**.

Return only the final text, do not explain anything.
`
  }
  
  return `
基于以下元素：
- 内容指导：${params.userGuidance || '无'}
- 小说架构：
${params.novelArchitecture}

设计${params.numberOfChapters}章的节奏分布（根据小说类型调整风格）：
1. 章节集群划分：
- 每 3-5 章构成一个情节单元，包含完整的小高潮
- 单元之间合理安排情感节奏（张弛有度）
- 关键转折章需预留铺垫

2. 每章需明确：
- 章节定位（角色/事件/主题等）
- 核心内容（剧情推进/情感发展/角色成长等）
- 情感基调（符合小说类型的情感色彩）
- 伏笔操作（埋设/强化/回收）
- 情节张力（★☆☆☆☆ 到 ★★★★★）

输出格式示例：
第 n 章 - [标题]
本章定位：[角色/事件/主题/...]
核心作用：[推进/转折/发展/升温/...]
情感强度：[平缓/渐进/高潮/...]
伏笔操作：埋设 (A 线索)→强化 (B 关系)...
情节张力：★☆☆☆☆
本章简述：[一句话概括]

要求：
- 使用精炼语言描述，每章字数控制在 100 字以内。
- 合理安排节奏，确保整体情感曲线的连贯性。
- 在生成${params.numberOfChapters}章前不要出现结局章节。
- **情节设计需符合小说类型的风格和情感基调**。

仅给出最终文本，不要解释任何内容。
`
}

/**
 * Chunked chapter blueprint prompt
 * For batch generation of chapters
 */
export const blueprintChunked = (params) => {
  if (isEnglish()) {
    return `
Based on the following elements:
- Content Guidance: ${params.userGuidance || 'None'}
- Novel Architecture:
${params.novelArchitecture}

Need to generate rhythm distribution for a total of ${params.numberOfChapters} chapters.

Existing chapter list (if empty, this is initial generation):
${params.chapterList || '(None)'}

Now please design the rhythm distribution for chapters ${params.startChapter} to ${params.endChapter} (adjust style based on genre):

1. Chapter Cluster Division:
- Every 3-5 chapters form a plot unit with a complete mini-climax
- Arrange emotional rhythm reasonably between units (balance tension and relaxation)
- Reserve foreshadowing for key turning point chapters

2. Each chapter should clarify:
- Chapter Position (character/event/theme/etc.)
- Core Content (plot progression/emotional development/character growth/etc.)
- Emotional Tone (matching the genre's emotional color)
- Foreshadowing Operations (plant/strengthen/recover)
- Plot Tension (★☆☆☆☆ to ★★★★★)

Output format example:
Chapter n - [Title]
Chapter Position: [character/event/theme/...]
Core Role: [progression/turning point/development/warming/...]
Emotional Intensity: [calm/gradual/climax/...]
Foreshadowing: Plant(A clue)→Strengthen(B relationship)...
Plot Tension: ★☆☆☆☆
Chapter Summary: [One sentence summary]

Requirements:
- Use concise language, keep each chapter description under 150 words.
- Arrange rhythm reasonably to ensure coherence of the overall emotional curve.
- **Plot design should match the style and emotional tone of the genre**.

Return only the final text, do not explain anything.
`
  }
  
  return `
基于以下元素：
- 内容指导：${params.userGuidance || '无'}
- 小说架构：
${params.novelArchitecture}

需要生成总共${params.numberOfChapters}章的节奏分布，

当前已有章节目录（若为空则说明是初始生成）：
${params.chapterList || '(无)'}

现在请设计第${params.startChapter}章到第${params.endChapter}章的节奏分布（根据小说类型调整风格）：
1. 章节集群划分：
- 每 3-5 章构成一个情节单元，包含完整的小高潮
- 单元之间合理安排情感节奏（张弛有度）
- 关键转折章需预留铺垫

2. 每章需明确：
- 章节定位（角色/事件/主题等）
- 核心内容（剧情推进/情感发展/角色成长等）
- 情感基调（符合小说类型的情感色彩）
- 伏笔操作（埋设/强化/回收）
- 情节张力（★☆☆☆☆ 到 ★★★★★）

输出格式示例：
第 n 章 - [标题]
本章定位：[角色/事件/主题/...]
核心作用：[推进/转折/发展/升温/...]
情感强度：[平缓/渐进/高潮/...]
伏笔操作：埋设 (A 线索)→强化 (B 关系)...
情节张力：★☆☆☆☆
本章简述：[一句话概括]

要求：
- 使用精炼语言描述，每章字数控制在 100 字以内。
- 合理安排节奏，确保整体情感曲线的连贯性。
- **情节设计需符合小说类型的风格和情感基调**。

仅给出最终文本，不要解释任何内容。
`
}

/**
 * Export chapter prompts
 */
export const chapterPrompts = {
  blueprint,
  blueprintChunked
}
