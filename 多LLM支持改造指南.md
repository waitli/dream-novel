# 多 LLM API 支持改造指南

## 📋 改造概述

本次改造使 AI 小说生成器支持 **10+ 种主流 LLM 平台**，包括：

| 平台 | 状态 | 说明 |
|------|------|------|
| **Chatfire** | ✅ 已支持 | 聚合平台（Gemini/Doubao 等） |
| **OpenAI** | ✅ 已支持 | GPT-4o/GPT-4-Turbo/o1 等 |
| **Google Gemini** | ✅ 已支持 | Gemini 2.0 Flash/1.5 Pro 等 |
| **Anthropic Claude** | ✅ 已支持 | Claude Sonnet/Opus 等 |
| **Azure OpenAI** | ✅ 已支持 | 需要 Resource Name + Deployment ID |
| **月之暗面 Kimi** | ✅ 已支持 | moonshot-v1 系列 |
| **DeepSeek** | ✅ 已支持 | deepseek-chat/deepseek-coder |
| **百川智能** | ✅ 已支持 | Baichuan4/Baichuan3-Turbo |
| **智谱 AI** | ✅ 已支持 | GLM-4/GLM-3-Turbo |
| **自定义 API** | ✅ 已支持 | 任意 OpenAI 兼容接口 |

---

## 🔧 修改文件清单

### 1. `src/components/SettingsDialog.vue`

**修改内容**:
- 扩展 `channels` 数组，添加 10 个 LLM 平台配置
- 添加 Azure 特殊配置字段（resourceName/deploymentId/apiVersion）
- 添加渠道切换时的 URL 处理逻辑
- 添加 Azure 专用配置 UI
- 启用测试连接功能

**新增渠道配置**:
```javascript
const channels = [
  { id: 'chatfire', name: 'Chatfire', ... },
  { id: 'openai', name: 'OpenAI', ... },
  { id: 'gemini', name: 'Google Gemini', ... },
  { id: 'anthropic', name: 'Anthropic Claude', ... },
  { id: 'azure', name: 'Azure OpenAI', ... },
  { id: 'moonshot', name: '月之暗面 Kimi', ... },
  { id: 'deepseek', name: 'DeepSeek 深度求索', ... },
  { id: 'baichuan', name: '百川智能', ... },
  { id: 'zhipu', name: '智谱 AI', ... },
  { id: 'custom', name: '自定义 API', ... }
]
```

### 2. `src/api/llm.js`

**修改内容**:
- 新增 `buildRequestConfig()` 函数，为不同平台构建请求
- 修改 `chatCompletion()` 支持多平台响应格式
- 修改 `streamCompletion()` 支持多平台流式响应

**平台适配**:

| 平台 | URL | Header | 响应格式 |
|------|-----|--------|----------|
| OpenAI 兼容 | `/chat/completions` | `Authorization: Bearer {key}` | `choices[0].message.content` |
| Azure | `/deployments/{id}/chat/completions` | `api-key: {key}` | `choices[0].message.content` |
| Anthropic | `/messages` | `x-api-key: {key}` | `content[0].text` |

### 3. `src/stores/settings.js`

**修改内容**:
- 扩展 `apiConfig` 添加 Azure 配置字段
- 新增 `updateAzureConfig()` 函数

---

## 🚀 使用方法

### 1. 打开设置对话框

点击右上角 ⚙️ 图标，打开 API 设置对话框。

### 2. 选择 LLM 渠道

在「渠道」下拉框中选择你要使用的平台：

```
┌─────────────────────────────────┐
│ 渠道：[Chatfire          ▼]    │
│      OpenAI                     │
│      Google Gemini              │
│      Anthropic Claude           │
│      Azure OpenAI               │
│      月之暗面 Kimi              │
│      DeepSeek 深度求索          │
│      百川智能                   │
│      智谱 AI                    │
│      自定义 API                 │
└─────────────────────────────────┘
```

### 3. 填写 API Key

点击「获取 Key」按钮跳转到对应平台的控制台，创建 API Key 后填入。

**各平台 Key 获取地址**:
- Chatfire: https://api.chatfire.site/login?inviteCode=EEE80324
- OpenAI: https://platform.openai.com/api-keys
- Gemini: https://aistudio.google.com/app/apikey
- Claude: https://console.anthropic.com/settings/keys
- Kimi: https://platform.moonshot.cn/console/api-keys
- DeepSeek: https://platform.deepseek.com/api_keys
- 百川：https://platform.baichuan-ai.com/console/apikey
- 智谱：https://open.bigmodel.cn/usercenter/apikeys

### 4. Azure OpenAI 特殊配置

选择 Azure 后，会显示额外配置项：

```
┌─────────────────────────────────┐
│ Resource Name:  [my-resource ]  │
│ Deployment ID:  [gpt-4o      ]  │
│ API Version:    [2024-02-15..]  │
└─────────────────────────────────┘
```

### 5. 分环节模型配置

可以为不同创作环节配置不同模型：

```
架构生成：[gemini-3-pro-preview  ▼]
大纲生成：[gpt-4o              ▼]
章节生成：[claude-sonnet-4-5   ▼]
定稿处理：[gemini-3-flash      ▼]
扩写：    [kimi-k2-thinking    ▼]
```

**建议配置**:
- **架构生成**: 使用推理能力强的模型（Claude/GPT-4）
- **大纲生成**: 使用逻辑清晰的模型（GPT-4/Gemini Pro）
- **章节生成**: 使用性价比高的模型（Gemini Flash/Kimi）
- **定稿处理**: 使用快速模型（Gemini Flash）
- **扩写**: 使用长文本模型（Kimi 128k）

### 6. 测试连接

点击「测试连接」按钮验证 API 配置是否正确。

---

## 🔍 技术实现细节

### 请求格式适配

```javascript
// buildRequestConfig() 实现

// 1. Azure OpenAI
{
  url: `https://${resourceName}.openai.azure.com/openai/deployments/${deploymentId}/chat/completions?api-version=${apiVersion}`,
  headers: { 'api-key': apiKey },
  data: { messages: [...], max_tokens: 8192 }
}

// 2. Anthropic Claude
{
  url: `${baseUrl}/messages`,
  headers: { 
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01'
  },
  data: { model, messages: [...], max_tokens: 8192 }
}

// 3. 标准 OpenAI 兼容
{
  url: `${baseUrl}/chat/completions`,
  headers: { 'Authorization': `Bearer ${apiKey}` },
  data: { model, messages: [...], max_tokens: 8192 }
}
```

### 响应格式适配

```javascript
// chatCompletion() 响应处理

// Anthropic
if (channel === 'anthropic') {
  return response.data.content[0].text
}

// OpenAI 兼容
return response.data.choices[0].message.content
```

### 流式响应适配

```javascript
// streamCompletion() 流式解析

// Anthropic SSE 格式
if (channel === 'anthropic') {
  if (parsed.type === 'content_block_delta') {
    content = parsed.delta?.text || ''
  }
} 
// OpenAI 兼容格式
else {
  content = parsed.choices?.[0]?.delta?.content || ''
}
```

---

## 📊 各平台对比

| 平台 | 优势 | 适合场景 | 价格 |
|------|------|----------|------|
| **Chatfire** | 聚合多模型，一个 Key 多用 | 快速测试 | 中 |
| **OpenAI** | 质量最高，生态完善 | 架构/大纲生成 | 高 |
| **Gemini** | 免费额度高，速度快 | 章节生成 | 低 |
| **Claude** | 长文本理解强 | 大纲/定稿 | 高 |
| **Azure** | 企业级稳定性 | 生产环境 | 中 |
| **Kimi** | 200k 上下文 | 长篇小说 | 中 |
| **DeepSeek** | 性价比高 | 章节生成 | 低 |
| **百川** | 中文优化 | 中文小说 | 低 |
| **智谱** | GLM-4 能力强 | 架构生成 | 中 |

---

## ⚠️ 注意事项

### 1. API 格式兼容性

所有平台都使用 **OpenAI 兼容格式**，除了：
- **Anthropic Claude**: 使用 `/messages` 端点
- **Azure OpenAI**: URL 格式特殊

### 2. 模型名称映射

不同平台的模型名称不同：

```javascript
// GPT-4 级别
'gpt-4o'                    // OpenAI
'gemini-1.5-pro'            // Gemini
'claude-sonnet-4-5-20250929' // Claude
'glm-4'                     // 智谱
'Baichuan4'                 // 百川

// 性价比级别
'gpt-4o-mini'               // OpenAI
'gemini-2.0-flash'          // Gemini
'moonshot-v1-8k'            // Kimi
'deepseek-chat'             // DeepSeek
```

### 3. Token 限制

| 平台 | 最大输入 | 最大输出 |
|------|----------|----------|
| GPT-4o | 128k | 16k |
| Gemini 1.5 Pro | 2M | 8k |
| Claude Sonnet | 200k | 8k |
| Kimi | 200k | 8k |
| DeepSeek | 128k | 8k |

### 4. 速率限制

- **OpenAI**: 3 RPM (免费) / 500+ RPM (付费)
- **Gemini**: 15 RPM (免费)
- **Claude**: 5 RPM (免费)
- **Kimi**: 10 RPM

---

## 🛠️ 扩展新平台

如需添加新平台，只需在 `SettingsDialog.vue` 的 `channels` 数组中添加配置：

```javascript
{
  id: 'your-platform',           // 唯一标识
  name: '你的平台名称',
  baseUrl: 'https://api.example.com/v1',
  models: ['model-1', 'model-2'],
  getApiKeyUrl: 'https://platform.example.com/keys'
}
```

如果平台使用非 OpenAI 格式，需要在 `llm.js` 的 `buildRequestConfig()` 中添加适配逻辑。

---

## ✅ 测试清单

- [ ] 切换到不同渠道，URL 自动更新
- [ ] 填写 API Key 后保存成功
- [ ] 测试连接返回成功
- [ ] 生成架构/大纲/章节正常工作
- [ ] 流式输出正常显示
- [ ] 分环节模型配置生效
- [ ] Azure 配置正确构建 URL
- [ ] Claude 响应格式正确解析

---

## 📝 总结

通过本次改造，AI 小说生成器现在支持 **10+ 种主流 LLM 平台**，用户可以根据需求灵活选择：

- **追求质量**: OpenAI GPT-4o / Claude Sonnet
- **追求性价比**: Gemini Flash / DeepSeek / Kimi
- **企业使用**: Azure OpenAI
- **长篇小说**: Kimi (200k 上下文)
- **快速测试**: Chatfire (一个 Key 多用)

所有配置通过设置对话框完成，无需修改代码。
