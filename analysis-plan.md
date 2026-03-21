# dream-novel 仓库分析计划

创建时间：2026-03-21 16:56

## 目标
详细分析每个文件的作用，提供完整的仓库文档

## 文件分类

### 项目配置类
- package.json
- vite.config.js
- tailwind.config.js
- postcss.config.js
- .gitignore
- LICENSE

### 入口文件
- index.html
- src/main.js
- src/App.vue

### 路由
- src/router/index.js

### 状态管理 (Pinia stores)
- src/stores/novel.js
- src/stores/settings.js

### API 层
- src/api/llm.js
- src/api/generator.js
- src/api/compass-generator.js

### Prompts (AI 提示词)
- src/prompts/index.js
- src/prompts/chapter.js
- src/prompts/architecture.js
- src/prompts/compass.js
- src/prompts/utility.js

### 工具函数
- src/utils/graph-helpers.js

### 组件 - 主界面
- src/components/AppHeader.vue
- src/components/ProjectCard.vue
- src/components/CreateProjectDialog.vue
- src/components/SettingsDialog.vue

### 组件 - 功能面板
- src/components/ArchitecturePanel.vue
- src/components/ChapterWriterPanel.vue
- src/components/ChapterBlueprintPanel.vue

### 组件 - Compass 系列
- src/components/compass/CompassGraph.vue
- src/components/compass/CompassSidebar.vue
- src/components/compass/CompassTimeline.vue
- src/components/compass/CompassToolbar.vue
- src/components/compass/ChapterRelationGraph.vue
- src/components/compass/InspirationCompass.vue
- src/components/compass/AuditPanel.vue
- src/components/compass/RelationPopover.vue

### 视图
- src/views/HomeView.vue
- src/views/ProjectView.vue

### 资源
- src/assets/main.css
- src/assets/logo.png
- public/favicon.svg
- public/logo.png

### 文档
- README.md
- systemPrompt.md
- doc/*.png

## 执行步骤
- [x] 读取项目配置文件
- [x] 读取入口文件
- [x] 读取路由和状态管理
- [x] 读取 API 层
- [x] 读取 Prompts
- [x] 读取组件文件
- [x] 读取视图文件
- [x] 汇总分析结果

完成时间：2026-03-21 17:15
