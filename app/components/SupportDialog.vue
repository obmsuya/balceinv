<script setup lang="ts">
import { CircleCheck, Clock, ImagePlus, LifeBuoy, LoaderCircle, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatPhone, normalizePhone } from '~/utils/mobileMoney'
import { supportMessageLimit, supportScreenshotLimitBytes, supportTopics } from '~/composables/useSupport'
import type { SupportResult, SupportStatus, SupportTopic } from '~/composables/useSupport'

const acceptedScreenshotTypes = ['image/png', 'image/jpeg', 'image/webp']
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const { t, formatRelativeTime } = useI18n()
const { user } = useAuth()
const {
  dialogOpen,
  sendingMessage,
  emailConfigured,
  recentMessages,
  fetchSupportStatus,
  fetchRecentMessages,
  sendSupportMessage,
} = useSupport()

const topic = ref<SupportTopic>('question')
const message = ref('')
const contactEmail = ref('')
const contactPhone = ref('')
const includeDetails = ref(true)
const screenshot = ref('')
const screenshotProblem = ref(false)
const attemptedSubmit = ref(false)
const result = ref<SupportResult | null>(null)
const screenshotInput = ref<HTMLInputElement | null>(null)

const trimmedMessage = computed(() => message.value.trim())
const trimmedEmail = computed(() => contactEmail.value.trim())
const trimmedPhone = computed(() => contactPhone.value.trim())

const messageProblem = computed(() => {
  if (trimmedMessage.value.length < 5) return t('support.form.messageTooShort')
  if (trimmedMessage.value.length > supportMessageLimit) return t('support.form.messageTooLong')
  return ''
})
const emailProblem = computed(() => (trimmedEmail.value && !emailPattern.test(trimmedEmail.value) ? t('support.form.emailInvalid') : ''))
const phoneProblem = computed(() => (trimmedPhone.value && !normalizePhone(trimmedPhone.value) ? t('support.form.phoneInvalid') : ''))
const contactProblem = computed(() => (!trimmedEmail.value && !trimmedPhone.value ? t('support.form.contactRequired') : ''))
const hasProblems = computed(() => Boolean(messageProblem.value || emailProblem.value || phoneProblem.value || contactProblem.value))

const resultTitle = computed(() => (result.value?.status === 'sent' ? t('support.result.sentTitle') : t('support.result.waitingTitle')))
const resultText = computed(() => {
  if (result.value?.status === 'sent') return t('support.result.sentText')
  if (result.value && !result.value.configured) return t('support.result.notSetUpText')
  return t('support.result.waitingText')
})

const statusLabel = (status: SupportStatus): string => t(`support.recent.${status}`)

const resetForm = () => {
  topic.value = 'question'
  message.value = ''
  contactEmail.value = user.value?.email ?? ''
  contactPhone.value = ''
  includeDetails.value = true
  screenshot.value = ''
  screenshotProblem.value = false
  attemptedSubmit.value = false
  result.value = null
}

const formatPhoneInput = async (typedPhone: string | number) => {
  const phoneText = String(typedPhone)
  contactPhone.value = phoneText
  await nextTick()
  contactPhone.value = /\d/.test(phoneText) ? formatPhone(phoneText) : phoneText
}

const chooseScreenshot = () => screenshotInput.value?.click()

const readScreenshot = (changeEvent: Event) => {
  const fileInput = changeEvent.target as HTMLInputElement
  const chosenFile = fileInput.files?.[0]
  fileInput.value = ''
  if (!chosenFile) return
  const isUsable = acceptedScreenshotTypes.includes(chosenFile.type) && chosenFile.size <= supportScreenshotLimitBytes
  screenshotProblem.value = !isUsable
  if (!isUsable) return
  const fileReader = new FileReader()
  fileReader.onload = () => {
    screenshot.value = String(fileReader.result ?? '')
  }
  fileReader.readAsDataURL(chosenFile)
}

const submit = async () => {
  attemptedSubmit.value = true
  if (hasProblems.value) return
  const sendResult = await sendSupportMessage({
    topic: topic.value,
    message: trimmedMessage.value,
    contact_email: trimmedEmail.value,
    contact_phone: trimmedPhone.value,
    include_details: includeDetails.value,
    screenshot: screenshot.value,
  })
  if (sendResult) result.value = sendResult
}

watch(dialogOpen, isOpen => {
  if (!isOpen) return
  resetForm()
  fetchSupportStatus()
  fetchRecentMessages()
})
</script>

<template>
  <Dialog v-model:open="dialogOpen">
    <DialogContent class="max-h-[92vh] max-w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2"><LifeBuoy class="size-5" /> {{ t('support.title') }}</DialogTitle>
        <DialogDescription>{{ t('support.description') }}</DialogDescription>
      </DialogHeader>

      <div v-if="result" class="flex flex-col items-center gap-2 py-4 text-center">
        <CircleCheck v-if="result.status === 'sent'" class="size-10 text-emerald-600" />
        <Clock v-else class="size-10 text-amber-600" />
        <p class="text-lg font-semibold">{{ resultTitle }}</p>
        <p class="text-sm text-muted-foreground">{{ resultText }}</p>
        <div class="mt-2 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
          <Button variant="outline" @click="resetForm">{{ t('support.result.sendAnother') }}</Button>
          <Button @click="dialogOpen = false">{{ t('support.result.close') }}</Button>
        </div>
      </div>

      <form v-else class="flex flex-col gap-4" novalidate @submit.prevent="submit">
        <p v-if="emailConfigured === false" class="rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          {{ t('support.form.notSetUp') }}
        </p>

        <fieldset class="flex flex-col gap-2">
          <legend class="mb-2 text-sm font-medium">{{ t('support.topics.label') }}</legend>
          <div class="flex flex-wrap gap-2">
            <Button
              v-for="topicOption in supportTopics"
              :key="topicOption"
              type="button"
              size="sm"
              :variant="topic === topicOption ? 'default' : 'outline'"
              :aria-pressed="topic === topicOption"
              class="rounded-full"
              @click="topic = topicOption"
            >
              {{ t(`support.topics.${topicOption}`) }}
            </Button>
          </div>
        </fieldset>

        <div class="flex flex-col gap-1.5">
          <div class="flex items-baseline justify-between gap-2">
            <Label for="support-message">{{ t('support.form.message') }}</Label>
            <span class="text-xs tabular-nums text-muted-foreground" :class="{ 'text-destructive': trimmedMessage.length > supportMessageLimit }">
              {{ t('support.form.characters', { count: trimmedMessage.length, limit: supportMessageLimit }) }}
            </span>
          </div>
          <Textarea
            id="support-message"
            v-model="message"
            rows="5"
            class="min-h-28"
            :placeholder="t('support.form.messagePlaceholder')"
            :aria-invalid="attemptedSubmit && !!messageProblem"
          />
          <p v-if="attemptedSubmit && messageProblem" class="text-xs text-destructive">{{ messageProblem }}</p>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div class="flex flex-col gap-1.5">
            <Label for="support-email">{{ t('support.form.email') }}</Label>
            <Input id="support-email" v-model="contactEmail" type="email" autocomplete="email" :aria-invalid="attemptedSubmit && !!emailProblem" />
            <p v-if="attemptedSubmit && emailProblem" class="text-xs text-destructive">{{ emailProblem }}</p>
          </div>
          <div class="flex flex-col gap-1.5">
            <Label for="support-phone">{{ t('support.form.phone') }}</Label>
            <Input
              id="support-phone"
              :model-value="contactPhone"
              type="tel"
              inputmode="tel"
              autocomplete="tel"
              :placeholder="t('support.form.phonePlaceholder')"
              :aria-invalid="attemptedSubmit && !!phoneProblem"
              @update:model-value="formatPhoneInput"
            />
            <p v-if="attemptedSubmit && phoneProblem" class="text-xs text-destructive">{{ phoneProblem }}</p>
          </div>
        </div>
        <p v-if="attemptedSubmit && contactProblem" class="-mt-2 text-xs text-destructive">{{ contactProblem }}</p>

        <div class="flex flex-col gap-2">
          <input ref="screenshotInput" type="file" class="hidden" :accept="acceptedScreenshotTypes.join(',')" @change="readScreenshot">
          <div v-if="screenshot" class="relative w-fit">
            <img :src="screenshot" :alt="t('support.form.screenshotAlt')" class="max-h-40 rounded-md border object-contain">
            <Button type="button" size="icon" variant="secondary" class="absolute right-1 top-1 size-7" :aria-label="t('support.form.removeScreenshot')" @click="screenshot = ''">
              <X class="size-4" />
            </Button>
          </div>
          <Button type="button" variant="outline" size="sm" class="w-fit" @click="chooseScreenshot">
            <ImagePlus class="size-4" />
            {{ screenshot ? t('support.form.changeScreenshot') : t('support.form.screenshot') }}
          </Button>
          <p v-if="screenshotProblem" class="text-xs text-destructive">{{ t('support.form.screenshotInvalid') }}</p>
        </div>

        <div class="flex flex-col gap-1">
          <Label class="flex items-start gap-2 font-normal leading-snug">
            <Checkbox :model-value="includeDetails" class="mt-0.5" @update:model-value="includeDetails = $event === true" />
            {{ t('support.form.includeDetails') }}
          </Label>
          <details class="pl-6 text-xs text-muted-foreground">
            <summary class="cursor-pointer select-none">{{ t('support.form.whatsIncluded') }}</summary>
            <p class="mt-1">{{ t('support.form.includedItems') }}</p>
          </details>
        </div>

        <Button type="submit" class="w-full" :disabled="sendingMessage">
          <LoaderCircle v-if="sendingMessage" class="size-4 animate-spin" />
          {{ sendingMessage ? t('support.form.sending') : t('support.form.send') }}
        </Button>
      </form>

      <div v-if="recentMessages.length" class="flex flex-col gap-2 border-t pt-4">
        <p class="text-sm font-medium">{{ t('support.recent.title') }}</p>
        <ul class="flex flex-col gap-2">
          <li v-for="recentMessage in recentMessages.slice(0, 5)" :key="recentMessage.id" class="flex items-start justify-between gap-3 text-sm">
            <span class="min-w-0">
              <span class="block truncate">{{ recentMessage.preview }}</span>
              <span class="block text-xs text-muted-foreground">{{ t(`support.topics.${recentMessage.topic}`) }} · {{ formatRelativeTime(recentMessage.created_at) }}</span>
            </span>
            <span
              class="shrink-0 rounded-full px-2 py-0.5 text-xs"
              :class="recentMessage.status === 'sent' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'"
            >
              {{ statusLabel(recentMessage.status) }}
            </span>
          </li>
        </ul>
      </div>
    </DialogContent>
  </Dialog>
</template>
