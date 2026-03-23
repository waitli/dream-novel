// English Language Pack
export default {
  // Common
  common: {
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    create: 'Create',
    loading: 'Loading...',
    success: 'Success',
    error: 'Error',
    yes: 'Yes',
    no: 'No',
    close: 'Close',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    finish: 'Finish',
    skip: 'Skip',
    search: 'Search',
    filter: 'Filter',
    reset: 'Reset',
    apply: 'Apply',
    clear: 'Clear',
    selectAll: 'Select All',
    deselectAll: 'Deselect All',
    noData: 'No Data',
    more: 'More',
    expand: 'Expand',
    collapse: 'Collapse'
  },

  // App Title
  app: {
    name: 'AI Novel Generator',
    subtitle: 'Novel Generator',
    description: 'AI Writing Tool Based on Snowflake Method',
    tagline: 'Intelligently generate novel architecture, character systems, world-building, and chapter outlines to make writing more efficient'
  },

  // Security Banner
  security: {
    banner: '🔒 Security Notice: This is a pure static project deployed on Cloudflare. Your API Key is NOT stored on any server. All data is saved locally in your browser.',
    learnMore: 'Learn More'
  },

  // Navigation and Header
  header: {
    toggleLightMode: 'Switch to Light Mode',
    toggleDarkMode: 'Switch to Dark Mode',
    settings: 'Settings',
    language: 'Language',
    home: 'Home',
    projects: 'Projects',
    profile: 'Profile'
  },

  // Home Page
  home: {
    myProjects: 'My Projects',
    createProject: 'Create New Project',
    noProjects: 'No Projects Yet',
    noProjectsHint: 'Click the button above to create your first novel project',
    projectCount: 'projects',
    deleteConfirm: 'Delete Confirmation',
    deleteConfirmMsg: 'Are you sure you want to delete project "{title}"? This action cannot be undone.',
    deleteSuccess: 'Project deleted',
    openProject: 'Open Project'
  },

  // Features
  features: {
    title: 'Core Features',
    snowflake: {
      title: 'Snowflake Method',
      description: 'Start from a core seed and gradually expand characters, world-building, and plot architecture to build a complete story'
    },
    characterArc: {
      title: 'Character Arc Theory',
      description: 'Design characters with dynamic change potential, including drive triangles and relationship conflict networks'
    },
    suspenseCurve: {
      title: 'Suspense Rhythm Curve',
      description: 'Intelligently plan chapter pacing, create cognitive roller coasters, and maintain reader interest'
    }
  },

  // Create Project Dialog
  createProject: {
    title: 'Create New Project',
    projectTitle: 'Project Title',
    projectTitlePlaceholder: 'e.g., Stars and Seas',
    novelTopic: 'Novel Topic / Core Concept',
    novelTopicPlaceholder: 'Describe your novel\'s core concept, e.g., An ordinary teenager accidentally obtains a mysterious legacy and grows step by step in a cultivation world...',
    genre: 'Genre',
    genrePlaceholder: 'Please select genre',
    chapterCount: 'Estimated Chapters',
    wordCount: 'Words per Chapter',
    userGuidance: 'User Guidance (Optional)',
    userGuidancePlaceholder: 'Add additional creative requirements here, such as specific character settings, plot direction, writing style, etc...',
    createButton: 'Create Project',
    cancelButton: 'Cancel',
    validation: {
      titleRequired: 'Please enter project title',
      topicRequired: 'Please enter novel topic',
      genreRequired: 'Please select genre',
      chapterCountRequired: 'Please enter chapter count',
      wordCountRequired: 'Please enter words per chapter'
    }
  },

  // Genres
  genres: {
    fantasy: 'Fantasy',
    xianxia: 'Xianxia',
    urban: 'Urban',
    historical: 'Historical',
    sciFi: 'Science Fiction',
    game: 'Game',
    mystery: 'Mystery',
    magic: 'Fantasy',
    wuxia: 'Wuxia',
    romance: 'Romance',
    military: 'Military',
    sports: 'Sports',
    supernatural: 'Supernatural',
    anime: 'Anime',
    other: 'Other'
  },

  // Settings Dialog
  settings: {
    title: 'API Settings',
    channel: 'Channel',
    apiBaseUrl: 'API Base URL',
    apiKey: 'API Key',
    apiKeyPlaceholder: 'Please enter API Key',
    defaultModel: 'Default Model',
    modelHint: 'Used when stage-specific models are not configured',
    stageModels: 'Stage-specific Models',
    stageModelsHint: 'Leave empty to use default model',
    getApiKey: 'Get API Key',
    testConnection: 'Test Connection',
    connectionSuccess: 'Connection successful!',
    connectionFailed: 'Connection failed',
    pleaseEnterApiKey: 'Please enter API Key first',
    settingsSaved: 'Settings saved',
    azureResourceName: 'Resource Name',
    azureDeploymentId: 'Deployment ID',
    azureApiVersion: 'API Version',
    azureResourceNamePlaceholder: 'Your Azure OpenAI resource name',
    azureDeploymentIdPlaceholder: 'Deployment ID',
    stages: {
      architecture: 'Architecture Generation',
      blueprint: 'Outline Generation',
      chapter: 'Chapter Generation',
      finalize: 'Finalization',
      enrich: 'Chapter Expansion'
    }
  },

  // Channel Names
  channels: {
    chatfire: 'Chatfire',
    openai: 'OpenAI',
    gemini: 'Google Gemini',
    anthropic: 'Anthropic Claude',
    azure: 'Azure OpenAI',
    moonshot: 'Moonshot Kimi',
    deepseek: 'DeepSeek',
    baichuan: 'Baichuan AI',
    zhipu: 'Zhipu AI',
    custom: 'Custom API'
  },

  // Project Card
  projectCard: {
    chapters: 'chapters',
    words: 'words',
    lastUpdated: 'Last updated',
    delete: 'Delete',
    open: 'Open',
    progress: 'Progress',
    outlineGenerated: 'Outline Generated',
    architectureGenerated: 'Architecture Generated',
    pending: 'Pending'
  },

  // Project Page
  project: {
    back: 'Back',
    chapters: 'chapters',
    wordsPerChapter: 'words per',
    words: 'words',
    pleaseConfigureApiKey: 'Please Configure API Key',
    generateArchitecture: 'Generate Architecture',
    generateBlueprint: 'Generate Chapter Blueprint',
    generateChapter: 'Generate Chapter',
    architectureTab: 'Architecture',
    blueprintTab: 'Chapter Blueprint',
    chaptersTab: 'Chapters',
    compassTab: 'Inspiration Compass',
    generated: 'Generated',
    notGenerated: 'Not Generated',
    regenerate: 'Regenerate',
    export: 'Export',
    exportText: 'Export TXT',
    exportMarkdown: 'Export Markdown',
    writtenChapters: 'Written Chapters',
    noChaptersYet: 'No chapters yet',
    startWriting: 'Start Writing',
    regenerateConfirm: 'Regenerate Confirmation',
    regenerateArchitectureConfirm: 'Are you sure you want to regenerate the architecture? Existing content will be overwritten.',
    regenerateBlueprintConfirm: 'Are you sure you want to regenerate the chapter blueprint? Existing content will be overwritten.',
    architectureGeneratedSuccess: 'Architecture generation complete!',
    blueprintGeneratedSuccess: 'Chapter blueprint generation complete!',
    generationFailed: 'Generation failed: {error}',
    exportSuccess: 'Export successful',
    pleaseGenerateArchitectureFirst: 'Please generate architecture first',
    generating: 'Generating...',
    exportDropdown: 'Export',
    notFound: 'Project not found or has been deleted',
    backToHome: 'Back to Home'
  },

  // Export Page
  export: {
    completedChapters: 'Completed Chapters',
    totalChapters: 'Total Chapters',
    totalWords: 'Total Words',
    noChaptersHint: 'No completed chapters yet. Please generate chapter content in the Chapters tab first.'
  },

  // Generation Steps
  generation: {
    steps: {
      generatingCoreSeed: 'Generating core seed...',
      generatingCharacterDynamics: 'Generating character dynamics...',
      generatingWorldBuilding: 'Building world...',
      generatingPlotArchitecture: 'Designing plot architecture...',
      generatingChapterBlueprint: 'Generating chapter blueprint...',
      generatingChapter: 'Generating chapter...'
    }
  },

  // Architecture Panel
  architecture: {
    coreSeed: 'Core Seed',
    coreSeedDesc: 'Story essence and core conflict',
    characterDynamics: 'Character System',
    characterDynamicsDesc: 'Dynamic design of core characters',
    worldBuilding: 'World Building',
    worldBuildingDesc: 'Three-dimensional world construction',
    plotArchitecture: 'Plot Architecture',
    plotArchitectureDesc: 'Three-act suspense structure',
    characterState: 'Character State',
    characterStateDesc: 'Initial character state table',
    startGenerating: 'Start Generating Architecture',
    description: 'AI will generate core seed, character system, world-building, and plot architecture based on the Snowflake Method',
    startGenerateButton: 'Generate Architecture',
    noContent: 'No content yet, click generate to start'
  },

  // Common
  common: {
    generating: 'Generating...',
    regenerate: 'Regenerate',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    create: 'Create',
    loading: 'Loading...',
    success: 'Success',
    error: 'Error'
  },

  // Blueprint Panel
  blueprint: {
    pleaseGenerateArchitecture: 'Please Generate Architecture First',
    requirement: 'Chapter blueprint generation requires the novel architecture (core seed, character system, world-building, plot architecture)',
    generateTitle: 'Generate Chapter Blueprint',
    description: 'AI will generate detailed outlines for {chapters} chapters based on the novel architecture, including suspense rhythm curves',
    startGenerate: 'Start Generating Blueprint',
    cardView: 'Card View',
    rawText: 'Raw Text',
    totalChapters: '{count} chapters total',
    searchPlaceholder: 'Search chapters...',
    chapterTitle: 'Chapter {number} - {title}',
    twistLevel: 'Twist Level',
    noResults: 'No matching chapters found'
  },

  // Chapter Writer Panel
  chapterWriter: {
    pleaseGenerateBlueprint: 'Please Generate Chapter Blueprint First',
    requirement: 'Chapter content generation requires the chapter blueprint',
    continueGenerate: 'Continue',
    generateChapter: 'Generate Chapter',
    enrichChapter: 'Enrich Chapter',
    finalizeChapter: 'Finalize Chapter',
    saveChapter: 'Save Chapter',
    chapterContent: 'Chapter Content',
    autoSaved: 'Auto-saved',
    generateGraph: 'Generate Graph',
    viewGraph: 'View Graph'
  },

  // Common
  common: {
    tip: 'Tip',
    generating: 'Generating...',
    regenerate: 'Regenerate',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    create: 'Create',
    loading: 'Loading...',
    success: 'Success',
    error: 'Error'
  },

  // Messages
  messages: {
    projectCreated: 'Project created successfully',
    projectDeleted: 'Project deleted',
    settingsSaved: 'Settings saved',
    connectionSuccess: 'Connection successful!',
    connectionFailed: 'Connection failed: {error}',
    pleaseEnterApiKey: 'Please enter API Key',
    azureConfigRequired: 'Please fill in Azure Resource Name and Deployment ID',
    noGetKeyUrl: 'No Get Key URL configured for this channel',
    pleaseConfigureApiKey: 'Please configure API Key in settings first'
  }
}
