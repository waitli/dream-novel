<script setup>
import { ref, computed } from 'vue'
import { useNovelStore } from '../stores/novel'
import { useI18n } from '../i18n'
import { NButton, NCollapse, NCollapseItem, NInput, NTag, NIcon } from 'naive-ui'
import { SparklesOutline, PlayOutline, RefreshOutline, LocateOutline, PersonOutline, GlobeOutline, TrendingUpOutline, DocumentTextOutline } from '@vicons/ionicons5'

const props = defineProps({
  project: Object,
  isGenerating: Boolean
})

const emit = defineEmits(['generate', 'regenerate'])
const novelStore = useNovelStore()
const { t } = useI18n()

// Expanded sections
const expandedSections = ref(['coreSeed', 'characterDynamics', 'worldBuilding', 'plotArchitecture'])

// Architecture sections config
const sections = computed(() => [
  { key: 'coreSeed', title: t('architecture.coreSeed'), icon: LocateOutline, description: t('architecture.coreSeedDesc'), color: 'from-rose-500 to-orange-500' },
  { key: 'characterDynamics', title: t('architecture.characterDynamics'), icon: PersonOutline, description: t('architecture.characterDynamicsDesc'), color: 'from-blue-500 to-cyan-500' },
  { key: 'worldBuilding', title: t('architecture.worldBuilding'), icon: GlobeOutline, description: t('architecture.worldBuildingDesc'), color: 'from-emerald-500 to-teal-500' },
  { key: 'plotArchitecture', title: t('architecture.plotArchitecture'), icon: TrendingUpOutline, description: t('architecture.plotArchitectureDesc'), color: 'from-violet-500 to-purple-500' },
  { key: 'characterState', title: t('architecture.characterState'), icon: DocumentTextOutline, description: t('architecture.characterStateDesc'), color: 'from-amber-500 to-yellow-500' }
])

// Check if has content
const hasContent = computed(() => {
  return props.project?.coreSeed || props.project?.characterDynamics || 
         props.project?.worldBuilding || props.project?.plotArchitecture
})

// Update section content
function updateContent(key, value) {
  novelStore.updateProject(props.project.id, { [key]: value })
}
</script>

<template>
  <div class="space-y-4">
    <!-- Generate button area -->
    <div v-if="!hasContent" class="bg-white dark:bg-[#1f1f23] rounded-2xl p-12 border border-gray-200/80 dark:border-gray-700/50 text-center">
      <div class="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-500/25">
        <SparklesOutline class="w-12 h-12 text-white" />
      </div>
      <h3 class="text-2xl font-bold text-gray-800 dark:text-white mb-3">
        {{ t('architecture.startGenerating') }}
      </h3>
      <p class="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">
        {{ t('architecture.description') }}
      </p>
      <n-button 
        type="primary" 
        size="large"
        :loading="isGenerating"
        @click="emit('generate')"
        class="!px-8 !h-12"
      >
        <template #icon v-if="!isGenerating">
          <n-icon><PlayOutline /></n-icon>
        </template>
        {{ isGenerating ? t('common.generating') : t('architecture.startGenerateButton') }}
      </n-button>
    </div>

    <!-- Content sections -->
    <template v-else>
      <!-- Action bar -->
      <div class="flex justify-end mb-4">
        <n-button 
          :disabled="isGenerating"
          @click="emit('regenerate')"
          size="small"
          secondary
        >
          <template #icon>
            <n-icon><RefreshOutline /></n-icon>
          </template>
          {{ t('common.regenerate') }}
        </n-button>
      </div>

      <!-- Collapsible sections -->
      <n-collapse 
        v-model:expanded-names="expandedSections" 
        class="architecture-collapse"
      >
        <n-collapse-item 
          v-for="section in sections" 
          :key="section.key"
          :name="section.key"
        >
          <template #header>
            <div class="flex items-center gap-3 py-1">
              <div :class="['w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg', section.color]">
                <component :is="section.icon" class="w-5 h-5 text-white" />
              </div>
              <div class="flex-1">
                <span class="font-semibold text-gray-800 dark:text-white">{{ section.title }}</span>
                <span class="text-xs text-gray-400 ml-2 hidden sm:inline">{{ section.description }}</span>
              </div>
              <n-tag 
                v-if="project[section.key]" 
                type="success" 
                size="small" 
                :bordered="false"
                round
              >
                {{ t('project.generated') }}
              </n-tag>
            </div>
          </template>

          <div class="pt-3 pb-1">
            <n-input
              type="textarea"
              :value="project[section.key]"
              @update:value="updateContent(section.key, $event)"
              :autosize="{ minRows: 6, maxRows: 20 }"
              :placeholder="project[section.key] ? '' : t('architecture.noContent')"
              class="novel-textarea"
            />
          </div>
        </n-collapse-item>
      </n-collapse>
    </template>
  </div>
</template>

<style>
.n-collapse-item{
  border: none !important;
}
.n-collapse-item__header{
  padding: 4px 10px !important;
}
.architecture-collapse .n-collapse-item {
  @apply mb-3;
}

.architecture-collapse .n-collapse-item:last-child {
  @apply mb-0;
}

.architecture-collapse .n-collapse-item__header {
  @apply bg-white dark:bg-[#1f1f23] rounded-xl px-4 border border-gray-200/80 dark:border-gray-700/50 hover:border-indigo-300 dark:hover:border-indigo-600/50 transition-colors;
}

.architecture-collapse .n-collapse-item__content-wrapper {
  @apply bg-transparent;
}

.architecture-collapse .n-collapse-item__content-inner {
  @apply pt-0 pb-0;
}

</style>
