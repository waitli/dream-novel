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

- Node.js 20.19+ 或 22.12+
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

首次使用时，点击右上角设置图标，填写：
1. API Base URL（默认 `https://api.deepseek.com`，支持 OpenAI 兼容接口）
2. API Key
3. 模型名称（默认 `deepseek-v4-flash`）

点击“测试连接”可发送一条简短请求验证配置，接口提供方可能收取用量费用。
输出上限、创作温度、超时和各环节模型统一收在“高级设置”，各环节默认使用同一个模型。

旧版兼容渠道会自动合并到通用接口配置，保留已有地址、密钥和模型。已有 Anthropic / Azure 原生配置继续保留；
需要更换为兼容接口时，可在设置中点击“切换到兼容接口”后填写新地址和密钥。

### 草稿保存和定稿

- 编辑、生成和扩写的草稿按项目、章节自动暂存到当前浏览器；切章、离开页面或刷新前会立即尝试暂存。
- “快速保存”将草稿写入项目正文，纳入 TXT / Markdown 导出；自动暂存本身不会更新长期记忆。
- “保存并定稿”先保存正文，再检查一致性并更新记忆。记忆失败时保留正文，显示“记忆更新失败”，可点击“重试定稿”。
- 生成期间锁定切章和编辑；可点击“停止生成并保留草稿”。连接中断或达到输出上限时，会提示正文不完整。
- 数据仍保存在当前浏览器。自动暂存不是云备份；清除网站数据会删除本地项目和草稿。

## 验证

```bash
npm ci
npm test
npm run build
```

回归测试使用本地模拟响应，不消耗真实 AI 接口用量，覆盖流式分块、错误与取消、配置迁移、草稿恢复和定稿失败。

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
