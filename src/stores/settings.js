import { defineStore } from 'pinia'
import { ref, watch, computed } from 'vue'

// Default model config - 默认模型配置
const DEFAULT_MODEL = 'gemini-3-flash-preview'

// Default locale - 默认语言
const DEFAULT_LOCALE = localStorage.getItem('locale') || 'zh-CN'

// Settings store - 设置状态管理
export const useSettingsStore = defineStore('settings', () => {
  // State
  const isDark = ref(localStorage.getItem('theme') === 'dark' || 
    (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches))
  
  const locale = ref(localStorage.getItem('locale') || 'zh-CN')
  
  const apiConfig = ref(JSON.parse(localStorage.getItem('api_config') || JSON.stringify({
    channel: 'chatfire',
    baseUrl: 'https://api.chatfire.site/v1',
    apiKey: '',
    model: DEFAULT_MODEL,
    temperature: 0.7,
    maxTokens: 8192,
    timeout: 600,
    // Azure 配置
    resourceName: '',
    deploymentId: '',
    apiVersion: '2024-02-15-preview'
  })))

  // Stage-specific model configs - 各环节模型配置
  const stageModels = ref(JSON.parse(localStorage.getItem('stage_models') || JSON.stringify({
    architecture: '',  // 架构生成
    blueprint: '',     // 大纲生成
    chapter: '',       // 章节生成
    finalize: '',      // 定稿（摘要/状态更新）
    enrich: ''         // 扩写
  })))

  // Get config for specific stage - 获取特定环节的配置
  function getStageConfig(stage) {
    const stageModel = stageModels.value[stage]
    if (stageModel) {
      return { ...apiConfig.value, model: stageModel }
    }
    return apiConfig.value
  }

  // Watch theme changes and apply - 监听主题变化并应用
  watch(isDark, (newValue) => {
    if (newValue) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, { immediate: true })
  
  // Watch locale changes and apply - 监听语言变化并应用
  watch(locale, (newValue) => {
    localStorage.setItem('locale', newValue)
    document.documentElement.lang = newValue
  }, { immediate: true })

  // Actions
  // Toggle dark mode - 切换深色模式
  function toggleDark() {
    isDark.value = !isDark.value
  }

  // Toggle locale - 切换语言
  function toggleLocale() {
    locale.value = locale.value === 'zh-CN' ? 'en-US' : 'zh-CN'
  }

  // Set locale - 设置语言
  function setLocale(newLocale) {
    if (['zh-CN', 'en-US'].includes(newLocale)) {
      locale.value = newLocale
    }
  }

  // Update API config - 更新 API 配置
  function updateApiConfig(config) {
    apiConfig.value = { ...apiConfig.value, ...config }
    localStorage.setItem('api_config', JSON.stringify(apiConfig.value))
  }

  // Update Azure config - 更新 Azure 配置
  function updateAzureConfig(azureConfig) {
    apiConfig.value = { ...apiConfig.value, ...azureConfig }
    localStorage.setItem('api_config', JSON.stringify(apiConfig.value))
  }

  // Update stage models - 更新环节模型配置
  function updateStageModels(models) {
    stageModels.value = { ...stageModels.value, ...models }
    localStorage.setItem('stage_models', JSON.stringify(stageModels.value))
  }

  return {
    isDark,
    locale,
    apiConfig,
    stageModels,
    toggleDark,
    toggleLocale,
    setLocale,
    updateApiConfig,
    updateAzureConfig,
    updateStageModels,
    getStageConfig
  }
})
