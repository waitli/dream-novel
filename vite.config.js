import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  base: '/', // 自定义域名使用根路径
  plugins: [vue()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'vue-vendor',
              test: /node_modules[\\/](vue|vue-router|pinia)[\\/]/,
              priority: 40
            },
            {
              name: 'naive-ui',
              test: /node_modules[\\/](naive-ui|@css-render|css-render|date-fns|vooks|vueuc|treemate|seemly)[\\/]/,
              priority: 30,
              maxSize: 450000
            },
            {
              name: 'echarts',
              test: /node_modules[\\/](echarts|zrender|tslib)[\\/]/,
              priority: 30,
              maxSize: 450000
            },
            {
              name: 'icons',
              test: /node_modules[\\/]@vicons[\\/]/,
              priority: 20,
              maxSize: 450000
            }
          ]
        }
      }
    }
  },
  server: {
    host: '0.0.0.0',
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
