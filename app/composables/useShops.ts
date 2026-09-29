import { toast } from 'vue-sonner'
import { apiErrorMessage, t } from '~/utils/i18n'

export interface Shop {
  id: string
  name: string
  address: string | null
  phone: string | null
  receipt_prefix: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ShopFields {
  name: string
  address: string | null
  phone: string | null
  receipt_prefix: string
  is_active?: boolean
}

interface ApiEnvelope<Payload> {
  success: boolean
  message: string
  data: Payload
}

interface Page<Item> {
  items: Item[]
  total: number
  limit: number
  offset: number
}

export const useShops = () => {
  const { $apiFetch } = useNuxtApp()
  const apiFetch = $apiFetch as typeof $fetch
  const { fetchCurrentUser } = useAuth()

  const shops = ref<Shop[]>([])
  const loading = ref(false)
  const saving = ref(false)

  const fetchShops = async (): Promise<void> => {
    loading.value = true
    try {
      const shopPage = await apiFetch<ApiEnvelope<Page<Shop>>>('/api/shops', { query: { limit: 100 } })
      shops.value = shopPage.data.items
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'shops.toasts.loadFailed'))
    } finally {
      loading.value = false
    }
  }

  const saveShop = async (shopId: string | null, shopFields: ShopFields): Promise<Shop | undefined> => {
    saving.value = true
    try {
      const saveResponse = await apiFetch<ApiEnvelope<Shop>>(shopId ? `/api/shops/${shopId}` : '/api/shops', {
        method: shopId ? 'PUT' : 'POST',
        body: shopFields,
      })
      await Promise.all([fetchShops(), fetchCurrentUser()])
      toast.success(shopId ? t('shops.toasts.saved') : t('shops.toasts.created'))
      return saveResponse.data
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'shops.toasts.saveFailed'))
      throw error
    } finally {
      saving.value = false
    }
  }

  const closeShop = async (shopId: string): Promise<void> => {
    saving.value = true
    try {
      const closeResponse = await apiFetch<ApiEnvelope<Shop>>(`/api/shops/${shopId}`, { method: 'DELETE' })
      await Promise.all([fetchShops(), fetchCurrentUser()])
      toast.success(t('shops.toasts.closed'))
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'shops.toasts.closeFailed'))
      throw error
    } finally {
      saving.value = false
    }
  }

  return {
    shops,
    loading,
    saving,
    fetchShops,
    saveShop,
    closeShop,
  }
}
