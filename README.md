# AI 小说生成器

在线体验: <https://novel.waitli.top/>

基于雪花写作法的 AI 小说创作工具，支持从核心创意到架构、大纲、章节正文的一整套写作流程。项目由 [huobao-novel](https://github.com/chatfire-AI/huobao-novel) 演化而来，已适配 Cloudflare Pages 部署、多模型接入和中英双语界面。

![Vue](https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vue.js)
![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite)
![License](https://img.shields.io/badge/License-MIT-blue)

## 截图

![首页](./doc/home.png)

## 特性

- 雪花写作法流程：核心种子、角色动力学、世界观、情节架构
- 章节大纲与章节正文生成，支持流式输出
- 灵感罗盘：关系图谱、时间线和逻辑审计
- 多项目管理，本地持久化保存
- 深色模式与中英双语切换
- 多模型阶段配置，适合不同创作环节
- 支持 TXT / Markdown 导出
- 纯前端部署，API Key 仅保存在浏览器本地

## 技术栈

- Vue 3
- Vite
- Naive UI
- Tailwind CSS
- Pinia
- Vue Router
- Axios
- ECharts

## 快速开始

### 环境要求

- Node.js 18+
- npm

### 安装与运行

```bash
git clone https://github.com/waitli/dream-novel.git
cd dream-novel
npm install
npm run dev
```

### 构建

```bash
npm run build
```

## 配置

首次使用时，点击右上角设置图标并填写：

1. `API Base URL`
2. `API Key`
3. 默认模型
4. 各环节模型（可选）

默认接入方式是 OpenAI 兼容接口，基础配置已预设为 `https://api.chatfire.site/v1`。

### 支持的 LLM 渠道

| 渠道 | 说明 |
| --- | --- |
| Chatfire | 默认渠道，OpenAI 兼容接口 |
| OpenAI | 标准 OpenAI 接口 |
| Google Gemini | OpenAI 兼容接入 |
| Anthropic Claude | 使用 `/messages` 接口 |
| Azure OpenAI | 使用 Azure 专用部署地址 |
| Moonshot Kimi | OpenAI 兼容接入 |
| DeepSeek | OpenAI 兼容接入 |
| 百川智能 | OpenAI 兼容接入 |
| 智谱 AI | OpenAI 兼容接入 |
| 自定义 API | 任意兼容 OpenAI 的接口 |

## 中英双语

项目已内置中英双语界面：

- 中文、英文可在界面中切换
- 语言选择会保存到浏览器本地
- 界面文案会随语言同步切换

## 部署到 Cloudflare Pages

推荐使用 Cloudflare Pages 直接部署前端静态站点：

```bash
npm run build
npm run deploy:pages
```

说明：

- `vite.config.js` 已设置根路径 `base: '/'`
- 路由使用根路径 history 模式
- SPA 刷新问题已通过静态资源配置处理

## 项目结构

```text
src/
├── api/        # LLM 和生成流程封装
├── assets/     # 静态资源
├── components/ # 页面组件与功能面板
├── i18n/       # 国际化配置
├── locales/    # 中英文语言包
├── prompts/    # 小说生成提示词
├── router/     # 路由配置
├── stores/     # Pinia 状态管理
├── utils/      # 工具函数
└── views/      # 页面视图
```

## 许可

[MIT](./LICENSE)
