<script setup>
import { computed } from 'vue'
import { useI18n } from '../i18n'
import { NButton, NProgress, NTag } from 'naive-ui'
import { TrashOutline, ArrowForwardOutline } from '@vicons/ionicons5'

const props = defineProps({
  project: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['click', 'delete'])
const { t } = useI18n()

// Genre label mapping
const genreLabels = {
  fantasy: 'genres.fantasy',
  xianxia: 'genres.xianxia',
  urban: 'genres.urban',
  historical: 'genres.historical',
  sciFi: 'genres.sciFi',
  game: 'genres.game',
  mystery: 'genres.mystery',
  magic: 'genres.magic',
  wuxia: 'genres.wuxia',
  romance: 'genres.romance',
  military: 'genres.military',
  sports: 'genres.sports',
  supernatural: 'genres.supernatural',
  anime: 'genres.anime',
  other: 'genres.other'
}

// Format date
function formatDate(dateStr) {
  const date = new Date(dateStr)
  const locale = localStorage.getItem('locale') || 'zh-CN'
  return date.toLocaleDateString(locale === 'zh-CN' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Get status info
const statusInfo = computed(() => {
  if (props.project.blueprintGenerated) {
    return { text: t('projectCard.outlineGenerated'), type: 'success' }
  }
  if (props.project.architectureGenerated) {
    return { text: t('projectCard.architectureGenerated'), type: 'warning' }
  }
  return { text: t('projectCard.pending'), type: 'info' }
})

const genreText = computed(() => {
  const genre = props.project?.genre
  if (Array.isArray(genre)) {
    return genre.map(g => t(genreLabels[g] || 'genres.other')).join(' / ')
  }
  return genre || ''
})

const coverStyle = computed(() => {
  const palettes = [['#e8dccb', '#766044'], ['#d8e2da', '#486653'], ['#e8d8d2', '#8d5c4b'], ['#dce0e6', '#54667b']]
  const hash = [...String(props.project.id)].reduce((n, c) => n + c.charCodeAt(0), 0)
  const [paper, ink] = palettes[hash % palettes.length]
  return { '--book-paper': paper, '--book-ink': ink }
})
const savedChapters = computed(() => Object.values(props.project.chapters || {}).filter(text => text.trim()).length)
// Calculate progress
const progress = computed(() => {
  let completed = 0
  if (props.project.coreSeed) completed++
  if (props.project.characterDynamics) completed++
  if (props.project.worldBuilding) completed++
  if (props.project.plotArchitecture) completed++
  if (props.project.chapterBlueprintData?.length || props.project.chapterBlueprint) completed++
  return Math.round((completed / 5) * 100)
})
</script>

<template>
  <article class="book-card" :style="coverStyle">
    <div class="book-cover"><span class="cover-category">{{ genreText }}</span><span class="cover-emblem" aria-hidden="true">✳</span><h3>{{ project.title }}</h3><span class="cover-bottom">DREAM NOVEL <span>故事 / STORY</span></span></div>
    <div class="book-details"><div class="book-title-row"><h3><button class="book-open" @click="emit('click')">{{ project.title }}</button></h3><n-button quaternary circle size="small" :aria-label="t('common.delete') + ' ' + project.title" class="book-delete" @click="emit('delete')"><template #icon><TrashOutline /></template></n-button></div>
      <p class="book-topic">{{ project.topic }}</p>
      <div class="book-progress-label"><span>{{ t('projectCard.progress') }}</span><span>{{ progress }}%</span></div>
      <n-progress type="line" :percentage="progress" :height="3" :show-indicator="false" :border-radius="3" />
      <div class="book-meta"><n-tag :type="statusInfo.type" size="small" :bordered="false">{{ statusInfo.text }}</n-tag><span>{{ savedChapters }} / {{ project.numberOfChapters }} {{ t('projectCard.chapters') }}</span></div>
      <div class="book-footer"><time :datetime="project.updatedAt">{{ formatDate(project.updatedAt) }}</time><ArrowForwardOutline aria-hidden="true" /></div>
    </div>
  </article>
</template>
