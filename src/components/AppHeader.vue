<script setup>
import { useRouter } from 'vue-router'
import { useSettingsStore } from '../stores/settings'
import { useI18n } from '../i18n'
import SettingsDialog from './SettingsDialog.vue'
import { ref } from 'vue'
import { NButton, NTooltip } from 'naive-ui'
import { PencilOutline, SunnyOutline, MoonOutline, SettingsOutline, LanguageOutline } from '@vicons/ionicons5'

const router = useRouter()
const settings = useSettingsStore()
const { t } = useI18n()
const showSettings = ref(false)
</script>

<template>
  <header class="studio-header">
    <div class="header-inner">
      <div class="flex items-center justify-between h-16">
        <button class="brand" @click="router.push('/')" :aria-label="t('app.name')">
          <span class="brand-mark"><PencilOutline /></span>
          <span class="brand-name">{{ t('app.name') }}<small>DREAM NOVEL · {{ settings.locale === 'zh-CN' ? '创作书房' : 'WRITING STUDIO' }}</small></span>
        </button>
        <!-- Actions -->
        <div class="flex items-center gap-2">
          <!-- Language toggle -->
          <n-tooltip :show-arrow="false">
            <template #trigger>
              <n-button 
                circle 
                quaternary
                :aria-label="settings.locale === 'zh-CN' ? 'Switch to English' : '切换到中文'" @click="settings.toggleLocale"
                class="!w-10 !h-10"
              >
                <template #icon>
                  <LanguageOutline class="w-5 h-5" />
                </template>
              </n-button>
            </template>
            {{ settings.locale === 'zh-CN' ? 'Switch to English' : '切换到中文' }}
          </n-tooltip>

          <!-- Theme toggle -->
          <n-tooltip :show-arrow="false">
            <template #trigger>
              <n-button 
                circle 
                quaternary
                :aria-label="settings.isDark ? t('header.toggleLightMode') : t('header.toggleDarkMode')" @click="settings.toggleDark"
                class="!w-10 !h-10"
              >
                <template #icon>
                  <SunnyOutline v-if="settings.isDark" class="w-5 h-5" />
                  <MoonOutline v-else class="w-5 h-5" />
                </template>
              </n-button>
            </template>
            {{ settings.isDark ? t('header.toggleLightMode') : t('header.toggleDarkMode') }}
          </n-tooltip>

          <!-- Settings -->
          <n-tooltip :show-arrow="false">
            <template #trigger>
              <n-button 
                circle 
                quaternary
                :aria-label="t('header.settings')" @click="showSettings = true"
                class="!w-10 !h-10"
              >
                <template #icon>
                  <SettingsOutline class="w-5 h-5" />
                </template>
              </n-button>
            </template>
            {{ t('header.settings') }}
          </n-tooltip>
        </div>
      </div>
    </div>
  </header>
  <SettingsDialog v-model="showSettings" />
</template>

