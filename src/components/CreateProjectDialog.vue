<script setup>
import { ref, reactive, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useNovelStore } from '../stores/novel'
import { useI18n } from '../i18n'
import { useMessage } from 'naive-ui'
import { NModal, NForm, NFormItem, NInput, NInputNumber, NSelect, NButton, NSpace, NIcon } from 'naive-ui'
import { CheckmarkOutline } from '@vicons/ionicons5'

const props = defineProps({
  modelValue: Boolean
})

const emit = defineEmits(['update:modelValue'])
const router = useRouter()
const novelStore = useNovelStore()
const { t } = useI18n()
const message = useMessage()

// Form data
const formRef = ref(null)
const form = reactive({
  title: '',
  topic: '',
  genre: ['fantasy'],
  numberOfChapters: 100,
  wordNumber: 3000,
  userGuidance: ''
})

// Genre options - computed dynamically based on locale
import { computed } from 'vue'
const genreOptions = computed(() => [
  { label: t('genres.fantasy'), value: 'fantasy' },
  { label: t('genres.xianxia'), value: 'xianxia' },
  { label: t('genres.urban'), value: 'urban' },
  { label: t('genres.historical'), value: 'historical' },
  { label: t('genres.sciFi'), value: 'sciFi' },
  { label: t('genres.game'), value: 'game' },
  { label: t('genres.mystery'), value: 'mystery' },
  { label: t('genres.magic'), value: 'magic' },
  { label: t('genres.wuxia'), value: 'wuxia' },
  { label: t('genres.romance'), value: 'romance' },
  { label: t('genres.military'), value: 'military' },
  { label: t('genres.sports'), value: 'sports' },
  { label: t('genres.supernatural'), value: 'supernatural' },
  { label: t('genres.anime'), value: 'anime' },
  { label: t('genres.other'), value: 'other' }
])

// Form rules
const rules = computed(() => ({
  title: [{ required: true, message: t('createProject.validation.titleRequired'), trigger: 'blur' }],
  topic: [{ required: true, message: t('createProject.validation.topicRequired'), trigger: 'blur' }],
  genre: [
    {
      required: true,
      trigger: 'change',
      validator: (_rule, value) => {
        if (Array.isArray(value) && value.length > 0) return true
        return new Error(t('createProject.validation.genreRequired'))
      }
    }
  ],
  numberOfChapters: [{ required: true, message: t('createProject.validation.chapterCountRequired'), trigger: 'blur', type: 'number' }],
  wordNumber: [{ required: true, message: t('createProject.validation.wordCountRequired'), trigger: 'blur', type: 'number' }]
}))

// Reset form when dialog opens
watch(() => props.modelValue, (val) => {
  if (val) {
    form.title = ''
    form.topic = ''
    form.genre = ['fantasy']
    form.numberOfChapters = 100
    form.wordNumber = 3000
    form.userGuidance = ''
  }
})

// Create project
async function createProject() {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    
    const project = novelStore.createProject({
      title: form.title,
      topic: form.topic,
      genre: form.genre,
      numberOfChapters: form.numberOfChapters,
      wordNumber: form.wordNumber,
      userGuidance: form.userGuidance
    })
    
    message.success(t('messages.projectCreated'))
    emit('update:modelValue', false)
    router.push(`/project/${project.id}`)
  } catch (error) {
    // Validation failed
  }
}
</script>

<template>
  <n-modal
    :show="modelValue"
    @update:show="emit('update:modelValue', $event)"
    :mask-closable="false"
    preset="card"
    :title="t('createProject.title')"
    style="width: 620px"
    :bordered="false"
    class="!rounded-2xl"
  >
    <n-form 
      ref="formRef"
      :model="form" 
      :rules="rules"
      label-placement="top"
      class="space-y-1"
    >
      <!-- Project title -->
      <n-form-item :label="t('createProject.projectTitle')" path="title">
        <n-input 
          v-model:value="form.title" 
          :placeholder="t('createProject.projectTitlePlaceholder')"
          :maxlength="50"
          show-count
        />
      </n-form-item>

      <!-- Novel topic -->
      <n-form-item :label="t('createProject.novelTopic')" path="topic">
        <n-input 
          v-model:value="form.topic" 
          type="textarea"
          :rows="3"
          :placeholder="t('createProject.novelTopicPlaceholder')"
          :maxlength="500"
          show-count
        />
      </n-form-item>

      <!-- Genre selection -->
      <n-form-item :label="t('createProject.genre')" path="genre">
        <n-select 
          v-model:value="form.genre" 
          :options="genreOptions"
          multiple
          class="w-full"
        />
      </n-form-item>

      <!-- Chapter count and word count -->
      <div class="grid grid-cols-2 gap-4">
        <n-form-item :label="t('createProject.chapterCount')" path="numberOfChapters">
          <n-input-number 
            v-model:value="form.numberOfChapters" 
            :min="10" 
            :max="500"
            :step="10"
            class="w-full"
          />
        </n-form-item>

        <n-form-item :label="t('createProject.wordCount')" path="wordNumber">
          <n-input-number 
            v-model:value="form.wordNumber" 
            :min="1000" 
            :max="10000"
            :step="500"
            class="w-full"
          />
        </n-form-item>
      </div>

      <!-- User guidance -->
      <n-form-item :label="t('createProject.userGuidance')">
        <n-input 
          v-model:value="form.userGuidance" 
          type="textarea"
          :rows="3"
          :placeholder="t('createProject.userGuidancePlaceholder')"
          :maxlength="1000"
          show-count
        />
      </n-form-item>
    </n-form>

    <template #footer>
      <n-space justify="end">
        <n-button @click="emit('update:modelValue', false)">{{ t('common.cancel') }}</n-button>
        <n-button type="primary" @click="createProject">
          <template #icon>
            <n-icon><CheckmarkOutline /></n-icon>
          </template>
          {{ t('createProject.createButton') }}
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template>
