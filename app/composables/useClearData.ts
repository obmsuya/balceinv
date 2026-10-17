import { toast } from 'vue-sonner'
import { apiErrorMessage, t } from '~/utils/i18n'

export interface ClearResult {
  kept_shop_id: string
  products: number
  sales: number
  customers: number
  suppliers: number
  shops_removed: number
  staff_removed: number
  files_removed: number
}

interface ApiEnvelope<Payload> {
  success: boolean
  message: string
  data: Payload
}

export const useClearData = () => {
  const { $apiFetch } = useNuxtApp()
  const apiFetch = $apiFetch as typeof $fetch

  const clearing = ref(false)
  const clearError = ref<string | null>(null)

  const clearBusinessData = async (businessName: string, password: string): Promise<ClearResult | undefined> => {
    clearing.value = true
    clearError.value = null
    try {
      const clearResponse = await apiFetch<ApiEnvelope<ClearResult>>('/api/business/clear-data', {
        method: 'POST',
        body: { business_name: businessName, password },
      })
      toast.success(t('clearData.toasts.cleared'), {
        description: t('clearData.toasts.clearedDetail', { products: clearResponse.data.products, sales: clearResponse.data.sales }),
      })
      return clearResponse.data
    } catch (error: any) {
      clearError.value = apiErrorMessage(error, 'clearData.toasts.failed')
      toast.error(clearError.value)
      return undefined
    } finally {
      clearing.value = false
    }
  }

  return {
    clearing,
    clearError,
    clearBusinessData,
  }
}
