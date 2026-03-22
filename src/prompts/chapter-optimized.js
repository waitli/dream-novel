/**
 * Chapter Prompts - 优化版（详细大纲 + 严格遵循）
 * 用于生成详细章节大纲和严格遵循大纲的章节正文
 * 
 * 文件来源：https://github.com/waitli/dream-novel/blob/main/src/prompts/chapter-optimized.js
 * 修改时间：2026-03-22
 * 修改内容：降低大纲详细度要求（200-300 字 → 100-150 字）
 */

/**
 * 详细章节大纲提示词（一次性生成）
 * 每章 100-150 字详细大纲（降低要求，确保能生成）
 */
export const blueprint = (params) => `
基于以下元素：
- 内容指导：${params.userGuidance || '无'}
- 小说架构：
${params.novelArchitecture}

设计${params.numberOfChapters}章的**节奏分布**（根据小说类型调整风格）：

## 章节集群划分
- 每 3-5 章构成一个情节单元，包含完整的小高潮
- 单元之间合理安排情感节奏（张弛有度）
- 关键转折章需预留铺垫

## 每章设计（严格按照以下格式，每章简述 100-150 字）

第 n 章 - [章节标题，8-15 字]
【本章定位】[角色视角/关键事件，15 字]
【核心作用】[推进主线/角色成长/关系变化，20 字]
【情感基调】[紧张/温馨/悬疑等，10 字]
【出场角色】[主要角色及状态变化，30 字]
【场景设计】[主要场景 1-2 个，30 字]
【情节要点】
  1. 开场：[15 字]
  2. 发展：[30 字]
  3. 转折：[20 字]
  4. 收尾：[15 字]
【伏笔操作】
  - 埋设：[新伏笔及预计回收章节]
  - 强化：[已有伏笔加深]
  - 回收：[本章回收的伏笔]
【悬念密度】[★☆☆☆☆～★★★★★]
【情节张力】[★☆☆☆☆～★★★★★]
【本章简述】[100-150 字概括，包含具体事件和角色变化]

## 输出要求
1. **每章简述 100-150 字**，包含核心情节发展
2. 伏笔标注预计回收章节（如：伏笔 A→第 50 章回收）
3. 角色变化要具体（如：从怀疑→信任）
4. **严格遵循小说架构中的角色设定和世界观**
5. 在生成${params.numberOfChapters}章前不要出现结局章节

**现在开始生成${params.numberOfChapters}章的大纲。**

仅给出最终文本，不要解释任何内容。
`

/**
 * 分块章节大纲提示词
 */
export const blueprintChunked = (params) => `
基于以下元素：
- 内容指导：${params.userGuidance || '无'}
- 小说架构：
${params.novelArchitecture}

需要生成总共${params.numberOfChapters}章的节奏分布，

当前已有章节目录（若为空则说明是初始生成）：
${params.chapterList || '(无)'}

现在请设计第${params.startChapter}章到第${params.endChapter}章的节奏分布：

## 每章设计（严格按照以下格式，每章简述 100-150 字）

第 n 章 - [章节标题]
【本章定位】[...]
【核心作用】[...]
【情感基调】[...]
【出场角色】[...]
【场景设计】[...]
【情节要点】
  1. 开场：[...]
  2. 发展：[...]
  3. 转折：[...]
  4. 收尾：[...]
【伏笔操作】
  - 埋设：[...]
  - 强化：[...]
  - 回收：[...]
【悬念密度】[★☆☆☆☆～★★★★★]
【情节张力】[★☆☆☆☆～★★★★★]
【本章简述】[100-150 字概括]

**注意保持与已有章节的连贯性，伏笔前后一致。**

仅给出最终文本，不要解释任何内容。
`

/**
 * 第一章草稿提示词（严格遵循大纲）
 */
export const firstDraft = (params) => `
# 创作任务：第 ${params.chapterNumber} 章《${params.chapterTitle}》

## 本章大纲（必须严格遵循）
【本章定位】${params.chapterRole}
【核心作用】${params.chapterPurpose}
【悬念密度】${params.suspenseLevel}
【伏笔操作】${params.foreshadowing}
【认知颠覆】${params.plotTwistLevel}
【本章简述】${params.chapterSummary}

## 可用元素
- 核心人物：${params.charactersInvolved || '(未指定)'}
- 关键道具：${params.keyItems || '(未指定)'}
- 空间坐标：${params.sceneLocation || '(未指定)'}
- 时间压力：${params.timeConstraint || '(未指定)'}

## 小说设定
${params.novelSetting}

## 写作要求（必须遵守）

### 1. 严格遵循大纲
- **必须按照【本章简述】中的情节要点展开**
- 不得随意添加大纲中没有的重大情节
- 不得改变大纲中设定的角色关系和事件走向

### 2. 场景设计（至少 2 个场景）
- 对话场景：体现人物性格和关系，推动剧情
- 动作/互动场景：环境交互细节，感官描写（视觉/听觉/嗅觉/触觉）
- 心理/情感场景：内心活动描写，情感变化刻画
- 环境场景：氛围营造，环境与心情呼应

### 3. 字数要求
- 目标字数：${params.wordNumber}字
- 允许范围：±10%

### 4. 伏笔埋设
- 按照大纲要求埋设伏笔
- 伏笔要自然，不突兀

### 5. 格式要求
- 仅返回章节正文文本
- 不使用分章节小标题
- 不要使用 markdown 格式

## 额外指导
${params.userGuidance || '(无)'}

**现在开始创作，严格遵循大纲，确保情节连贯、角色一致、伏笔清晰。**
`

/**
 * 后续章节草稿提示词（严格遵循大纲 + 上下文连贯）
 */
export const nextDraft = (params) => `
# 创作任务：第 ${params.chapterNumber} 章《${params.chapterTitle}》

## 本章大纲（必须严格遵循）
【本章定位】${params.chapterRole}
【核心作用】${params.chapterPurpose}
【悬念密度】${params.suspenseLevel}
【伏笔设计】${params.foreshadowing}
【转折程度】${params.plotTwistLevel}
【章节简述】${params.chapterSummary}

## 上下文信息

### 前文摘要（了解故事进展）
${params.globalSummary}

### 前章结尾段（确保衔接流畅）
${params.previousChapterExcerpt}

### 角色状态（确保角色一致性）
${params.characterState}

### 用户指导
${params.userGuidance || '(无)'}

## 下一章预告（为后续铺垫）
第${params.nextChapterNumber}章《${params.nextChapterTitle}》：
- 章节定位：${params.nextChapterRole}
- 核心作用：${params.nextChapterPurpose}
- 章节简述：${params.nextChapterSummary}

## 写作要求（必须遵守）

### 1. 严格遵循大纲
- **必须按照【章节简述】中的情节要点展开**
- 不得随意添加大纲中没有的重大情节
- 不得改变大纲中设定的角色关系和事件走向
- 如有必要调整，必须在前文有合理铺垫

### 2. 上下文连贯性
- **与前文摘要保持一致**，不得出现矛盾
- **与前章结尾段自然衔接**，过渡流畅
- **角色状态一致**，性格、能力、关系符合已有设定
- 为下一章做好铺垫（参考【下一章预告】）

### 3. 场景设计（至少 2 个场景）
- 对话场景：体现人物性格和关系
- 动作/互动场景：环境交互细节，感官描写
- 心理/情感场景：内心活动，情感变化
- 环境场景：氛围营造

### 4. 字数要求
- 目标字数：${params.wordNumber}字
- 允许范围：±10%

### 5. 伏笔操作
- 按照大纲要求埋设/强化/回收伏笔
- 伏笔要自然，不突兀

### 6. 格式要求
- 仅返回章节正文文本
- 不使用分章节小标题
- 不要使用 markdown 格式

**现在开始创作，严格遵循大纲，确保与前文连贯、角色一致、伏笔清晰。**
`

/**
 * 章节扩写提示词
 */
export const enrich = (params) => `
以下章节文本较短，请在保持剧情连贯的前提下进行扩写，使其更充实，接近 ${params.wordNumber} 字左右。

原内容：
${params.chapterText}

## 扩写要求
1. **保持剧情连贯性**，不得改变原有情节走向
2. 增加环境描写（视觉/听觉/嗅觉/触觉）
3. 增加心理描写（角色内心活动、情感变化）
4. 丰富对话细节（语气、表情、动作）
5. 丰富场景细节（氛围营造、环境交互）
6. 仅给出最终文本，不要解释任何内容
`

/**
 * 导出所有章节类提示词
 */
export const chapterPrompts = {
  blueprint,
  blueprintChunked,
  firstDraft,
  nextDraft,
  enrich
}
