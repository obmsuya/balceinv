import { toast } from 'vue-sonner'
import { apiErrorMessage, t } from '~/utils/i18n'

export type StockStatus = 'ok' | 'low' | 'out'
export type MovementReason = 'opening' | 'sale' | 'return' | 'purchase' | 'adjustment' | 'damage' | 'transfer_in' | 'transfer_out'
export type AdjustmentReason = 'purchase' | 'return' | 'adjustment' | 'damage'

export interface StockLevel {
  product_id: string
  parent_id: string | null
  name: string
  variant_label: string
  sku: string
  unit: string
  category: string | null
  price: number
  cost_price: number
  quantity: number
  min_stock: number
  status: StockStatus
}

export interface StockSummary {
  product_count: number
  total_units: number
  value_at_cost: number
  value_at_price: number
  low_count: number
  out_count: number
}

export interface StockMovement {
  id: string
  product_id: string
  product_name: string
  variant_label: string
  sku: string
  unit: string
  change: number
  quantity_after: number
  reason: MovementReason
  reference: string | null
  user_id: string | null
  user_name: string | null
  created_at: string
}

export interface LevelFilter {
  searchText: string
  status: '' | 'low' | 'out'
  offset: number
}

export interface MovementFilter {
  productId?: string
  reason: '' | MovementReason
  fromDate: string
  toDate: string
  offset: number
}

export interface AdjustmentFields {
  product_id: string
  reason: AdjustmentReason
  change: number
  reference: string | null
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

export const stockPageSize = 50

export const movementReasons: MovementReason[] = ['opening', 'sale', 'return', 'purchase', 'adjustment', 'damage', 'transfer_in', 'transfer_out']

export const movementReasonLabel = (reason: MovementReason): string => t(`stock.reasons.${reason}`)

export const productLabel = (item: { name?: string; product_name?: string; variant_label: string }): string => {
  const baseName = item.name ?? item.product_name ?? ''
  return item.variant_label ? `${baseName} · ${item.variant_label}` : baseName
}

const localDayStart = (isoDate: string): string | undefined =>
  isoDate ? new Date(`${isoDate}T00:00:00`).toISOString() : undefined

const localDayAfter = (isoDate: string): string | undefined => {
  if (!isoDate) return undefined
  const dayAfter = new Date(`${isoDate}T00:00:00`)
  dayAfter.setDate(dayAfter.getDate() + 1)
  return dayAfter.toISOString()
}

export const useStock = () => {
  const { $apiFetch } = useNuxtApp()
  const apiFetch = $apiFetch as typeof $fetch

  const levels = ref<StockLevel[]>([])
  const totalLevels = ref(0)
  const summary = ref<StockSummary | null>(null)
  const movements = ref<StockMovement[]>([])
  const totalMovements = ref(0)
  const loading = ref(false)
  const saving = ref(false)

  const searchLevels = async (searchText: string, limit = 8): Promise<StockLevel[]> => {
    const levelPage = await apiFetch<ApiEnvelope<Page<StockLevel>>>('/api/stock', {
      query: { q: searchText || undefined, limit },
    })
    return levelPage.data.items
  }

  const fetchLevels = async (filter: LevelFilter): Promise<void> => {
    loading.value = true
    try {
      const levelPage = await apiFetch<ApiEnvelope<Page<StockLevel>>>('/api/stock', {
        query: {
          q: filter.searchText || undefined,
          status: filter.status || undefined,
          limit: stockPageSize,
          offset: filter.offset,
        },
      })
      levels.value = levelPage.data.items
      totalLevels.value = levelPage.data.total
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'stock.toasts.levelsFailed'))
    } finally {
      loading.value = false
    }
  }

  const fetchSummary = async (): Promise<void> => {
    try {
      const summaryResponse = await apiFetch<ApiEnvelope<StockSummary>>('/api/stock/summary')
      summary.value = summaryResponse.data
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'stock.toasts.summaryFailed'))
    }
  }

  const fetchMovements = async (filter: MovementFilter): Promise<void> => {
    loading.value = true
    try {
      const movementPage = await apiFetch<ApiEnvelope<Page<StockMovement>>>('/api/stock-movements', {
        query: {
          product_id: filter.productId || undefined,
          reason: filter.reason || undefined,
          from: localDayStart(filter.fromDate),
          to: localDayAfter(filter.toDate),
          limit: stockPageSize,
          offset: filter.offset,
        },
      })
      movements.value = movementPage.data.items
      totalMovements.value = movementPage.data.total
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'stock.toasts.historyFailed'))
    } finally {
      loading.value = false
    }
  }

  const adjustStock = async (adjustmentFields: AdjustmentFields): Promise<StockMovement | undefined> => {
    saving.value = true
    try {
      const adjustResponse = await apiFetch<ApiEnvelope<StockMovement>>('/api/stock-movements', {
        method: 'POST',
        body: adjustmentFields,
      })
      toast.success(t('stock.toasts.adjusted'))
      return adjustResponse.data
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'stock.toasts.adjustFailed'))
      throw error
    } finally {
      saving.value = false
    }
  }

  return {
    levels,
    totalLevels,
    summary,
    movements,
    totalMovements,
    loading,
    saving,
    searchLevels,
    fetchLevels,
    fetchSummary,
    fetchMovements,
    adjustStock,
  }
}
