<script setup>
import { ref, watch, computed } from 'vue'
import { useSettingsStore } from '../stores/settings'
import { useI18n } from '../i18n'
import { useMessage } from 'naive-ui'
import { NModal, NCard, NForm, NFormItem, NInput, NButton, NSpace, NIcon, NTooltip, NTabs, NTabPane, NSelect, NAutoComplete } from 'naive-ui'
import { FlashOutline, HelpCircleOutline } from '@vicons/ionicons5'

const props = defineProps({
  modelValue: Boolean
})

const emit = defineEmits(['update:modelValue'])

const settings = useSettingsStore()
const { t } = useI18n()
const message = useMessage()

// Channel configurations
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
    isClaude: true
  },
  {
    id: 'azure',
    name: 'Azure OpenAI',
    baseUrl: 'https://{resource-name}.openai.azure.com/openai/deployments/{deployment-id}',
    models: ['gpt-4o', 'gpt-4-turbo', 'gpt-35-turbo'],
    getApiKeyUrl: 'https://portal.azure.com/',
    isAzure: true
  },
  {
    id: 'moonshot',
    name: 'Moonshot Kimi',
    baseUrl: 'https://api.moonshot.cn/v1',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
    getApiKeyUrl: 'https://platform.moonshot.cn/console/api-keys'
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    models: ['deepseek-chat', 'deepseek-coder'],
    getApiKeyUrl: 'https://platform.deepseek.com/api_keys'
  },
  {
    id: 'baichuan',
    name: 'Baichuan AI',
    baseUrl: 'https://api.baichuan-ai.com/v1',
    models: ['Baichuan4', 'Baichuan3-Turbo', 'Baichuan2-Turbo'],
    getApiKeyUrl: 'https://platform.baichuan-ai.com/console/apikey'
  },
  {
    id: 'zhipu',
    name: 'Zhipu AI',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: ['glm-4', 'glm-4-air', 'glm-3-turbo'],
    getApiKeyUrl: 'https://open.bigmodel.cn/usercenter/apikeys'
  },
  {
    id: 'custom',
    name: 'Custom API',
    baseUrl: '',
    models: [],
    getApiKeyUrl: '',
    isCustom: true
  }
]

// Current channel
const currentChannel = ref('chatfire')

// Channel options for select
const channelOptions = computed(() => channels.map(c => ({ label: c.name, value: c.id })))

// Current channel models
const currentChannelModels = computed(() => {
  const channel = channels.find(c => c.id === currentChannel.value)
  return channel?.models.map(m => ({ label: m, value: m })) || []
})

// Initialize with default values
const localConfig = ref({
  channel: 'chatfire',
  baseUrl: 'https://api.chatfire.site/v1',
  apiKey: '',
  model: 'gemini-3-flash-preview',
  temperature: 0.7,
  maxTokens: 8192,
  timeout: 600
})

// Azure config
const azureConfig = ref({
  resourceName: '',
  deploymentId: '',
  apiVersion: '2024-02-15-preview'
})

// Handle channel change
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

// Get current channel's get key URL
function getCurrentGetKeyUrl() {
  const channel = channels.find(c => c.id === currentChannel.value)
  return channel?.getApiKeyUrl || ''
}

// Stage-specific models
const localStageModels = ref({
  architecture: '',
  blueprint: '',
  chapter: '',
  finalize: '',
  enrich: ''
})

// Stage labels - computed dynamically
const stageLabels = computed(() => ({
  architecture: t('settings.stages.architecture'),
  blueprint: t('settings.stages.blueprint'),
  chapter: t('settings.stages.chapter'),
  finalize: t('settings.stages.finalize'),
  enrich: t('settings.stages.enrich')
}))

// Sync local config when dialog opens
watch(() => props.modelValue, (val) => {
  if (val) {
    localConfig.value = { ...settings.apiConfig }
    localStageModels.value = { ...settings.stageModels }
    currentChannel.value = localConfig.value.channel || 'chatfire'
  }
}, { immediate: true })

// Save settings
function saveSettings() {
  if (!localConfig.value.apiKey) {
    message.warning(t('messages.pleaseEnterApiKey'))
    return
  }
  
  // Azure special handling
  if (currentChannel.value === 'azure') {
    if (!azureConfig.value.resourceName || !azureConfig.value.deploymentId) {
      message.warning(t('messages.azureConfigRequired'))
      return
    }
    // Build Azure URL
    localConfig.value.baseUrl = `https://${azureConfig.value.resourceName}.openai.azure.com/openai/deployments/${azureConfig.value.deploymentId}`
    settings.updateAzureConfig({
      ...localConfig.value,
      ...azureConfig.value
    })
  } else {
    settings.updateApiConfig(localConfig.value)
  }
  
  settings.updateStageModels(localStageModels.value)
  message.success(t('messages.settingsSaved'))
  emit('update:modelValue', false)
}

// Test connection
async function testConnection() {
  if (!localConfig.value.apiKey) {
    message.warning(t('messages.pleaseEnterApiKey'))
    return
  }
  
  try {
    const response = await fetch(`${localConfig.value.baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${localConfig.value.apiKey}`
      }
    })
    
    if (response.ok) {
      message.success(t('messages.connectionSuccess'))
    } else {
      message.error(t('messages.connectionFailed', { error: response.status }))
    }
  } catch (error) {
    message.error(t('messages.connectionFailed', { error: error.message }))
  }
}

</script>

<template>
  <n-modal
    :show="modelValue"
    @update:show="emit('update:modelValue', $event)"
    :mask-closable="false"
    preset="card"
    :title="t('settings.title')"
    style="width: 520px"
    :bordered="false"
    class="!rounded-2xl"
  >
    <n-form label-placement="top" class="space-y-1">
      <!-- Channel Select -->
      <n-form-item :label="t('settings.channel')">
        <n-select
          :value="currentChannel"
          :options="channelOptions"
          @update:value="handleChannelChange"
        />
      </n-form-item>

      <!-- API Base URL -->
      <n-form-item 
        v-if="currentChannel !== 'azure'"
        :label="t('settings.apiBaseUrl')"
      >
        <n-input 
          v-model:value="localConfig.baseUrl" 
          :placeholder="currentChannel === 'custom' ? t('settings.apiBaseUrl') : channels.find(c => c.id === currentChannel)?.baseUrl"
          :disabled="currentChannel !== 'custom'"
        />
      </n-form-item>

      <!-- Azure special config -->
      <template v-if="currentChannel === 'azure'">
        <n-form-item :label="t('settings.azureResourceName')">
          <n-input 
            v-model:value="azureConfig.resourceName" 
            :placeholder="t('settings.azureResourceNamePlaceholder')"
          />
        </n-form-item>
        <n-form-item :label="t('settings.azureDeploymentId')">
          <n-input 
            v-model:value="azureConfig.deploymentId" 
            :placeholder="t('settings.azureDeploymentIdPlaceholder')"
          />
        </n-form-item>
        <n-form-item :label="t('settings.azureApiVersion')">
          <n-input 
            v-model:value="azureConfig.apiVersion" 
            placeholder="2024-02-15-preview"
          />
        </n-form-item>
      </template>

      <!-- API Key -->
      <n-form-item :label="t('settings.apiKey')">
        <n-input 
          v-model:value="localConfig.apiKey" 
          type="password"
          :placeholder="t('settings.apiKeyPlaceholder')"
          show-password-on="click"
        />
      </n-form-item>

      <!-- Default Model -->
      <n-form-item>
        <template #label>
          <div class="flex items-center gap-1">
            <span>{{ t('settings.defaultModel') }}</span>
            <n-tooltip trigger="hover">
              <template #trigger>
                <n-icon class="text-gray-400 cursor-help" :size="14">
                  <HelpCircleOutline />
                </n-icon>
              </template>
              {{ t('settings.modelHint') }}
            </n-tooltip>
          </div>
        </template>
        <n-auto-complete
          v-model:value="localConfig.model"
          :options="currentChannelModels"
          :get-show="() => true"
          :placeholder="t('settings.defaultModel')"
          clearable
        />
      </n-form-item>

      <!-- Stage-specific Models -->
      <div class="mt-4">
        <div class="flex items-center gap-1 mb-3">
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('settings.stageModels') }}</span>
          <n-tooltip trigger="hover">
            <template #trigger>
              <n-icon class="text-gray-400 cursor-help" :size="14">
                <HelpCircleOutline />
              </n-icon>
            </template>
            {{ t('settings.stageModelsHint') }}
          </n-tooltip>
        </div>
        
        <!-- Stage models grid layout -->
        <div class="grid grid-cols-1 gap-3">
          <div v-for="(label, key) in stageLabels" :key="key" class="space-y-1">
            <label class="text-xs text-gray-500 dark:text-gray-400">{{ label }}</label>
            <n-auto-complete
              v-model:value="localStageModels[key]"
              :options="currentChannelModels"
              :get-show="() => true"
              :placeholder="t('settings.stageModelsHint')"
              clearable
            />
          </div>
        </div>
      </div>
    </n-form>

    <template #footer>
      <div class="flex justify-between">
        <n-space>
          <n-button @click="() => { const url = getCurrentGetKeyUrl(); if(url) window.open(url, '_blank'); else message.warning(t('messages.noGetKeyUrl')) }" tertiary>
            {{ t('settings.getApiKey') }}
          </n-button>
          <n-button @click="testConnection" tertiary>
            <template #icon>
              <n-icon><FlashOutline /></n-icon>
            </template>
            {{ t('settings.testConnection') }}
          </n-button>
        </n-space>
        <n-space>
          <n-button @click="emit('update:modelValue', false)">{{ t('common.cancel') }}</n-button>
          <n-button type="primary" @click="saveSettings">{{ t('common.save') }}</n-button>
        </n-space>
      </div>
    </template>
  </n-modal>
</template>
