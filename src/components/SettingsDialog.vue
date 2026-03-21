<script setup>
import { ref, watch } from 'vue'
import { useSettingsStore } from '../stores/settings'
import { useMessage } from 'naive-ui'
import { NModal, NCard, NForm, NFormItem, NInput, NButton, NSpace, NIcon, NTooltip, NTabs, NTabPane, NSelect, NAutoComplete } from 'naive-ui'
import { FlashOutline, HelpCircleOutline } from '@vicons/ionicons5'

const props = defineProps({
  modelValue: Boolean
})

const emit = defineEmits(['update:modelValue'])

const settings = useSettingsStore()
const message = useMessage()

// Channel configurations - 渠道配置
const channels = [
  { 
    id: 'chatfire', 
    name: 'Chatfire',
    baseUrl: 'https://api.chatfire.site/v1',
    models: [
      'gemini-3-flash-preview',
      'doubao-seed-1-8-251228',
      'gemini-3-pro-preview',
      'gpt-4o',
      'claude-sonnet-4-5-20250929',
      'kimi-k2-thinking'
    ],
    getApiKeyUrl: 'https://api.chatfire.site/login?inviteCode=EEE80324'
  },
  { 
    id: 'openai', 
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1-preview', 'o1-mini'],
    getApiKeyUrl: 'https://platform.openai.com/api-keys'
  },
  { 
    id: 'gemini', 
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    getApiKeyUrl: 'https://aistudio.google.com/app/apikey'
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    baseUrl: 'https://api.anthropic.com/v1',
    models: ['claude-sonnet-4-5-20250929', 'claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'],
    getApiKeyUrl: 'https://console.anthropic.com/settings/keys',
    // Claude 需要特殊处理
    isClaude: true
  },
  {
    id: 'azure',
    name: 'Azure OpenAI',
    baseUrl: 'https://{resource-name}.openai.azure.com/openai/deployments/{deployment-id}',
    models: ['gpt-4o', 'gpt-4-turbo', 'gpt-35-turbo'],
    getApiKeyUrl: 'https://portal.azure.com/',
    // Azure 需要特殊处理
    isAzure: true
  },
  {
    id: 'moonshot',
    name: '月之暗面 Kimi',
    baseUrl: 'https://api.moonshot.cn/v1',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
    getApiKeyUrl: 'https://platform.moonshot.cn/console/api-keys'
  },
  {
    id: 'deepseek',
    name: 'DeepSeek 深度求索',
    baseUrl: 'https://api.deepseek.com/v1',
    models: ['deepseek-chat', 'deepseek-coder'],
    getApiKeyUrl: 'https://platform.deepseek.com/api_keys'
  },
  {
    id: 'baichuan',
    name: '百川智能',
    baseUrl: 'https://api.baichuan-ai.com/v1',
    models: ['Baichuan4', 'Baichuan3-Turbo', 'Baichuan2-Turbo'],
    getApiKeyUrl: 'https://platform.baichuan-ai.com/console/apikey'
  },
  {
    id: 'zhipu',
    name: '智谱 AI',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: ['glm-4', 'glm-4-air', 'glm-3-turbo'],
    getApiKeyUrl: 'https://open.bigmodel.cn/usercenter/apikeys'
  },
  {
    id: 'custom',
    name: '自定义 API',
    baseUrl: '',
    models: [],
    getApiKeyUrl: '',
    isCustom: true
  }
]

// Current channel - 当前渠道
const currentChannel = ref('chatfire')

// Channel options for select - 渠道选项
const channelOptions = channels.map(c => ({ label: c.name, value: c.id }))

// Current channel models - 当前渠道的模型列表
import { computed } from 'vue'
const currentChannelModels = computed(() => {
  const channel = channels.find(c => c.id === currentChannel.value)
  return channel?.models.map(m => ({ label: m, value: m })) || []
})

// Initialize with default values - 使用默认值初始化
const localConfig = ref({
  channel: 'chatfire',
  baseUrl: 'https://api.chatfire.site/v1',
  apiKey: '',
  model: 'gemini-3-flash-preview',
  temperature: 0.7,
  maxTokens: 8192,
  timeout: 600
})

// Azure 配置（单独存储）
const azureConfig = ref({
  resourceName: '',
  deploymentId: '',
  apiVersion: '2024-02-15-preview'
})

// Handle channel change - 处理渠道切换
function handleChannelChange(channelId) {
  currentChannel.value = channelId
  const channel = channels.find(c => c.id === channelId)
  if (channel) {
    localConfig.value.channel = channelId
    if (!channel.isCustom) {
      localConfig.value.baseUrl = channel.baseUrl
    }
    localConfig.value.model = channel.models[0] || ''
  }
}

// 获取当前渠道的获取 Key 链接
function getCurrentGetKeyUrl() {
  const channel = channels.find(c => c.id === currentChannel.value)
  return channel?.getApiKeyUrl || ''
}

// Stage-specific models - 各环节模型配置
const localStageModels = ref({
  architecture: '',
  blueprint: '',
  chapter: '',
  finalize: '',
  enrich: ''
})

// Stage labels - 环节标签
const stageLabels = {
  architecture: '架构生成',
  blueprint: '大纲生成',
  chapter: '章节生成',
  finalize: '定稿处理',
  enrich: '章节扩写'
}

// Sync local config when dialog opens - 打开对话框时同步本地配置
watch(() => props.modelValue, (val) => {
  if (val) {
    localConfig.value = { ...settings.apiConfig }
    localStageModels.value = { ...settings.stageModels }
    currentChannel.value = localConfig.value.channel || 'chatfire'
  }
}, { immediate: true })

// Save settings - 保存设置
function saveSettings() {
  if (!localConfig.value.apiKey) {
    message.warning('请输入 API Key')
    return
  }
  
  // Azure 特殊处理
  if (currentChannel.value === 'azure') {
    if (!azureConfig.value.resourceName || !azureConfig.value.deploymentId) {
      message.warning('请填写 Azure Resource Name 和 Deployment ID')
      return
    }
    // 构建 Azure URL
    localConfig.value.baseUrl = `https://${azureConfig.value.resourceName}.openai.azure.com/openai/deployments/${azureConfig.value.deploymentId}`
    settings.updateAzureConfig({
      ...localConfig.value,
      ...azureConfig.value
    })
  } else {
    settings.updateApiConfig(localConfig.value)
  }
  
  settings.updateStageModels(localStageModels.value)
  message.success('设置已保存')
  emit('update:modelValue', false)
}

// Test connection - 测试连接
async function testConnection() {
  if (!localConfig.value.apiKey) {
    message.warning('请先输入 API Key')
    return
  }
  
  try {
    const response = await fetch(`${localConfig.value.baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${localConfig.value.apiKey}`
      }
    })
    
    if (response.ok) {
      message.success('连接成功!')
    } else {
      message.error('连接失败: ' + response.status)
    }
  } catch (error) {
    message.error('连接失败: ' + error.message)
  }
}

</script>

<template>
  <n-modal
    :show="modelValue"
    @update:show="emit('update:modelValue', $event)"
    :mask-closable="false"
    preset="card"
    title="API 设置"
    style="width: 520px"
    :bordered="false"
    class="!rounded-2xl"
  >
    <n-form label-placement="top" class="space-y-1">
      <!-- Channel Select -->
      <n-form-item label="渠道">
        <n-select
          :value="currentChannel"
          :options="channelOptions"
          @update:value="handleChannelChange"
        />
      </n-form-item>

      <!-- API Base URL -->
      <n-form-item 
        v-if="currentChannel !== 'azure'"
        label="API Base URL"
      >
        <n-input 
          v-model:value="localConfig.baseUrl" 
          :placeholder="currentChannel === 'custom' ? '请输入 API Base URL' : channels.find(c => c.id === currentChannel)?.baseUrl"
          :disabled="currentChannel !== 'custom'"
        />
      </n-form-item>

      <!-- Azure 特殊配置 -->
      <template v-if="currentChannel === 'azure'">
        <n-form-item label="Resource Name">
          <n-input 
            v-model:value="azureConfig.resourceName" 
            placeholder="你的 Azure OpenAI 资源名"
          />
        </n-form-item>
        <n-form-item label="Deployment ID">
          <n-input 
            v-model:value="azureConfig.deploymentId" 
            placeholder="部署 ID"
          />
        </n-form-item>
        <n-form-item label="API Version">
          <n-input 
            v-model:value="azureConfig.apiVersion" 
            placeholder="2024-02-15-preview"
          />
        </n-form-item>
      </template>

      <!-- API Key -->
      <n-form-item label="API Key">
        <n-input 
          v-model:value="localConfig.apiKey" 
          type="password"
          placeholder="请输入 API Key"
          show-password-on="click"
        />
      </n-form-item>

      <!-- Default Model -->
      <n-form-item>
        <template #label>
          <div class="flex items-center gap-1">
            <span>默认模型</span>
            <n-tooltip trigger="hover">
              <template #trigger>
                <n-icon class="text-gray-400 cursor-help" :size="14">
                  <HelpCircleOutline />
                </n-icon>
              </template>
              未单独配置环节模型时使用此模型
            </n-tooltip>
          </div>
        </template>
<n-auto-complete
          v-model:value="localConfig.model"
          :options="currentChannelModels"
          :get-show="() => true"
          placeholder="选择或输入模型名称"
          clearable
        />
      </n-form-item>

      <!-- Stage-specific Models -->
      <div class="mt-4">
        <div class="flex items-center gap-1 mb-3">
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">各环节模型配置</span>
          <n-tooltip trigger="hover">
            <template #trigger>
              <n-icon class="text-gray-400 cursor-help" :size="14">
                <HelpCircleOutline />
              </n-icon>
            </template>
            留空则使用默认模型
          </n-tooltip>
        </div>
        <n-tabs type="segment" size="small">
          <n-tab-pane v-for="(label, key) in stageLabels" :key="key" :name="key" :tab="label">
<n-auto-complete
              v-model:value="localStageModels[key]"
              :options="currentChannelModels"
              :get-show="() => true"
              placeholder="留空使用默认模型"
              class="mt-3"
              clearable
            />
          </n-tab-pane>
        </n-tabs>
      </div>
    </n-form>

    <template #footer>
      <div class="flex justify-between">
        <n-space>
          <n-button @click="() => { const url = getCurrentGetKeyUrl(); if(url) window.open(url, '_blank'); else message.warning('该渠道未配置获取 Key 链接') }" tertiary>
            获取 Key
          </n-button>
          <n-button @click="testConnection" tertiary>
            <template #icon>
              <n-icon><FlashOutline /></n-icon>
            </template>
            测试连接
          </n-button>
        </n-space>
        <n-space>
          <n-button @click="emit('update:modelValue', false)">取消</n-button>
          <n-button type="primary" @click="saveSettings">保存</n-button>
        </n-space>
      </div>
    </template>
  </n-modal>
</template>
