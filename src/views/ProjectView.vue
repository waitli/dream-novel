<script setup>
import { ref, computed, shallowRef, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'
import { useNovelStore } from '../stores/novel'
import { useSettingsStore } from '../stores/settings'
import { useI18n } from '../i18n'
import { useSeo } from '../composables/useSeo'
import { getProjectBlueprintChapters, exportNovelToText, exportNovelToMarkdown } from '../api/generator'
import { useMessage, useDialog, NButton, NTabs, NTabPane, NCard, NProgress, NTag, NIcon } from 'naive-ui'
import { ArrowBackOutline, WarningOutline, GridOutline, ListOutline, PencilOutline, DownloadOutline, DocumentTextOutline, ReloadOutline } from '@vicons/ionicons5'
import { runGenerationPipeline, generationRunLabel, generationInputRevision } from '../utils/generation-pipeline.js'
import ArchitecturePanel from '../components/ArchitecturePanel.vue'
import ChapterBlueprintPanel from '../components/ChapterBlueprintPanel.vue'
import ChapterWriterPanel from '../components/ChapterWriterPanel.vue'

const route = useRoute()
const router = useRouter()
const novelStore = useNovelStore()
const settings = useSettingsStore()
const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()

// Current tab
const activeTab = ref('architecture')

// Generation state
const isGenerating = ref(false)
const generationStep = ref('')
const generationProgress = ref({ current: 0, total: 0 })

// Get current project
const project = computed(() => {
  return novelStore.projects.find(p => p.id === route.params.id)
})

// Parsed chapters
const chapters = computed(() => {
  if (!project.value?.chapterBlueprint && !project.value?.chapterBlueprintData?.length) return []
  return getProjectBlueprintChapters(project.value)
})

// Check if API is configured
const isApiConfigured = computed(() => {
  return !!settings.apiConfig.apiKey
})

const genreText = computed(() => {
  const genre = project.value?.genre
  if (Array.isArray(genre)) return genre.join(' / ')
  return genre || ''
})

const seoTitle = computed(() => {
  const title = project.value?.title || (settings.locale === 'zh-CN' ? '小说项目' : 'Novel Project')
  return settings.locale === 'zh-CN'
    ? `${title} | AI 小说生成器`
    : `${title} | AI Novel Generator`
})

const seoDescription = computed(() => {
  const title = project.value?.title || ''
  if (settings.locale === 'zh-CN') {
    return title
      ? `查看小说项目《${title}》的架构、章节大纲和创作进度。`
      : '查看小说项目的架构、章节大纲和创作进度。'
  }
  return title
    ? `View the story project "${title}" with architecture, chapter outlines, and writing progress.`
    : 'View the story project with architecture, chapter outlines, and writing progress.'
})

useSeo({
  title: seoTitle,
  description: seoDescription,
  path: computed(() => `/project/${route.params.id || ''}`),
  lang: computed(() => settings.locale),
  noindex: true
})

// Load project on mount
onMounted(() => {
  if (!project.value) {
    message.error('Project not found')
    router.push('/')
  }
})

const pipelineTask = shallowRef(null)
const savedRuns = computed(() => Object.entries(project.value?.generationRuns || {}).filter(([kind]) => ['architecture', 'blueprint'].includes(kind)))

function cancelPipeline() {
  const task = pipelineTask.value
  if (!task) return
  task.controller.abort()
  pipelineTask.value = null
  isGenerating.value = false
  generationStep.value = ''
}
onBeforeRouteLeave(cancelPipeline)
onBeforeRouteUpdate(cancelPipeline)
onBeforeUnmount(cancelPipeline)

async function runPipeline(kind, restart = false) {
  if (isGenerating.value || !project.value) return
  if (!isApiConfigured.value) { message.warning(t('messages.pleaseConfigureApiKey')); return }
  if (kind === 'blueprint' && !project.value.architectureGenerated) { message.warning(t('project.pleaseGenerateArchitectureFirst')); return }
  const snapshot = JSON.parse(JSON.stringify(project.value))
  const task = { projectId: snapshot.id, controller: new AbortController() }
  pipelineTask.value = task
  isGenerating.value = true
  generationProgress.value = { current: 0, total: 0 }
  try {
    await runGenerationPipeline(snapshot, kind, {
      restart, config: { ...settings.getStageConfig(kind), signal: task.controller.signal },
      getLatest: id => novelStore.projects.find(p => p.id === id),
      save: (id, updates) => novelStore.updateProject(id, updates),
      onProgress: (step, current, total) => {
        if (pipelineTask.value !== task) return
        generationStep.value = step
        generationProgress.value = { current, total }
      }
    })
    if (pipelineTask.value === task) message.success(kind === 'architecture' ? '架构已生成并保存' : '章节大纲已生成并保存')
  } catch (error) {
    if (pipelineTask.value === task && !task.controller.signal.aborted) message.error('生成未完成，已保存的步骤可继续：' + error.message)
  } finally {
    if (pipelineTask.value === task) {
      pipelineTask.value = null
      isGenerating.value = false
      generationStep.value = ''
    }
  }
}
const handleGenerateArchitecture = () => runPipeline('architecture')
const handleGenerateBlueprint = () => runPipeline('blueprint')
function handleConfirmBlueprint() {
  if (isGenerating.value || !project.value?.architectureGenerated || !chapters.value.length) return
  const total = Number(project.value.numberOfChapters)
  if (!Number.isInteger(total) || total < 1 || !Array.from({ length: total }, (_, i) => i + 1).every(n => chapters.value.some(ch => ch.number === n && ch.title?.trim() && ch.summary?.trim()))) {
    message.warning('当前大纲缺少章节、标题或简述，请先补充生成')
    return
  }
  novelStore.updateProject(project.value.id, { blueprintGenerated: true })
  message.success('已确认沿用当前大纲')
}

// Written chapters count
const writtenChaptersCount = computed(() => {
  return Object.keys(project.value?.chapters || {}).length
})

// Export novel
function handleExport(format) {
  if (!project.value) return
  
  const content = format === 'markdown' 
    ? exportNovelToMarkdown(project.value)
    : exportNovelToText(project.value)
  
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${project.value.title}.${format === 'markdown' ? 'md' : 'txt'}`
  a.click()
  URL.revokeObjectURL(url)
  
  message.success(t('project.exportSuccess'))
}

// Regenerate confirmation
async function confirmRegenerate(type) {
  dialog.warning({
    title: t('project.regenerateConfirm'),
    content: type === 'architecture' 
      ? '重新生成架构，新版本完成后替换原架构。已有正文保留，章节记忆需要重新更新，大纲需要确认或重新生成。'
      : '重新生成大纲，新版本完成后替换原大纲。失败或停止时保留原版本和已保存的生成进度。',
    positiveText: t('common.confirm'),
    negativeText: t('common.cancel'),
    onPositiveClick: () => { runPipeline(type, true) }
  })
}
</script>

<template>
  <div v-if="project" class="project-workspace">
    <!-- Project header -->
    <div class="mb-6">
      <div class="flex items-center gap-3 mb-4">
        <n-button text @click="router.push('/')">
          <template #icon>
            <n-icon><ArrowBackOutline /></n-icon>
          </template>
          {{ t('project.back') }}
        </n-button>
      </div>
      
      <div class="project-title-row flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 class="project-heading text-2xl font-bold text-gray-800 dark:text-white mb-2">
            {{ project.title }}
          </h1>
          <div class="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            <n-tag :bordered="false" round size="small">{{ genreText }}</n-tag>
            <span>{{ project.numberOfChapters }} {{ t('project.chapters') }}</span>
            <span>·</span>
            <span>{{ t('project.wordsPerChapter') }} {{ project.wordNumber }} {{ t('project.words') }}</span>
          </div>
        </div>

        <!-- API status indicator -->
        <div v-if="!isApiConfigured" class="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
          <WarningOutline class="w-5 h-5" />
          <span class="text-sm font-medium">{{ t('project.pleaseConfigureApiKey') }}</span>
        </div>
      </div>
    </div>

    <!-- Generation progress -->
    <div v-if="isGenerating" class="mb-6 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-5 border border-indigo-200/50 dark:border-indigo-700/50">
      <div class="flex items-center gap-4">
        <ReloadOutline class="w-6 h-6 text-indigo-500 animate-spin" />
        <div class="flex-1">
          <div class="text-gray-800 dark:text-white font-medium mb-2">
            {{ generationStep }}
          </div>
          <n-progress 
            type="line"
            :percentage="generationProgress.total > 0 ? Math.round((generationProgress.current / generationProgress.total) * 100) : 0"
            :height="8"
            :border-radius="4"
            :fill-border-radius="4"
            :show-indicator="false"
          />
        </div>
      </div>
    </div>

    <div v-for="[kind, run] in savedRuns" :key="kind" class="mb-4 p-4 rounded-xl border border-amber-200 dark:border-amber-800">
      <p class="text-sm mb-2">{{ generationRunLabel(kind, run) }} · {{ isGenerating ? '生成进度会自动保存' : '可从已保存步骤继续' }}</p>
      <p v-if="run.inputRevision !== generationInputRevision(project, kind)" class="text-sm text-amber-600 mb-2">生成条件已变化，继续时将按新条件重新开始。</p>
      <n-button v-if="!isGenerating" @click="runPipeline(kind)" secondary>继续生成{{ kind === 'architecture' ? '架构' : '大纲' }}</n-button>
    </div>
    <n-button v-if="pipelineTask" @click="cancelPipeline" class="mb-4" secondary>停止生成并保留进度</n-button>

    <!-- Tabs -->
    <n-tabs v-model:value="activeTab" type="segment" animated class="novel-tabs">
      <!-- Architecture tab -->
      <n-tab-pane name="architecture">
        <template #tab>
          <div class="flex items-center gap-2">
            <GridOutline class="w-4 h-4" />
            <span>{{ t('project.architectureTab') }}</span>
            <n-tag v-if="project.architectureGenerated" type="success" size="small" :bordered="false" round>
              {{ t('project.generated') }}
            </n-tag>
          </div>
        </template>
        
        <ArchitecturePanel 
          :project="project"
          :is-generating="isGenerating"
          @generate="handleGenerateArchitecture"
          @regenerate="confirmRegenerate('architecture')"
        />
      </n-tab-pane>

      <!-- Chapter blueprint tab -->
      <n-tab-pane name="blueprint">
        <template #tab>
          <div class="flex items-center gap-2">
            <ListOutline class="w-4 h-4" />
            <span>{{ t('project.blueprintTab') }}</span>
            <n-tag v-if="project.blueprintGenerated" type="success" size="small" :bordered="false" round>
              {{ t('project.generated') }}
            </n-tag>
          </div>
        </template>

        <ChapterBlueprintPanel
          :project="project"
          :chapters="chapters"
          :is-generating="isGenerating"
          :architecture-generated="project.architectureGenerated"
          @generate="handleGenerateBlueprint"
          @regenerate="confirmRegenerate('blueprint')"
          @confirm-existing="handleConfirmBlueprint"
        />
      </n-tab-pane>

      <!-- Chapter writer tab -->
      <n-tab-pane name="writer">
        <template #tab>
          <div class="flex items-center gap-2">
            <PencilOutline class="w-4 h-4" />
            <span>{{ t('project.chaptersTab') }}</span>
            <n-tag v-if="writtenChaptersCount > 0" type="success" size="small" :bordered="false" round>
              {{ writtenChaptersCount }}/{{ project.numberOfChapters }}
            </n-tag>
          </div>
        </template>

        <ChapterWriterPanel
          :project="project"
          :is-generating="isGenerating"
          @update:is-generating="isGenerating = $event"
        />
      </n-tab-pane>

      <!-- Export tab -->
      <n-tab-pane name="export">
        <template #tab>
          <div class="flex items-center gap-2">
            <DownloadOutline class="w-4 h-4" />
            <span>{{ t('project.export') }}</span>
          </div>
        </template>

        <div class="bg-white dark:bg-[#1f1f23] rounded-2xl p-8 border border-gray-200/80 dark:border-gray-700/50">
          <h3 class="text-xl font-bold text-gray-800 dark:text-white mb-6">{{ t('project.export') }}</h3>
          
          <!-- Export stats -->
          <div class="grid grid-cols-3 gap-4 mb-8">
            <div class="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-xl p-5 text-center">
              <div class="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">{{ writtenChaptersCount }}</div>
              <div class="text-sm text-gray-500 dark:text-gray-400 mt-1">{{ t('export.completedChapters') }}</div>
            </div>
            <div class="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-5 text-center">
              <div class="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">{{ project.numberOfChapters }}</div>
              <div class="text-sm text-gray-500 dark:text-gray-400 mt-1">{{ t('export.totalChapters') }}</div>
            </div>
            <div class="bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-900/20 dark:to-orange-900/20 rounded-xl p-5 text-center">
              <div class="text-4xl font-bold bg-gradient-to-r from-rose-600 to-orange-600 bg-clip-text text-transparent">
                {{ Object.values(project.chapters || {}).reduce((a, b) => a + b.length, 0) }}
              </div>
              <div class="text-sm text-gray-500 dark:text-gray-400 mt-1">{{ t('export.totalWords') }}</div>
            </div>
          </div>

          <!-- Export options -->
          <div class="flex gap-4">
            <n-button size="large" @click="handleExport('txt')" :disabled="writtenChaptersCount === 0" secondary>
              <template #icon>
                <n-icon><DocumentTextOutline /></n-icon>
              </template>
              {{ t('project.exportText') }}
            </n-button>
            <n-button size="large" @click="handleExport('markdown')" :disabled="writtenChaptersCount === 0" secondary>
              <template #icon>
                <n-icon><DocumentTextOutline /></n-icon>
              </template>
              {{ t('project.exportMarkdown') }}
            </n-button>
          </div>

          <div v-if="writtenChaptersCount === 0" class="flex items-center gap-2 mt-6 text-amber-600 dark:text-amber-400 text-sm">
            <WarningOutline class="w-4 h-4" />
            {{ t('export.noChaptersHint') }}
          </div>
        </div>
      </n-tab-pane>
    </n-tabs>
  </div>

  <!-- Not found state -->
  <div v-else class="text-center py-20">
    <WarningOutline class="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
    <p class="text-gray-500 dark:text-gray-400 mb-6">{{ t('project.notFound') }}</p>
    <n-button type="primary" @click="router.push('/')">
      {{ t('project.backToHome') }}
    </n-button>
  </div>
</template>

<style>
.novel-tabs .n-tabs-nav {
  @apply bg-white dark:bg-[#1f1f23] rounded-xl p-1.5 border border-gray-200/80 dark:border-gray-700/50;
}

.novel-tabs .n-tabs-pane-wrapper {
  @apply pt-6;
}

.novel-tabs .n-tab-pane {
  @apply px-0;
}
</style>
