import { toast } from 'vue-sonner'
import { formatMoney } from '~/utils/money'

export type DiscountKind = 'percent' | 'fixed'
export type DiscountStatus = 'scheduled' | 'active' | 'expired' | 'stopped'

export interface Discount {
  id: string
  name: string
  product_id: string | null
  product_name: string | null
  variant_label: string | null
  kind: DiscountKind
  value: number
  starts_at: string
  ends_at: string
  is_active: boolean
  status: DiscountStatus
  created_at: string
  updated_at: string
}

export interface DiscountFields {
  name: string
  product_id: string | null
  kind: DiscountKind
  value: number
  starts_at: string
  ends_at: string
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

export const discountPageSize = 50

export const discountValueLabel = (discount: Pick<Discount, 'kind' | 'value'>): string =>
  discount.kind === 'percent'
    ? `${(discount.value / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}% off`
    : `${formatMoney(discount.value)} off each`

export const discountTargetLabel = (discount: Discount): string => {
  if (!discount.product_id) return 'Every product'
  return discount.variant_label ? `${discount.product_name} · ${discount.variant_label}` : discount.product_name ?? 'A product'
}

export const useDiscounts = () => {
  const { $apiFetch } = useNuxtApp()
  const apiFetch = $apiFetch as typeof $fetch

  const discounts = ref<Discount[]>([])
  const totalDiscounts = ref(0)
  const loading = ref(false)
  const saving = ref(false)

  const fetchDiscounts = async (offset = 0): Promise<void> => {
    loading.value = true
    try {
      const discountPage = await apiFetch<ApiEnvelope<Page<Discount>>>('/api/discounts', {
        query: { limit: discountPageSize, offset },
      })
      discounts.value = discountPage.data.items
      totalDiscounts.value = discountPage.data.total
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to load discounts')
    } finally {
      loading.value = false
    }
  }

  const saveDiscount = async (discountId: string | null, discountFields: DiscountFields): Promise<Discount | undefined> => {
    saving.value = true
    try {
      const saveResponse = await apiFetch<ApiEnvelope<Discount>>(discountId ? `/api/discounts/${discountId}` : '/api/discounts', {
        method: discountId ? 'PUT' : 'POST',
        body: discountFields,
      })
      toast.success(saveResponse.message)
      return saveResponse.data
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to save the discount')
      throw error
    } finally {
      saving.value = false
    }
  }

  const stopDiscount = async (discountId: string): Promise<void> => {
    saving.value = true
    try {
      const stopResponse = await apiFetch<ApiEnvelope<Discount>>(`/api/discounts/${discountId}`, { method: 'DELETE' })
      toast.success(stopResponse.message)
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to stop the discount')
      throw error
    } finally {
      saving.value = false
    }
  }

  return {
    discounts,
    totalDiscounts,
    loading,
    saving,
    fetchDiscounts,
    saveDiscount,
    stopDiscount,
  }
}
