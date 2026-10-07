import { toast } from 'vue-sonner'
import { saveFile } from '~/utils/download'
import { apiErrorMessage, t } from '~/utils/i18n'

export type PaymentMethod = 'cash' | 'card' | 'mobile' | 'credit'

export type ManualDiscountKind = 'percent' | 'amount'

export interface ManualDiscount {
  kind: ManualDiscountKind
  value: number
}

export interface SaleLineInput {
  product_id: string
  quantity: number
  addon_ids: string[]
  manual_discount?: ManualDiscount
}

export interface PaymentInput {
  method: PaymentMethod
  amount: number
}

export interface SaleAddon {
  addon_id: string
  name: string
  unit_price: number
}

export interface SaleLine {
  product_id: string
  product_name: string
  variant_label: string
  sku: string
  unit: string
  quantity: number
  unit_price: number
  is_wholesale: boolean
  addons: SaleAddon[]
  addons_unit_total: number
  discount_name: string | null
  discount_amount: number
  manual_discount_amount: number
  line_total: number
  in_stock?: number
}

export type FiscalStatus = 'pending' | 'sending' | 'sent' | 'failed'

export type SaleDocumentKind = 'receipt' | 'invoice'

export interface SaleFiscal {
  status: FiscalStatus
  attempts: number
  verification_code: string | null
  verification_url: string | null
  last_error: string | null
  sent_at: string | null
}

export interface TillOptions {
  numpad_enabled: boolean
  customer_display_enabled: boolean
  efd_enabled: boolean
  print_receipt_automatically: boolean
}

export interface SendWaitingResult {
  sent: number
  failed: number
  still_waiting: number
}

export const fiscalStatusLabel = (status: FiscalStatus): string => t(`sales.fiscalStatus.${status}`)

export interface SaleQuote {
  lines: SaleLine[]
  subtotal: number
  discount_total: number
  total: number
  tax_total: number
  tax_rate_basis_points: number
}

export interface Sale {
  id: string
  receipt_number: string
  client_ref: string
  shop_id: string
  shop_name: string
  user_id: string
  cashier_name: string
  subtotal: number
  discount_total: number
  total: number
  tax_total: number
  tax_rate_basis_points: number
  amount_paid: number
  change_given: number
  currency_code: string
  currency_decimals: number
  note: string | null
  customer_id: string | null
  customer_name: string | null
  customer_phone: string | null
  credit_amount: number
  order_number: string | null
  created_at: string
  items: SaleLine[]
  payments: PaymentInput[]
  fiscal: SaleFiscal | null
  voided_at: string | null
  void_reason: string | null
  voided_by_name: string | null
  credit_note: SaleFiscal | null
}

export interface SaleSummary {
  id: string
  receipt_number: string
  total: number
  discount_total: number
  unit_count: number
  payment_methods: PaymentMethod[]
  cashier_name: string
  fiscal_status: FiscalStatus | null
  voided_at: string | null
  created_at: string
}

export interface SaleTotals {
  sale_count: number
  total: number
  tax_total: number
  discount_total: number
}

export interface SaleReceipt {
  sale: Sale
  company: {
    name: string
    address: string | null
    phone: string | null
    tin: string | null
    logo_url: string | null
    receipt_header: string | null
    receipt_footer: string | null
  }
  shop: { name: string; address: string | null; phone: string | null }
  show_tax: boolean
  show_barcodes: boolean
  receipt_language: string
  paper_width_millimeters: number
}

export interface SaleFilter {
  searchText: string
  fromDate: string
  toDate: string
  offset: number
  fiscalWaiting?: boolean
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

export const salePageSize = 50

export const paymentMethodLabel = (method: PaymentMethod): string => t(`sales.paymentMethods.${method}`)

const localDayStart = (isoDate: string): string | undefined =>
  isoDate ? new Date(`${isoDate}T00:00:00`).toISOString() : undefined

const localDayAfter = (isoDate: string): string | undefined => {
  if (!isoDate) return undefined
  const dayAfter = new Date(`${isoDate}T00:00:00`)
  dayAfter.setDate(dayAfter.getDate() + 1)
  return dayAfter.toISOString()
}

export const useSales = () => {
  const { $apiFetch } = useNuxtApp()
  const apiFetch = $apiFetch as typeof $fetch

  const sales = ref<SaleSummary[]>([])
  const totalSales = ref(0)
  const totals = ref<SaleTotals | null>(null)
  const loading = ref(false)
  const saving = ref(false)

  const quoteSale = async (items: SaleLineInput[]): Promise<SaleQuote> => {
    const quoteResponse = await apiFetch<ApiEnvelope<SaleQuote>>('/api/sales/quote', {
      method: 'POST',
      body: { items },
    })
    return quoteResponse.data
  }

  const createSale = async (clientRef: string, items: SaleLineInput[], payments: PaymentInput[], note: string | null, customerId: string | null): Promise<Sale> => {
    saving.value = true
    try {
      const saleResponse = await apiFetch<ApiEnvelope<Sale>>('/api/sales', {
        method: 'POST',
        body: { client_ref: clientRef, items, payments, note, customer_id: customerId ?? undefined },
      })
      return saleResponse.data
    } finally {
      saving.value = false
    }
  }

  const saleQuery = (filter: SaleFilter) => ({
    q: filter.searchText || undefined,
    from: localDayStart(filter.fromDate),
    to: localDayAfter(filter.toDate),
    fiscal: filter.fiscalWaiting ? 'waiting' : undefined,
  })

  const fetchSales = async (filter: SaleFilter): Promise<void> => {
    loading.value = true
    try {
      const [salePage, totalsResponse] = await Promise.all([
        apiFetch<ApiEnvelope<Page<SaleSummary>>>('/api/sales', { query: { ...saleQuery(filter), limit: salePageSize, offset: filter.offset } }),
        apiFetch<ApiEnvelope<SaleTotals>>('/api/sales/totals', { query: saleQuery(filter) }),
      ])
      sales.value = salePage.data.items
      totalSales.value = salePage.data.total
      totals.value = totalsResponse.data
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'sales.toasts.loadFailed'))
    } finally {
      loading.value = false
    }
  }

  const fetchSale = async (saleId: string): Promise<Sale | undefined> => {
    try {
      const saleResponse = await apiFetch<ApiEnvelope<Sale>>(`/api/sales/${saleId}`)
      return saleResponse.data
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'sales.toasts.saleLoadFailed'))
    }
  }

  const fetchReceipt = async (saleId: string): Promise<SaleReceipt> => {
    const receiptResponse = await apiFetch<ApiEnvelope<SaleReceipt>>(`/api/sales/${saleId}/receipt`)
    return receiptResponse.data
  }

  const downloadingDocument = ref(false)

  const fetchSaleDocument = async (saleId: string, documentKind: SaleDocumentKind): Promise<Uint8Array> => {
    const documentBytes = await apiFetch<ArrayBuffer>(`/api/sales/${saleId}/document`, {
      query: { format: 'pdf', kind: documentKind },
      responseType: 'arrayBuffer',
    })
    return new Uint8Array(documentBytes)
  }

  const saleDocumentName = (documentKind: SaleDocumentKind, receiptNumber: string): string =>
    `${documentKind}-${receiptNumber.replace(/[^A-Za-z0-9._-]/g, '-')}.pdf`

  const pdfFilter = () => ({ name: t('sales.pdfFileType'), extensions: ['pdf'] })

  const downloadSaleDocument = async (saleId: string, receiptNumber: string, documentKind: SaleDocumentKind = 'invoice'): Promise<void> => {
    const isReceipt = documentKind === 'receipt'
    downloadingDocument.value = true
    try {
      const documentBytes = await fetchSaleDocument(saleId, documentKind)
      const savedName = await saveFile(documentBytes, saleDocumentName(documentKind, receiptNumber), pdfFilter())
      if (savedName) toast.success(t(isReceipt ? 'sales.toasts.receiptSaved' : 'sales.toasts.documentSaved'), { description: savedName })
    } catch (error: any) {
      toast.error(apiErrorMessage(error, isReceipt ? 'sales.toasts.receiptFailed' : 'sales.toasts.documentFailed'))
    } finally {
      downloadingDocument.value = false
    }
  }

  const shareSaleReceipt = async (saleId: string, receiptNumber: string): Promise<void> => {
    downloadingDocument.value = true
    try {
      const receiptBytes = await fetchSaleDocument(saleId, 'receipt')
      const receiptFileName = saleDocumentName('receipt', receiptNumber)
      const receiptFile = new File([receiptBytes], receiptFileName, { type: 'application/pdf' })
      const canShareFile = typeof navigator.canShare === 'function' && navigator.canShare({ files: [receiptFile] })
      if (canShareFile) {
        try {
          await navigator.share({ files: [receiptFile], title: t('sales.shareTitle', { number: receiptNumber }) })
          return
        } catch (shareError: any) {
          if (shareError?.name === 'AbortError') return
        }
      }
      const savedName = await saveFile(receiptBytes, receiptFileName, pdfFilter())
      if (savedName) toast.success(t('sales.toasts.receiptSavedToShare'), { description: savedName })
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'sales.toasts.receiptFailed'))
    } finally {
      downloadingDocument.value = false
    }
  }

  const fetchTillOptions = async (): Promise<TillOptions | null> => {
    try {
      const optionsResponse = await apiFetch<ApiEnvelope<TillOptions>>('/api/sales/till')
      return optionsResponse.data
    } catch {
      return null
    }
  }

  const sendToEfd = async (saleId: string): Promise<SaleFiscal | null> => {
    try {
      const fiscalResponse = await apiFetch<ApiEnvelope<SaleFiscal>>(`/api/sales/${saleId}/fiscal`, { method: 'POST' })
      return fiscalResponse.data
    } catch (error: any) {
      if (error?.data?.message) toast.error(apiErrorMessage(error, 'sales.toasts.efdSendFailed'))
      return null
    }
  }

  const voidingSale = ref(false)

  const voidSale = async (saleId: string, reason: string): Promise<Sale | null> => {
    voidingSale.value = true
    try {
      const voidResponse = await apiFetch<ApiEnvelope<Sale>>(`/api/sales/${saleId}/void`, { method: 'POST', body: { reason } })
      toast.success(t('sales.void.done'), { description: voidResponse.data.receipt_number })
      return voidResponse.data
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'sales.void.failed'))
      return null
    } finally {
      voidingSale.value = false
    }
  }

  const sendWaitingToEfd = async (announce: boolean): Promise<SendWaitingResult | null> => {
    try {
      const sendResponse = await apiFetch<ApiEnvelope<SendWaitingResult>>('/api/sales/fiscal/send-waiting', { method: 'POST' })
      const sendResult = sendResponse.data
      if (announce) {
        if (sendResult.failed) toast.error(t('sales.toasts.efdStillFailing', { failed: sendResult.failed }), { description: t('sales.toasts.efdSendSummary', { sent: sendResult.sent, waiting: sendResult.still_waiting }) })
        else toast.success(sendResult.sent ? t('sales.toasts.efdSent', { count: sendResult.sent }) : t('sales.toasts.efdNothingWaiting'))
      }
      return sendResult
    } catch (error: any) {
      if (announce) toast.error(apiErrorMessage(error, 'sales.toasts.serverUnreachable'))
      return null
    }
  }

  return {
    sales,
    totalSales,
    totals,
    loading,
    saving,
    quoteSale,
    createSale,
    fetchSales,
    fetchSale,
    fetchReceipt,
    downloadingDocument,
    downloadSaleDocument,
    shareSaleReceipt,
    voidingSale,
    voidSale,
    fetchTillOptions,
    sendToEfd,
    sendWaitingToEfd,
  }
}
