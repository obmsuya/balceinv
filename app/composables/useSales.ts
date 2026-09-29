import { toast } from 'vue-sonner'

export type PaymentMethod = 'cash' | 'card' | 'mobile'

export interface SaleLineInput {
  product_id: string
  quantity: number
  addon_ids: string[]
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
  line_total: number
  in_stock?: number
}

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
  created_at: string
  items: SaleLine[]
  payments: PaymentInput[]
}

export interface SaleSummary {
  id: string
  receipt_number: string
  total: number
  discount_total: number
  unit_count: number
  payment_methods: PaymentMethod[]
  cashier_name: string
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

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: 'Cash',
  card: 'Card',
  mobile: 'Mobile money',
}

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

  const createSale = async (clientRef: string, items: SaleLineInput[], payments: PaymentInput[], note: string | null): Promise<Sale> => {
    saving.value = true
    try {
      const saleResponse = await apiFetch<ApiEnvelope<Sale>>('/api/sales', {
        method: 'POST',
        body: { client_ref: clientRef, items, payments, note },
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
      toast.error(error?.data?.message || 'Failed to load sales')
    } finally {
      loading.value = false
    }
  }

  const fetchSale = async (saleId: string): Promise<Sale | undefined> => {
    try {
      const saleResponse = await apiFetch<ApiEnvelope<Sale>>(`/api/sales/${saleId}`)
      return saleResponse.data
    } catch (error: any) {
      toast.error(error?.data?.message || 'Could not load the sale')
    }
  }

  const fetchReceipt = async (saleId: string): Promise<SaleReceipt> => {
    const receiptResponse = await apiFetch<ApiEnvelope<SaleReceipt>>(`/api/sales/${saleId}/receipt`)
    return receiptResponse.data
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
  }
}
