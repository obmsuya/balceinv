import { toast } from 'vue-sonner'
import { apiErrorMessage, t } from '~/utils/i18n'
import type { CustomerPaymentMethod } from '~/composables/useCustomers'
import type { PaymentInput } from '~/composables/useSales'

export type OrderStatus = 'open' | 'ready' | 'collected' | 'cancelled'

export interface OrderLine {
  product_id: string
  product_name: string
  variant_label: string
  sku: string
  unit: string
  quantity: number
  unit_price: number
  is_wholesale: boolean
  discount_name: string | null
  discount_amount: number
  line_total: number
}

export interface OrderPayment {
  id: string
  kind: 'deposit' | 'refund'
  method: CustomerPaymentMethod
  amount: number
  created_at: string
  created_by_name: string
}

export interface Order {
  id: string
  number: string
  status: OrderStatus
  customer_id: string
  customer_name: string
  customer_phone: string | null
  shop_id: string
  shop_name: string
  due_date: string | null
  note: string | null
  subtotal: number
  discount_total: number
  total: number
  tax_total: number
  deposit_total: number
  balance_due: number
  line_count: number
  lines: OrderLine[]
  payments: OrderPayment[]
  sale_id: string | null
  sale_receipt_number: string | null
  created_by_name: string
  created_at: string
  ready_at: string | null
  collected_at: string | null
  cancelled_at: string | null
  cancelled_by_name: string | null
  cancel_reason: string | null
}

export interface OrderDeposit {
  method: CustomerPaymentMethod
  amount: number
}

export interface NewOrderFields {
  customer_id: string
  items: { product_id: string; quantity: number }[]
  due_date: string | null
  note: string | null
  deposit: OrderDeposit | null
}

export interface OrderFilter {
  status: OrderStatus
  searchText: string
  offset: number
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

export const orderPageSize = 50

export const orderStatuses: OrderStatus[] = ['open', 'ready', 'collected', 'cancelled']

export const orderStatusLabel = (status: OrderStatus): string => t(`orders.status.${status}`)

export const useOrders = () => {
  const { $apiFetch } = useNuxtApp()
  const apiFetch = $apiFetch as typeof $fetch

  const orders = ref<Order[]>([])
  const totalOrders = ref(0)
  const loading = ref(false)
  const saving = ref(false)

  const fetchOrders = async (filter: OrderFilter): Promise<void> => {
    loading.value = true
    try {
      const orderPage = await apiFetch<ApiEnvelope<Page<Order>>>('/api/orders', {
        query: { status: filter.status, q: filter.searchText || undefined, limit: orderPageSize, offset: filter.offset },
      })
      orders.value = orderPage.data.items
      totalOrders.value = orderPage.data.total
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'orders.toasts.loadFailed'))
    } finally {
      loading.value = false
    }
  }

  const fetchOrder = async (orderId: string): Promise<Order | null> => {
    try {
      const orderResponse = await apiFetch<ApiEnvelope<Order>>(`/api/orders/${orderId}`)
      return orderResponse.data
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'orders.toasts.orderLoadFailed'))
      return null
    }
  }

  const changeOrder = async (path: string, body: object | undefined, successKey: string, failureKey: string): Promise<Order> => {
    saving.value = true
    try {
      const orderResponse = await apiFetch<ApiEnvelope<Order>>(path, { method: 'POST', body })
      toast.success(t(successKey))
      return orderResponse.data
    } catch (error: any) {
      toast.error(apiErrorMessage(error, failureKey))
      throw error
    } finally {
      saving.value = false
    }
  }

  const createOrder = (orderFields: NewOrderFields): Promise<Order> =>
    changeOrder('/api/orders', orderFields, 'orders.toasts.created', 'orders.toasts.createFailed')

  const addDeposit = (orderId: string, deposit: OrderDeposit): Promise<Order> =>
    changeOrder(`/api/orders/${orderId}/deposits`, deposit, 'orders.toasts.depositAdded', 'orders.toasts.depositFailed')

  const markReady = (orderId: string): Promise<Order> =>
    changeOrder(`/api/orders/${orderId}/ready`, undefined, 'orders.toasts.markedReady', 'orders.toasts.readyFailed')

  const collectOrder = (orderId: string, payments: PaymentInput[]): Promise<Order> =>
    changeOrder(`/api/orders/${orderId}/collect`, { payments }, 'orders.toasts.collected', 'orders.toasts.collectFailed')

  const cancelOrder = (orderId: string, reason: string, refundMethod: CustomerPaymentMethod | null): Promise<Order> =>
    changeOrder(`/api/orders/${orderId}/cancel`, { reason, refund_method: refundMethod ?? undefined }, 'orders.toasts.cancelled', 'orders.toasts.cancelFailed')

  return {
    orders,
    totalOrders,
    loading,
    saving,
    fetchOrders,
    fetchOrder,
    createOrder,
    addDeposit,
    markReady,
    collectOrder,
    cancelOrder,
  }
}
