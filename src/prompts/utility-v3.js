/**
 * Utility Prompts - v3 三层记忆架构
 * 
 * 核心改造：
 * 1. 摘要采用「分章压缩」而非「单块累加」
 * 2. 角色状态改为「JSON 结构化存储」，支持按需裁剪
 * 3. 伏笔追踪独立为正式系统，含生命周期管理
 * 4. 新增「章节生成上下文组装器」，只喂精简信息给写作模型
 * 
 * 修改时间：2026-03-27
 */

// ========================
// 工具函数
// ========================

/**
 * 计算大致 token 数（中文约 1.5 字/token，英文 4 字符/token）
 */
export const estimateTokens = (text) => {
  if (!text) return 0;
  const cjk = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const other = text.length - cjk;
  return Math.ceil(cjk / 1.5 + other / 4);
};

/**
 * 截断文本到指定 token 数，保留完整段落
 */
export const truncateToTokens = (text, maxTokens) => {
  if (!text) return '';
  const currentTokens = estimateTokens(text);
  if (currentTokens <= maxTokens) return text;
  // 按段落截断，优先保留前面
  const paragraphs = text.split(/\n{2,}/);
  let result = '';
  for (const p of paragraphs) {
    const candidate = result ? result + '\n\n' + p : p;
    if (estimateTokens(candidate) > maxTokens) break;
    result = candidate;
  }
  return result;
};


// ========================
// 第一层：分章摘要系统
// ========================

/**
 * 生成章节摘要（每章独立一条，而非合并到大文本块）
 * 
 * 输出格式：结构化 JSON 字符串，每章一条记录
 * 
 * @param {Object} params
 * @param {string} params.chapterText - 本章全文
 * @param {number} params.chapterNumber - 章节号
 * @param {string} params.previousChapterSummary - 上一章摘要（用于衔接）
 * @param {string} params.arcSummary - 当前卷/弧的汇总摘要
 * @param {string} params.chapterOutline - 本章大纲
 */
export const generateChapterSummary = (params) => `
你是一个专业的小说编辑，负责提取章节关键信息。

## 本章内容
${params.chapterText}

## 本章大纲（参考）
${params.chapterOutline || '(无)'}

## 上一章摘要
${params.previousChapterSummary || '(无)'}

## 当前弧/卷摘要
${params.arcSummary || '(无)'}

---

请提取本章（第 ${params.chapterNumber} 章）的关键信息，严格按以下 JSON 格式输出：

\`\`\`json
{
  "chapter": ${params.chapterNumber},
  "title": "本章标题或一句话概括",
  "summary": "本章核心事件摘要，200-300字，包含起因经过结果",
  "events": [
    {
      "type": "剧情推进/角色互动/世界观揭示/伏笔埋设/伏笔回收/转折",
      "description": "事件描述，50-80字",
      "characters": ["涉及角色名"],
      "importance": 1-5
    }
  ],
  "characterUpdates": [
    {
      "name": "角色名",
      "changes": "本章该角色的变化，50字以内",
      "newItems": ["获得的物品"],
      "newAbilities": ["获得的能力"],
      "relationshipChanges": [
        {"target": "对方角色", "change": "关系变化描述"}
      ]
    }
  ],
  "foreshadowing": {
    "planted": ["新埋设的伏笔描述"],
    "reinforced": ["本章再次提及的伏笔"],
    "resolved": ["本章回收的伏笔"]
  },
  "worldBuilding": ["本章新增或确认的世界观设定"],
  "mood": "本章整体氛围（紧张/轻松/悬疑/温馨/悲壮/...）",
  "cliffhanger": "本章结尾钩子/悬念，如无则为null",
  "arcStatus": "当前弧的进展状态，一句话"
}
\`\`\`

仅返回 JSON，不要任何解释。
`;


// ========================
// 第二层：弧/卷级汇总摘要
// ========================

/**
 * 更新弧/卷级汇总摘要
 * 
 * 不再是「把所有章节合在一起」，而是每个弧一个独立摘要，
 * 跨弧只保留极简概要（每个弧 200 字以内）。
 * 
 * @param {Object} params
 * @param {Array} params.chapterSummaries - 本弧所有章节的摘要 JSON 数组
 * @param {string} params.currentArcName - 当前弧名称
 * @param {number} params.currentArcStart - 当前弧起始章节
 * @param {number} params.currentArcEnd - 当前弧结束章节
 * @param {string} params.previousArcsSummary - 之前所有弧的极简汇总
 */
export const generateArcSummary = (params) => `
你是一个专业的小说编辑，负责编写弧/卷的汇总摘要。

## 当前弧信息
弧名称：${params.currentArcName || '未命名'}
章节范围：第 ${params.currentArcStart} - ${params.currentArcEnd} 章

## 本弧各章节摘要
${JSON.stringify(params.chapterSummaries, null, 2)}

## 之前弧的汇总（供参考衔接）
${params.previousArcsSummary || '(这是第一个弧)'}

---

请输出本弧的汇总摘要，严格按以下格式：

### 【弧概要】(200 字)
- 弧的核心冲突和解决
- 主角在本弧的成长/变化
- 本弧对主线的推进作用

### 【关键事件】(400 字)
按时间顺序列出本弧 3-7 个最关键事件，每个 50-80 字：
1. [事件]（第 X 章）→ [结果]
2. ...

### 【角色变化】(300 字)
列出本弧中发生重大变化的角色：
- [角色名]：从 [初始状态] → [当前状态]，关键转折 [描述]

### 【伏笔状态】(200 字)
- 本弧新埋设：[列表]
- 本弧回收：[列表]
- 跨弧待回收：[列表]

### 【弧评分】(100 字)
- 节奏：[紧凑/偏慢/前松后紧/...]
- 完整度：[独立成弧/需要下弧延续/...]
- 读者体验关键点：[本弧最吸引人的 2-3 个点]

仅返回摘要文本，不要解释任何内容。
`;


// ========================
// 第三层：角色数据库（JSON 结构化）
// ========================

/**
 * 更新角色数据库
 * 
 * 核心改进：
 * 1. 角色用 JSON 对象存储，不再拼接成大文本
 * 2. 支持「活跃/淡出/归档」状态切换
 * 3. 关系用独立的边（edge）存储
 * 4. 可以按需裁剪：只取与当前章节相关的角色
 * 
 * @param {Object} params
 * @param {string} params.chapterText - 本章全文
 * @param {string} params.currentCharacterDB - 当前角色数据库（JSON 字符串）
 * @param {number} params.chapterNumber - 当前章节号
 */
export const updateCharacterDB = (params) => `
你是一个角色管理系统，负责更新小说的角色数据库。

## 本章内容
${params.chapterText}

## 当前角色数据库
${params.currentCharacterDB || '{"characters": [], "relationships": []}'}

## 当前章节
第 ${params.chapterNumber} 章

---

请根据本章内容更新角色数据库，输出完整的更新后 JSON：

\`\`\`json
{
  "characters": [
    {
      "id": "角色唯一ID（英文或拼音，如 protagonist, liubei）",
      "name": "角色中文名",
      "role": "protagonist/supporting/minor/antagonist",
      "status": "active/absent/dead",  
      "lastSeen": ${params.chapterNumber},
      "firstSeen": 1,
      "profile": {
        "identity": "身份，20字",
        "personality": "性格特征，50字",
        "background": "背景，50字"
      },
      "currentState": {
        "physical": "身体状态，30字",
        "mental": "心理状态，30字",
        "location": "当前位置"
      },
      "items": [
        {"name": "物品名", "source": "获得章节", "function": "用途，20字"}
      ],
      "abilities": [
        {"name": "能力名", "level": "等级", "limitation": "限制，20字"}
      ],
      "goals": {
        "shortTerm": "短期目标，30字",
        "longTerm": "长期目标，30字"
      },
      "importance": 1-10,
      "tags": ["标签1", "标签2"]
    }
  ],
  "relationships": [
    {
      "from": "角色A的id",
      "to": "角色B的id", 
      "type": "trust/enemy/love/rival/mentor/family/ally",
      "strength": 1-10,
      "history": [
        {"chapter": 5, "event": "关系变化事件"},
        {"chapter": 20, "event": "关系深化事件"}
      ],
      "currentStatus": "当前关系状态，30字"
    }
  ],
  "factions": [
    {
      "name": "阵营/势力名",
      "members": ["角色id列表"],
      "stance": "对主角阵营的态度",
      "status": "当前状态"
    }
  ],
  "metadata": {
    "totalCharacters": 0,
    "activeCharacters": 0,
    "lastUpdated": ${params.chapterNumber}
  }
}
\`\`\`

更新规则：
1. 已有角色只更新变化字段，不要覆盖未变化的信息
2. 超过 30 章未出现的角色，status 改为 "absent"
3. 新角色添加完整信息
4. 关系必须双向记录或在 history 中记录变化
5. importance 评分：主角=10，核心配角=7-9，重要配角=4-6，次要角色=1-3

仅返回 JSON，不要任何解释。
`;


// ========================
// 第三层：伏笔数据库
// ========================

/**
 * 更新伏笔数据库
 * 
 * @param {Object} params
 * @param {string} params.chapterText - 本章全文
 * @param {string} params.currentForeshadowingDB - 当前伏笔数据库（JSON 字符串）
 * @param {number} params.chapterNumber - 当前章节号
 */
export const updateForeshadowingDB = (params) => `
你是一个伏笔管理系统，负责追踪小说的伏笔生命周期。

## 本章内容
${params.chapterText}

## 当前伏笔数据库
${params.currentForeshadowingDB || '{"foreshadowing": []}'}

## 当前章节
第 ${params.chapterNumber} 章

---

请根据本章内容更新伏笔数据库，输出完整 JSON：

\`\`\`json
{
  "foreshadowing": [
    {
      "id": "伏笔唯一ID",
      "name": "伏笔名称/简述",
      "type": "item/identity/relationship/event/world/ability",
      "plantedChapter": 5,
      "plantedDescription": "埋设时的具体描写，50字",
      "status": "planted/reinforced/resolved/expired",
      "resolvedChapter": null,
      "resolvedDescription": null,
      "importance": 1-5,
      "relatedCharacters": ["角色id"],
      "timeline": [
        {"chapter": 5, "action": "planted", "detail": "在XX场景中埋设"},
        {"chapter": 15, "action": "reinforced", "detail": "通过XX事件再次暗示"},
        {"chapter": 30, "action": "resolved", "detail": "通过XX方式回收"}
      ],
      "expectedResolution": "预计在什么情境下回收，50字"
    }
  ],
  "statistics": {
    "total": 0,
    "active": 0,
    "resolved": 0,
    "overdue": 0
  }
}
\`\`\`

更新规则：
1. 新伏笔：创建新条目，status="planted"
2. 本章再次提及：更新 timeline，status="reinforced"
3. 本章回收：status="resolved"，填写 resolvedChapter 和 resolvedDescription
4. 超过 35 章未回收且 status!="resolved"：视为 "expired"（可能遗忘的伏笔）
5. importance: 5=核心伏笔，4=重要伏笔，3=一般伏笔，2=氛围伏笔，1=细节伏笔

仅返回 JSON，不要任何解释。
`;


// ========================
// 世界观词条系统
// ========================

/**
 * 更新世界观词条
 * 
 * @param {Object} params
 * @param {string} params.chapterText - 本章全文
 * @param {string} params.currentWorldDB - 当前世界观数据库（JSON 字符串）
 * @param {number} params.chapterNumber - 当前章节号
 */
export const updateWorldBuildingDB = (params) => `
你是一个世界观管理系统，负责维护小说的世界设定词条。

## 本章内容
${params.chapterText}

## 当前世界观数据库
${params.currentWorldDB || '{"entries": []}'}

## 当前章节
第 ${params.chapterNumber} 章

---

请根据本章内容更新世界观数据库：

\`\`\`json
{
  "entries": [
    {
      "id": "词条唯一ID",
      "name": "设定名称",
      "category": "geography/history/culture/magic_system/technology/politics/creature/item",
      "description": "详细描述，100字",
      "rules": "相关规则和限制，50字",
      "firstMentioned": 1,
      "lastMentioned": ${params.chapterNumber},
      "relatedCharacters": ["角色id"],
      "relatedEntries": ["关联词条id"],
      "importance": 1-5
    }
  ]
}
\`\`\`

规则：
1. 新设定：创建新条目
2. 已有设定的新信息：补充 description 和 rules
3. 超过 40 章未提及：保留但可精简 description
4. 不要重复添加已有词条

仅返回 JSON，不要任何解释。
`;


// ========================
// 章节生成上下文组装器
// ========================

/**
 * 【核心】组装章节写作的上下文
 * 
 * 这是解决「遗忘」和「幻觉」的关键——不再把所有摘要拼成大文本，
 * 而是按需组装，只给写作模型它需要的信息。
 * 
 * @param {Object} params
 * @param {number} params.chapterNumber - 要生成的章节号
 * @param {string} params.chapterOutline - 本章大纲
 * @param {string} params.novelTitle - 小说标题
 * @param {string} params.genre - 题材
 * @param {Array} params.recentSummaries - 最近 5 章的摘要 JSON 数组
 * @param {string} params.currentArcSummary - 当前弧的汇总摘要
 * @param {string} params.globalArcsSummary - 跨弧极简摘要（每个弧 200 字）
 * @param {Array} params.relevantCharacters - 与本章相关的角色 JSON 数组
 * @param {Array} params.activeForeshadowing - 活跃的伏笔 JSON 数组
 * @param {Array} params.relevantWorldEntries - 与本章相关的世界观词条
 * @param {string} params.previousChapterEnding - 上一章最后 500 字（衔接用）
 * @param {string} params.styleGuide - 写作风格指南
 * @param {string} params.writerPrompt - 写作主提示词
 */
export const assembleChapterContext = (params) => {
  // 限制最近摘要的数量和长度
  const recentSummariesText = (params.recentSummaries || [])
    .slice(-5) // 只取最近 5 章
    .map(s => `第${s.chapter}章「${s.title}」：${s.summary}`)
    .join('\n');

  // 角色信息精简输出
  const charactersText = (params.relevantCharacters || [])
    .map(c => {
      const lines = [`【${c.name}】(${c.role}) - ${c.currentState?.physical || ''} ${c.currentState?.mental || ''}`];
      if (c.abilities?.length) lines.push(`  能力：${c.abilities.map(a => `${a.name}(${a.level})`).join('、')}`);
      if (c.items?.length) lines.push(`  物品：${c.items.map(i => i.name).join('、')}`);
      if (c.goals?.shortTerm) lines.push(`  短期目标：${c.goals.shortTerm}`);
      return lines.join('\n');
    })
    .join('\n\n');

  // 伏笔信息精简输出
  const foreshadowingText = (params.activeForeshadowing || [])
    .filter(f => f.status !== 'resolved')
    .map(f => {
      const urgency = (params.chapterNumber - f.plantedChapter) > 25 ? '⚠️ 高优先' : '';
      return `- ${f.name}（第${f.plantedChapter}章埋设，${f.type}，${urgency}）`;
    })
    .join('\n');

  // 世界观词条精简输出
  const worldText = (params.relevantWorldEntries || [])
    .map(w => `- ${w.name}（${w.category}）：${w.description?.slice(0, 60)}...`)
    .join('\n');

  return `
# 小说信息
标题：${params.novelTitle || '未命名'}
题材：${params.genre || '未指定'}

# 本章信息
章节：第 ${params.chapterNumber} 章
大纲：
${params.chapterOutline}

# 写作风格
${params.styleGuide || '(无特殊要求)'}

# 上一章结尾（用于衔接）
${params.previousChapterEnding ? '...' + params.previousChapterEnding.slice(-500) : '(第一章)'}

# 近期剧情（最近 5 章摘要）
${recentSummariesText || '(无)'}

# 当前弧摘要
${params.currentArcSummary || '(无)'}

# 跨弧概要
${params.globalArcsSummary || '(这是第一个弧)'}

# 相关角色状态
${charactersText || '(无特定角色)'}

# 活跃伏笔（本章需关注）
${foreshadowingText || '(无活跃伏笔)'}

# 相关世界观设定
${worldText || '(无特定设定)'}

---

${params.writerPrompt}
`;
};


// ========================
// 全局摘要自适应压缩
// ========================

/**
 * 当全局摘要超出限制时，自动压缩
 * 
 * 压缩策略：
 * 1. 远古章节（>30章前）：只保留事件名和结果，100字以内
 * 2. 旧章节（15-30章前）：保留关键事件，200字以内
 * 3. 近期章节（<15章前）：保留详细信息
 * 4. 伏笔和关键角色关系永远不压缩
 */
export const compressGlobalSummary = (params) => `
你是一个信息压缩专家。以下是小说的前文摘要，因内容过长需要压缩。

## 原始摘要
${params.globalSummary}

## 压缩要求
- 总字数控制在 ${params.maxChars || 6000} 字以内
- 近期内容（最近 15 章）尽量保留细节
- 远古内容（30 章以前）极度精简，只保留对后续有影响的关键信息
- **绝对不能删除**：
  - 未回收的伏笔
  - 主要角色的核心关系
  - 对后续剧情有重大影响的事件
  - 世界观核心设定
- 按原有格式结构输出

仅返回压缩后的摘要文本。
`;


// ========================
// 老摘要 → 新格式迁移工具
// ========================

/**
 * 将旧格式的单文本块摘要，迁移为新的分章结构
 * 一次性使用，用于升级现有项目
 */
export const migrateOldSummary = (params) => `
你是一个数据迁移专家。以下是小说的旧格式前文摘要，请将其拆分为章节级别的结构化数据。

## 旧格式摘要
${params.oldSummary}

## 当前已到章节
第 ${params.currentChapter} 章

---

请输出结构化的章节数组 JSON：

\`\`\`json
{
  "chapterSummaries": [
    {
      "chapter": 1,
      "title": "章节标题/概括",
      "summary": "核心事件摘要，150-200字",
      "events": [
        {"type": "剧情推进/角色互动/转折/伏笔", "description": "50字", "importance": 1-5}
      ],
      "characterUpdates": [
        {"name": "角色名", "changes": "本章变化，30字"}
      ]
    }
  ],
  "arcSummaries": [
    {
      "name": "弧名称",
      "startChapter": 1,
      "endChapter": 10,
      "summary": "弧的汇总摘要，300字",
      "keyEvents": ["关键事件列表"]
    }
  ],
  "globalSummary": "全局极简摘要，500字以内，只保留最重要的主线信息"
}
\`\`\`

迁移规则：
1. 尽量为每一章生成独立摘要
2. 如果旧摘要中某些章节信息缺失，根据上下文推断
3. 每章摘要 150-200 字
4. 自动识别弧/卷的划分
5. 全局摘要只保留对后续有影响的核心信息

仅返回 JSON。
`;


// ========================
// 导出
// ========================

export const utilityPromptsV3 = {
  // 核心更新函数
  generateChapterSummary,
  generateArcSummary,
  updateCharacterDB,
  updateForeshadowingDB,
  updateWorldBuildingDB,
  
  // 上下文组装
  assembleChapterContext,
  
  // 压缩和迁移
  compressGlobalSummary,
  migrateOldSummary,
  
  // 工具函数
  estimateTokens,
  truncateToTokens
};

export default utilityPromptsV3;
