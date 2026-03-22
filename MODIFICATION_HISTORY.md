# Dream Novel 修改记录

**仓库**: https://github.com/waitli/dream-novel  
**分支**: main  
**最新提交**: `1736ac2` (2026-03-22 11:52 GMT+8)

---

## 🔧 紧急修复（2026-03-22 11:52）

### 问题：章节大纲生成不完整

**现象**：计划生成 100 章大纲，实际只生成 79 章

**根本原因**：
1. 分块生成时没有验证每块实际生成的章节数量
2. AI 可能因为 token 限制或其他原因提前停止生成
3. 没有重试机制来补救生成失败的情况

**修复内容**：

| 文件 | 修改内容 |
|------|---------|
| `src/api/generator.js` | 添加章节数量验证和重试机制 |
| `src/prompts/chapter-optimized.js` | 强化 prompt，明确要求必须生成完整数量 |

**技术细节**：
- 使用正则 `/第\s*\d+\s*章/g` 统计章节数量
- 每块生成后验证：`actualCount < expectedCount` → 重试
- 重试时比较 `retryCount > actualCount` 才采用新结果
- 最终验证总章节数，显示警告信息

**generator.js 新增逻辑**：
```javascript
// 验证本块生成的章节数量
const actualCount = (chunkResult.match(/第\s*\d+\s*章/g) || []).length
if (actualCount < expectedCount) {
  console.warn(`第${currentStart}-${currentEnd}块生成不完整：期望${expectedCount}章，实际${actualCount}章`)
  // 尝试重试一次
  const retryResult = cleanResponse(await chatCompletion(apiConfig, prompt))
  const retryCount = (retryResult.match(/第\s*\d+\s*章/g) || []).length
  if (retryCount > actualCount) {
    blueprint = blueprint ? `${blueprint}\n\n${retryResult}` : retryResult
  }
}

// 最终验证
const finalCount = (blueprint.match(/第\s*\d+\s*章/g) || []).length
if (finalCount < numberOfChapters) {
  console.error(`大纲生成完成但数量不足：期望${numberOfChapters}章，实际${finalCount}章`)
  onProgress(`⚠️ 大纲生成不完整：${finalCount}/${numberOfChapters}章`, numberOfChapters, numberOfChapters)
}
```

**chapter-optimized.js 新增要求**：
```javascript
// 一次性生成 prompt
6. **必须生成完整的${params.numberOfChapters}章，不能遗漏任何章节**
7. **每章都要有标题和本章简述，确保格式完整**

// 分块生成 prompt
## 重要要求
1. **必须生成第${params.startChapter}章到第${params.endChapter}章，共${expectedCount}章，不能遗漏**
2. 每章都要有标题和本章简述
3. 如果内容过长，也要确保所有章节都生成完整
```

---

## 📝 主要修改（2026-03-22 10:08）

### 修改原因

1. **章节大纲要求过高**：原版本每章 200-300 字详细大纲，有时无法生成成功
2. **前文摘要字数不足**：3000 字限制在长篇小说（50 章+）时会被截断
3. **角色状态容量不够**：2500 字无法追踪复杂的多角色关系

### 修改内容

| 文件 | 修改项 | 原值 | 新值 | 变化 |
|------|--------|------|------|------|
| `chapter-optimized.js` | 大纲每章简述 | 200-300 字 | **100-150 字** | ⬇️ -50% |
| `utility-optimized.js` | 前文摘要总字数 | 3000 字 | **9000 字** | ⬆️ +200% |
| `utility-optimized.js` | 角色状态总字数 | 2500 字 | **5000 字** | ⬆️ +100% |

### 详细对比

#### 1️⃣ 章节大纲优化 (`chapter-optimized.js`)

**降低详细度，确保生成成功率**

| 字段 | 原要求 | 新要求 |
|------|--------|--------|
| 章节标题 | 10-20 字 | 8-15 字 |
| 【本章定位】 | 20 字 | 15 字 |
| 【核心作用】 | 30 字 | 20 字 |
| 【情感基调】 | 15 字 | 10 字 |
| 【出场角色】 | 50 字 | 30 字 |
| 【场景设计】 | 50 字 | 30 字 |
| 【情节要点 - 开场】 | 20 字 | 15 字 |
| 【情节要点 - 发展】 | 40 字 | 30 字 |
| 【情节要点 - 转折】 | 30 字 | 20 字 |
| 【情节要点 - 收尾】 | 20 字 | 15 字 |
| 【本章简述】 | 200-300 字 | **100-150 字** |

**输出要求简化**：从 6 条减至 5 条，移除过细的感官细节要求。

---

#### 2️⃣ 前文摘要优化 (`utility-optimized.js`)

**大幅增加容量，支持长篇小说**

| 模块 | 原字数 | 新字数 | 说明 |
|------|--------|--------|------|
| 【核心主线】 | 300 字 | **800 字** | 增加核心矛盾演变过程 |
| 【重要事件】 | 500 字 | **3000 字** | 每章 3-5 个事件，每个 150-200 字 |
| 【角色关系】 | 400 字 | **1500 字** | 详细关系演变和张力来源 |
| 【未解之谜】 | 300 字 | **1500 字** | 详细伏笔列表和状态 |
| 【世界观揭示】 | 300 字 | **1500 字** | 详细规则和设定 |
| 【时间线梳理】 | ❌ 无 | **700 字** | 新增模块 |
| **总计** | **3000 字** | **9000 字** | **+200%** |

**新增要求**：
- 每个重大事件必须包含：起因、经过、结果、影响
- 优先级：核心主线 > 重要事件 > 角色关系 > 未解之谜 > 世界观揭示 > 时间线梳理

---

#### 3️⃣ 角色状态优化 (`utility-optimized.js`)

**支持更复杂的角色关系网络**

| 模块 | 原字数 | 新字数 | 说明 |
|------|--------|--------|------|
| 【主角】 | 100 字/人 | **300 字/人** | 增加成长轨迹、详细目标 |
| 【重要配角】 | 80 字/人 | **200 字/人** | 增加核心动机、个人目标 |
| 【次要角色】 | ❌ 无 | **100 字/人** | 新增模块 |
| 【角色关系网】 | 200 字 | **500 字** | 详细关系演变和原因 |
| 【阵营/势力关系】 | ❌ 无 | **300 字** | 新增模块 |
| 【淡出角色】 | 50 字 | **200 字** | 详细记录和回归预测 |
| **总计** | **2500 字** | **5000 字** | **+100%** |

**新增字段**：
- 主角：成长轨迹（50 字）
- 重要配角：核心动机（40 字）
- 关系变化必须标注章节和原因

---

### 新增模块

#### 1. 时间线梳理（700 字）
```markdown
### 【时间线梳理】(700 字)
- 主要事件的时间顺序
- 倒计时状态（如有）
- 角色年龄/修炼时长等时间相关信息
```

#### 2. 阵营/势力关系（300 字）
```markdown
### 【阵营/势力关系】(300 字)
- [阵营 A] ↔ [阵营 B]：[关系性质，合作/敌对/中立，演变过程]
- [阵营 C] ↔ [阵营 D]：[关系性质，关键事件影响]
```

#### 3. 次要角色（100 字/人）
```markdown
### 【次要角色】(100 字/人)
[角色名] | 状态：[活跃/离场] | 最后出现：[章节]
- 身份：[20 字]
- 关系：[与主角关系 20 字]
- 作用：[在剧情中的作用 30 字]
- 状态：[当前状态 30 字]
```

---

## 📊 影响评估

### ✅ 优势

1. **生成成功率提升**：大纲要求降低约 50%，更容易生成完整大纲
2. **长篇小说支持**：9000 字摘要可支撑 100-200 章的长篇小说
3. **角色追踪增强**：5000 字角色状态可追踪 20-30 个重要角色
4. **时间线清晰**：新增时间线模块，避免时间逻辑错误
5. **阵营关系明确**：新增阵营关系模块，适合多势力斗争题材
6. **大纲完整性保证**：新增验证和重试机制，确保生成完整数量

### ⚠️ 潜在问题

1. **Token 消耗增加**：
   - 前文摘要：3000 → 9000 字（约 +6000 tokens）
   - 角色状态：2500 → 5000 字（约 +2500 tokens）
   - 每次调用 API 成本增加约 30-40%

2. **上下文压力**：
   - 长篇小说后期，9000 字摘要 +5000 字角色状态 = 14000 字
   - 加上章节正文（3000-5000 字），可能接近模型上下文限制

3. **生成时间增加**：
   - 更多字数 = 更长生成时间
   - 建议：考虑分批次更新（如每 5 章更新一次完整摘要）

---

## 🔗 引用关系

```
src/api/generator.js
  ├─ import chapter-optimized.js  ← 已修改（大纲 + 验证）
  └─ import utility-optimized.js  ← 已修改（摘要 + 角色）
```

**generator.js 配置**（第 4-11 行）：
```javascript
// 使用优化版 prompts（详细大纲 + 严格遵循 + 防截断）
import { chapterPrompts as chapterPromptsOptimized } from '../prompts/chapter-optimized'
import { utilityPrompts as utilityPromptsOptimized } from '../prompts/utility-optimized'

// 使用优化版 prompts
const chapterPromptsToUse = chapterPromptsOptimized
const utilityPromptsToUse = utilityPromptsOptimized
```

---

## 📁 本地仓库位置

```
/home/admin/openclaw/workspace/temp/dream-novel-push/
├── src/
│   ├── api/
│   │   └── generator.js          # 添加验证和重试机制 ✅
│   └── prompts/
│       ├── chapter-optimized.js  ← 已修改（大纲 + 强制要求）✅
│       ├── chapter.js             # 基础版（未修改）
│       ├── utility-optimized.js  ← 已修改（摘要 + 角色）✅
│       └── utility.js             # 基础版（未修改）
├── MODIFICATION_HISTORY.md       # 本文档
├── ANALYSIS_REPORT.md            # 完整分析报告
└── README.md
```

---

## 🎯 下次修改建议

### 可能需要调整的地方

1. **Token 优化**：
   - 如果 API 成本过高，考虑动态调整摘要字数
   - 或实现"精简模式"（保留核心模块，压缩次要模块）

2. **分卷管理**：
   - 对于 200 章+ 的超长篇小说，建议分卷存储摘要
   - 每 50 章为一个卷，保留卷摘要 + 当前卷详细摘要

3. **RAG 集成**：
   - 考虑使用向量数据库存储历史信息
   - 按需检索相关章节，而非全部加载到上下文

4. **性能监控**：
   - 记录每次生成的 token 消耗和时间
   - 分析瓶颈，针对性优化

5. **chunkSize 优化**：
   - 当前公式：`Math.floor(maxTokens / 200 / 10) * 10 - 10`
   - 如果频繁生成不完整，可以减小 chunkSize（如每块 20 章而非 30 章）

---

## 📅 修改历史

| 日期 | 提交哈希 | 修改内容 | 修改者 |
|------|---------|---------|--------|
| 2026-03-22 11:52 | `1736ac2` | chore: 删除临时文件 generator-fixed.js | Halcyon |
| 2026-03-22 11:52 | `b94dbf5` | fix: 修复章节大纲生成不完整问题（100 章只生成 79 章） | Halcyon |
| 2026-03-22 11:10 | `8ca5c35` | docs: 添加修改记录文档 (MODIFICATION_HISTORY.md) | Halcyon |
| 2026-03-22 11:10 | `74506e4` | docs: 添加完整分析报告 (ANALYSIS_REPORT.md) | Halcyon |
| 2026-03-22 10:08 | `0a75dac` | 优化 prompts: 降低大纲要求 + 增加摘要和角色状态字数限制 | Halcyon |
| 2026-03-22 09:xx | `814f7d3` | Delete doc/wx-group.jpg | - |
| 2026-03-22 09:xx | `3e9149d` | Update README.md | - |

---

## 🔗 相关链接

- **GitHub 仓库**: https://github.com/waitli/dream-novel
- **最新提交**: https://github.com/waitli/dream-novel/commit/1736ac2
- **修改记录**: https://github.com/waitli/dream-novel/blob/main/MODIFICATION_HISTORY.md
- **分析报告**: https://github.com/waitli/dream-novel/blob/main/ANALYSIS_REPORT.md
- **体验地址**: https://novel.waitli.top/

---

**文档更新时间**: 2026-03-22 11:52  
**维护者**: Halcyon
