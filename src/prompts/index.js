/**
 * Prompt Manager - 提示词管理器
 * 统一管理所有 AI 提示词，便于维护和扩展
 */

import { architecturePrompts } from './architecture'
import { chapterPrompts } from './chapter'
import { utilityPrompts } from './utility'

/**
 * 提示词管理器
 * 提供统一的提示词访问接口
 */
class PromptManager {
  constructor() {
    this.prompts = {
      architecture: architecturePrompts,
      chapter: chapterPrompts,
      utility: utilityPrompts
    }
    
    // 版本号，用于追踪提示词更新
    this.version = '1.0.0'
  }

  /**
   * 获取提示词
   * @param {string} category - 分类 (architecture/chapter/utility)
   * @param {string} name - 提示词名称
   * @param {object} params - 参数
   * @returns {string} 生成的提示词
   */
  get(category, name, params = {}) {
    const categoryPrompts = this.prompts[category]
    if (!categoryPrompts) {
      throw new Error(`Unknown prompt category: ${category}`)
    }
    
    const promptFn = categoryPrompts[name]
    if (!promptFn) {
      throw new Error(`Unknown prompt: ${category}.${name}`)
    }
    
    return promptFn(params)
  }

  /**
   * 获取架构类提示词
   */
  architecture(name, params) {
    return this.get('architecture', name, params)
  }

  /**
   * 获取章节类提示词
   */
  chapter(name, params) {
    return this.get('chapter', name, params)
  }

  /**
   * 获取工具类提示词
   */
  utility(name, params) {
    return this.get('utility', name, params)
  }

  /**
   * 列出所有可用提示词
   */
  list() {
    const result = {}
    for (const [category, prompts] of Object.entries(this.prompts)) {
      result[category] = Object.keys(prompts)
    }
    return result
  }

  /**
   * 注册自定义提示词
   * @param {string} category - 分类
   * @param {string} name - 名称
   * @param {function} promptFn - 提示词生成函数
   */
  register(category, name, promptFn) {
    if (!this.prompts[category]) {
      this.prompts[category] = {}
    }
    this.prompts[category][name] = promptFn
  }
}

// 导出单例
export const promptManager = new PromptManager()

// 导出各分类提示词（兼容旧代码）
export { architecturePrompts } from './architecture'
export { chapterPrompts } from './chapter'
export { utilityPrompts } from './utility'

