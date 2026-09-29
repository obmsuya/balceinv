import { toast } from 'vue-sonner'
import { activeLocale, formatDate, formatDateTime, formatNumber, formatRelativeTime, setActiveLocale, t } from '~/utils/i18n'
import type { Locale } from '~/utils/translate'
import type { CurrentUser } from '~/composables/useAuth'

interface ApiEnvelope<Payload> {
  success: boolean
  message: string
  data: Payload
}

export const useI18n = () => {
  const chooseLanguage = async (chosenLocale: Locale) => {
    const previousLocale = activeLocale.value
    setActiveLocale(chosenLocale)
    const { user, applyCurrentUser } = useAuth()
    if (!user.value) return
    try {
      const { $apiFetch } = useNuxtApp()
      const apiFetch = $apiFetch as typeof $fetch
      const savedUser = await apiFetch<ApiEnvelope<CurrentUser>>('/api/auth/language', {
        method: 'PUT',
        body: { locale: chosenLocale },
      })
      applyCurrentUser(savedUser.data)
    } catch {
      setActiveLocale(previousLocale)
      toast.error(t('common.language.saveFailed'))
    }
  }

  return {
    t,
    locale: activeLocale,
    chooseLanguage,
    formatDate,
    formatDateTime,
    formatNumber,
    formatRelativeTime,
  }
}
