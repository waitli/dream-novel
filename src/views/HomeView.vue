<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useNovelStore } from '../stores/novel'
import { useSettingsStore } from '../stores/settings'
import { useI18n } from '../i18n'
import { useSeo } from '../composables/useSeo'
import { useMessage, useDialog, NButton, NIcon, NAlert } from 'naive-ui'
import {
  AddOutline,
  DocumentTextOutline,
  RocketOutline,
  PersonOutline,
  TrendingUpOutline,
  CloudOutline,
  ShieldCheckmarkOutline,
  SaveOutline
} from '@vicons/ionicons5'
import CreateProjectDialog from '../components/CreateProjectDialog.vue'
import ProjectCard from '../components/ProjectCard.vue'

const router = useRouter()
const novelStore = useNovelStore()
const settings = useSettingsStore()
const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()

const showCreateDialog = ref(false)
const showSecurityBanner = ref(true)
const SITE_URL = new URL('/', import.meta.env.VITE_SITE_URL || 'https://novel.waitli.top').toString()

const isZh = computed(() => settings.locale === 'zh-CN')

const copy = computed(() => {
  const zh = isZh.value

  return {
    heroBadge: zh ? '面向长篇小说创作的浏览器工具' : 'Browser-based long-form fiction workspace',
    heroTitle: zh ? '把灵感变成可执行的小说生产流程' : 'Turn one idea into a structured novel workflow',
    heroLead: zh
      ? '从一句核心创意开始，生成小说架构、角色关系、章节大纲和正文草稿。项目保存在浏览器本地，适合长期连载、个人创作和小团队协作。'
      : 'Start from a core idea, then generate architecture, character relationships, chapter outlines, and draft chapters. Projects stay in your browser, which fits serial fiction, solo writing, and small teams.',
    heroPoints: zh
      ? [
          {
            title: '本地优先',
            description: 'API Key 和项目数据保存在浏览器，不依赖中心化数据库。'
          },
          {
            title: '一条工作流',
            description: '从架构、蓝图到章节，按创作顺序推进，不会丢上下文。'
          },
          {
            title: '可直接发布',
            description: '支持 TXT / Markdown 导出，方便整理、发布和二次编辑。'
          }
        ]
      : [
          {
            title: 'Local-first',
            description: 'API keys and project data stay in your browser, without a central database.'
          },
          {
            title: 'One workflow',
            description: 'Move from architecture to outline to chapter drafts without losing context.'
          },
          {
            title: 'Ready to publish',
            description: 'Export to TXT / Markdown for editing, publishing, and reuse.'
          }
        ],
    valueTitle: zh ? '为什么它更像一个产品页，而不是一个空白编辑器' : 'Why this reads like a product page, not a blank editor',
    valueIntro: zh
      ? '搜索引擎更容易理解“它解决什么问题、适合谁、如何使用、会产出什么结果”。'
      : 'Search engines can more easily understand what it solves, who it is for, how it works, and what outputs it creates.',
    valueProps: zh
      ? [
          {
            icon: CloudOutline,
            title: '浏览器即工作台',
            description: '无需安装桌面软件，打开页面就能开始写作和生成内容。'
          },
          {
            icon: ShieldCheckmarkOutline,
            title: '隐私友好',
            description: '配置的 API Key 不会上传到服务端，减少敏感信息暴露面。'
          },
          {
            icon: RocketOutline,
            title: '从种子到章节',
            description: '先搭小说架构，再扩成章节蓝图，最后生成具体章节正文。'
          },
          {
            icon: DocumentTextOutline,
            title: '便于整理输出',
            description: '支持导出和复用，适合存档、发布或接入其他编辑流程。'
          }
        ]
      : [
          {
            icon: CloudOutline,
            title: 'Browser as the workspace',
            description: 'No desktop install is needed. Open the page and start generating.'
          },
          {
            icon: ShieldCheckmarkOutline,
            title: 'Privacy-aware',
            description: 'Configured API keys never need to be stored on your server.'
          },
          {
            icon: RocketOutline,
            title: 'From seed to chapters',
            description: 'Build architecture first, expand into outlines, then generate the chapters.'
          },
          {
            icon: DocumentTextOutline,
            title: 'Easy to export',
            description: 'Export and reuse the content for publishing, archiving, or editing.'
          }
        ],
    workflowTitle: zh ? '三步完成小说生产流程' : 'Three steps to a full fiction workflow',
    workflowIntro: zh
      ? '把“想写一本小说”拆成清晰的产品流程，搜索引擎也更容易识别页面主题。'
      : 'Break “I want to write a novel” into a clear product workflow that search engines can understand.',
    workflowSteps: zh
      ? [
          {
            step: '01',
            title: '输入核心创意',
            description: '先写项目名、题材和一句话脑洞，给 AI 一个明确的创作起点。'
          },
          {
            step: '02',
            title: '生成架构与蓝图',
            description: '扩展世界观、角色关系、冲突线和章节骨架，形成可执行的大纲。'
          },
          {
            step: '03',
            title: '逐章生成与导出',
            description: '按章节继续生成正文，必要时回到架构修改，然后导出为文件。'
          }
        ]
      : [
          {
            step: '01',
            title: 'Enter the core idea',
            description: 'Start with a title, genre, and one-sentence concept to anchor generation.'
          },
          {
            step: '02',
            title: 'Generate architecture and outline',
            description: 'Expand the world, characters, conflicts, and chapter skeleton into a plan.'
          },
          {
            step: '03',
            title: 'Generate chapters and export',
            description: 'Draft chapters, revise the plan if needed, and export to files.'
          }
        ],
    audienceTitle: zh ? '适合哪些创作者' : 'Who it is for',
    audienceIntro: zh
      ? '用产品语言说明目标用户，比只写“AI 小说生成器”更容易被搜索引擎理解。'
      : 'Naming the target user segments is clearer for both readers and search engines.',
    audiences: zh
      ? [
          {
            title: '网文连载作者',
            description: '需要稳定产出章节、保持节奏和持续更新的个人作者。'
          },
          {
            title: '长篇小说创作者',
            description: '希望在开写前就把角色、世界观和结构理顺的创作者。'
          },
          {
            title: '内容与产品团队',
            description: '需要快速验证创意、生成样稿或做内部内容原型的团队。'
          }
        ]
      : [
          {
            title: 'Serial fiction writers',
            description: 'Writers who need a steady chapter cadence and a repeatable workflow.'
          },
          {
            title: 'Long-form novel authors',
            description: 'Creators who want to sort out characters, world-building, and structure early.'
          },
          {
            title: 'Content and product teams',
            description: 'Teams that need quick idea validation, sample drafts, or internal prototypes.'
          }
        ],
    faqTitle: zh ? '常见问题' : 'Frequently asked questions',
    faqIntro: zh
      ? 'FAQ 内容本身就是搜索引擎很容易理解的产品说明。'
      : 'FAQ content is one of the clearest ways to explain a product to search engines.',
    faq: zh
      ? [
          {
            question: '这是一个需要安装的软件吗？',
            answer: '不需要。它是运行在浏览器里的 Cloudflare 静态站点，打开网页就能用。'
          },
          {
            question: '我的 API Key 会被上传到服务器吗？',
            answer: '不会。项目采用本地保存策略，API Key 和项目数据都保留在你的浏览器里。'
          },
          {
            question: '它支持哪些小说类型？',
            answer: '可以用于玄幻、仙侠、都市、悬疑、科幻、言情等多种长篇创作场景。'
          },
          {
            question: '能导出成文件吗？',
            answer: '可以，支持导出 TXT 和 Markdown，便于后续编辑、发布和归档。'
          }
        ]
      : [
          {
            question: 'Do I need to install anything?',
            answer: 'No. It is a Cloudflare-hosted static web app, so you can use it directly in the browser.'
          },
          {
            question: 'Is my API key uploaded to a server?',
            answer: 'No. The project uses a local-first approach, so your API key and data stay in the browser.'
          },
          {
            question: 'What genres does it support?',
            answer: 'It works well for fantasy, xianxia, urban fiction, mystery, sci-fi, romance, and more.'
          },
          {
            question: 'Can I export the result?',
            answer: 'Yes. TXT and Markdown export are supported for editing, publishing, and archiving.'
          }
        ]
  }
})

const seoTitle = computed(() =>
  isZh.value
    ? `${t('app.name')} | 长篇小说创作工作台`
    : `${t('app.name')} | Novel writing workspace`
)
const seoDescription = computed(() =>
  isZh.value
    ? 'AI 小说生成器，支持从核心创意生成小说架构、角色关系、章节大纲和正文草稿的浏览器创作工作台。'
    : 'AI novel generator for turning one idea into architecture, character relationships, chapter outlines, and draft chapters in the browser.'
)

const seoSchema = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: t('app.name'),
  applicationCategory: 'WritingApplication',
  operatingSystem: 'Web',
  url: SITE_URL,
  description: seoDescription.value,
  inLanguage: ['zh-CN', 'en-US'],
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD'
  },
  featureList: isZh.value
    ? ['小说架构生成', '章节蓝图', '正文生成', 'TXT 和 Markdown 导出', '本地优先存储']
    : ['Novel architecture generation', 'Chapter outlines', 'Chapter drafting', 'TXT and Markdown export', 'Local-first storage']
}))

const faqSchema = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: copy.value.faq.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer
    }
  }))
}))

const pageSchema = computed(() => [seoSchema.value, faqSchema.value])

useSeo({
  title: seoTitle,
  description: seoDescription,
  path: '/',
  lang: computed(() => settings.locale),
  noindex: false,
  schema: pageSchema
})

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

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

function openProject(project) {
  router.push(`/project/${project.id}`)
}
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-20">
    <n-alert
      v-if="showSecurityBanner"
      type="success"
      :title="settings.locale === 'zh-CN' ? '🔒 安全提示' : '🔒 Security Notice'"
      closable
      @close="showSecurityBanner = false"
      class="mb-2"
    >
      {{ t('security.banner') }}
      <div class="flex flex-wrap items-center gap-4 mt-3 text-sm opacity-80">
        <span class="flex items-center gap-1">
          <CloudOutline class="w-4 h-4" />
          {{ settings.locale === 'zh-CN' ? 'Cloudflare 部署' : 'Cloudflare deployed' }}
        </span>
        <span class="flex items-center gap-1">
          <ShieldCheckmarkOutline class="w-4 h-4" />
          {{ settings.locale === 'zh-CN' ? '纯静态项目' : 'Pure static site' }}
        </span>
        <span class="flex items-center gap-1">
          <SaveOutline class="w-4 h-4" />
          {{ settings.locale === 'zh-CN' ? '数据本地存储' : 'Local storage only' }}
        </span>
      </div>
    </n-alert>

    <section
      class="relative overflow-hidden rounded-[2rem] border border-gray-200/80 dark:border-gray-700/60 bg-white dark:bg-[#17171b] shadow-[0_24px_80px_rgba(15,23,42,0.08)]"
    >
      <div class="absolute inset-0 pointer-events-none">
        <div class="absolute -top-24 -right-16 h-72 w-72 rounded-full bg-indigo-400/10 blur-3xl"></div>
        <div class="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-rose-400/10 blur-3xl"></div>
      </div>

      <div class="relative grid gap-10 lg:grid-cols-[1.15fr_0.85fr] p-8 md:p-12">
        <div class="flex flex-col justify-center">
          <div
            class="inline-flex items-center gap-2 w-fit px-4 py-2 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 text-sm font-medium mb-6"
          >
            <RocketOutline class="w-4 h-4" />
            {{ copy.heroBadge }}
          </div>
          <h1 class="text-4xl md:text-6xl font-bold tracking-tight text-gray-950 dark:text-white leading-tight">
            {{ copy.heroTitle }}
          </h1>
          <p class="mt-6 text-lg text-gray-600 dark:text-gray-300 max-w-2xl leading-relaxed">
            {{ copy.heroLead }}
          </p>

          <div class="flex flex-wrap gap-3 mt-8">
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
            <n-button tertiary size="large" class="!px-6 !h-12 !text-base" @click="scrollToSection('how-it-works')">
              {{ isZh ? '查看工作流' : 'See the workflow' }}
            </n-button>
          </div>

          <div class="grid gap-3 sm:grid-cols-3 mt-10">
            <div
              v-for="point in copy.heroPoints"
              :key="point.title"
              class="rounded-2xl border border-gray-200/80 dark:border-gray-700/60 bg-gray-50/80 dark:bg-white/5 p-4"
            >
              <div class="text-sm font-semibold text-gray-900 dark:text-white">{{ point.title }}</div>
              <div class="mt-1 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                {{ point.description }}
              </div>
            </div>
          </div>
        </div>

        <div class="relative">
          <div class="rounded-[1.75rem] border border-gray-200/80 dark:border-gray-700/60 bg-gradient-to-br from-gray-950 to-slate-800 text-white p-6 md:p-8 shadow-2xl">
            <div class="flex items-center justify-between gap-4 mb-6">
              <div>
                <div class="text-xs uppercase tracking-[0.24em] text-white/60">
                  {{ isZh ? '产品流程' : 'Product flow' }}
                </div>
                <div class="mt-2 text-2xl font-semibold">
                  {{ isZh ? '把创意拆成可执行步骤' : 'Turn ideas into executable steps' }}
                </div>
              </div>
              <div class="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                <DocumentTextOutline class="w-6 h-6 text-indigo-200" />
              </div>
            </div>

            <div class="space-y-4">
              <div
                v-for="item in copy.workflowSteps"
                :key="item.step"
                class="rounded-2xl bg-white/6 border border-white/10 p-4"
              >
                <div class="flex items-center justify-between gap-4">
                  <span class="text-sm font-medium text-indigo-200">{{ item.step }}</span>
                  <span class="text-xs uppercase tracking-[0.24em] text-white/40">
                    {{ isZh ? '创作管线' : 'Pipeline' }}
                  </span>
                </div>
                <div class="mt-2 text-lg font-semibold">{{ item.title }}</div>
                <div class="mt-2 text-sm leading-relaxed text-white/72">{{ item.description }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section id="product-value">
      <div class="max-w-3xl">
        <h2 class="text-2xl md:text-3xl font-bold text-gray-950 dark:text-white">
          {{ copy.valueTitle }}
        </h2>
        <p class="mt-3 text-gray-600 dark:text-gray-300 leading-relaxed">
          {{ copy.valueIntro }}
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mt-8">
        <article
          v-for="item in copy.valueProps"
          :key="item.title"
          class="rounded-3xl border border-gray-200/80 dark:border-gray-700/60 bg-white dark:bg-[#1f1f23] p-6 shadow-sm hover:shadow-lg transition-shadow"
        >
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center mb-5 shadow-lg shadow-indigo-500/20">
            <n-icon size="28" class="text-white">
              <component :is="item.icon" />
            </n-icon>
          </div>
          <h3 class="text-lg font-bold text-gray-950 dark:text-white">{{ item.title }}</h3>
          <p class="mt-3 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            {{ item.description }}
          </p>
        </article>
      </div>
    </section>

    <section id="how-it-works" class="scroll-mt-24">
      <div class="max-w-3xl">
        <h2 class="text-2xl md:text-3xl font-bold text-gray-950 dark:text-white">
          {{ copy.workflowTitle }}
        </h2>
        <p class="mt-3 text-gray-600 dark:text-gray-300 leading-relaxed">
          {{ copy.workflowIntro }}
        </p>
      </div>

      <div class="grid gap-6 lg:grid-cols-3 mt-8">
        <div
          v-for="item in copy.workflowSteps"
          :key="`${item.step}-${item.title}`"
          class="rounded-3xl border border-gray-200/80 dark:border-gray-700/60 bg-white dark:bg-[#1f1f23] p-6"
        >
          <div class="text-sm font-semibold text-indigo-600 dark:text-indigo-400">{{ item.step }}</div>
          <h3 class="mt-3 text-xl font-bold text-gray-950 dark:text-white">{{ item.title }}</h3>
          <p class="mt-4 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            {{ item.description }}
          </p>
        </div>
      </div>
    </section>

    <section id="audience">
      <div class="max-w-3xl">
        <h2 class="text-2xl md:text-3xl font-bold text-gray-950 dark:text-white">
          {{ copy.audienceTitle }}
        </h2>
        <p class="mt-3 text-gray-600 dark:text-gray-300 leading-relaxed">
          {{ copy.audienceIntro }}
        </p>
      </div>

      <div class="grid gap-6 md:grid-cols-3 mt-8">
        <div
          v-for="item in copy.audiences"
          :key="item.title"
          class="rounded-3xl border border-gray-200/80 dark:border-gray-700/60 bg-white dark:bg-[#1f1f23] p-6"
        >
          <div class="flex items-center gap-3 mb-4">
            <div class="w-11 h-11 rounded-2xl bg-gray-100 dark:bg-white/10 flex items-center justify-center">
              <PersonOutline class="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </div>
            <h3 class="text-lg font-bold text-gray-950 dark:text-white">{{ item.title }}</h3>
          </div>
          <p class="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            {{ item.description }}
          </p>
        </div>
      </div>
    </section>

    <section id="projects" class="scroll-mt-24">
      <div class="flex items-end justify-between gap-4 mb-6">
        <div>
          <h2 class="text-2xl font-bold text-gray-950 dark:text-white">
            {{ t('home.myProjects') }}
            <span class="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
              ({{ novelStore.projectList.length }})
            </span>
          </h2>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
            {{ isZh ? '你本地保存的小说工作区' : 'Your locally saved novel workspace' }}
          </p>
        </div>
      </div>

      <div v-if="novelStore.hasProjects" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ProjectCard
          v-for="project in novelStore.projectList"
          :key="project.id"
          :project="project"
          @click="openProject(project)"
          @delete="handleDelete(project)"
        />
      </div>

      <div
        v-else
        class="text-center py-16 bg-white dark:bg-[#1f1f23] rounded-3xl border border-gray-200/80 dark:border-gray-700/50"
      >
        <div class="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
          <DocumentTextOutline class="w-12 h-12 text-gray-400 dark:text-gray-500" />
        </div>
        <h3 class="text-xl font-semibold text-gray-800 dark:text-white mb-2">{{ t('home.noProjects') }}</h3>
        <p class="text-gray-500 dark:text-gray-400 mb-6">{{ t('home.noProjectsHint') }}</p>
        <n-button type="primary" size="large" @click="showCreateDialog = true">
          <template #icon>
            <n-icon><AddOutline /></n-icon>
          </template>
          {{ t('home.createProject') }}
        </n-button>
      </div>
    </section>

    <section id="features">
      <div class="max-w-3xl">
        <h2 class="text-2xl md:text-3xl font-bold text-gray-950 dark:text-white">{{ t('features.title') }}</h2>
        <p class="mt-3 text-gray-600 dark:text-gray-300 leading-relaxed">
          {{ isZh ? '这些功能让首页更像一个能被搜索引擎理解的真实产品页。' : 'These capabilities make the homepage read like a real product page search engines can understand.' }}
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div class="bg-white dark:bg-[#1f1f23] rounded-3xl p-6 border border-gray-200/80 dark:border-gray-700/50 hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-300 dark:hover:border-indigo-600/50 transition-all duration-300 group">
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center mb-5 shadow-lg shadow-indigo-500/25 group-hover:scale-110 transition-transform">
            <RocketOutline class="w-7 h-7 text-white" />
          </div>
          <h3 class="text-lg font-bold text-gray-800 dark:text-white mb-3">{{ t('features.snowflake.title') }}</h3>
          <p class="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
            {{ t('features.snowflake.description') }}
          </p>
        </div>

        <div class="bg-white dark:bg-[#1f1f23] rounded-3xl p-6 border border-gray-200/80 dark:border-gray-700/50 hover:shadow-xl hover:shadow-purple-500/5 hover:border-purple-300 dark:hover:border-purple-600/50 transition-all duration-300 group">
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mb-5 shadow-lg shadow-purple-500/25 group-hover:scale-110 transition-transform">
            <PersonOutline class="w-7 h-7 text-white" />
          </div>
          <h3 class="text-lg font-bold text-gray-800 dark:text-white mb-3">{{ t('features.characterArc.title') }}</h3>
          <p class="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
            {{ t('features.characterArc.description') }}
          </p>
        </div>

        <div class="bg-white dark:bg-[#1f1f23] rounded-3xl p-6 border border-gray-200/80 dark:border-gray-700/50 hover:shadow-xl hover:shadow-rose-500/5 hover:border-rose-300 dark:hover:border-rose-600/50 transition-all duration-300 group">
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-600 flex items-center justify-center mb-5 shadow-lg shadow-rose-500/25 group-hover:scale-110 transition-transform">
            <TrendingUpOutline class="w-7 h-7 text-white" />
          </div>
          <h3 class="text-lg font-bold text-gray-800 dark:text-white mb-3">{{ t('features.suspenseCurve.title') }}</h3>
          <p class="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
            {{ t('features.suspenseCurve.description') }}
          </p>
        </div>
      </div>
    </section>

    <section id="faq">
      <div class="max-w-3xl">
        <h2 class="text-2xl md:text-3xl font-bold text-gray-950 dark:text-white">
          {{ copy.faqTitle }}
        </h2>
        <p class="mt-3 text-gray-600 dark:text-gray-300 leading-relaxed">
          {{ copy.faqIntro }}
        </p>
      </div>

      <div class="grid gap-4 mt-8">
        <details
          v-for="item in copy.faq"
          :key="item.question"
          class="group rounded-3xl border border-gray-200/80 dark:border-gray-700/60 bg-white dark:bg-[#1f1f23] p-6"
        >
          <summary class="cursor-pointer list-none flex items-center justify-between gap-6 text-left">
            <span class="text-lg font-semibold text-gray-950 dark:text-white">{{ item.question }}</span>
            <span class="text-gray-400 group-open:rotate-45 transition-transform text-2xl leading-none">+</span>
          </summary>
          <p class="mt-4 text-sm text-gray-600 dark:text-gray-300 leading-relaxed max-w-4xl">
            {{ item.answer }}
          </p>
        </details>
      </div>
    </section>

    <section
      class="rounded-[2rem] border border-gray-200/80 dark:border-gray-700/60 bg-gradient-to-r from-gray-950 via-slate-900 to-indigo-950 text-white px-8 py-10 md:px-12 md:py-14"
    >
      <div class="max-w-3xl">
        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-sm font-medium mb-5">
          <RocketOutline class="w-4 h-4" />
          {{ isZh ? '开始创作' : 'Start creating' }}
        </div>
        <h2 class="text-3xl md:text-4xl font-bold tracking-tight">
          {{ isZh ? '把下一本小说先变成清晰的结构，再交给 AI 继续写。' : 'Turn the next novel into a clear structure first, then let AI continue writing.' }}
        </h2>
        <p class="mt-4 text-white/75 text-base md:text-lg leading-relaxed">
          {{ isZh ? '如果你想要的不只是“生成一段文本”，而是一套能持续迭代的小说创作流程，这个首页应该先讲清楚它是什么、怎么用、能产出什么。' : 'If you need more than “generate a paragraph” and want a workflow that can evolve over time, the homepage should clearly explain what it is, how it works, and what it produces.' }}
        </p>
        <div class="flex flex-wrap gap-3 mt-8">
          <n-button type="primary" size="large" @click="showCreateDialog = true" class="!px-8 !h-12 !text-base">
            <template #icon>
              <n-icon><AddOutline /></n-icon>
            </template>
            {{ t('home.createProject') }}
          </n-button>
          <n-button tertiary size="large" class="!px-6 !h-12 !text-base" @click="scrollToSection('product-value')">
            {{ isZh ? '返回上方说明' : 'Back to the explanation' }}
          </n-button>
        </div>
      </div>
    </section>

    <CreateProjectDialog v-model="showCreateDialog" />
  </div>
</template>
