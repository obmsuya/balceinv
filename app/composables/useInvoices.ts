import { toast } from 'vue-sonner'
import { saveFile } from '~/utils/download'
import { apiErrorMessage, t } from '~/utils/i18n'

export type InvoiceKind = 'invoice' | 'proforma' | 'quotation' | 'delivery_note' | 'supplier_invoice'
export type InvoiceStatus = 'draft' | 'issued' | 'accepted' | 'cancelled'
export type InvoicePaymentStatus = 'unpaid' | 'part_paid' | 'paid'
export type InvoicePaymentFilter = InvoicePaymentStatus | 'overdue'
export type InvoicePaymentMethod = 'cash' | 'card' | 'mobile' | 'bank' | 'offset'

export interface InvoiceParty {
  id: string
  type: 'customer' | 'supplier'
  name: string
  phone: string | null
  email: string | null
  address: string | null
  tin: string | null
}

export interface InvoiceLine {
  id: string
  product_id: string | null
  sku: string | null
  description: string
  unit: string
  quantity: number
  unit_price: number
  discount_amount: number
  line_total: number
}

export interface InvoicePayment {
  id: string
  method: InvoicePaymentMethod
  amount: number
  reference: string | null
  is_voided: boolean
  created_at: string
  created_by_name: string
  money_record_id: string | null
}

export interface RelatedInvoice {
  id: string
  kind: InvoiceKind
  number: string
  status: InvoiceStatus
}

export interface Invoice {
  id: string
  kind: InvoiceKind
  number: string
  status: InvoiceStatus
  payment_status: InvoicePaymentStatus | null
  is_overdue: boolean
  party: InvoiceParty
  shop_id: string
  shop_name: string
  issue_date: string
  due_date: string | null
  reference: string | null
  notes: string | null
  terms: string | null
  subtotal: number
  discount_total: number
  tax_total: number
  tax_rate_basis_points: number
  total: number
  paid_total: number
  balance_due: number
  line_count: number
  lines?: InvoiceLine[]
  payments?: InvoicePayment[]
  source: RelatedInvoice | null
  derived?: RelatedInvoice[]
  delivered_at: string | null
  delivered_by_name: string | null
  cancelled_at: string | null
  cancelled_by_name: string | null
  cancel_reason: string | null
  created_by_name: string
  created_at: string
  updated_at: string
}

export interface InvoiceSummary {
  owed_to_you: number
  owed_count: number
  overdue: number
  overdue_count: number
  paid_this_month: number
  awaiting_delivery_count: number
  open_quote_count: number
}

export interface InvoiceLineInput {
  product_id?: string
  description: string
  unit: string
  quantity: number
  unit_price?: number
  discount_amount: number
}

export interface InvoiceFields {
  kind: InvoiceKind
  customer_id?: string
  supplier_id?: string
  issue_date?: string
  due_date?: string
  reference?: string
  notes?: string
  terms?: string
  lines: InvoiceLineInput[]
}

export interface InvoicePaymentInput {
  method: InvoicePaymentMethod
  amount: number
  reference?: string
}

export interface InvoiceFilter {
  kind: InvoiceKind | ''
  state: InvoiceStateFilter
  searchText: string
  offset: number
  customerId?: string
}

export type InvoiceStateFilter = '' | InvoicePaymentFilter | 'draft' | 'cancelled'

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

export const invoicePageSize = 50

export const customerInvoiceKinds: InvoiceKind[] = ['invoice', 'proforma', 'quotation', 'delivery_note']

export const invoiceStateFilters: InvoiceStateFilter[] = ['', 'unpaid', 'part_paid', 'overdue', 'paid', 'draft', 'cancelled']

export const isBill = (invoice: Pick<Invoice, 'kind'>): boolean => invoice.kind === 'invoice' || invoice.kind === 'supplier_invoice'

export const isOffer = (invoice: Pick<Invoice, 'kind'>): boolean => invoice.kind === 'quotation' || invoice.kind === 'proforma'

export type InvoiceBadgeTone = 'paid' | 'part_paid' | 'unpaid' | 'overdue' | 'draft' | 'accepted' | 'cancelled' | 'issued'

export const invoiceBadgeTone = (invoice: Pick<Invoice, 'status' | 'payment_status' | 'is_overdue'>): InvoiceBadgeTone => {
  if (invoice.status === 'draft') return 'draft'
  if (invoice.status === 'cancelled') return 'cancelled'
  if (invoice.status === 'accepted') return 'accepted'
  if (invoice.payment_status === 'paid') return 'paid'
  if (invoice.is_overdue) return 'overdue'
  if (invoice.payment_status) return invoice.payment_status
  return 'issued'
}

export const invoiceBadgeClasses: Record<InvoiceBadgeTone, string> = {
  paid: 'border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
  part_paid: 'border-transparent bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300',
  unpaid: 'border-border bg-transparent text-foreground',
  overdue: 'border-transparent bg-destructive text-white',
  draft: 'border-transparent bg-secondary text-secondary-foreground',
  accepted: 'border-transparent bg-primary/15 text-primary',
  cancelled: 'border-transparent bg-muted text-muted-foreground line-through',
  issued: 'border-border bg-transparent text-foreground',
}

export const invoiceFileName = (invoiceNumber: string): string => `${invoiceNumber.replace(/[^A-Za-z0-9._-]/g, '-')}.pdf`

export const useInvoices = () => {
  const { $apiFetch } = useNuxtApp()
  const apiFetch = $apiFetch as typeof $fetch

  const invoices = ref<Invoice[]>([])
  const totalInvoices = ref(0)
  const summary = ref<InvoiceSummary | null>(null)
  const loading = ref(false)
  const saving = ref(false)
  const downloading = ref(false)

  const fetchInvoices = async (filter: InvoiceFilter): Promise<void> => {
    loading.value = true
    const isPaymentFilter = filter.state === 'unpaid' || filter.state === 'part_paid' || filter.state === 'paid' || filter.state === 'overdue'
    const isStatusFilter = filter.state === 'draft' || filter.state === 'cancelled'
    try {
      const invoicePage = await apiFetch<ApiEnvelope<Page<Invoice>>>('/api/invoices', {
        query: {
          kind: filter.kind || undefined,
          payment: isPaymentFilter ? filter.state : undefined,
          status: isStatusFilter ? filter.state : undefined,
          q: filter.searchText || undefined,
          customer_id: filter.customerId || undefined,
          limit: invoicePageSize,
          offset: filter.offset,
        },
      })
      invoices.value = invoicePage.data.items
      totalInvoices.value = invoicePage.data.total
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'invoices.toasts.loadFailed'))
    } finally {
      loading.value = false
    }
  }

  const fetchSummary = async (): Promise<void> => {
    try {
      const summaryResponse = await apiFetch<ApiEnvelope<InvoiceSummary>>('/api/invoices/summary')
      summary.value = summaryResponse.data
    } catch {
      summary.value = null
    }
  }

  const fetchInvoice = async (invoiceId: string): Promise<Invoice | null> => {
    try {
      const invoiceResponse = await apiFetch<ApiEnvelope<Invoice>>(`/api/invoices/${invoiceId}`)
      return invoiceResponse.data
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'invoices.toasts.invoiceLoadFailed'))
      return null
    }
  }

  const changeInvoice = async (method: 'POST' | 'PUT', path: string, body: object | undefined, successKey: string, failureKey: string): Promise<Invoice> => {
    saving.value = true
    try {
      const invoiceResponse = await apiFetch<ApiEnvelope<Invoice>>(path, { method, body })
      toast.success(t(successKey, { number: invoiceResponse.data.number }))
      return invoiceResponse.data
    } catch (error: any) {
      toast.error(apiErrorMessage(error, failureKey))
      throw error
    } finally {
      saving.value = false
    }
  }

  const createInvoice = (fields: InvoiceFields): Promise<Invoice> =>
    changeInvoice('POST', '/api/invoices', fields, 'invoices.toasts.saved', 'invoices.toasts.saveFailed')

  const updateInvoice = (invoiceId: string, fields: InvoiceFields): Promise<Invoice> =>
    changeInvoice('PUT', `/api/invoices/${invoiceId}`, fields, 'invoices.toasts.saved', 'invoices.toasts.saveFailed')

  const issueInvoice = (invoiceId: string): Promise<Invoice> =>
    changeInvoice('POST', `/api/invoices/${invoiceId}/issue`, undefined, 'invoices.toasts.issued', 'invoices.toasts.issueFailed')

  const acceptInvoice = (invoiceId: string): Promise<Invoice> =>
    changeInvoice('POST', `/api/invoices/${invoiceId}/accept`, undefined, 'invoices.toasts.accepted', 'invoices.toasts.acceptFailed')

  const deliverInvoice = (invoiceId: string): Promise<Invoice> =>
    changeInvoice('POST', `/api/invoices/${invoiceId}/deliver`, undefined, 'invoices.toasts.delivered', 'invoices.toasts.deliverFailed')

  const recordPayment = (invoiceId: string, payment: InvoicePaymentInput): Promise<Invoice> =>
    changeInvoice('POST', `/api/invoices/${invoiceId}/payments`, payment, 'invoices.toasts.paymentRecorded', 'invoices.toasts.paymentFailed')

  const voidPayment = (invoiceId: string, paymentId: string, reason: string): Promise<Invoice> =>
    changeInvoice('POST', `/api/invoices/${invoiceId}/payments/${paymentId}/void`, { reason }, 'invoices.toasts.paymentVoided', 'invoices.toasts.paymentVoidFailed')

  const convertInvoice = (invoiceId: string, kind: 'invoice' | 'delivery_note'): Promise<Invoice> =>
    changeInvoice('POST', `/api/invoices/${invoiceId}/convert`, { kind }, 'invoices.toasts.converted', 'invoices.toasts.convertFailed')

  const cancelInvoice = (invoiceId: string, reason: string): Promise<Invoice> =>
    changeInvoice('POST', `/api/invoices/${invoiceId}/cancel`, { reason }, 'invoices.toasts.cancelled', 'invoices.toasts.cancelFailed')

  const fetchInvoicePdfBytes = async (invoiceId: string, language?: string): Promise<Uint8Array> => {
    const documentBytes = await apiFetch<ArrayBuffer>(`/api/invoices/${invoiceId}/document`, {
      query: { format: 'pdf', lang: language || undefined },
      responseType: 'arrayBuffer',
    })
    return new Uint8Array(documentBytes)
  }

  const pdfFilter = () => ({ name: t('sales.pdfFileType'), extensions: ['pdf'] })

  const downloadInvoicePdf = async (invoiceId: string, invoiceNumber: string, language?: string): Promise<void> => {
    downloading.value = true
    try {
      const documentBytes = await fetchInvoicePdfBytes(invoiceId, language)
      const savedName = await saveFile(documentBytes, invoiceFileName(invoiceNumber), pdfFilter())
      if (savedName) toast.success(t('invoices.toasts.pdfSaved'), { description: savedName })
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'invoices.toasts.pdfFailed'))
    } finally {
      downloading.value = false
    }
  }

  const shareInvoicePdf = async (invoiceId: string, invoiceNumber: string, language?: string): Promise<void> => {
    downloading.value = true
    try {
      const documentBytes = await fetchInvoicePdfBytes(invoiceId, language)
      const documentFileName = invoiceFileName(invoiceNumber)
      const documentFile = new File([documentBytes], documentFileName, { type: 'application/pdf' })
      const canShareFile = typeof navigator.canShare === 'function' && navigator.canShare({ files: [documentFile] })
      if (canShareFile) {
        try {
          await navigator.share({ files: [documentFile], title: invoiceNumber })
          return
        } catch (shareError: any) {
          if (shareError?.name === 'AbortError') return
        }
      }
      const savedName = await saveFile(documentBytes, documentFileName, pdfFilter())
      if (savedName) toast.success(t('invoices.toasts.pdfSavedToShare'), { description: savedName })
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'invoices.toasts.pdfFailed'))
    } finally {
      downloading.value = false
    }
  }

  return {
    invoices,
    totalInvoices,
    summary,
    loading,
    saving,
    downloading,
    fetchInvoices,
    fetchSummary,
    fetchInvoice,
    createInvoice,
    updateInvoice,
    issueInvoice,
    acceptInvoice,
    deliverInvoice,
    recordPayment,
    voidPayment,
    convertInvoice,
    cancelInvoice,
    fetchInvoicePdfBytes,
    downloadInvoicePdf,
    shareInvoicePdf,
  }
}
