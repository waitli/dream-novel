# AI 小说生成器
[体验地址](https://marketing.chatfire.site/huobao-novel/)
一个基于雪花写作法的 AI 小说创作工具，支持智能生成小说架构、角色体系、世界观和章节内容。

![Vue](https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vue.js)
![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite)
![License](https://img.shields.io/badge/License-MIT-blue)

## 📸 截图

### 首页
![首页](./doc/home.png)


## ✨ 特性

- 📖 **雪花写作法** - 从核心种子开始，逐步扩展角色、世界观、情节架构
- 🎭 **角色弧光理论** - 设计具有动态变化潜力的角色，包含驱动力三角和关系冲突网
- 🌍 **世界观构建** - AI 自动生成符合故事背景的世界设定
- 📊 **悬念节奏曲线** - 智能规划章节节奏，保持读者阅读兴趣
- ✍️ **章节写作** - 基于大纲逐章生成小说内容，支持流式输出
- 📤 **多格式导出** - 支持导出为 TXT 和 Markdown 格式
- 🌓 **深色/浅色主题** - 支持主题切换，保护眼睛
- 💾 **本地项目存储** - 项目数据本地持久化，支持多项目管理

## 🚀 快速开始

### 环境要求

- Node.js >= 18
- pnpm / npm / yarn

### 安装

```bash
# 克隆项目
git clone https://github.com/chatfire-AI/huobao-novel.git
cd huobao-novel

# 安装依赖
pnpm install
# 或
npm install

# 启动开发服务器
pnpm dev
# 或
npm run dev
```

### 构建

```bash
pnpm build
# 或
npm run build
```

## ⚙️ 配置

首次使用需要配置 API：

1. 点击右上角设置图标 ⚙️
2. 填入 API Base URL 和 API Key
3. 选择需要使用的模型

支持 OpenAI 兼容的 API 接口。

## 📝 创作流程

| 步骤 | 描述 |
|------|------|
| **创建项目** | 设置小说标题、题材、章节数、每章字数等基本信息 |
| **生成架构** | AI 自动生成核心种子、角色动力学、世界观、情节架构 |
| **生成大纲** | 基于架构生成详细的章节大纲 |
| **章节写作** | 逐章生成小说内容，支持批量生成 |
| **导出小说** | 将完成的小说导出为 TXT 或 Markdown 文件 |

## 🛠️ 技术栈

- **框架**: [Vue 3](https://vuejs.org/) + [Vite](https://vitejs.dev/)
- **UI 组件**: [Naive UI](https://www.naiveui.com/)
- **样式**: [Tailwind CSS](https://tailwindcss.com/)
- **状态管理**: [Pinia](https://pinia.vuejs.org/)
- **图标**: [@vicons/ionicons5](https://www.xicons.org/)
- **路由**: [Vue Router](https://router.vuejs.org/)
- **HTTP**: [Axios](https://axios-http.com/)

## 📁 项目结构

```
src/
├── api/          # API 请求封装
├── assets/       # 静态资源
├── components/   # 组件
│   ├── ArchitecturePanel.vue      # 小说架构面板
│   ├── ChapterBlueprintPanel.vue  # 章节大纲面板
│   ├── ChapterWriterPanel.vue     # 章节写作面板
│   ├── CreateProjectDialog.vue    # 创建项目对话框
│   ├── ProjectCard.vue            # 项目卡片
│   └── SettingsDialog.vue         # 设置对话框
├── prompts/      # AI 提示词模板
├── router/       # 路由配置
├── stores/       # 状态管理
├── views/        # 页面视图
│   ├── HomeView.vue     # 首页
│   └── ProjectView.vue  # 项目详情页
└── main.js       # 入口文件
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 提交 Pull Request

## 联系我


## 📄 License

[MIT](./LICENSE)
