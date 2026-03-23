<script setup>
import { ref, computed } from 'vue'
import { useNovelStore } from '../stores/novel'
import { useSettingsStore } from '../stores/settings'
import { useI18n } from '../i18n'
import { generateChapterDraft, finalizeChapter, enrichChapter, parseChapterBlueprint } from '../api/generator'
import { generateChapterGraph } from '../api/compass-generator'
import { useMessage, useDialog, NButton, NInput, NProgress, NTag, NIcon, NTooltip } from 'naive-ui'
import { WarningOutline, SparklesOutline, PencilOutline, SaveOutline, CheckmarkOutline, CheckmarkCircleOutline, ReloadOutline, HelpCircleOutline, DocumentTextOutline } from '@vicons/ionicons5'
import ChapterRelationGraph from './compass/ChapterRelationGraph.vue'

const props = defineProps({
  project: Object,
  isGenerating: Boolean
})

const emit = defineEmits(['update:isGenerating'])
const novelStore = useNovelStore()
const settings = useSettingsStore()
const message = useMessage()
const dialog = useDialog()
const { t } = useI18n()

// Current chapter being written - 当前正在写的章节
const currentChapter = ref(1)
const chapterContent = ref('')
const generationStep = ref('')
const graphGenerating = ref(false)
const graphStep = ref('')

// Parsed blueprint chapters - 解析后的大纲章节
const blueprintChapters = computed(() => {
  if (!props.project?.chapterBlueprint) return []
  return parseChapterBlueprint(props.project.chapterBlueprint)
})

// Written chapters count - 已写章节数
const writtenChaptersCount = computed(() => {
  return Object.keys(props.project?.chapters || {}).length
})

// Next chapter to write - 下一个要写的章节
const nextChapterToWrite = computed(() => {
  const chapters = props.project?.chapters || {}
  for (let i = 1; i <= props.project?.numberOfChapters; i++) {
    if (!chapters[i]) return i
  }
  return props.project?.numberOfChapters || 1
})

// Current chapter info from blueprint - 当前章节大纲信息
const currentChapterInfo = computed(() => {
  return blueprintChapters.value.find(c => c.number === currentChapter.value) || null
})

// Check if chapter exists - 检查章节是否已存在
const chapterExists = computed(() => {
  return !!props.project?.chapters?.[currentChapter.value]
})

// Current chapter's relation graph data
const currentChapterGraph = computed(() => {
  return props.project?.chapterGraphs?.[currentChapter.value] || null
})

// Load chapter content when switching - 切换章节时加载内容
function loadChapter(num) {
  currentChapter.value = num
  chapterContent.value = props.project?.chapters?.[num] || ''
}

// Generate chapter draft - 生成章节草稿
async function handleGenerate() {
  if (!settings.apiConfig.apiKey) {
    message.warning(t('messages.pleaseConfigureApiKey'))
    return
  }

  if (!props.project?.blueprintGenerated) {
    message.warning(t('chapterWriter.pleaseGenerateBlueprint'))
    return
  }

  // Check if previous chapters exist for non-first chapters
  if (currentChapter.value > 1 && !props.project?.chapters?.[currentChapter.value - 1]) {
    const confirmed = await new Promise((resolve) => {
      dialog.warning({
        title: t('common.tip'),
        content: `第 ${currentChapter.value - 1} 章还未生成，建议先按顺序生成。是否继续？`,
        positiveText: t('chapterWriter.continueGenerate'),
        negativeText: t('common.cancel'),
        onPositiveClick: () => resolve(true),
        onNegativeClick: () => resolve(false)
      })
    })
    if (!confirmed) return
  }

  try {
    emit('update:isGenerating', true)
    
    const draft = await generateChapterDraft(
      props.project,
      currentChapter.value,
      settings.getStageConfig('chapter'),
      (step) => { generationStep.value = step }
    )

    chapterContent.value = draft
    message.success(`第 ${currentChapter.value} 章草稿生成完成`)
  } catch (error) {
    console.error('Generation error:', error)
    message.error('生成失败: ' + error.message)
  } finally {
    emit('update:isGenerating', false)
    generationStep.value = ''
  }
}

// Save and finalize chapter - 保存并定稿章节
async function handleSaveAndFinalize() {
  if (!chapterContent.value.trim()) {
    message.warning('章节内容为空')
    return
  }

  if (!settings.apiConfig.apiKey) {
    message.warning(t('messages.pleaseConfigureApiKey'))
    return
  }

  try {
    emit('update:isGenerating', true)

    // Save chapter content - 保存章节内容
    const updatedChapters = { ...props.project.chapters, [currentChapter.value]: chapterContent.value }
    
    // Finalize chapter (update summary and character state)
    const updates = await finalizeChapter(
      props.project,
      currentChapter.value,
      chapterContent.value,
      settings.getStageConfig('finalize'),
      (step) => { generationStep.value = step }
    )

    novelStore.updateProject(props.project.id, {
      chapters: updatedChapters,
      ...updates
    })

    message.success(`第 ${currentChapter.value} 章已保存并定稿`)

    // Generate chapter relation graph in background
    const savedChapter = currentChapter.value
    const savedContent = chapterContent.value
    generateChapterGraphData(savedChapter, savedContent)

    // Auto advance to next chapter - 自动跳转到下一章
    if (currentChapter.value < props.project.numberOfChapters) {
      currentChapter.value++
      chapterContent.value = ''
    }
  } catch (error) {
    console.error('Finalize error:', error)
    message.error('保存失败: ' + error.message)
  } finally {
    emit('update:isGenerating', false)
    generationStep.value = ''
  }
}

// Quick save without finalize - 快速保存（不定稿）
function handleQuickSave() {
  if (!chapterContent.value.trim()) {
    message.warning('章节内容为空')
    return
  }

  const updatedChapters = { ...props.project.chapters, [currentChapter.value]: chapterContent.value }
  novelStore.updateProject(props.project.id, { chapters: updatedChapters })
  message.success('已保存')
}

// Enrich chapter - 扩写章节
async function handleEnrich() {
  if (!chapterContent.value.trim()) {
    message.warning('请先生成或输入章节内容')
    return
  }

  if (!settings.apiConfig.apiKey) {
    message.warning(t('messages.pleaseConfigureApiKey'))
    return
  }

  try {
    emit('update:isGenerating', true)
    
    const enriched = await enrichChapter(
      chapterContent.value,
      props.project.wordNumber,
      settings.getStageConfig('enrich'),
      (step) => { generationStep.value = step }
    )

    chapterContent.value = enriched
    message.success('扩写完成')
  } catch (error) {
    console.error('Enrich error:', error)
    message.error('扩写失败: ' + error.message)
  } finally {
    emit('update:isGenerating', false)
    generationStep.value = ''
  }
}

// Generate chapter relation graph - 生成章节关系图谱
async function generateChapterGraphData(chapterNum, chapterText) {
  try {
    graphGenerating.value = true
    graphStep.value = '正在提取本章人物关系...'

    const graphResult = await generateChapterGraph(
      props.project,
      chapterNum,
      chapterText,
      settings.getStageConfig('architecture'),
      (step) => { graphStep.value = step }
    )

    const updatedChapterGraphs = { ...props.project.chapterGraphs, [chapterNum]: graphResult }
    novelStore.updateProject(props.project.id, { chapterGraphs: updatedChapterGraphs })
    message.success(`第 ${chapterNum} 章关系图谱已生成`)
  } catch (err) {
    console.error('Chapter graph error:', err)
    message.warning('关系图谱生成失败: ' + err.message)
  } finally {
    graphGenerating.value = false
    graphStep.value = ''
  }
}

// Initialize with next chapter to write - 初始化到下一个要写的章节
loadChapter(nextChapterToWrite.value)
</script>

<template>
  <div class="space-y-4">
    <!-- Not ready state - 未就绪状态 -->
    <div 
      v-if="!project?.blueprintGenerated" 
      class="bg-white dark:bg-[#1f1f23] rounded-2xl p-12 border border-gray-200/80 dark:border-gray-700/50 text-center"
    >
      <div class="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-xl shadow-amber-500/25">
        <WarningOutline class="w-12 h-12 text-white" />
      </div>
      <h3 class="text-2xl font-bold text-gray-800 dark:text-white mb-3">{{ t('chapterWriter.pleaseGenerateBlueprint') }}</h3>
      <p class="text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
        {{ t('chapterWriter.requirement') }}
      </p>
    </div>

    <!-- Main content - 主内容 -->
    <template v-else>
      <!-- Progress indicator - 进度指示 -->
      <div class="bg-white dark:bg-[#1f1f23] rounded-xl p-5 border border-gray-200/80 dark:border-gray-700/50">
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm font-medium text-gray-600 dark:text-gray-400">写作进度</span>
          <span class="text-sm font-bold text-gray-800 dark:text-white">
            {{ writtenChaptersCount }} / {{ project.numberOfChapters }} 章
          </span>
        </div>
        <n-progress 
          type="line"
          :percentage="Math.round((writtenChaptersCount / project.numberOfChapters) * 100)"
          :height="10"
          :border-radius="6"
          :fill-border-radius="6"
          :show-indicator="false"
        />
      </div>

      <!-- Chapter selector and editor - 章节选择器和编辑器 -->
      <div class="grid grid-cols-12 gap-4">
        <!-- Chapter list sidebar - 章节列表侧边栏 -->
        <div class="col-span-3">
          <div class="bg-white dark:bg-[#1f1f23] rounded-xl border border-gray-200/80 dark:border-gray-700/50 overflow-hidden">
            <div class="p-4 border-b border-gray-200/80 dark:border-gray-700/50">
              <h3 class="font-semibold text-gray-800 dark:text-white">章节列表</h3>
            </div>
            <div class="max-h-[500px] overflow-y-auto">
              <div
                v-for="ch in blueprintChapters"
                :key="ch.number"
                class="px-4 py-3 cursor-pointer border-b border-gray-100 dark:border-gray-700/50 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                :class="{ 'bg-indigo-50 dark:bg-indigo-900/20 border-l-2 !border-l-indigo-500': ch.number === currentChapter }"
                @click="loadChapter(ch.number)"
              >
                <div class="flex items-center justify-between">
                  <span class="text-sm font-medium text-gray-800 dark:text-white truncate flex-1">
                    第{{ ch.number }}章
                  </span>
                  <CheckmarkCircleOutline v-if="project.chapters?.[ch.number]" class="w-5 h-5 text-green-500 ml-2" />
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">{{ ch.title }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Editor area - 编辑区域 -->
        <div class="col-span-9 space-y-4">
          <!-- Chapter info header - 章节信息头部 -->
          <div class="bg-white dark:bg-[#1f1f23] rounded-xl p-5 border border-gray-200/80 dark:border-gray-700/50">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-lg font-bold text-gray-800 dark:text-white">
                第{{ currentChapter }}章 - {{ currentChapterInfo?.title || '未命名' }}
              </h3>
              <div class="flex items-center gap-2">
                <n-tag v-if="chapterExists" type="success" size="small" :bordered="false" round>已保存</n-tag>
                <n-tag v-else type="info" size="small" :bordered="false" round>未保存</n-tag>
              </div>
            </div>
            
            <!-- Chapter meta info - 章节元信息 -->
            <div v-if="currentChapterInfo" class="flex flex-wrap gap-2 text-xs">
              <n-tag size="small" :bordered="false" round>{{ currentChapterInfo.position }}</n-tag>
              <n-tag size="small" type="success" :bordered="false" round>{{ currentChapterInfo.purpose }}</n-tag>
              <n-tag size="small" type="warning" :bordered="false" round>{{ currentChapterInfo.suspense }}</n-tag>
            </div>
            <p v-if="currentChapterInfo?.summary" class="text-sm text-gray-600 dark:text-gray-400 mt-3 leading-relaxed">
              {{ currentChapterInfo.summary }}
            </p>
          </div>

          <!-- Global Summary - 前文摘要 -->
          <div 
            v-if="currentChapter > 1 && project.globalSummary" 
            class="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 rounded-xl p-4 border border-amber-200/50 dark:border-amber-700/30"
          >
            <div class="flex items-center gap-2 mb-2">
              <DocumentTextOutline class="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span class="text-sm font-medium text-amber-700 dark:text-amber-300">前文摘要</span>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
              {{ project.globalSummary }}
            </p>
          </div>

          <!-- Generation status - 生成状态 -->
          <div v-if="isGenerating" class="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-4 border border-indigo-200/50 dark:border-indigo-700/50">
            <div class="flex items-center gap-3">
              <ReloadOutline class="w-5 h-5 text-indigo-500 animate-spin" />
              <span class="text-indigo-700 dark:text-indigo-300 font-medium">{{ generationStep || '处理中...' }}</span>
            </div>
          </div>

          <!-- Action buttons - 操作按钮 -->
          <div class="flex items-center gap-2 flex-wrap">
            <n-button type="primary" :loading="isGenerating" @click="handleGenerate">
              <template #icon>
                <n-icon><SparklesOutline /></n-icon>
              </template>
              生成草稿
            </n-button>
            <n-button :disabled="isGenerating || !chapterContent" @click="handleEnrich" secondary>
              <template #icon>
                <n-icon><PencilOutline /></n-icon>
              </template>
              扩写
            </n-button>
            <div class="flex-1"></div>
            <n-button :disabled="isGenerating || !chapterContent" @click="handleQuickSave" tertiary>
              <template #icon>
                <n-icon><SaveOutline /></n-icon>
              </template>
              快速保存
            </n-button>
            <n-tooltip trigger="hover">
              <template #trigger>
                <n-icon class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" :size="18">
                  <HelpCircleOutline />
                </n-icon>
              </template>
              仅保存章节内容，不更新摘要和角色状态
            </n-tooltip>
            <n-button type="success" :loading="isGenerating" :disabled="!chapterContent" @click="handleSaveAndFinalize">
              <template #icon>
                <n-icon><CheckmarkOutline /></n-icon>
              </template>
              保存并定稿
            </n-button>
            <n-tooltip trigger="hover">
              <template #trigger>
                <n-icon class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" :size="18">
                  <HelpCircleOutline />
                </n-icon>
              </template>
              保存内容并更新章节摘要、角色状态，用于后续章节的上下文连贯性
            </n-tooltip>
          </div>

          <!-- Editor textarea - 编辑器文本框 -->
          <n-input
            v-model:value="chapterContent"
            type="textarea"
            :autosize="{ minRows: 20, maxRows: 40 }"
            :placeholder="`在此编写或生成第 ${currentChapter} 章内容...`"
            class="novel-textarea"
          />

          <!-- Word count - 字数统计 -->
          <div class="text-right text-sm text-gray-500 dark:text-gray-400">
            当前字数：<span class="font-medium text-gray-700 dark:text-gray-300">{{ chapterContent.length }}</span> / 目标：{{ project.wordNumber }}
          </div>

          <!-- Chapter relation graph - 章节关系图谱 -->
          <div v-if="graphGenerating" class="flex items-center gap-3 px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-sm text-indigo-600 dark:text-indigo-400">
            <span class="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            {{ graphStep || '正在生成关系图谱...' }}
          </div>
          <div v-if="currentChapterGraph" class="bg-white dark:bg-[#1f1f23] rounded-xl border border-gray-200/80 dark:border-gray-700/50 overflow-hidden">
            <div class="px-4 py-3 border-b border-gray-200/80 dark:border-gray-700/50 flex items-center justify-between">
              <span class="text-sm font-medium text-gray-700 dark:text-gray-200">本章人物关系图谱</span>
              <n-tag size="small" :bordered="false" round type="info">
                {{ currentChapterGraph.nodes?.length || 0 }} 角色 · {{ currentChapterGraph.edges?.length || 0 }} 关系
              </n-tag>
            </div>
            <ChapterRelationGraph :graph-data="currentChapterGraph" :height="360" />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

