/**
 * Architecture Prompts - 架构类提示词
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
 * Core seed prompt - 核心种子提示词
 * Snowflake method step 1 - Summarize story essence in one sentence
 */
export const coreSeed = (params) => {
  if (isEnglish()) {
    return `
As a professional writer, please use the first step of the "Snowflake Method" to build the story core:

Topic: ${params.topic}
Genre: ${params.genre}
Length: Approximately ${params.numberOfChapters} chapters (${params.wordNumber} words per chapter)

Please summarize the story essence using a single-sentence formula based on the characteristics of the [${params.genre}] genre.

Examples for different genres:
- Mystery/Thriller: "When [protagonist] encounters [core event], they must [key action], or [disaster consequence]; meanwhile, [hidden greater crisis] is brewing."
- Romance/Heartwarming: "When [protagonist] meets [another character] in [setting], they develop a bond through [catalyst], gaining [emotional ending] during [growth/healing process]."
- Fantasy/Cultivation: "When [protagonist] obtains [opportunity], they embark on [cultivation path], face [challenges], and gradually grow to [final achievement]."
- Urban/Realistic: "When [protagonist] faces [realistic dilemma], through [effort method], they achieve [life goal] while gaining [emotional growth]."

Requirements:
1. **Strictly follow the core characteristics and emotional tone of the [${params.genre}] genre**
2. Reflect the character's core drive
3. Hint at key features of the world-building or story background
4. Express precisely in 25-100 words (Chinese) or 50-200 characters (English)

Return only the story core text, do not explain anything.
`
  }
  
  return `
作为专业作家，请用"雪花写作法"第一步构建故事核心：
主题：${params.topic}
类型：${params.genre}
篇幅：约${params.numberOfChapters}章（每章${params.wordNumber}字）

请根据【${params.genre}】类型的特点，用单句公式概括故事本质。

不同类型的示例：
- 悬疑/惊悚类："当 [主角] 遭遇 [核心事件]，必须 [关键行动]，否则 [灾难后果]；与此同时，[隐藏的更大危机] 正在发酵。"
- 言情/温馨类："当 [主角] 在 [背景环境] 中遇见 [另一角色]，两人因 [契机] 产生羁绊，在 [成长/治愈过程] 中收获 [情感结局]。"
- 玄幻/仙侠类："当 [主角] 获得 [机缘]，踏上 [修炼之路]，面对 [挑战]，逐步成长为 [最终成就]。"
- 都市/现实类："当 [主角] 面临 [现实困境]，通过 [努力方式]，实现 [人生目标]，同时收获 [情感/成长]。"

要求：
1. **严格遵循【${params.genre}】类型的核心特征和情感基调**
2. 体现人物核心驱动力
3. 暗示世界观或故事背景的关键特点
4. 使用 25-100 字精准表达

仅返回故事核心文本，不要解释任何内容。
`
}

/**
 * Character dynamics prompt - 角色动力学提示词
 * Design core characters with dynamic change potential
 */
export const characterDynamics = (params) => {
  if (isEnglish()) {
    return `
Based on the following elements:
- Novel Genre: ${params.genre || 'General'}
- Content Guidance: ${params.userGuidance || 'None'}
- Core Seed: ${params.coreSeed}

Please design 3-6 core characters with dynamic change potential. Each character should include:

Character Profile:
- Background, appearance, gender, age, occupation, etc.
- Unique traits or room for growth

Core Drive Triangle:
- Surface Goal (material objective)
- Deep Desire (emotional need)
- Soul Need (philosophical level)

Character Arc Design:
Initial State → Triggering Event → Inner Transformation → Growth Node → Final State

Relationship Network (adjust based on [${params.genre || 'General'}] genre):
- Relationships and interaction patterns with other characters
- Sources of bonds or tension between characters
- Emotional connection points (friendship/love/family/trust, etc.)
- Possible misunderstandings or obstacles to overcome

**Important**: Character design should match the emotional tone of the [${params.genre || 'General'}] genre.

Requirements:
Return only the final text, do not explain anything.
`
  }
  
  return `
基于以下元素：
- 小说类型：${params.genre || '通用'}
- 内容指导：${params.userGuidance || '无'}
- 核心种子：${params.coreSeed}

请设计 3-6 个具有动态变化潜力的核心角色，每个角色需包含：
特征：
- 背景、外貌、性别、年龄、职业等
- 角色独特之处或成长空间

核心驱动力三角：
- 表面追求（物质目标）
- 深层渴望（情感需求）
- 灵魂需求（哲学层面）

角色弧线设计：
初始状态 → 触发事件 → 内心转变 → 成长节点 → 最终状态

角色关系网（根据【${params.genre || '通用'}】类型调整）：
- 与其他角色的关系和互动模式
- 角色间的羁绊或张力来源
- 情感连接点（友情/爱情/亲情/信任等）
- 可能的误解或需要跨越的障碍

**重要**：角色设计需符合【${params.genre || '通用'}】类型的情感基调。

要求：
仅给出最终文本，不要解释任何内容。
`
}

/**
 * World building prompt - 世界观构建提示词
 * Three-dimensional interweaving method
 */
export const worldBuilding = (params) => {
  if (isEnglish()) {
    return `
Based on the following elements:
- Novel Genre: ${params.genre || 'General'}
- Content Guidance: ${params.userGuidance || 'None'}
- Core Story: "${params.coreSeed}"

To serve the above content, please build a world suitable for the [${params.genre || 'General'}] genre:

1. Physical Dimension:
- Spatial Structure (geography, main settings)
- Time Background (era/time span of the story)
- Rule System (basic operating laws of this world)

2. Social Dimension:
- Social Structure (social environment where characters exist)
- Cultural Atmosphere (customs, habits, values)
- Lifestyle (details of daily life settings)

3. Emotional Dimension:
- Core imagery throughout the book (recurring scenes, objects, symbols)
- Correspondence between environmental atmosphere and story emotions
- How scene design enhances the emotional experience of the [${params.genre || 'General'}] genre

**Important**: World-building should serve the core experience of the [${params.genre || 'General'}] genre, creating an atmosphere consistent with genre characteristics.

Requirements:
Each dimension should include at least 3 dynamic elements that can interact with character decisions.
Return only the final text, do not explain anything.
`
  }
  
  return `
基于以下元素：
- 小说类型：${params.genre || '通用'}
- 内容指导：${params.userGuidance || '无'}
- 核心故事："${params.coreSeed}"

为服务上述内容，请构建适合【${params.genre || '通用'}】类型的世界观：

1. 物理维度：
- 空间结构（地理环境、主要场景）
- 时间背景（故事发生的时代/时间跨度）
- 规则体系（该世界的基本运行法则）

2. 社会维度：
- 社会结构（人物所处的社会环境）
- 文化氛围（风俗、习惯、价值观）
- 生活方式（日常生活的细节设定）

3. 情感维度：
- 贯穿全书的核心意象（如反复出现的场景、物品、象征）
- 环境氛围与故事情感的呼应关系
- 场景设计如何强化【${params.genre || '通用'}】类型的情感体验

**重要**：世界观设计需服务于【${params.genre || '通用'}】类型的核心体验，营造符合类型特点的氛围。

要求：
每个维度至少包含 3 个可与角色决策产生互动的动态元素。
仅给出最终文本，不要解释任何内容。
`
}

/**
 * Plot architecture prompt - 情节架构提示词
 * Three-act suspense structure
 */
export const plotArchitecture = (params) => {
  if (isEnglish()) {
    return `
Based on the following elements:
- Novel Genre: ${params.genre || 'General'}
- Content Guidance: ${params.userGuidance || 'None'}
- Core Seed: ${params.coreSeed}
- Character System: ${params.characterDynamics}
- World-building: ${params.worldBuilding}

Please design a three-act plot architecture based on the [${params.genre || 'General'}] genre:

Act I (Beginning):
- Daily State Display (3 scene setups, reflecting the atmosphere of [${params.genre || 'General'}])
- Story Introduction: Show the beginning of the main storyline, romantic storyline, and subplot
- Catalyst Event: Trigger point that drives story development (changes character relationships or states)
- Initial Reaction: Protagonist's first response to change

Act II (Development):
- Plot Deepening: Interweaving development of main storyline + romantic storyline
- Challenges and Growth: Difficulties faced by characters and inner changes
- Emotional Warming/Conflict Intensification: Key nodes in relationship development
- Important Turning Point: Key moment that changes the story direction

Act III (Climax and Resolution):
- Core Conflict Explosion: The climax of the story
- Character Choice: Protagonist makes important decisions
- Emotional/Event Conclusion: Ending treatment consistent with the [${params.genre || 'General'}] genre

**Important**: Plot design should meet the expectations of [${params.genre || 'General'}] genre readers, ensuring consistent emotional tone.

Each stage should include 3 key nodes and their foreshadowing designs.
Return only the final text, do not explain anything.
`
  }
  
  return `
基于以下元素：
- 小说类型：${params.genre || '通用'}
- 内容指导：${params.userGuidance || '无'}
- 核心种子：${params.coreSeed}
- 角色体系：${params.characterDynamics}
- 世界观：${params.worldBuilding}

请根据【${params.genre || '通用'}】类型设计三幕式情节架构：

第一幕（开端） 
- 日常状态展示（3 处场景铺垫，体现【${params.genre || '通用'}】的氛围）
- 引出故事：展示主线、感情线、副线的开端
- 契机事件：推动故事发展的触发点（改变角色关系或状态）
- 初步反应：主角面对变化的第一反应

第二幕（发展）
- 剧情深入：主线 + 感情线的交织发展
- 挑战与成长：角色面临的困难和内心变化
- 情感升温/矛盾激化：关系发展的关键节点
- 重要转折：改变故事走向的关键时刻

第三幕（高潮与结局）
- 核心冲突爆发：故事的高潮部分
- 角色抉择：主角做出重要决定
- 情感/事件收尾：符合【${params.genre || '通用'}】类型的结局处理

**重要**：情节设计需符合【${params.genre || '通用'}】类型读者的期待，确保情感基调一致。

每个阶段需包含 3 个关键节点及其伏笔设计。
仅给出最终文本，不要解释任何内容。
`
}

/**
 * Character state prompt - 角色状态提示词
 * Generate initial character state document
 */
export const characterState = (params) => {
  if (isEnglish()) {
    return `
Based on the current character dynamics setting: ${params.characterDynamics}

Please generate a character state document in the following format:

Example:
Zhang San:
├── Items:
│  ├── Green Robe: A damaged green robe with dark red stains
│  └── Cold Iron Sword: A broken iron sword with ancient runes carved on the blade
├── Abilities
│  ├── Skill 1: Powerful spiritual perception: Can sense the thoughts of people around
│  └── Skill 2: Invisible Attack: Can release a spiritual attack that cannot be visually captured
├── Status
│  ├── Physical State: Tall figure, wearing gorgeous armor, cold expression
│  └── Mental State: Currently calm, but hiding ambition and unease about controlling the future of Liuxi Town
├── Relationship Network with Main Characters
│  ├── Li Si: Zhang San has been connected with her since childhood, always paying attention to her growth
│  └── Wang Er: The two have a complex past, recently made the other feel threatened due to a conflict
├── Events that Trigger or Deepen
│  ├── Unknown symbols suddenly appear in the village: This symbol seems to hint at a major event about to happen in Liuxi Town
│  └── Li Si's skin was pierced: This event made both realize the other's powerful strength, prompting them to leave the team quickly

Requirements:
Return only the compiled character state text, do not explain anything.
`
  }
  
  return `
依据当前角色动力学设定：${params.characterDynamics}

请生成一个角色状态文档，内容格式：
例：
张三：
├──物品:
│  ├──青衫：一件破损的青色长袍，带有暗红色的污渍
│  └──寒铁长剑：一柄断裂的铁剑，剑身上刻有古老的符文
├──能力
│  ├──技能 1：强大的精神感知能力：能够察觉到周围人的心中活动
│  └──技能 2：无形攻击：能够释放一种无法被视觉捕捉的精神攻击
├──状态
│  ├──身体状态：身材挺拔，穿着华丽的铠甲，面色冷峻
│  └──心理状态：目前的心态比较平静，但内心隐藏着对柳溪镇未来掌控的野心和不安
├──主要角色间关系网
│  ├──李四：张三从小就与她有关联，对她的成长一直保持关注
│  └──王二：两人之间有着复杂的过去，最近因一场冲突而让对方感到威胁
├──触发或加深的事件
│  ├──村庄内突然出现不明符号：这个不明符号似乎在暗示柳溪镇即将发生重大事件
│  └──李四被刺穿皮肤：这次事件让两人意识到对方的强大实力，促使他们迅速离开队伍

要求：
仅返回编写好的角色状态文本，不要解释任何内容。
`
}

/**
 * Export all architecture prompts
 */
export const architecturePrompts = {
  coreSeed,
  characterDynamics,
  worldBuilding,
  plotArchitecture,
  characterState
}
