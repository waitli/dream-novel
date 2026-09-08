<script setup>
import { ref, computed, shallowRef, watch, onBeforeUnmount } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { readChapterDraft, writeChapterDraft, removeChapterDraft } from '../utils/chapter-drafts.js'
import { useNovelStore } from '../stores/novel'
import { useSettingsStore } from '../stores/settings'
import { useI18n } from '../i18n'
import { generateChapterDraft, finalizeChapter, checkChapterConsistency, enrichChapter, getProjectBlueprintChapters } from '../api/generator'
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
const activeTask = shallowRef(null)
const isWorking = computed(() => props.isGenerating || Boolean(activeTask.value))
const draftDirty = ref(false), draftError = ref(''), draftSavedAt = ref('')
let draftTimer = null, restoringDraft = false, loadedProjectId = props.project?.id
let lastDraftContent = ''

function flushDraft() {
  clearTimeout(draftTimer)
  draftTimer = null
  if (!draftDirty.value || !loadedProjectId) return true
  try {
    const saved = writeChapterDraft(localStorage, loadedProjectId, currentChapter.value, chapterContent.value)
    lastDraftContent = chapterContent.value
    draftSavedAt.value = saved.updatedAt
    draftDirty.value = false
    draftError.value = ''
    return true
  } catch {
    draftError.value = '草稿暂存失败，请保留页面并复制正文备份，检查浏览器存储空间。'
    return false
  }
}
watch(chapterContent, () => {
  if (restoringDraft) return
  draftDirty.value = chapterContent.value !== lastDraftContent
  if (draftDirty.value && !draftTimer) draftTimer = setTimeout(flushDraft, 600)
}, { flush: 'sync' })

function restoreChapter(num) {
  let draft = null
  try { draft = readChapterDraft(localStorage, props.project.id, num) } catch (error) { message.error(error.message); return false }
  restoringDraft = true
  loadedProjectId = props.project.id
  currentChapter.value = num
  const savedAt = props.project.chapterMeta?.[num]?.updatedAt || ''
  const useDraft = draft && draft.updatedAt >= savedAt
  chapterContent.value = useDraft ? draft.content : (props.project.chapters?.[num] || '')
  lastDraftContent = chapterContent.value
  draftSavedAt.value = useDraft ? draft.updatedAt : ''
  draftDirty.value = false
  draftError.value = ''
  restoringDraft = false
  return true
}
function startTask() {
  if (isWorking.value || !flushDraft()) return null
  const task = {
    projectId: props.project.id, chapterNumber: currentChapter.value, content: chapterContent.value,
    project: JSON.parse(JSON.stringify(props.project)), controller: new AbortController()
  }
  activeTask.value = task
  emit('update:isGenerating', true)
  return task
}
function isCurrentTask(task) {
  return activeTask.value === task && props.project?.id === task.projectId && !task.controller.signal.aborted
}
function finishTask(task) {
  if (activeTask.value !== task) return
  flushDraft()
  activeTask.value = null
  generationStep.value = ''
  emit('update:isGenerating', false)
}
function cancelTask() {
  const task = activeTask.value
  if (!task) return
  task.controller.abort()
  finishTask(task)
}
function taskConfig(stage, task) {
  return { ...settings.getStageConfig(stage), signal: task.controller.signal }
}
function confirmAction(options) {
  return new Promise(resolve => dialog.warning({
    ...options, onPositiveClick: () => resolve(true), onNegativeClick: () => resolve(false),
    onClose: () => resolve(false), onMaskClick: () => resolve(false)
  }))
}
function saveTaskContent(task, status, extra = {}) {
  const project = novelStore.projects.find(p => p.id === task.projectId)
  if (!project) throw new Error('项目已不存在')
  novelStore.updateProject(task.projectId, {
    chapters: { ...project.chapters, [task.chapterNumber]: task.content },
    chapterMeta: { ...project.chapterMeta, [task.chapterNumber]: {
      ...project.chapterMeta?.[task.chapterNumber], status, updatedAt: new Date().toISOString(),
      wordCount: task.content.length, ...extra
    } }
  })
}
function handlePageHide() { flushDraft() }
function handleBeforeUnload(event) {
  if (!flushDraft()) { event.preventDefault(); event.returnValue = '' }
}
window.addEventListener('pagehide', handlePageHide)
window.addEventListener('beforeunload', handleBeforeUnload)
onBeforeRouteLeave(() => {
  if (!flushDraft()) { message.error(draftError.value); return false }
  cancelTask()
})
onBeforeUnmount(() => {
  flushDraft()
  cancelTask()
  window.removeEventListener('pagehide', handlePageHide)
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
watch(() => props.project?.id, id => {
  if (id === loadedProjectId) return
  flushDraft()
  cancelTask()
  if (id) restoreChapter(nextChapterToWrite.value)
}, { flush: 'sync' })

// Parsed blueprint chapters - 解析后的大纲章节
const blueprintChapters = computed(() => {
  if (!props.project?.chapterBlueprint && !props.project?.chapterBlueprintData?.length) return []
  return getProjectBlueprintChapters(props.project)
})

// Written chapters count - 已写章节数
const writtenChaptersCount = computed(() => {
  return Object.keys(props.project?.chapters || {}).length
})

// Next chapter to write - 下一个要写的章节
const nextChapterToWrite = computed(() => {
  for (let i = 1; i <= props.project?.numberOfChapters; i++) {
    if (getChapterStatus(i) !== 'finalized') return i
  }
  return props.project?.numberOfChapters || 1
})

// Current chapter info from blueprint - 当前章节大纲信息
const currentChapterInfo = computed(() => {
  return blueprintChapters.value.find(c => c.number === currentChapter.value) || null
})

const finalizedChaptersCount = computed(() => {
  let count = 0
  for (let i = 1; i <= (props.project?.numberOfChapters || 0); i++) {
    if (getChapterStatus(i) === 'finalized') count++
  }
  return count
})

const currentChapterStatus = computed(() => {
  const status = getChapterStatus(currentChapter.value)
  if (chapterContent.value !== (props.project?.chapters?.[currentChapter.value] || '')) {
    return status === 'finalized' ? 'needs_refinalize' : 'draft'
  }
  return status
})

// Current chapter's relation graph data
const currentChapterGraph = computed(() => {
  return props.project?.chapterGraphs?.[currentChapter.value] || null
})

// Load chapter content when switching - 切换章节时加载内容
function loadChapter(num) {
  if (isWorking.value) return
  if (!flushDraft()) { message.error(draftError.value); return }
  restoreChapter(num)
}

function getChapterMeta(num) {
  return props.project?.chapterMeta?.[num] || {}
}

function getChapterStatus(num) {
  const metaStatus = getChapterMeta(num).status
  if (metaStatus) return metaStatus
  if ((props.project?.chapterSummaries || []).some(summary => Number(summary?.chapter) === Number(num))) return 'finalized'
  return props.project?.chapters?.[num] ? 'draft' : 'empty'
}

function getStatusLabel(status) {
  const labels = {
    finalized: '已定稿',
    needs_refinalize: '待定稿',
    memory_failed: '记忆更新失败',
    draft: '草稿',
    empty: '未保存'
  }
  return labels[status] || '未保存'
}

function getStatusType(status) {
  const types = {
    finalized: 'success',
    needs_refinalize: 'warning',
    memory_failed: 'error',
    draft: 'info',
    empty: 'default'
  }
  return types[status] || 'default'
}

function buildChapterMeta(status, extra = {}) {
  const now = new Date().toISOString()
  return {
    ...getChapterMeta(currentChapter.value),
    status,
    updatedAt: now,
    wordCount: chapterContent.value.length,
    ...extra
  }
}

function hasSignificantConsistencyIssues(report) {
  if (!report) return false
  if (report.passed === false) return true
  if (report.recommendedAction && report.recommendedAction !== 'finalize') return true
  const significant = new Set(['blocker', 'high', 'medium'])
  return (report.issues || []).some(issue => significant.has(String(issue.severity || '').toLowerCase())) ||
    (report.missingForeshadowing || []).length > 0 ||
    (report.newFactsToConfirm || []).length > 0
}

function formatConsistencyReport(report) {
  const lines = []
  if (report.summary) lines.push(report.summary)
  if (report.score !== null && report.score !== undefined) lines.push(`评分：${report.score}`)

  const issues = report.issues || []
  if (issues.length) {
    lines.push('')
    lines.push('问题：')
    issues.slice(0, 6).forEach(issue => {
      lines.push(`- [${issue.severity || 'review'}] ${issue.description || ''}${issue.suggestion ? `；建议：${issue.suggestion}` : ''}`)
    })
  }

  if (report.missingForeshadowing?.length) {
    lines.push('')
    lines.push(`遗漏伏笔：${report.missingForeshadowing.join('；')}`)
  }

  if (report.newFactsToConfirm?.length) {
    lines.push('')
    lines.push(`待确认新增事实：${report.newFactsToConfirm.join('；')}`)
  }

  return lines.join('\n') || '一致性检查发现需要确认的问题。'
}

async function confirmConsistencyReport(report) {
  if (!hasSignificantConsistencyIssues(report)) return true
  return confirmAction({ title: '定稿前一致性检查', content: formatConsistencyReport(report), positiveText: '仍然定稿', negativeText: '返回修改' })
}

// Generate chapter draft - 生成章节草稿
async function handleGenerate() {
  if (!settings.apiConfig.apiKey) { message.warning(t('messages.pleaseConfigureApiKey')); return }
  if (!props.project?.blueprintGenerated) { message.warning(t('chapterWriter.pleaseGenerateBlueprint')); return }
  const task = startTask()
  if (!task) return
  try {
    if (task.chapterNumber > 1 && getChapterStatus(task.chapterNumber - 1) !== 'finalized') {
      const confirmed = await confirmAction({
        title: t('common.tip'), content: `第 ${task.chapterNumber - 1} 章尚未定稿，记忆可能未更新。是否继续生成？`,
        positiveText: t('chapterWriter.continueGenerate'), negativeText: t('common.cancel')
      })
      if (!confirmed || !isCurrentTask(task)) return
    }
    const draft = await generateChapterDraft(task.project, task.chapterNumber, taskConfig('chapter', task),
      step => { if (isCurrentTask(task)) generationStep.value = step },
      (chunk, fullContent) => { if (isCurrentTask(task)) chapterContent.value = fullContent })
    if (!isCurrentTask(task)) return
    chapterContent.value = draft
    if (flushDraft()) message.success(`第 ${task.chapterNumber} 章草稿已生成并自动暂存`)
  } catch (error) {
    if (isCurrentTask(task)) message.error('生成未完成，已保留当前正文：' + error.message)
  } finally { finishTask(task) }
}

// Save and finalize chapter - 保存并定稿章节
async function handleSaveAndFinalize() {
  if (!chapterContent.value.trim()) { message.warning('章节内容为空'); return }
  if (!settings.apiConfig.apiKey) { message.warning(t('messages.pleaseConfigureApiKey')); return }
  const task = startTask()
  if (!task) return
  let contentSaved = false
  try {
    // Persist text first. Memory failures must never discard the chapter.
    saveTaskContent(task, 'needs_refinalize', { memoryError: null })
    contentSaved = true
    generationStep.value = '正文已保存，正在进行定稿前一致性检查...'
    let consistencyReport = null
    try {
      consistencyReport = await checkChapterConsistency(task.project, task.chapterNumber, task.content, taskConfig('finalize', task))
      if (!isCurrentTask(task)) return
      if (!await confirmConsistencyReport(consistencyReport)) return
    } catch (error) {
      if (!isCurrentTask(task)) return
      const confirmed = await confirmAction({
        title: '一致性检查失败', content: `正文已保存。检查失败：${error.message}。是否跳过检查继续更新记忆？`,
        positiveText: '继续定稿', negativeText: '稍后重试'
      })
      if (!confirmed) return
    }
    if (!isCurrentTask(task)) return
    const updates = await finalizeChapter(task.project, task.chapterNumber, task.content, taskConfig('finalize', task),
      step => { if (isCurrentTask(task)) generationStep.value = step })
    if (!isCurrentTask(task)) return
    const latest = novelStore.projects.find(p => p.id === task.projectId)
    if (!latest || latest.chapters?.[task.chapterNumber] !== task.content) throw new Error('正文已发生变化，请重新定稿')
    const now = new Date().toISOString()
    novelStore.updateProject(task.projectId, {
      ...updates,
      chapterMeta: { ...latest.chapterMeta, [task.chapterNumber]: {
        ...latest.chapterMeta?.[task.chapterNumber], status: 'finalized', updatedAt: now,
        finalizedAt: now, memoryUpdatedAt: now, memoryError: null, consistencyCheck: consistencyReport
      } }
    })
    flushDraft()
    try { removeChapterDraft(localStorage, task.projectId, task.chapterNumber) } catch { /* Saved chapter remains authoritative. */ }
    message.success(`第 ${task.chapterNumber} 章已保存并定稿`)
    generateChapterGraphData(task.chapterNumber, task.content, task.projectId)
    if (task.chapterNumber < task.project.numberOfChapters) restoreChapter(task.chapterNumber + 1)
  } catch (error) {
    if (!isCurrentTask(task)) return
    if (contentSaved) {
      const latest = novelStore.projects.find(p => p.id === task.projectId)
      if (latest?.chapters?.[task.chapterNumber] === task.content) {
        try { saveTaskContent(task, 'memory_failed', { memoryError: error.message }) } catch { /* Draft still provides recovery. */ }
      }
    }
    message.error((contentSaved ? '正文已保存，定稿未完成，可重试：' : '保存失败，草稿仍保留：') + error.message)
  } finally { finishTask(task) }
}

// Quick save without finalize - 快速保存（不定稿）
function handleQuickSave() {
  if (isWorking.value) return
  if (!chapterContent.value.trim()) { message.warning('章节内容为空'); return }
  if (!flushDraft()) { message.error(draftError.value); return }
  const previousStatus = getChapterStatus(currentChapter.value)
  const unchanged = props.project.chapters?.[currentChapter.value] === chapterContent.value
  const status = unchanged ? previousStatus : (previousStatus === 'finalized' || previousStatus === 'needs_refinalize' ? 'needs_refinalize' : 'draft')
  try {
    saveTaskContent({ projectId: props.project.id, chapterNumber: currentChapter.value, content: chapterContent.value }, status)
    message.success(status === 'finalized' ? '已保存' : '正文已保存，可继续定稿更新记忆')
  } catch (error) { message.error('保存失败，草稿仍保留：' + error.message) }
}

// Enrich chapter - 扩写章节
async function handleEnrich() {
  if (!chapterContent.value.trim()) { message.warning('请先生成或输入章节内容'); return }
  if (!settings.apiConfig.apiKey) { message.warning(t('messages.pleaseConfigureApiKey')); return }
  const task = startTask()
  if (!task) return
  try {
    const enriched = await enrichChapter(task.content, task.project.wordNumber, taskConfig('enrich', task),
      step => { if (isCurrentTask(task)) generationStep.value = step },
      (chunk, fullContent) => { if (isCurrentTask(task)) chapterContent.value = fullContent })
    if (!isCurrentTask(task)) return
    chapterContent.value = enriched
    if (flushDraft()) message.success('扩写完成，草稿已自动暂存')
  } catch (error) {
    if (isCurrentTask(task)) message.error('扩写未完成，已保留当前正文：' + error.message)
  } finally { finishTask(task) }
}

// Generate chapter relation graph - 生成章节关系图谱
async function generateChapterGraphData(chapterNum, chapterText, projectId) {
  const graphProject = novelStore.projects.find(p => p.id === projectId)
  if (!graphProject) return
  try {
    graphGenerating.value = true
    graphStep.value = '正在提取本章人物关系...'

    const graphResult = await generateChapterGraph(
      graphProject,
      chapterNum,
      chapterText,
      settings.getStageConfig('architecture'),
      (step) => { graphStep.value = step }
    )

    const latest = novelStore.projects.find(p => p.id === projectId)
    if (!latest || latest.chapters?.[chapterNum] !== chapterText) return
    const updatedChapterGraphs = { ...latest.chapterGraphs, [chapterNum]: graphResult }
    novelStore.updateProject(projectId, { chapterGraphs: updatedChapterGraphs })
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
restoreChapter(nextChapterToWrite.value)
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
          <div class="flex items-center gap-2 text-sm">
            <span class="font-medium text-gray-500 dark:text-gray-400">已保存 {{ writtenChaptersCount }}</span>
            <span class="text-gray-300 dark:text-gray-600">/</span>
            <span class="font-bold text-gray-800 dark:text-white">已定稿 {{ finalizedChaptersCount }} / {{ project.numberOfChapters }}</span>
          </div>
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
                :aria-disabled="isWorking"
              >
                <div class="flex items-center justify-between">
                  <span class="text-sm font-medium text-gray-800 dark:text-white truncate flex-1">
                    第{{ ch.number }}章
                  </span>
                  <CheckmarkCircleOutline v-if="getChapterStatus(ch.number) === 'finalized'" class="w-5 h-5 text-green-500 ml-2" />
                  <WarningOutline v-else-if="getChapterStatus(ch.number) === 'needs_refinalize'" class="w-5 h-5 text-amber-500 ml-2" />
                </div>
                <div class="flex items-center gap-2 mt-1">
                  <p class="text-xs text-gray-500 dark:text-gray-400 truncate flex-1">{{ ch.title }}</p>
                  <n-tag
                    v-if="getChapterStatus(ch.number) !== 'empty'"
                    size="tiny"
                    :type="getStatusType(getChapterStatus(ch.number))"
                    :bordered="false"
                    round
                  >
                    {{ getStatusLabel(getChapterStatus(ch.number)) }}
                  </n-tag>
                </div>
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
                <n-tag :type="getStatusType(currentChapterStatus)" size="small" :bordered="false" round>
                  {{ getStatusLabel(currentChapterStatus) }}
                </n-tag>
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
          <div v-if="isWorking" class="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-4 border border-indigo-200/50 dark:border-indigo-700/50">
            <div class="flex items-center gap-3">
              <ReloadOutline class="w-5 h-5 text-indigo-500 animate-spin" />
              <span class="text-indigo-700 dark:text-indigo-300 font-medium">{{ generationStep || '处理中...' }}</span>
            </div>
          </div>

          <n-button v-if="activeTask" @click="cancelTask" secondary>停止生成并保留草稿</n-button>
          <p role="status" class="text-sm" :class="draftError ? 'text-red-500' : 'text-gray-500'">
            {{ draftError || (draftDirty ? '正在自动暂存草稿…' : draftSavedAt ? '草稿已自动暂存到本浏览器' : '编辑后将自动暂存草稿') }}
          </p>
          <p v-if="currentChapterStatus === 'memory_failed'" class="text-sm text-amber-600">
            正文已保存，记忆更新尚未完成。点击“重试定稿”后再继续下一章。
          </p>
          <!-- Action buttons - 操作按钮 -->
          <div class="flex items-center gap-2 flex-wrap">
            <n-button type="primary" :loading="isWorking" @click="handleGenerate">
              <template #icon>
                <n-icon><SparklesOutline /></n-icon>
              </template>
              生成草稿
            </n-button>
            <n-button :disabled="isWorking || !chapterContent" @click="handleEnrich" secondary>
              <template #icon>
                <n-icon><PencilOutline /></n-icon>
              </template>
              扩写
            </n-button>
            <div class="flex-1"></div>
            <n-button :disabled="isWorking || !chapterContent" @click="handleQuickSave" tertiary>
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
            <n-button type="success" :loading="isWorking" :disabled="isWorking || !chapterContent" @click="handleSaveAndFinalize">
              <template #icon>
                <n-icon><CheckmarkOutline /></n-icon>
              </template>
              {{ currentChapterStatus === 'memory_failed' ? '重试定稿' : '保存并定稿' }}
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
            :readonly="isWorking"
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
