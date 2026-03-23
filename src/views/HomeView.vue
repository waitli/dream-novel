<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useNovelStore } from '../stores/novel'
import { useSettingsStore } from '../stores/settings'
import { useI18n } from '../i18n'
import { useMessage, useDialog, NButton, NIcon } from 'naive-ui'
import { AddOutline, DocumentTextOutline, RocketOutline, PersonOutline, TrendingUpOutline } from '@vicons/ionicons5'
import CreateProjectDialog from '../components/CreateProjectDialog.vue'
import ProjectCard from '../components/ProjectCard.vue'

const router = useRouter()
const novelStore = useNovelStore()
const settings = useSettingsStore()
const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()

const showCreateDialog = ref(false)

// Delete project with confirmation
async function handleDelete(project) {
  dialog.warning({
    title: t('home.deleteConfirm'),
    content: t('home.deleteConfirmMsg', { title: project.title }),
    positiveText: t('common.delete'),
    negativeText: t('common.cancel'),
    onPositiveClick: () => {
      novelStore.deleteProject(project.id)
      message.success(t('home.deleteSuccess'))
    }
  })
}

// Open project
function openProject(project) {
  router.push(`/project/${project.id}`)
}
</script>

<template>
  <div class="max-w-6xl mx-auto">
    <!-- Hero Section -->
    <div class="text-center py-16 mb-8">
      <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-sm font-medium mb-6">
        <RocketOutline class="w-4 h-4" />
        {{ t('app.description') }}
      </div>
      <h1 class="text-5xl font-bold mb-6 bg-gradient-to-r from-gray-900 via-indigo-800 to-purple-800 dark:from-white dark:via-indigo-200 dark:to-purple-200 bg-clip-text text-transparent">
        {{ t('app.name') }}
      </h1>
      <p class="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
        {{ t('app.tagline') }}
      </p>
      
      <!-- Quick start button -->
      <n-button 
        type="primary" 
        size="large"
        @click="showCreateDialog = true"
        class="!px-8 !h-12 !text-base"
      >
        <template #icon>
          <n-icon><AddOutline /></n-icon>
        </template>
        {{ t('home.createProject') }}
      </n-button>
    </div>

    <!-- Projects Grid -->
    <div v-if="novelStore.hasProjects" class="mb-12">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-bold text-gray-800 dark:text-white">
          {{ t('home.myProjects') }}
          <span class="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
            ({{ novelStore.projectList.length }})
          </span>
        </h2>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ProjectCard
          v-for="project in novelStore.projectList"
          :key="project.id"
          :project="project"
          @click="openProject(project)"
          @delete="handleDelete(project)"
        />
      </div>
    </div>

    <!-- Empty State -->
    <div 
      v-else 
      class="text-center py-20 bg-white dark:bg-[#1f1f23] rounded-2xl border border-gray-200/80 dark:border-gray-700/50"
    >
      <div class="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
        <DocumentTextOutline class="w-12 h-12 text-gray-400 dark:text-gray-500" />
      </div>
      <h3 class="text-xl font-semibold text-gray-800 dark:text-white mb-2">{{ t('home.noProjects') }}</h3>
      <p class="text-gray-500 dark:text-gray-400 mb-6">{{ t('home.noProjectsHint') }}</p>
    </div>

    <!-- Features Section -->
    <div class="mt-20 mb-12">
      <h2 class="text-2xl font-bold text-center text-gray-800 dark:text-white mb-10">{{ t('features.title') }}</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="bg-white dark:bg-[#1f1f23] rounded-2xl p-6 border border-gray-200/80 dark:border-gray-700/50 hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-300 dark:hover:border-indigo-600/50 transition-all duration-300 group">
          <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center mb-5 shadow-lg shadow-indigo-500/25 group-hover:scale-110 transition-transform">
            <RocketOutline class="w-7 h-7 text-white" />
          </div>
          <h3 class="text-lg font-bold text-gray-800 dark:text-white mb-3">{{ t('features.snowflake.title') }}</h3>
          <p class="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
            {{ t('features.snowflake.description') }}
          </p>
        </div>

        <div class="bg-white dark:bg-[#1f1f23] rounded-2xl p-6 border border-gray-200/80 dark:border-gray-700/50 hover:shadow-xl hover:shadow-purple-500/5 hover:border-purple-300 dark:hover:border-purple-600/50 transition-all duration-300 group">
          <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mb-5 shadow-lg shadow-purple-500/25 group-hover:scale-110 transition-transform">
            <PersonOutline class="w-7 h-7 text-white" />
          </div>
          <h3 class="text-lg font-bold text-gray-800 dark:text-white mb-3">{{ t('features.characterArc.title') }}</h3>
          <p class="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
            {{ t('features.characterArc.description') }}
          </p>
        </div>

        <div class="bg-white dark:bg-[#1f1f23] rounded-2xl p-6 border border-gray-200/80 dark:border-gray-700/50 hover:shadow-xl hover:shadow-rose-500/5 hover:border-rose-300 dark:hover:border-rose-600/50 transition-all duration-300 group">
          <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-rose-500 to-orange-600 flex items-center justify-center mb-5 shadow-lg shadow-rose-500/25 group-hover:scale-110 transition-transform">
            <TrendingUpOutline class="w-7 h-7 text-white" />
          </div>
          <h3 class="text-lg font-bold text-gray-800 dark:text-white mb-3">{{ t('features.suspenseCurve.title') }}</h3>
          <p class="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
            {{ t('features.suspenseCurve.description') }}
          </p>
        </div>
      </div>
    </div>

    <!-- Create Project Dialog -->
    <CreateProjectDialog v-model="showCreateDialog" />
  </div>
</template>
