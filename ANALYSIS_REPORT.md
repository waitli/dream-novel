# Dream Novel 完整分析报告

**分析时间**: 2026-03-22  
**仓库**: https://github.com/waitli/dream-novel  
**分支**: main  
**最新提交**: `8ca5c35` (包含修改记录文档)

---

## 📋 项目概述

**dream-novel** 是一个基于 **雪花写作法** 的 AI 小说创作工具，支持智能生成小说架构、角色体系、世界观和章节内容。

| 项目 | 值 |
|------|-----|
| **体验地址** | https://novel.waitli.top/ |
| **基于项目** | huobao-novel |
| **部署平台** | Cloudflare Pages |
| **技术栈** | Vue 3.5 + Vite 5.4 + Naive UI + TailwindCSS + Pinia |
| **许可证** | MIT |

---

## 🏗️ 项目架构

### 核心文件结构

```
src/
├── api/
│   ├── llm.js                    # LLM API 调用封装
│   ├── generator.js              # 小说生成流程编排（核心）
│   └── compass-generator.js      # 灵感罗盘图谱生成
│
├── prompts/
│   ├── index.js                  # 提示词管理器
│   ├── architecture.js           # 架构类提示词（5 步）
│   ├── chapter.js                # 章节类提示词（基础版）
│   ├── chapter-optimized.js      # 章节类提示词（优化版）⭐
│   ├── utility.js                # 工具类提示词（基础版）
│   ├── utility-optimized.js      # 工具类提示词（优化版）⭐
│   └── compass.js                # 灵感罗盘提示词
│
├── stores/
│   ├── novel.js                  # 小说项目状态管理
│   └── settings.js               # 设置状态管理
│
├── components/
│   ├── ArchitecturePanel.vue     # 小说架构面板
│   ├── ChapterBlueprintPanel.vue # 章节大纲面板
│   ├── ChapterWriterPanel.vue    # 章节写作面板
│   └── compass/                  # 灵感罗盘系列组件
│
└── views/
    ├── HomeView.vue              # 首页
    └── ProjectView.vue           # 项目详情页
```

---

## 🔄 核心生成流程

### Phase 1: 架构生成（5 步顺序）

```
generateArchitecture()
├─ Step 1: 核心种子 (Core Seed) - 25-100 字
├─ Step 2: 角色动力学 (Character Dynamics) - 3-6 个角色
├─ Step 2.5: 角色状态 (Character State) - 结构化文档
├─ Step 3: 世界观 (World Building) - 物理/社会/情感三维
└─ Step 4: 情节架构 (Plot Architecture) - 三幕式结构
```

### Phase 2: 章节大纲生成

```
generateChapterBlueprint()
├─ 构建小说架构文本（整合 Phase 1 结果）
├─ 计算 chunkSize（根据 maxTokens 自动分块）
├─ 解析已有章节（支持增量生成）
└─ 调用 chapter-optimized.js → chapter_blueprint.md
```

### Phase 3: 章节正文生成

```
generateChapterDraft()
├─ 第 1 章：使用 firstDraft prompt
└─ 后续章节：使用 nextDraft prompt（包含前文摘要 + 前章结尾）

finalizeChapter()
├─ 更新前文摘要 (globalSummary) ← utility-optimized.js
└─ 更新角色状态 (characterState) ← utility-optimized.js
```

---

## 🎯 双版本 Prompts 系统

项目同时包含两套 prompt 系统，**默认使用优化版**。

### 基础版 vs 优化版

| 特性 | 基础版 | 优化版（默认） |
|------|--------|---------------|
| **大纲详细度** | 100 字/章 | **100-150 字/章**（修改后） |
| **大纲字段** | 5 个基础字段 | **12 个详细字段** |
| **前文摘要** | 2000 字自由格式 | **9000 字结构化 6 模块** |
| **角色状态** | 自由格式 | **5000 字表格化 + 自动清理** |
| **伏笔追踪** | ❌ 无 | ✅ **专门文件追踪** |
| **写作约束** | 一般 | **严格遵循大纲 + 惩罚说明** |

---

## 📊 2026-03-22 修改详情

### 修改原因

1. **章节大纲要求过高**：原版本每章 200-300 字，有时无法生成成功
2. **前文摘要字数不足**：3000 字在长篇小说（50 章+）时会被截断
3. **角色状态容量不够**：2500 字无法追踪复杂的多角色关系

### 修改内容

| 文件 | 修改项 | 原值 | 新值 | 变化 |
|------|--------|------|------|------|
| `chapter-optimized.js` | 大纲每章简述 | 200-300 字 | **100-150 字** | ⬇️ -50% |
| `utility-optimized.js` | 前文摘要总字数 | 3000 字 | **9000 字** | ⬆️ +200% |
| `utility-optimized.js` | 角色状态总字数 | 2500 字 | **5000 字** | ⬆️ +100% |

### 新增模块

1. **时间线梳理**（700 字）：主要事件时间顺序、倒计时状态、角色年龄等
2. **阵营/势力关系**（300 字）：多势力关系性质和演变过程
3. **次要角色**（100 字/人）：记录龙套角色，避免遗忘

---

## 🔍 关键代码分析

### generator.js 核心函数

```javascript
// 1. 架构生成（5 步顺序）
export async function generateArchitecture(project, apiConfig, onProgress)

// 2. 大纲生成（支持分块）
export async function generateChapterBlueprint(project, apiConfig, onProgress)

// 3. 单章草稿生成
export async function generateChapterDraft(project, chapterNumber, apiConfig, onProgress)

// 4. 章节定稿（更新摘要和角色状态）
export async function finalizeChapter(project, chapterNumber, chapterText, apiConfig, onProgress)

// 5. 章节扩写
export async function enrichChapter(chapterText, wordNumber, apiConfig, onProgress)
```

### 引用关系

```javascript
// generator.js 第 4-11 行
import { chapterPrompts as chapterPromptsOptimized } from '../prompts/chapter-optimized'
import { utilityPrompts as utilityPromptsOptimized } from '../prompts/utility-optimized'

// 使用优化版 prompts
const chapterPromptsToUse = chapterPromptsOptimized
const utilityPromptsToUse = utilityPromptsOptimized
```

---

## 📈 影响评估

### ✅ 优势

1. **生成成功率提升**：大纲要求降低 50%，更容易生成完整大纲
2. **长篇小说支持**：9000 字摘要可支撑 100-200 章的长篇小说
3. **角色追踪增强**：5000 字角色状态可追踪 20-30 个重要角色
4. **时间线清晰**：新增时间线模块，避免时间逻辑错误
5. **阵营关系明确**：新增阵营关系模块，适合多势力斗争题材

### ⚠️ 潜在问题

1. **Token 消耗增加**：
   - 前文摘要：3000 → 9000 字（约 +6000 tokens）
   - 角色状态：2500 → 5000 字（约 +2500 tokens）
   - 每次调用 API 成本增加约 30-40%

2. **上下文压力**：
   - 长篇小说后期：9000 字摘要 + 5000 字角色状态 = 14000 字
   - 加上章节正文（3000-5000 字），可能接近模型上下文限制

3. **生成时间增加**：更多字数 = 更长生成时间

---

## 🎨 UI 组件

### 核心组件

| 组件 | 功能 |
|------|------|
| `ArchitecturePanel.vue` | 小说架构面板（5 个可折叠部分） |
| `ChapterBlueprintPanel.vue` | 章节大纲面板（卡片视图/原始文本） |
| `ChapterWriterPanel.vue` | 章节写作面板（左侧章节列表 + 右侧编辑器） |
| `SettingsDialog.vue` | API 设置（支持多种 OpenAI 兼容接口） |

### 灵感罗盘系列组件

| 组件 | 功能 |
|------|------|
| `InspirationCompass.vue` | 灵感罗盘主组件 |
| `CompassGraph.vue` | ECharts 关系图谱 |
| `CompassSidebar.vue` | 节点详情侧边栏 |
| `CompassTimeline.vue` | 章节时间轴滑块 |
| `CompassToolbar.vue` | 工具栏 |
| `ChapterRelationGraph.vue` | 章节内嵌关系图谱 |
| `RelationPopover.vue` | 关系气泡弹窗 |
| `AuditPanel.vue` | 逻辑审计面板 |

---

## 🛠️ 技术栈详情

### 依赖

```json
{
  "dependencies": {
    "@vicons/ionicons5": "^0.12.0",
    "axios": "^1.13.2",
    "echarts": "^6.0.0",
    "naive-ui": "^2.40.1",
    "pinia": "^3.0.4",
    "vue": "^3.5.12",
    "vue-router": "^4.6.4"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.1.4",
    "autoprefixer": "^10.4.23",
    "postcss": "^8.5.6",
    "tailwindcss": "3",
    "vite": "^5.4.10"
  }
}
```

### 部署配置

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "deploy:pages": "npm run build && wrangler pages deploy dist",
  "deploy:pages:prod": "npm run build && wrangler pages deploy dist --project-name=dream-novel --branch=main",
  "wrangler:login": "wrangler login"
}
```

**部署平台**: Cloudflare Pages (使用 Wrangler CLI)

---

## 📝 创作流程

| 步骤 | 描述 | 使用 Prompts |
|------|------|-------------|
| **1. 创建项目** | 设置小说标题、题材、章节数、每章字数等 | - |
| **2. 生成架构** | AI 自动生成核心种子、角色动力学、世界观、情节架构 | architecture.js |
| **3. 生成大纲** | 基于架构生成详细的章节大纲 | chapter-optimized.js |
| **4. 章节写作** | 逐章生成小说内容，支持批量生成 | chapter-optimized.js |
| **5. 章节定稿** | 更新前文摘要和角色状态 | utility-optimized.js |
| **6. 导出小说** | 将完成的小说导出为 TXT 或 Markdown 文件 | - |

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

5. **去 AI 味规则**：
   - 可集成 inkos 项目的去 AI 味规则
   - 限制"仿佛/不禁/宛如"等 AI 标记词

6. **六维检查**：
   - 可集成 webnovel 项目的六维并行检查
   - Consistency/OOC/Pacing/Continuity/High-point/Reader-pull

---

## 📅 修改历史

| 日期 | 提交哈希 | 修改内容 | 修改者 |
|------|---------|---------|--------|
| 2026-03-22 10:10 | `8ca5c35` | docs: 添加修改记录文档 | Halcyon |
| 2026-03-22 10:08 | `0a75dac` | 优化 prompts: 降低大纲要求 + 增加摘要和角色状态字数限制 | Halcyon |
| 2026-03-22 09:xx | `814f7d3` | Delete doc/wx-group.jpg | - |
| 2026-03-22 09:xx | `3e9149d` | Update README.md | - |

---

## 🔗 相关链接

- **GitHub 仓库**: https://github.com/waitli/dream-novel
- **最新提交**: https://github.com/waitli/dream-novel/commit/8ca5c35
- **修改记录**: https://github.com/waitli/dream-novel/blob/main/MODIFICATION_HISTORY.md
- **体验地址**: https://novel.waitli.top/

---

**报告更新时间**: 2026-03-22 11:03  
**维护者**: Halcyon
