<script setup>
import { computed, watch } from 'vue'
import { setLocale } from './i18n'
import { useSettingsStore } from './stores/settings'
import { NConfigProvider, NMessageProvider, NDialogProvider, darkTheme } from 'naive-ui'
import AppHeader from './components/AppHeader.vue'

const settings = useSettingsStore()
watch(() => settings.locale, setLocale, { immediate: true, flush: 'sync' })

const themeOverrides = computed(() => ({
  Progress: { fillColor: settings.isDark ? '#dea17e' : '#a45638', railColor: settings.isDark ? '#424037' : '#e9e4d9' },
  common: {
    primaryColor: settings.isDark ? '#dea17e' : '#a45638', primaryColorHover: settings.isDark ? '#ecb797' : '#88442d',
    primaryColorPressed: settings.isDark ? '#c58563' : '#743922', primaryColorSuppl: '#a45638',
    borderRadius: '10px', fontFamily: '"Inter", "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
    bodyColor: settings.isDark ? '#201f1c' : '#f7f5f0', cardColor: settings.isDark ? '#292823' : '#fffefa',
    modalColor: settings.isDark ? '#292823' : '#fffefa', popoverColor: settings.isDark ? '#302f29' : '#fffefa'
  }
}))
const theme = computed(() => settings.isDark ? darkTheme : null)
</script>

<template>
  <n-config-provider :theme="theme" :theme-overrides="themeOverrides">
    <n-message-provider>
      <n-dialog-provider>
        <div class="app-shell">
          <!-- Header - 顶部导航栏 -->
          <AppHeader />
          
          <!-- Main content - 主内容区 -->
          <main class="app-main">
            <router-view />
          </main>
        </div>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<style>
/* Global styles - 全局样式 */
html {
  scroll-behavior: smooth;
}
</style>
