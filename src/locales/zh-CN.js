// 中文语言包
export default {
  // 通用
  common: {
    cancel: '取消',
    confirm: '确认',
    save: '保存',
    delete: '删除',
    edit: '编辑',
    create: '创建',
    loading: '加载中...',
    success: '成功',
    error: '错误',
    yes: '是',
    no: '否',
    close: '关闭',
    back: '返回',
    next: '下一步',
    previous: '上一步',
    finish: '完成',
    skip: '跳过',
    search: '搜索',
    filter: '筛选',
    reset: '重置',
    apply: '应用',
    clear: '清除',
    selectAll: '全选',
    deselectAll: '取消全选',
    noData: '暂无数据',
    more: '更多',
    expand: '展开',
    collapse: '收起'
  },

  // 应用标题
  app: {
    name: 'AI 小说生成器',
    subtitle: 'Novel Generator',
    description: '基于雪花写作法的 AI 创作工具',
    tagline: '智能生成小说架构、角色体系、世界观和章节大纲，让创作更高效'
  },

  // 安全提醒
  security: {
    banner: '🔒 安全提示：本项目为部署在 Cloudflare 上的纯静态项目，不会保存你的 API Key，所有数据都保存在你的浏览器本地。',
    learnMore: '了解更多'
  },

  // 导航和头部
  header: {
    toggleLightMode: '切换到亮色模式',
    toggleDarkMode: '切换到深色模式',
    settings: '设置',
    language: '语言',
    home: '首页',
    projects: '项目',
    profile: '个人中心'
  },

  // 首页
  home: {
    myProjects: '我的项目',
    createProject: '创建新项目',
    noProjects: '还没有项目',
    noProjectsHint: '点击上方按钮创建你的第一个小说项目',
    projectCount: '个项目',
    deleteConfirm: '删除确认',
    deleteConfirmMsg: '确定要删除项目 "{title}" 吗？此操作不可恢复。',
    deleteSuccess: '项目已删除',
    openProject: '打开项目'
  },

  // 功能特性
  features: {
    title: '核心功能',
    snowflake: {
      title: '雪花写作法',
      description: '从核心种子开始，逐步扩展角色、世界观、情节架构，构建完整故事'
    },
    characterArc: {
      title: '角色弧光理论',
      description: '设计具有动态变化潜力的角色，包含驱动力三角和关系冲突网'
    },
    suspenseCurve: {
      title: '悬念节奏曲线',
      description: '智能规划章节节奏，设置认知过山车，保持读者阅读兴趣'
    }
  },

  // 创建项目对话框
  createProject: {
    title: '创建新项目',
    projectTitle: '项目名称',
    projectTitlePlaceholder: '例如：星辰大海',
    novelTopic: '小说主题 / 核心创意',
    novelTopicPlaceholder: '描述你的小说核心创意，例如：一个普通少年意外获得神秘传承，在修仙世界中逐步成长...',
    genre: '小说类型',
    genrePlaceholder: '请选择小说类型',
    chapterCount: '预计章节数',
    wordCount: '每章字数',
    userGuidance: '创作指导 (可选)',
    userGuidancePlaceholder: '可以在这里添加额外的创作要求，如特定角色设定、情节走向、写作风格等...',
    createButton: '创建项目',
    cancelButton: '取消',
    validation: {
      titleRequired: '请输入项目名称',
      topicRequired: '请输入小说主题',
      genreRequired: '请选择小说类型',
      chapterCountRequired: '请输入章节数量',
      wordCountRequired: '请输入每章字数'
    }
  },

  // 小说类型
  genres: {
    fantasy: '玄幻',
    xianxia: '仙侠',
    urban: '都市',
    historical: '历史',
    sciFi: '科幻',
    game: '游戏',
    mystery: '悬疑',
    magic: '奇幻',
    wuxia: '武侠',
    romance: '言情',
    military: '军事',
    sports: '体育',
    supernatural: '灵异',
    anime: '二次元',
    other: '其他'
  },

  // 设置对话框
  settings: {
    title: 'API 设置',
    channel: '渠道',
    apiBaseUrl: 'API Base URL',
    apiKey: 'API Key',
    apiKeyPlaceholder: '请输入 API Key',
    defaultModel: '默认模型',
    modelHint: '未单独配置环节模型时使用此模型',
    stageModels: '各环节模型配置',
    stageModelsHint: '留空则使用默认模型',
    getApiKey: '获取 Key',
    testConnection: '测试连接',
    connectionSuccess: '连接成功!',
    connectionFailed: '连接失败',
    pleaseEnterApiKey: '请先输入 API Key',
    settingsSaved: '设置已保存',
    azureResourceName: 'Resource Name',
    azureDeploymentId: 'Deployment ID',
    azureApiVersion: 'API Version',
    azureResourceNamePlaceholder: '你的 Azure OpenAI 资源名',
    azureDeploymentIdPlaceholder: '部署 ID',
    stages: {
      architecture: '架构生成',
      blueprint: '大纲生成',
      chapter: '章节生成',
      finalize: '定稿处理',
      enrich: '章节扩写'
    }
  },

  // 渠道名称
  channels: {
    chatfire: 'Chatfire',
    openai: 'OpenAI',
    gemini: 'Google Gemini',
    anthropic: 'Anthropic Claude',
    azure: 'Azure OpenAI',
    moonshot: '月之暗面 Kimi',
    deepseek: 'DeepSeek 深度求索',
    baichuan: '百川智能',
    zhipu: '智谱 AI',
    custom: '自定义 API'
  },

  // 项目卡片
  projectCard: {
    chapters: '章',
    words: '字',
    lastUpdated: '最后更新',
    delete: '删除',
    open: '打开',
    progress: '生成进度',
    outlineGenerated: '大纲已生成',
    architectureGenerated: '架构已生成',
    pending: '待生成'
  },

  // 项目页面
  project: {
    back: '返回',
    chapters: '章',
    wordsPerChapter: '每章',
    words: '字',
    pleaseConfigureApiKey: '请配置 API Key',
    generateArchitecture: '生成小说架构',
    generateBlueprint: '生成章节大纲',
    generateChapter: '生成章节',
    architectureTab: '小说架构',
    blueprintTab: '章节大纲',
    chaptersTab: '章节生成',
    compassTab: '灵感罗盘',
    generated: '已生成',
    notGenerated: '未生成',
    regenerate: '重新生成',
    export: '导出',
    exportText: '导出 TXT',
    exportMarkdown: '导出 Markdown',
    writtenChapters: '已写章节',
    noChaptersYet: '暂无章节',
    startWriting: '开始写作',
    regenerateConfirm: '重新生成确认',
    regenerateArchitectureConfirm: '确定要重新生成小说架构吗？现有内容将被覆盖。',
    regenerateBlueprintConfirm: '确定要重新生成章节大纲吗？现有内容将被覆盖。',
    architectureGeneratedSuccess: '小说架构生成完成!',
    blueprintGeneratedSuccess: '章节大纲生成完成!',
    generationFailed: '生成失败：{error}',
    exportSuccess: '导出成功',
    pleaseGenerateArchitectureFirst: '请先生成小说架构',
    generating: '正在生成...',
    exportDropdown: '导出',
    notFound: '项目不存在或已被删除',
    backToHome: '返回首页'
  },

  // 导出页面
  export: {
    completedChapters: '已完成章节',
    totalChapters: '总章节数',
    totalWords: '总字数',
    noChaptersHint: '还没有已完成的章节，请先在「章节写作」中生成章节内容'
  },

  // 生成步骤
  generation: {
    steps: {
      generatingCoreSeed: '正在生成核心种子...',
      generatingCharacterDynamics: '正在生成角色动力学...',
      generatingWorldBuilding: '正在构建世界观...',
      generatingPlotArchitecture: '正在设计情节架构...',
      generatingChapterBlueprint: '正在生成章节大纲...',
      generatingChapter: '正在生成章节...'
    }
  },

  // 消息提示
  messages: {
    projectCreated: '项目创建成功',
    projectDeleted: '项目已删除',
    settingsSaved: '设置已保存',
    connectionSuccess: '连接成功!',
    connectionFailed: '连接失败：{error}',
    pleaseEnterApiKey: '请输入 API Key',
    azureConfigRequired: '请填写 Azure Resource Name 和 Deployment ID',
    noGetKeyUrl: '该渠道未配置获取 Key 链接',
    pleaseConfigureApiKey: '请先在设置中配置 API Key'
  }
}
