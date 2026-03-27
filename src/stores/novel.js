import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// Novel project store - 小说项目状态管理
export const useNovelStore = defineStore('novel', () => {
  // State
  const projects = ref(JSON.parse(localStorage.getItem('novel_projects') || '[]'))
  const currentProject = ref(null)
  const isGenerating = ref(false)
  const generationProgress = ref('')

  // Getters
  const projectList = computed(() => projects.value)
  const hasProjects = computed(() => projects.value.length > 0)

  // Actions
  // Create a new novel project - 创建新小说项目
  function createProject(projectData) {
    const newProject = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...projectData,
      // Architecture data - 架构数据
      coreSeed: '',
      characterDynamics: '',
      worldBuilding: '',
      plotArchitecture: '',
      characterState: '',
      // Chapter blueprint - 章节大纲
      chapterBlueprint: '',
      // Chapters content (key: chapter number, value: chapter text) - 章节内容
      chapters: {},
      // Global summary - 前文摘要
      globalSummary: '',
      // v3: 结构化存储
      characterDB: '',          // 角色数据库（JSON）
      foreshadowingDB: '',      // 伏笔数据库（JSON）
      worldBuildingDB: '',      // 世界观数据库（JSON）
      chapterSummaries: [],     // 分章摘要数组
      currentArcSummary: '',    // 当前弧汇总摘要
      currentArcName: '',       // 当前弧名称
      currentArcStart: 1,       // 当前弧起始章节
      // Graph data - 关系图谱数据
      graphData: {
        version: 1,
        generatedAt: null,
        snapshots: {},
        audit: { inconsistencies: [], lastAuditAt: null },
        graphGenerated: false
      },
      // Chapter graphs - 每章独立的关系图谱 { [chapterNum]: { nodes, edges } }
      chapterGraphs: {},
      // Generation status - 生成状态
      architectureGenerated: false,
      blueprintGenerated: false
    }
    projects.value.unshift(newProject)
    saveToStorage()
    return newProject
  }

  // Update project - 更新项目
  function updateProject(id, updates) {
    const index = projects.value.findIndex(p => p.id === id)
    if (index !== -1) {
      projects.value[index] = {
        ...projects.value[index],
        ...updates,
        updatedAt: new Date().toISOString()
      }
      saveToStorage()
      if (currentProject.value?.id === id) {
        currentProject.value = projects.value[index]
      }
    }
  }

  // Delete project - 删除项目
  function deleteProject(id) {
    const index = projects.value.findIndex(p => p.id === id)
    if (index !== -1) {
      projects.value.splice(index, 1)
      saveToStorage()
      if (currentProject.value?.id === id) {
        currentProject.value = null
      }
    }
  }

  // Set current project - 设置当前项目
  function setCurrentProject(id) {
    currentProject.value = projects.value.find(p => p.id === id) || null
  }

  // Save to localStorage - 保存到本地存储
  function saveToStorage() {
    localStorage.setItem('novel_projects', JSON.stringify(projects.value))
  }

  // Set generation state - 设置生成状态
  function setGenerating(value, progress = '') {
    isGenerating.value = value
    generationProgress.value = progress
  }

  return {
    projects,
    currentProject,
    isGenerating,
    generationProgress,
    projectList,
    hasProjects,
    createProject,
    updateProject,
    deleteProject,
    setCurrentProject,
    setGenerating
  }
})
