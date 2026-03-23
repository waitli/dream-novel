<script setup>
import { ref, computed } from 'vue'
import { useNovelStore } from '../stores/novel'
import { useI18n } from '../i18n'
import { NButton, NInput, NTag, NIcon, NRadioGroup, NRadioButton } from 'naive-ui'
import { WarningOutline, ListOutline, PlayOutline, RefreshOutline, GridOutline, DocumentTextOutline, SearchOutline, GitNetworkOutline } from '@vicons/ionicons5'

const props = defineProps({
  project: Object,
  chapters: Array,
  isGenerating: Boolean,
  architectureGenerated: Boolean
})

const emit = defineEmits(['generate', 'regenerate'])
const novelStore = useNovelStore()
const { t } = useI18n()

// View mode
const viewMode = ref('list') // 'list' | 'raw'

// Search query
const searchQuery = ref('')

// Filtered chapters
const filteredChapters = computed(() => {
  if (!searchQuery.value) return props.chapters
  const query = searchQuery.value.toLowerCase()
  return props.chapters.filter(ch => 
    ch.title.toLowerCase().includes(query) ||
    ch.summary.toLowerCase().includes(query)
  )
})

// Get twist level stars
function getTwistStars(level) {
  if (!level) return '☆☆☆☆☆'
  const starCount = (level.match(/★/g) || []).length
  return level
}

// Update raw blueprint
function updateBlueprint(value) {
  novelStore.updateProject(props.project.id, { chapterBlueprint: value })
}
</script>

<template>
  <div class="space-y-4">
    <!-- Not ready state -->
    <div 
      v-if="!architectureGenerated" 
      class="bg-white dark:bg-[#1f1f23] rounded-2xl p-12 border border-gray-200/80 dark:border-gray-700/50 text-center"
    >
      <div class="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-xl shadow-amber-500/25">
        <WarningOutline class="w-12 h-12 text-white" />
      </div>
      <h3 class="text-2xl font-bold text-gray-800 dark:text-white mb-3">
        {{ t('blueprint.pleaseGenerateArchitecture') }}
      </h3>
      <p class="text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
        {{ t('blueprint.requirement') }}
      </p>
    </div>

    <!-- Generate button area -->
    <div 
      v-else-if="!project.chapterBlueprint" 
      class="bg-white dark:bg-[#1f1f23] rounded-2xl p-12 border border-gray-200/80 dark:border-gray-700/50 text-center"
    >
      <div class="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-xl shadow-purple-500/25">
        <ListOutline class="w-12 h-12 text-white" />
      </div>
      <h3 class="text-2xl font-bold text-gray-800 dark:text-white mb-3">
        {{ t('blueprint.generateTitle') }}
      </h3>
      <p class="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">
        {{ t('blueprint.description', { chapters: project.numberOfChapters }) }}
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
        {{ isGenerating ? t('common.generating') : t('blueprint.startGenerate') }}
      </n-button>
    </div>

    <!-- Content area -->
    <template v-else>
      <!-- Toolbar -->
      <div class="flex items-center justify-between gap-4 flex-wrap bg-white dark:bg-[#1f1f23] rounded-xl p-4 border border-gray-200/80 dark:border-gray-700/50">
        <div class="flex items-center gap-3">
          <!-- View mode toggle -->
          <n-radio-group v-model:value="viewMode" size="small">
            <n-radio-button value="list">
              <div class="flex items-center gap-1">
                <GridOutline class="w-4 h-4" />
                {{ t('blueprint.cardView') }}
              </div>
            </n-radio-button>
            <n-radio-button value="raw">
              <div class="flex items-center gap-1">
                <DocumentTextOutline class="w-4 h-4" />
                {{ t('blueprint.rawText') }}
              </div>
            </n-radio-button>
          </n-radio-group>

          <!-- Chapter count -->
          <n-tag type="info" :bordered="false" round>
            {{ t('blueprint.totalChapters', { count: chapters.length }) }}
          </n-tag>
        </div>

        <div class="flex items-center gap-2">
          <!-- Search -->
          <n-input
            v-if="viewMode === 'list'"
            v-model:value="searchQuery"
            :placeholder="t('blueprint.searchPlaceholder')"
            clearable
            style="width: 220px"
          >
            <template #prefix>
              <n-icon><SearchOutline /></n-icon>
            </template>
          </n-input>

          <!-- Regenerate -->
          <n-button 
            :disabled="isGenerating"
            @click="emit('regenerate')"
            secondary
          >
            <template #icon>
              <n-icon><RefreshOutline /></n-icon>
            </template>
            {{ t('common.regenerate') }}
          </n-button>
        </div>
      </div>

      <!-- List view -->
      <div v-if="viewMode === 'list'" class="space-y-4">
        <div 
          v-for="chapter in filteredChapters" 
          :key="chapter.number"
          class="bg-white dark:bg-[#1f1f23] rounded-xl p-5 border border-gray-200/80 dark:border-gray-700/50 hover:border-indigo-300 dark:hover:border-indigo-600/50 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300"
        >
          <div class="flex items-start gap-4">
            <!-- Chapter number -->
            <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/20">
              <span class="text-white font-bold text-sm">{{ chapter.number }}</span>
            </div>

            <div class="flex-1 min-w-0">
              <!-- Title -->
              <h4 class="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                {{ t('blueprint.chapterTitle', { number: chapter.number, title: chapter.title }) }}
              </h4>

              <!-- Meta info -->
              <div class="flex flex-wrap gap-2 mb-3">
                <n-tag v-if="chapter.position" size="small" :bordered="false" round>
                  {{ chapter.position }}
                </n-tag>
                <n-tag v-if="chapter.purpose" size="small" type="success" :bordered="false" round>
                  {{ chapter.purpose }}
                </n-tag>
                <n-tag v-if="chapter.suspense" size="small" type="warning" :bordered="false" round>
                  {{ chapter.suspense }}
                </n-tag>
              </div>

              <!-- Summary -->
              <p v-if="chapter.summary" class="text-gray-600 dark:text-gray-300 text-sm mb-3 leading-relaxed">
                {{ chapter.summary }}
              </p>

              <!-- Twist level -->
              <div v-if="chapter.twistLevel" class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <GitNetworkOutline class="w-3.5 h-3.5" />
                <span>{{ t('blueprint.twistLevel') }}: {{ getTwistStars(chapter.twistLevel) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- No results -->
        <div 
          v-if="!filteredChapters.length" 
          class="text-center py-12 text-gray-500 dark:text-gray-400"
        >
          <SearchOutline class="w-12 h-12 mx-auto mb-3 opacity-50" />
          {{ t('blueprint.noResults') }}
        </div>
      </div>

      <!-- Raw text view -->
      <div v-else-if="viewMode === 'raw'" class="bg-white dark:bg-[#1f1f23] rounded-xl border border-gray-200/80 dark:border-gray-700/50">
        <n-input
          type="textarea"
          :value="project.chapterBlueprint"
          @update:value="updateBlueprint"
          :autosize="{ minRows: 20, maxRows: 50 }"
          class="novel-textarea"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.novel-textarea {
  @apply border-0 focus:ring-0;
}
</style>
