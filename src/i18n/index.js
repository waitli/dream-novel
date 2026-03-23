// i18n configuration
import { reactive, computed } from 'vue'
import zhCN from '../locales/zh-CN.js'
import enUS from '../locales/en-US.js'

// Language messages
const messages = {
  'zh-CN': zhCN,
  'en-US': enUS
}

// Current locale (default to Chinese)
const defaultLocale = typeof localStorage !== 'undefined' ? localStorage.getItem('locale') || 'zh-CN' : 'zh-CN'

// Reactive state
const state = reactive({
  locale: defaultLocale
})

// Get nested value from object using dot notation
function getNestedValue(obj, path) {
  if (!obj || !path) return path
  return path.split('.').reduce((prev, curr) => {
    return prev && prev[curr] !== undefined ? prev[curr] : null
  }, obj)
}

// Translation function
function t(key, params = {}) {
  const locale = state.locale
  let message = getNestedValue(messages[locale], key)
  
  // Fallback to Chinese if translation not found
  if (!message && locale !== 'zh-CN') {
    message = getNestedValue(messages['zh-CN'], key)
  }
  
  // If still not found, return the key
  if (!message) return key
  
  // Replace parameters
  return message.replace(/\{(\w+)\}/g, (_, key) => {
    return params[key] !== undefined ? params[key] : `{${key}}`
  })
}

// Change locale
function setLocale(locale) {
  if (messages[locale]) {
    state.locale = locale
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('locale', locale)
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale
    }
  }
}

// Toggle between Chinese and English
function toggleLocale() {
  setLocale(state.locale === 'zh-CN' ? 'en-US' : 'zh-CN')
}

// Create i18n plugin
export function createI18n() {
  // Set initial lang attribute
  if (typeof document !== 'undefined') {
    document.documentElement.lang = state.locale
  }
  
  const i18n = {
    t,
    locale: computed(() => state.locale),
    setLocale,
    toggleLocale
  }
  
  return {
    install(app) {
      // Provide for composition API
      app.provide('i18n', i18n)
      
      // Add global property
      app.config.globalProperties.$t = t
      app.config.globalProperties.$locale = state.locale
      app.config.globalProperties.$setLocale = setLocale
      app.config.globalProperties.$toggleLocale = toggleLocale
    }
  }
}

// Composable for composition API
export function useI18n() {
  const { t, locale, setLocale, toggleLocale } = inject('i18n')
  return {
    t,
    locale,
    setLocale,
    toggleLocale
  }
}

// Import inject from Vue
import { inject } from 'vue'

// Export for direct import
export { t, setLocale, toggleLocale, messages }
export default createI18n()
