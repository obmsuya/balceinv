import { toast } from 'vue-sonner'
import { apiErrorMessage, t } from '~/utils/i18n'

export type PaymentMethod = 'cash' | 'bank' | 'mobile'
export type PaymentStatus = 'paid' | 'part_paid' | 'unpaid' | 'cancelled'
export type OrderStatus = 'draft' | 'sent' | 'partly_received' | 'received' | 'cancelled'
export type StatementKind = 'opening_balance' | 'purchase' | 'payment' | 'return'
export type InvoiceVat = 'none' | 'included' | 'added'

export interface AgingBuckets {
  current: number
  days_1_30: number
  days_31_60: number
  days_61_90: number
  days_over_90: number
}

export interface Supplier {
  id: string
  name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  tin: string | null
  vrn: string | null
  address: string | null
  payment_terms_days: number
  opening_balance: number
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  balance: number
  overdue_amount: number
  aging?: AgingBuckets
}

export interface SupplierFields {
  name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  tin: string | null
  vrn: string | null
  address: string | null
  payment_terms_days: number
  opening_balance: number
  notes: string | null
  is_active?: boolean
}

export interface AgingReport {
  as_of: string
  total_balance: number
  totals: AgingBuckets
  suppliers: Array<{ supplier_id: string; name: string; is_active: boolean; balance: number; aging: AgingBuckets }>
}

export interface StatementLine {
  date: string
  kind: StatementKind
  reference: string
  document_id: string | null
  debit: number
  credit: number
  balance: number
}

export interface Statement {
  supplier_id: string
  supplier_name: string
  from: string
  to: string
  opening_balance: number
  closing_balance: number
  lines: StatementLine[]
}

export interface SupplierPayment {
  id: string
  payment_number: string
  supplier_id: string | null
  supplier_name: string | null
  purchase_id: string | null
  purchase_number: string | null
  shop_id: string
  shop_name: string
  amount: number
  method: PaymentMethod
  reference: string | null
  paid_at: string
  created_by_name: string | null
  created_at: string
  is_voided: boolean
  voided_by_name: string | null
  voided_at: string | null
  void_reason: string | null
}

export interface PurchaseLine {
  product_id: string
  product_name: string
  variant_label: string
  sku: string
  unit: string
  quantity: number
  unit_cost: number
  vat_amount: number
  line_total: number
}

export interface Purchase {
  id: string
  purchase_number: string
  shop_id: string
  shop_name: string
  supplier_id: string | null
  supplier_name: string | null
  supplier_invoice_number: string | null
  invoice_date: string | null
  received_at: string
  status: 'received' | 'cancelled'
  prices_include_vat: boolean
  subtotal: number
  vat_total: number
  total: number
  amount_paid: number
  amount_due: number
  payment_status: PaymentStatus
  note: string | null
  attachment_url: string | null
  purchase_order_id: string | null
  purchase_order_number: string | null
  line_count: number
  created_by_name: string | null
  created_at: string
  cancelled_by_name: string | null
  cancelled_at: string | null
  cancel_reason: string | null
  lines?: PurchaseLine[]
  payments?: SupplierPayment[]
}

export interface PurchaseFields {
  client_ref: string
  supplier_id: string | null
  shop_id: string | null
  purchase_order_id: string | null
  supplier_invoice_number: string | null
  invoice_date: string | null
  received_at: string | null
  invoice_has_vat: boolean
  prices_include_vat: boolean
  amount_paid: number
  payment_method: PaymentMethod
  payment_reference: string | null
  note: string | null
  lines: Array<{ product_id: string; quantity: number; unit_cost: number }>
}

export interface PaymentFields {
  supplier_id: string
  purchase_id: string | null
  amount: number
  method: PaymentMethod
  reference: string | null
  paid_at: string | null
}

export interface ReturnFields {
  supplier_id: string
  note: string | null
  lines: Array<{ product_id: string; quantity: number; unit_cost: number }>
}

export interface OrderLine {
  product_id: string
  product_name: string
  variant_label: string
  sku: string
  unit: string
  cost_price: number
  quantity_ordered: number
  expected_unit_cost: number
  quantity_received: number
  quantity_remaining: number
}

export interface PurchaseOrder {
  id: string
  order_number: string
  supplier_id: string
  supplier_name: string
  shop_id: string
  shop_name: string
  status: OrderStatus
  expected_date: string | null
  note: string | null
  expected_total: number
  line_count: number
  created_by_name: string | null
  created_at: string
  sent_at: string | null
  cancelled_by_name: string | null
  cancelled_at: string | null
  cancel_reason: string | null
  lines?: OrderLine[]
}

export interface OrderFields {
  supplier_id: string
  expected_date: string | null
  note: string | null
  send: boolean
  lines: Array<{ product_id: string; quantity: number; expected_unit_cost: number }>
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

export const supplierPageSize = 50
export const paymentMethods: PaymentMethod[] = ['cash', 'bank', 'mobile']

export const localDateText = (moment: Date = new Date()): string => {
  const shifted = new Date(moment.getTime() - moment.getTimezoneOffset() * 60000)
  return shifted.toISOString().slice(0, 10)
}

export const calendarDay = (isoDate: string): Date => new Date(`${isoDate}T12:00:00`)

export const dateToMoment =(dateText: string): string | null => {
  if (!dateText || dateText === localDateText()) return null
  return new Date(`${dateText}T12:00:00`).toISOString()
}

export const phoneLinks = (phone: string | null) => {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  return { call: `tel:${phone}`, whatsapp: `https://wa.me/${digits}` }
}

export const openExternal = (url: string) => {
  window.open(url, '_blank', 'noopener')
}

export const useSuppliers = () => {
  const { $apiFetch } = useNuxtApp()
  const apiFetch = $apiFetch as typeof $fetch

  const loading = ref(false)
  const saving = ref(false)

  const listSuppliers = async (query: { searchText?: string; includeInactive?: boolean; offset?: number; limit?: number } = {}): Promise<Page<Supplier>> => {
    loading.value = true
    try {
      const supplierPage = await apiFetch<ApiEnvelope<Page<Supplier>>>('/api/suppliers', {
        query: {
          q: query.searchText || undefined,
          include_inactive: query.includeInactive || undefined,
          limit: query.limit ?? supplierPageSize,
          offset: query.offset ?? 0,
        },
      })
      return supplierPage.data
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'suppliers.toasts.loadFailed'))
      return { items: [], total: 0, limit: 0, offset: 0 }
    } finally {
      loading.value = false
    }
  }

  const activeSupplierOptions = async (): Promise<Supplier[]> => (await listSuppliers({ limit: 100 })).items

  const fetchSupplier = async (supplierId: string): Promise<Supplier | null> => {
    try {
      const supplierResponse = await apiFetch<ApiEnvelope<Supplier>>(`/api/suppliers/${supplierId}`)
      return supplierResponse.data
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'suppliers.toasts.loadFailed'))
      return null
    }
  }

  const saveSupplier = async (supplierId: string | null, fields: SupplierFields): Promise<Supplier> => {
    saving.value = true
    try {
      const saveResponse = supplierId
        ? await apiFetch<ApiEnvelope<Supplier>>(`/api/suppliers/${supplierId}`, { method: 'PUT', body: fields })
        : await apiFetch<ApiEnvelope<Supplier>>('/api/suppliers', { method: 'POST', body: fields })
      toast.success(t('suppliers.toasts.saved'))
      return saveResponse.data
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'suppliers.toasts.saveFailed'))
      throw error
    } finally {
      saving.value = false
    }
  }

  const deactivateSupplier = async (supplierId: string): Promise<void> => {
    saving.value = true
    try {
      await apiFetch<ApiEnvelope<null>>(`/api/suppliers/${supplierId}`, { method: 'DELETE' })
      toast.success(t('suppliers.toasts.deactivated'))
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'suppliers.toasts.deactivateFailed'))
      throw error
    } finally {
      saving.value = false
    }
  }

  const fetchAging = async (): Promise<AgingReport | null> => {
    try {
      const agingResponse = await apiFetch<ApiEnvelope<AgingReport>>('/api/suppliers/aging')
      return agingResponse.data
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'suppliers.toasts.agingFailed'))
      return null
    }
  }

  const fetchStatement = async (supplierId: string, fromDate: string, toDate: string): Promise<Statement | null> => {
    loading.value = true
    try {
      const statementResponse = await apiFetch<ApiEnvelope<Statement>>(`/api/suppliers/${supplierId}/statement`, {
        query: { from: fromDate || undefined, to: toDate || undefined },
      })
      return statementResponse.data
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'suppliers.toasts.statementFailed'))
      return null
    } finally {
      loading.value = false
    }
  }

  const listPurchases = async (query: { supplierId?: string; offset?: number } = {}): Promise<Page<Purchase>> => {
    loading.value = true
    try {
      const purchasePage = await apiFetch<ApiEnvelope<Page<Purchase>>>('/api/purchases', {
        query: { supplier_id: query.supplierId || undefined, limit: supplierPageSize, offset: query.offset ?? 0 },
      })
      return purchasePage.data
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'suppliers.toasts.purchasesFailed'))
      return { items: [], total: 0, limit: 0, offset: 0 }
    } finally {
      loading.value = false
    }
  }

  const fetchPurchase = async (purchaseId: string): Promise<Purchase | null> => {
    try {
      const purchaseResponse = await apiFetch<ApiEnvelope<Purchase>>(`/api/purchases/${purchaseId}`)
      return purchaseResponse.data
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'suppliers.toasts.purchaseFailed'))
      return null
    }
  }

  const lastCost = async (productId: string, supplierId: string | null): Promise<number | null> => {
    try {
      const costResponse = await apiFetch<ApiEnvelope<{ unit_cost: number | null }>>('/api/purchases/last-cost', {
        query: { product_id: productId, supplier_id: supplierId || undefined },
      })
      return costResponse.data.unit_cost
    } catch {
      return null
    }
  }

  const vatRate = async (): Promise<number> => {
    try {
      const rateResponse = await apiFetch<ApiEnvelope<{ tax_rate_basis_points: number }>>('/api/purchases/vat-rate')
      return rateResponse.data.tax_rate_basis_points
    } catch {
      return 0
    }
  }

  const attachInvoicePhoto = async (purchaseId: string, photoFile: File): Promise<Purchase> => {
    const photoForm = new FormData()
    photoForm.append('image', photoFile)
    const attachResponse = await apiFetch<ApiEnvelope<Purchase>>(`/api/purchases/${purchaseId}/attachment`, { method: 'POST', body: photoForm })
    return attachResponse.data
  }

  const recordPurchase = async (fields: PurchaseFields, photoFile: File | null): Promise<Purchase> => {
    saving.value = true
    try {
      const recordResponse = await apiFetch<ApiEnvelope<Purchase>>('/api/purchases', { method: 'POST', body: fields })
      toast.success(t('suppliers.toasts.purchaseSaved', { number: recordResponse.data.purchase_number }))
      if (!photoFile) return recordResponse.data
      try {
        return await attachInvoicePhoto(recordResponse.data.id, photoFile)
      } catch (photoError: any) {
        toast.error(apiErrorMessage(photoError, 'suppliers.toasts.photoFailed'))
        return recordResponse.data
      }
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'suppliers.toasts.purchaseSaveFailed'))
      throw error
    } finally {
      saving.value = false
    }
  }

  const cancelPurchase = async (purchaseId: string, reason: string): Promise<Purchase> => {
    saving.value = true
    try {
      const cancelResponse = await apiFetch<ApiEnvelope<Purchase>>(`/api/purchases/${purchaseId}/cancel`, { method: 'POST', body: { reason } })
      toast.success(t('suppliers.toasts.purchaseCancelled'))
      return cancelResponse.data
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'suppliers.toasts.purchaseCancelFailed'))
      throw error
    } finally {
      saving.value = false
    }
  }

  const listPayments = async (query: { supplierId?: string; offset?: number } = {}): Promise<Page<SupplierPayment>> => {
    loading.value = true
    try {
      const paymentPage = await apiFetch<ApiEnvelope<Page<SupplierPayment>>>('/api/supplier-payments', {
        query: { supplier_id: query.supplierId || undefined, limit: supplierPageSize, offset: query.offset ?? 0 },
      })
      return paymentPage.data
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'suppliers.toasts.paymentsFailed'))
      return { items: [], total: 0, limit: 0, offset: 0 }
    } finally {
      loading.value = false
    }
  }

  const paySupplier = async (fields: PaymentFields): Promise<SupplierPayment> => {
    saving.value = true
    try {
      const payResponse = await apiFetch<ApiEnvelope<SupplierPayment>>('/api/supplier-payments', { method: 'POST', body: fields })
      toast.success(t('suppliers.toasts.paid'))
      return payResponse.data
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'suppliers.toasts.payFailed'))
      throw error
    } finally {
      saving.value = false
    }
  }

  const voidPayment = async (paymentId: string, reason: string): Promise<SupplierPayment> => {
    saving.value = true
    try {
      const voidResponse = await apiFetch<ApiEnvelope<SupplierPayment>>(`/api/supplier-payments/${paymentId}/void`, { method: 'POST', body: { reason } })
      toast.success(t('suppliers.toasts.paymentVoided'))
      return voidResponse.data
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'suppliers.toasts.voidFailed'))
      throw error
    } finally {
      saving.value = false
    }
  }

  const returnStock = async (fields: ReturnFields): Promise<void> => {
    saving.value = true
    try {
      const returnResponse = await apiFetch<ApiEnvelope<{ return_number: string }>>('/api/supplier-returns', { method: 'POST', body: fields })
      toast.success(t('suppliers.toasts.returned', { number: returnResponse.data.return_number }))
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'suppliers.toasts.returnFailed'))
      throw error
    } finally {
      saving.value = false
    }
  }

  const listOrders = async (query: { supplierId?: string; offset?: number } = {}): Promise<Page<PurchaseOrder>> => {
    loading.value = true
    try {
      const orderPage = await apiFetch<ApiEnvelope<Page<PurchaseOrder>>>('/api/purchase-orders', {
        query: { supplier_id: query.supplierId || undefined, limit: supplierPageSize, offset: query.offset ?? 0 },
      })
      return orderPage.data
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'suppliers.toasts.ordersFailed'))
      return { items: [], total: 0, limit: 0, offset: 0 }
    } finally {
      loading.value = false
    }
  }

  const fetchOrder = async (orderId: string): Promise<PurchaseOrder | null> => {
    try {
      const orderResponse = await apiFetch<ApiEnvelope<PurchaseOrder>>(`/api/purchase-orders/${orderId}`)
      return orderResponse.data
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'suppliers.toasts.orderFailed'))
      return null
    }
  }

  const createOrder = async (fields: OrderFields): Promise<PurchaseOrder> => {
    saving.value = true
    try {
      const createResponse = await apiFetch<ApiEnvelope<PurchaseOrder>>('/api/purchase-orders', { method: 'POST', body: fields })
      toast.success(t('suppliers.toasts.orderSaved', { number: createResponse.data.order_number }))
      return createResponse.data
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'suppliers.toasts.orderSaveFailed'))
      throw error
    } finally {
      saving.value = false
    }
  }

  const sendOrder = async (orderId: string): Promise<PurchaseOrder> => {
    saving.value = true
    try {
      const sendResponse = await apiFetch<ApiEnvelope<PurchaseOrder>>(`/api/purchase-orders/${orderId}/send`, { method: 'POST' })
      toast.success(t('suppliers.toasts.orderSent'))
      return sendResponse.data
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'suppliers.toasts.orderSendFailed'))
      throw error
    } finally {
      saving.value = false
    }
  }

  const cancelOrder = async (orderId: string, reason: string): Promise<PurchaseOrder> => {
    saving.value = true
    try {
      const cancelResponse = await apiFetch<ApiEnvelope<PurchaseOrder>>(`/api/purchase-orders/${orderId}/cancel`, { method: 'POST', body: { reason } })
      toast.success(t('suppliers.toasts.orderCancelled'))
      return cancelResponse.data
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'suppliers.toasts.orderCancelFailed'))
      throw error
    } finally {
      saving.value = false
    }
  }

  return {
    loading,
    saving,
    listSuppliers,
    activeSupplierOptions,
    fetchSupplier,
    saveSupplier,
    deactivateSupplier,
    fetchAging,
    fetchStatement,
    listPurchases,
    fetchPurchase,
    lastCost,
    vatRate,
    recordPurchase,
    cancelPurchase,
    listPayments,
    paySupplier,
    voidPayment,
    returnStock,
    listOrders,
    fetchOrder,
    createOrder,
    sendOrder,
    cancelOrder,
  }
}
