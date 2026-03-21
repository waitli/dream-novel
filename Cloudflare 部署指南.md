# Cloudflare 部署指南

## 📋 部署方案选择

### 方案对比

| 方案 | 适用场景 | 优点 | 缺点 |
|------|----------|------|------|
| **Cloudflare Pages** | 纯前端 Vue 应用 | ✅ 免费额度高<br>✅ 自动 HTTPS<br>✅ 全球 CDN<br>✅ 自动部署 | ❌ 无法隐藏 API Key |
| **Pages + Workers 代理** | 生产环境（推荐） | ✅ API Key 安全<br>✅ 速率限制<br>✅ 请求日志 | ❌ 配置稍复杂 |
| **仅 Workers** | 小型应用 | ✅ 灵活控制<br>✅ 边缘计算 | ❌ 免费额度有限<br>❌ 不适合大文件 |

**推荐**: Pages（前端） + Workers（API 代理）

---

## 🚀 方案 1: Cloudflare Pages（快速部署）

### 前置准备

1. **注册 Cloudflare 账号**
   - 访问：https://dash.cloudflare.com/sign-up
   - 免费计划已足够使用

2. **安装 Wrangler CLI**
   ```bash
   npm install -g wrangler
   ```

3. **登录 Cloudflare**
   ```bash
   wrangler login
   ```

### 部署步骤

#### 方式 A: GitHub 自动部署（推荐）

1. **在 Cloudflare Dashboard 创建项目**
   - 访问：https://dash.cloudflare.com/?to=/:account/pages
   - 点击 **"Create a project"**
   - 选择 **"Connect to Git"**

2. **选择仓库**
   - 选择你的 GitHub 账号
   - 选择 `waitli/dream-novel` 仓库
   - 分支：`main`

3. **配置构建设置**
   ```
   Framework preset: Vite
   Build command: npm run build
   Build output directory: dist
   Root directory: /
   ```

4. **设置环境变量**（可选）
   - 点击 **"Environment variables"**
   - 添加变量（如需要）

5. **点击 "Save and Deploy"**
   - Cloudflare 会自动构建并部署
   - 部署完成后会生成 URL：`https://dream-novel.pages.dev`

6. **自定义域名**（可选）
   - 进入项目设置 → **"Custom domains"**
   - 添加你的域名

#### 方式 B: CLI 手动部署

```bash
# 1. 克隆仓库
git clone https://github.com/waitli/dream-novel.git
cd dream-novel

# 2. 安装依赖
npm install

# 3. 构建项目
npm run build

# 4. 部署到 Pages
npm run deploy:pages
# 或
wrangler pages deploy dist
```

### 自动部署配置

创建 `.github/workflows/pages.yml`:

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
        env:
          VITE_API_BASE_URL: ${{ secrets.VITE_API_BASE_URL }}
      
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: pages deploy dist --project-name=dream-novel
```

---

## 🔐 方案 2: Pages + Workers API 代理（生产环境推荐）

### 为什么需要 API 代理？

**问题**: 前端直接调用 LLM API 会暴露 API Key

**解决**: 使用 Workers 作为代理，隐藏 API Key

### 部署 API 代理 Worker

#### 步骤 1: 配置 Worker

```bash
# 进入 API 代理目录
cd cloudflare-api-proxy

# 登录 Cloudflare
wrangler login

# 设置 API Key（加密存储）
wrangler secret put API_KEY
# 输入你的 LLM API Key（如：sk-xxx）

# 设置 API Base URL（可选）
wrangler secret put API_BASE_URL
# 输入：https://api.chatfire.site/v1
```

#### 步骤 2: 部署 Worker

```bash
# 部署到生产环境
wrangler deploy

# 或部署到预览环境
wrangler deploy --env preview
```

部署成功后会显示 Worker URL：
```
https://dream-novel-api-proxy.<your-subdomain>.workers.dev
```

#### 步骤 3: 修改前端配置

修改 `src/stores/settings.js` 或使用环境变量：

```javascript
// 使用 Worker 代理 URL
const DEFAULT_CONFIG = {
  channel: 'custom',
  baseUrl: 'https://dream-novel-api-proxy.your-subdomain.workers.dev',
  apiKey: '', // 不再需要
  model: 'default',
  // ...
}
```

或者创建 `.env` 文件：

```bash
# .env
VITE_API_PROXY_URL=https://dream-novel-api-proxy.your-subdomain.workers.dev
```

修改 `src/api/llm.js` 使用代理：

```javascript
const proxyUrl = import.meta.env.VITE_API_PROXY_URL
const url = proxyUrl || `${baseUrl}/chat/completions`
```

---

## ⚙️ 配置优化

### 1. 修改 Vite 配置（Cloudflare 优化）

修改 `vite.config.js`:

```javascript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  base: '/', // Cloudflare Pages 根路径部署
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
          'ui-vendor': ['naive-ui', '@vicons/ionicons5'],
          'chart-vendor': ['echarts']
        }
      }
    }
  }
})
```

### 2. 添加 _headers 文件（安全头）

创建 `public/_headers`:

```
/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.chatfire.site https://api.openai.com https://generativelanguage.googleapis.com
```

### 3. 添加 _redirects 文件（SPA 路由）

创建 `public/_redirects`:

```
/*    /index.html   200
```

---

## 📊 Cloudflare 免费额度

### Pages
| 资源 | 免费额度 |
|------|----------|
| 网站数量 | 无限 |
| 带宽 | 100 GB/月 |
| 构建次数 | 500 次/月 |
| 请求数 | 无限 |

### Workers
| 资源 | 免费额度 |
|------|----------|
| 请求数 | 100,000 次/天 |
| CPU 时间 | 10 ms/请求 |
| 存储 | 1 KB KV 存储 |

**评估**: 对于个人项目，免费额度完全足够！

---

## 🔍 部署后检查清单

- [ ] 网站可以正常访问
- [ ] 所有路由正常工作（刷新不 404）
- [ ] API 调用成功（检查浏览器 Console）
- [ ] 深色模式正常
- [ ] 本地存储正常（刷新后数据保留）
- [ ] 图谱可视化正常加载
- [ ] 移动端适配正常

---

## 🛠️ 常见问题

### Q1: 部署后路由刷新 404

**解决**: 确保 `public/_redirects` 文件存在：
```
/*    /index.html   200
```

### Q2: API Key 暴露风险

**解决**: 使用 Workers API 代理（见方案 2）

### Q3: 构建失败

**检查**:
```bash
# 本地测试构建
npm run build

# 查看错误信息
# 确保 Node.js 版本 >= 18
node -v
```

### Q4: 自定义域名不生效

**解决**:
1. 在 Cloudflare Dashboard 添加域名
2. 更新 DNS 记录
3. 等待 DNS 传播（最多 24 小时）

### Q5: 环境变量不生效

**解决**:
- Pages: Dashboard → Settings → Environment variables
- Workers: `wrangler secret put KEY_NAME`
- 重新部署使变量生效

---

## 📈 性能优化建议

### 1. 启用缓存

在 `wrangler.toml` 中添加：

```toml
[site]
bucket = "./dist"

[[rules]]
type = "ESModule"
globs = ["**/*.js"]
fallthrough = true
```

### 2. 图片优化

```bash
# 安装 sharp
npm install -D vite-plugin-image-optimizer

# vite.config.js
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer'

plugins: [
  vue(),
  ViteImageOptimizer({
    png: { quality: 80 },
    jpeg: { quality: 80 },
    webp: { quality: 80 }
  })
]
```

### 3. 启用 Gzip/Brotli

Cloudflare 自动启用，无需配置。

---

## 🎯 完整部署流程（推荐）

```bash
# 1. 安装 Wrangler
npm install -g wrangler

# 2. 登录 Cloudflare
wrangler login

# 3. 修改 vite.config.js（base 改为 '/'）
# 4. 创建 public/_redirects 和 public/_headers

# 5. 本地测试构建
npm run build
npm run preview

# 6. 部署到 Pages
npm run deploy:pages

# 7. （可选）部署 API 代理 Worker
cd cloudflare-api-proxy
wrangler secret put API_KEY
wrangler deploy

# 8. 验证部署
# 访问：https://dream-novel.pages.dev
```

---

## 📝 总结

### 快速开始（5 分钟）
```bash
npm install -g wrangler
wrangler login
npm run deploy:pages
```

### 生产部署（推荐）
1. **Pages** 部署前端
2. **Workers** 代理 API
3. **自定义域名** 提升品牌
4. **环境变量** 管理配置

### 成本估算
- **开发测试**: $0（免费额度内）
- **个人使用**: $0（免费额度内）
- **小规模生产**: $0-5/月（取决于用量）

---

## 🔗 相关资源

- Cloudflare Pages 文档：https://developers.cloudflare.com/pages/
- Cloudflare Workers 文档：https://developers.cloudflare.com/workers/
- Wrangler CLI 文档：https://developers.cloudflare.com/workers/wrangler/
- 部署示例：https://github.com/cloudflare/pages-example-vue
