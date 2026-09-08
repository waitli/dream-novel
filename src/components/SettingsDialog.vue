<script setup>
import { ref, computed, watch } from 'vue'
import { NModal, NForm, NFormItem, NInput, NInputNumber, NButton, NSpace, NCollapse, NCollapseItem, NAlert, useMessage } from 'naive-ui'
import { useSettingsStore } from '../stores/settings'
import { useI18n } from '../i18n'
import { DEFAULT_API_CONFIG, normalizeApiConfig, validateApiConfig } from '../utils/api-config.js'
import { chatCompletion } from '../api/llm.js'

const props = defineProps({ modelValue: Boolean })
const emit = defineEmits(['update:modelValue'])
const settings = useSettingsStore(), message = useMessage()
const { t } = useI18n()
const localConfig = ref({ ...DEFAULT_API_CONFIG })
const localStageModels = ref({})
const testing = ref(false), testResult = ref('')
const legacy = computed(() => ['azure', 'anthropic'].includes(localConfig.value.channel))
const copy = computed(() => settings.locale === 'en-US' ? {
  intro: 'One connection for the whole writing workflow. DeepSeek is prefilled; you can use another OpenAI-compatible endpoint.',
  legacy: 'Your existing native API configuration is preserved. Switching to a compatible endpoint requires its URL and API key.',
  switch: 'Use a compatible API', advanced: 'Advanced settings (optional)', test: 'Test connection',
  testHint: 'Sends a short request using your selected model. Usage may be charged by your provider.',
  passed: 'Connection successful', failed: 'Connection failed', temperature: 'Temperature', timeout: 'Timeout (seconds)',
  storage: 'Settings could not be saved. Please check browser storage.',
  model: 'Enter the model ID supplied by your API provider'
} : {
  intro: '一次配置用于全部创作环节。默认填入 DeepSeek，也可使用其他 OpenAI 兼容接口。',
  legacy: '已保留你的旧版原生接口配置。切换到兼容接口后，需要填写对应的地址和密钥。',
  switch: '切换到兼容接口', advanced: '高级设置（可选）', test: '测试连接',
  testHint: '会使用所选模型发送一条简短请求，接口提供方可能收取用量费用。',
  passed: '连接成功', failed: '连接失败', temperature: '创作温度', timeout: '超时（秒）',
  storage: '设置保存失败，请检查浏览器存储空间。',
  model: '填写接口提供方给出的模型名称'
})
const stageLabels = computed(() => ({
  architecture: t('settings.stages.architecture'), blueprint: t('settings.stages.blueprint'),
  chapter: t('settings.stages.chapter'), finalize: t('settings.stages.finalize'), enrich: t('settings.stages.enrich')
}))
watch(() => props.modelValue, show => {
  if (!show) return
  localConfig.value = normalizeApiConfig(settings.apiConfig)
  localStageModels.value = { ...settings.stageModels }
  testResult.value = ''
}, { immediate: true })
watch(localConfig, () => { testResult.value = '' }, { deep: true })
function switchToCompatible() {
  localConfig.value = { ...DEFAULT_API_CONFIG }
  localStageModels.value = Object.fromEntries(Object.keys(stageLabels.value).map(key => [key, '']))
}
async function testConnection() {
  if (testing.value) return
  try {
    const config = validateApiConfig(localConfig.value)
    testing.value = true
    testResult.value = ''
    await chatCompletion({ ...config, timeout: 30 }, 'Reply only with OK.')
    testResult.value = copy.value.passed
    message.success(copy.value.passed)
  } catch (error) {
    testResult.value = copy.value.failed + ': ' + error.message
    message.error(testResult.value)
  } finally { testing.value = false }
}
function saveSettings() {
  try {
    const config = validateApiConfig(localConfig.value)
    settings.updateApiConfig(config)
    settings.updateStageModels(Object.fromEntries(Object.entries(localStageModels.value).map(([key, value]) => [key, String(value || '').trim()])))
    message.success(t('messages.settingsSaved'))
    emit('update:modelValue', false)
  } catch (error) { message.error(error.message || copy.value.storage) }
}
</script>

<template>
  <n-modal :show="modelValue" @update:show="emit('update:modelValue', $event)" :mask-closable="false"
    :closable="!testing" preset="card" :title="t('settings.title')" :bordered="false"
    style="width: min(520px, calc(100vw - 32px)); max-height: 90vh; overflow: auto" class="!rounded-2xl">
    <p class="text-sm text-gray-500 mb-4">{{ copy.intro }}</p>
    <n-alert v-if="legacy" type="warning" class="mb-4">
      {{ copy.legacy }}
      <n-button size="small" class="mt-2" :disabled="testing" @click="switchToCompatible">{{ copy.switch }}</n-button>
    </n-alert>
    <n-form label-placement="top" :disabled="testing">
      <template v-if="localConfig.channel === 'azure'">
        <n-form-item :label="t('settings.azureResourceName')"><n-input v-model:value="localConfig.resourceName" /></n-form-item>
        <n-form-item :label="t('settings.azureDeploymentId')"><n-input v-model:value="localConfig.deploymentId" /></n-form-item>
        <n-form-item :label="t('settings.azureApiVersion')"><n-input v-model:value="localConfig.apiVersion" /></n-form-item>
      </template>
      <n-form-item v-else :label="t('settings.apiBaseUrl')">
        <n-input v-model:value="localConfig.baseUrl" placeholder="https://api.deepseek.com" />
      </n-form-item>
      <n-form-item :label="t('settings.apiKey')">
        <n-input v-model:value="localConfig.apiKey" type="password" :placeholder="t('settings.apiKeyPlaceholder')" show-password-on="click" />
      </n-form-item>
      <n-form-item v-if="localConfig.channel !== 'azure'" :label="t('settings.defaultModel')">
        <n-input v-model:value="localConfig.model" :placeholder="copy.model" />
      </n-form-item>
      <n-collapse>
        <n-collapse-item :title="copy.advanced" name="advanced">
          <n-form-item :label="t('settings.maxTokens')">
            <n-input-number v-model:value="localConfig.maxTokens" :min="1" :max="384000" :step="1024" class="w-full" />
          </n-form-item>
          <n-form-item :label="copy.temperature">
            <n-input-number v-model:value="localConfig.temperature" :min="0" :max="2" :step="0.1" class="w-full" />
          </n-form-item>
          <n-form-item :label="copy.timeout">
            <n-input-number v-model:value="localConfig.timeout" :min="1" :max="3600" class="w-full" />
          </n-form-item>
          <p class="text-sm text-gray-500 mb-3">{{ t('settings.stageModelsHint') }}</p>
          <n-form-item v-for="(label, key) in stageLabels" :key="key" :label="label">
            <n-input v-model:value="localStageModels[key]" :placeholder="localConfig.model" clearable />
          </n-form-item>
        </n-collapse-item>
      </n-collapse>
    </n-form>
    <p class="text-xs text-gray-500 mt-4">{{ copy.testHint }}</p>
    <p v-if="testResult" role="status" class="text-sm mt-2 break-words">{{ testResult }}</p>
    <template #footer>
      <div class="flex justify-between gap-2 flex-wrap">
        <n-button :loading="testing" @click="testConnection">{{ copy.test }}</n-button>
        <n-space>
          <n-button :disabled="testing" @click="emit('update:modelValue', false)">{{ t('common.cancel') }}</n-button>
          <n-button type="primary" :disabled="testing" @click="saveSettings">{{ t('common.save') }}</n-button>
        </n-space>
      </div>
    </template>
  </n-modal>
</template>
