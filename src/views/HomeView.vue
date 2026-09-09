<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useNovelStore } from '../stores/novel'
import { useSettingsStore } from '../stores/settings'
import { useI18n } from '../i18n'
import { useSeo } from '../composables/useSeo'
import { useMessage, useDialog, NButton, NInput } from 'naive-ui'
import {
  AddOutline,
  DocumentTextOutline,
  ShieldCheckmarkOutline
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
const SITE_URL = new URL('/', import.meta.env.VITE_SITE_URL || 'https://novel.waitli.top').toString()

const isZh = computed(() => settings.locale === 'zh-CN')

const search = ref('')
const visibleProjects = computed(() => [...novelStore.projectList]
  .filter(p => (p.title + ' ' + p.topic).toLowerCase().includes(search.value.trim().toLowerCase()))
  .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)))
const totalWords = computed(() => novelStore.projectList.reduce((sum, p) => sum + Object.values(p.chapters || {}).reduce((n, text) => n + text.length, 0), 0).toLocaleString())
const copy = computed(() => ({
  steps: isZh.value ? [
    { title: '留下一颗故事的种子', description: '一句灵感，一个人物，或一个始终忘不掉的世界。' },
    { title: '让世界与人物成形', description: '梳理角色、冲突和章节大纲，让故事有迹可循。' },
    { title: '把故事，一章章写下去', description: '生成与打磨正文，积累章节记忆，随时导出作品。' }
  ] : [
    { title: 'Start with a story seed', description: 'An idea, a character, or a world you cannot stop imagining.' },
    { title: 'Give your world a shape', description: 'Develop characters, conflicts, and a chapter-by-chapter outline.' },
    { title: 'Write the next chapter', description: 'Draft, refine, build chapter memory, and export your work.' }
  ],
  faq: isZh.value ? [
    { question: '开始写作前需要准备什么？', answer: '在右上角 AI 设置中填写接口地址、API Key 和模型名称，再创建你的第一部作品。生成内容会消耗所配置接口的用量。' },
    { question: '我的作品保存在哪里？', answer: '作品和设置保存在当前浏览器，生成时必要的内容会发送给你配置的 AI 服务。建议定期导出正文备份，清除网站数据会删除本地作品。' },
    { question: '生成中断了，还能继续吗？', answer: '可以。架构和大纲会分步保存进度，章节草稿会自动暂存。回到作品后，可从已保存的进度继续。' },
    { question: '能导出完整作品吗？', answer: '可以。在作品的导出页选择 TXT 或 Markdown，即可导出已经保存的章节正文。' }
  ] : [
    { question: 'What do I need to get started?', answer: 'Add your endpoint, API key, and model in AI settings, then create a project. Generation uses your configured provider and may incur charges.' },
    { question: 'Where is my writing saved?', answer: 'Projects and settings stay in this browser. Relevant content is sent to your chosen AI provider when generating. Export your writing regularly; clearing site data removes local projects.' },
    { question: 'Can I resume an interrupted generation?', answer: 'Yes. Architecture and outline progress is saved in stages, and chapter drafts are saved automatically. Open your project to continue.' },
    { question: 'Can I export my novel?', answer: 'Yes. Choose TXT or Markdown from the project export tab to download your saved chapters.' }
  ]
}))

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
  <div class="home-studio">
    <section class="story-hero" aria-labelledby="hero-title">
      <div class="hero-copy">
        <p class="eyebrow"><span class="status-dot"></span> {{ isZh ? '给想象力，一个落笔的地方' : 'A PLACE FOR YOUR IMAGINATION' }}</p>
        <h1 id="hero-title">{{ isZh ? '你的故事，' : 'Your story.' }}<br><em>{{ isZh ? '值得被写下来。' : 'Waiting to be written.' }}</em></h1>
        <p class="hero-description">{{ isZh ? '从一闪而过的灵感，到有血有肉的世界。让 AI 陪你构思、铺陈、落笔，把心里的故事写成长篇。' : 'From a fleeting idea to a world that feels alive. Plan, outline, and write your novel with AI by your side.' }}</p>
        <div class="hero-actions">
          <n-button type="primary" size="large" @click="showCreateDialog = true"><template #icon><AddOutline /></template>{{ isZh ? '开始一个新故事' : 'Start a new story' }}</n-button>
          <button class="text-link" @click="scrollToSection(novelStore.hasProjects ? 'projects' : 'how-it-works')">{{ novelStore.hasProjects ? (isZh ? '继续创作' : 'Your library') : (isZh ? '了解创作流程' : 'How it works') }} <span aria-hidden="true">↗</span></button>
        </div>
        <div class="hero-footnote"><ShieldCheckmarkOutline /> {{ isZh ? '本地保存' : 'Saved locally' }} <span>·</span> {{ isZh ? '随时续写' : 'Pick up anytime' }} <span>·</span> TXT / Markdown</div>
      </div>
      <div class="manuscript-scene" aria-hidden="true">
        <div class="orbit orbit-one"></div><div class="orbit orbit-two"></div>
        <span class="scene-star">✳</span><span class="scene-caption">EVERY WORLD BEGINS WITH A WORD.</span>
        <div class="manuscript-sheet sheet-back"></div>
        <div class="manuscript-sheet sheet-front">
          <div class="paper-top"><span>DREAM NOVEL</span><span>001</span></div>
          <div class="paper-rule"></div>
          <span class="paper-chapter">{{ isZh ? '第一章 / 故事的开始' : 'CHAPTER ONE / THE BEGINNING' }}</span>
          <h2>{{ isZh ? '风起时，故事有了回声' : 'Where the wind begins' }}</h2>
          <p>{{ isZh ? '那天清晨，远山还笼罩在薄雾里。她推开那扇许久无人问津的门，仿佛推开了另一个世界。' : 'The hills were still wrapped in mist when she opened the forgotten door. Beyond it, another world was waiting.' }}</p>
          <p>{{ isZh ? '而这一切，要从一封没有署名的信说起……' : 'And it all began with an unsigned letter…' }}<span class="ink-cursor"></span></p>
          <div class="paper-lines"><i></i><i></i><i></i></div>
          <span class="paper-bottom">{{ isZh ? '每一个世界，都从第一句话开始。' : 'One sentence. Endless possibilities.' }}</span>
        </div>
        <div class="margin-note"><span>✦</span><div>{{ isZh ? '灵感正在生长' : 'An idea takes shape' }}<small>{{ isZh ? '从一个念头，到一整个世界' : 'From a thought to an entire world' }}</small></div></div>
      </div>
    </section>

    <section id="projects" class="library-section">
      <div class="section-heading">
        <div><p class="eyebrow">YOUR LIBRARY</p><h2>{{ isZh ? '我的作品' : 'Your stories' }} <span class="count-badge">{{ novelStore.projectList.length }}</span></h2></div>
        <div class="library-tools"><n-input v-if="novelStore.hasProjects" v-model:value="search" clearable :placeholder="isZh ? '查找作品…' : 'Find a story…'" :aria-label="isZh ? '查找作品' : 'Find a story'" class="library-search"/><n-button @click="showCreateDialog = true" secondary><template #icon><AddOutline /></template>{{ isZh ? '新建作品' : 'New story' }}</n-button></div>
      </div>
      <p class="library-caption">{{ isZh ? '每一次落笔，都离心中的世界更近一点。' : 'Every word brings your world a little closer.' }} <span v-if="novelStore.hasProjects">{{ isZh ? '累计已保存' : 'Saved so far' }} {{ totalWords }} {{ isZh ? '字' : 'characters' }}</span></p>
      <div v-if="visibleProjects.length" class="book-grid"><ProjectCard v-for="project in visibleProjects" :key="project.id" :project="project" @click="openProject(project)" @delete="handleDelete(project)" /></div>
      <div v-else class="library-empty"><DocumentTextOutline /><h3>{{ search ? (isZh ? '还没有找到这部作品' : 'No matching stories') : (isZh ? '书架空着，想象力没有。' : 'An empty shelf. Endless possibilities.') }}</h3><p>{{ search ? (isZh ? '试试其他作品名或关键词。' : 'Try another title or keyword.') : (isZh ? '给故事取一个名字，从第一颗灵感开始。' : 'Give your story a name. Start with one small idea.') }}</p><n-button v-if="!search" type="primary" @click="showCreateDialog = true">{{ isZh ? '创建第一部作品' : 'Create your first story' }}</n-button><n-button v-else secondary @click="search = ''">{{ isZh ? '查看全部作品' : 'Show all stories' }}</n-button></div>
    </section>

    <section id="how-it-works" class="workflow-section">
      <div class="section-heading"><div><p class="eyebrow">FROM IDEA TO MANUSCRIPT</p><h2>{{ isZh ? '写长篇，也可以从容开始。' : 'A novel begins one step at a time.' }}</h2></div><span class="section-aside">{{ isZh ? '你决定方向，AI 陪你往前。' : 'Your vision. A little help along the way.' }}</span></div>
      <div class="workflow-grid"><article v-for="(step, index) in copy.steps" :key="index"><span class="step-number">0{{ index + 1 }}</span><h3>{{ step.title }}</h3><p>{{ step.description }}</p></article></div>
    </section>
    <section class="faq-section"><div><p class="eyebrow">A FEW THINGS TO KNOW</p><h2>{{ isZh ? '落笔之前' : 'Before you begin' }}</h2><p>{{ isZh ? '关于创作，你可能想知道的几件事。' : 'A few useful details for your writing journey.' }}</p></div><div class="faq-list"><details v-for="item in copy.faq" :key="item.question"><summary>{{ item.question }}<span aria-hidden="true">+</span></summary><p>{{ item.answer }}</p></details></div></section>
    <footer class="studio-footer"><span>DREAM NOVEL <span class="footer-dot">/</span> {{ isZh ? '让故事发生' : 'MAKE ROOM FOR STORIES' }}</span><span>{{ isZh ? '作品保存在本浏览器，记得定期导出备份。' : 'Saved in this browser. Export your work regularly.' }}</span></footer>
    <CreateProjectDialog v-model="showCreateDialog" />
  </div>
</template>
