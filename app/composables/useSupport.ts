import { toast } from 'vue-sonner'
import { apiErrorMessage, t } from '~/utils/i18n'
import { isTauri } from '~/composables/usePlatform'

export type SupportTopic = 'question' | 'problem' | 'billing' | 'idea'
export type SupportStatus = 'pending' | 'sending' | 'sent' | 'failed'

export interface SupportMessage {
  id: string
  topic: SupportTopic
  preview: string
  status: SupportStatus
  created_at: string
  sent_at: string | null
}

export interface SupportRequest {
  topic: SupportTopic
  message: string
  contact_email: string
  contact_phone: string
  include_details: boolean
  screenshot: string
}

export interface SupportResult {
  id: string
  status: SupportStatus
  configured: boolean
}

interface ApiEnvelope<Payload> {
  success: boolean
  message: string
  data: Payload
}

export const supportTopics: SupportTopic[] = ['question', 'problem', 'billing', 'idea']
export const supportMessageLimit = 5000
export const supportScreenshotLimitBytes = 2 * 1024 * 1024

export const lastErrorRequestId = ref<string | null>(null)

const readAppVersion = async (): Promise<string> => {
  if (!isTauri()) return ''
  try {
    const { getVersion } = await import('@tauri-apps/api/app')
    return await getVersion()
  } catch {
    return ''
  }
}

export const useSupport = () => {
  const { $apiFetch } = useNuxtApp()
  const apiFetch = $apiFetch as typeof $fetch
  const { hardwareId } = useLicense()
  const dialogOpen = useState<boolean>('support:dialog-open', () => false)
  const sendingMessage = useState<boolean>('support:sending', () => false)
  const emailConfigured = useState<boolean | null>('support:configured', () => null)
  const recentMessages = useState<SupportMessage[]>('support:recent', () => [])

  const openSupport = () => {
    dialogOpen.value = true
  }

  const fetchSupportStatus = async (): Promise<void> => {
    try {
      const statusResponse = await apiFetch<ApiEnvelope<{ configured: boolean }>>('/api/support/status')
      emailConfigured.value = statusResponse.data.configured
    } catch {
      emailConfigured.value = null
    }
  }

  const fetchRecentMessages = async (): Promise<void> => {
    try {
      const messagesResponse = await apiFetch<ApiEnvelope<SupportMessage[]>>('/api/support/messages')
      recentMessages.value = messagesResponse.data ?? []
    } catch {
      recentMessages.value = []
    }
  }

  const sendSupportMessage = async (request: SupportRequest): Promise<SupportResult | null> => {
    sendingMessage.value = true
    try {
      const submitResponse = await apiFetch<ApiEnvelope<SupportResult>>('/api/support', {
        method: 'POST',
        body: {
          ...request,
          app_version: await readAppVersion(),
          operating_system: navigator.userAgent.slice(0, 160),
          device_id: hardwareId.value ?? '',
          last_request_id: lastErrorRequestId.value ?? '',
        },
      })
      emailConfigured.value = submitResponse.data.configured
      toast.success(submitResponse.data.status === 'sent' ? t('support.toasts.sent') : t('support.toasts.saved'))
      await fetchRecentMessages()
      return submitResponse.data
    } catch (error: any) {
      const isRateLimited = error?.data?.code === 'rate_limited'
      toast.error(isRateLimited ? t('support.toasts.rateLimited') : apiErrorMessage(error, 'support.toasts.sendFailed'))
      return null
    } finally {
      sendingMessage.value = false
    }
  }

  return {
    dialogOpen,
    sendingMessage: readonly(sendingMessage),
    emailConfigured: readonly(emailConfigured),
    recentMessages: readonly(recentMessages),
    openSupport,
    fetchSupportStatus,
    fetchRecentMessages,
    sendSupportMessage,
  }
}
