# Cloudflare Pages 部署指南

## 📋 快速部署（5 分钟上线）

### 前置说明

**重要**: 本项目**不需要**后端服务或 API 代理！

- ✅ API Key 由用户自己填写
- ✅ Key 保存在用户浏览器 localStorage
- ✅ 用户自己承担 API 费用
- ✅ 纯前端应用，直接部署到 CDN

---

## 🚀 方式 1: GitHub 自动部署（推荐）

### 步骤

1. **访问 Cloudflare Dashboard**
   - https://dash.cloudflare.com/?to=/:account/pages

2. **创建项目**
   ```
   Create a project → Connect to Git
   选择 GitHub 账号 → 选择 waitli/dream-novel 仓库
   分支：main
   ```

3. **配置构建**
   ```
   Framework preset: Vite
   Build command: npm run build
   Build output directory: dist
   Root directory: /
   ```

4. **环境变量**（可选，一般不需要）
   ```
   点击 "Environment variables (advanced)"
   通常不需要设置，除非有特殊需求
   ```

5. **点击 "Save and Deploy"**
   - 等待构建完成（约 2 分钟）
   - 获得 URL：`https://dream-novel.pages.dev`

6. **自定义域名**（可选）
   - 项目设置 → Custom domains → 添加域名

---

## 🚀 方式 2: CLI 手动部署

```bash
# 1. 安装 Wrangler CLI
npm install -g wrangler

# 2. 登录 Cloudflare
wrangler login

# 3. 构建并部署
npm run build
wrangler pages deploy dist
```

或使用项目脚本：
```bash
npm run deploy:pages
```

---

## ⚙️ 部署前配置优化

### 1. 修改 vite.config.js

将 `base` 从 `/huobao-novel/` 改为 `/`：

```javascript
export default defineConfig({
  base: '/', // 根路径部署
  plugins: [vue()],
  // ...
})
```

### 2. 创建 public/_redirects（SPA 路由必需）

创建文件 `public/_redirects`:
```
/*    /index.html   200
```

**作用**: 解决 Vue Router 刷新 404 问题

### 3. 创建 public/_headers（安全增强，可选）

创建文件 `public/_headers`:
```
/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
```

---

## 📊 Cloudflare 免费额度

| 资源 | 免费额度 | 个人使用 |
|------|----------|----------|
| 网站数量 | 无限 | ✅ |
| 带宽 | 100 GB/月 | ✅ 足够 |
| 构建次数 | 500 次/月 | ✅ 足够 |
| 请求数 | 无限 | ✅ |

**成本**: $0/月（免费额度内完全够用）

---

## 🔍 部署后检查清单

- [ ] 网站可以正常访问
- [ ] 路由刷新不 404（测试：进入项目页 → 刷新）
- [ ] API 设置可以保存
- [ ] 生成架构/大纲/章节正常
- [ ] 本地存储正常（刷新后数据保留）
- [ ] 深色模式切换正常
- [ ] 图谱可视化正常加载
- [ ] 移动端适配正常

---

## 🛠️ 常见问题

### Q1: 路由刷新 404

**解决**: 确保 `public/_redirects` 文件存在：
```
/*    /index.html   200
```

### Q2: 构建失败

**检查**:
```bash
# 本地测试构建
npm run build

# 查看错误
# 确保 Node.js >= 18
node -v
```

### Q3: API 调用失败

**检查**:
1. 浏览器 Console 是否有 CORS 错误
2. API Key 是否正确
3. API Base URL 是否正确
4. 网络请求是否被防火墙拦截

### Q4: 自定义域名不生效

**解决**:
1. Dashboard → Custom domains 添加域名
2. 按提示配置 DNS（CNAME 或 A 记录）
3. 等待 DNS 传播（最多 24 小时，通常几分钟）

---

## 📈 性能优化建议

### 1. 代码分割（已配置）

`vite.config.js` 中配置了自动分割：
```javascript
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
```

### 2. 图片优化

Cloudflare 自动优化图片格式（WebP/AVIF）

### 3. CDN 缓存

Cloudflare 自动缓存静态资源，无需配置

---

## 🎯 完整部署流程

```bash
# 1. 安装 Wrangler
npm install -g wrangler

# 2. 登录 Cloudflare
wrangler login

# 3. 修改 vite.config.js（base: '/'）

# 4. 创建 public/_redirects
echo '/*    /index.html   200' > public/_redirects

# 5. 本地测试构建
npm run build
npm run preview

# 6. 部署到 Pages
npm run deploy:pages

# 7. 访问部署后的网站
# https://dream-novel.pages.dev
```

---

## 💡 架构说明

### 为什么不需要后端？

```
┌─────────────┐
│   用户浏览器  │
│             │
│  ┌───────┐  │
│  │ 前端  │  │
│  │ Vue3  │  │
│  └───┬───┘  │
│      │      │
│      ↓      │
│  ┌───────┐  │
│  │本地存储│  │
│  │localStorage│
│  └───┬───┘  │
│      │      │
└──────┼──────┘
       │
       │ HTTPS
       │ (用户自己的 API Key)
       ↓
┌─────────────┐
│  LLM API    │
│ (Chatfire/  │
│  OpenAI 等) │
└─────────────┘
```

**流程**:
1. 用户访问 Cloudflare Pages（CDN 加速）
2. 用户填写自己的 API Key（保存在自己浏览器）
3. 前端直接调用 LLM API
4. 用户自己承担 API 费用

**优点**:
- ✅ 零后端成本
- ✅ 零维护成本
- ✅ 用户数据隔离（每个用户只能看到自己的 Key 和项目）
- ✅ 全球 CDN 加速

---

## 📝 总结

### 快速部署命令
```bash
npm install -g wrangler
wrangler login
npm run deploy:pages
```

### 部署后 URL
```
https://dream-novel.pages.dev
```

### 成本
```
Cloudflare Pages: $0/月（免费）
API 费用：用户自己承担
总计：$0/月
```

### 维护
```
- 代码更新：git push → Cloudflare 自动构建部署
- 用户问题：检查浏览器 Console 和网络请求
- 无需维护后端服务
```

---

## 🔗 相关资源

- Cloudflare Pages 文档：https://developers.cloudflare.com/pages/
- Vue 3 部署指南：https://vuejs.org/guide/deployment/
- Vite 构建配置：https://vitejs.dev/config/
