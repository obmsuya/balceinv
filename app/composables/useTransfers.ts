import { toast } from 'vue-sonner'

export interface TransferItem {
  product_id: string
  product_name: string
  variant_label: string
  sku: string
  unit: string
  quantity: number
}

export interface StockTransfer {
  id: string
  from_shop_id: string
  from_shop_name: string
  to_shop_id: string
  to_shop_name: string
  note: string | null
  user_name: string | null
  item_count: number
  total_units: number
  created_at: string
  items?: TransferItem[]
}

export interface TransferFields {
  to_shop_id: string
  note: string | null
  items: Array<{ product_id: string; quantity: number }>
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

export const transferPageSize = 25

export const useTransfers = () => {
  const { $apiFetch } = useNuxtApp()
  const apiFetch = $apiFetch as typeof $fetch

  const transfers = ref<StockTransfer[]>([])
  const totalTransfers = ref(0)
  const loading = ref(false)
  const saving = ref(false)

  const fetchTransfers = async (offset = 0): Promise<void> => {
    loading.value = true
    try {
      const transferPage = await apiFetch<ApiEnvelope<Page<StockTransfer>>>('/api/stock-transfers', {
        query: { limit: transferPageSize, offset },
      })
      transfers.value = transferPage.data.items
      totalTransfers.value = transferPage.data.total
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to load transfers')
    } finally {
      loading.value = false
    }
  }

  const fetchTransfer = async (transferId: string): Promise<StockTransfer | undefined> => {
    try {
      const transferResponse = await apiFetch<ApiEnvelope<StockTransfer>>(`/api/stock-transfers/${transferId}`)
      return transferResponse.data
    } catch (error: any) {
      toast.error(error?.data?.message || 'Could not load the transfer')
    }
  }

  const sendStock = async (transferFields: TransferFields): Promise<StockTransfer | undefined> => {
    saving.value = true
    try {
      const sendResponse = await apiFetch<ApiEnvelope<StockTransfer>>('/api/stock-transfers', {
        method: 'POST',
        body: transferFields,
      })
      toast.success(sendResponse.message)
      return sendResponse.data
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to send the stock')
      throw error
    } finally {
      saving.value = false
    }
  }

  return {
    transfers,
    totalTransfers,
    loading,
    saving,
    fetchTransfers,
    fetchTransfer,
    sendStock,
  }
}
