import { toast } from 'vue-sonner'

export interface PaymentTotals {
  cash: number
  card: number
  mobile: number
}

export interface ReportSummary {
  from: string
  to: string
  sale_count: number
  units_sold: number
  total: number
  tax_total: number
  discount_total: number
  net_sales: number
  cost_total: number
  gross_profit: number
  margin_basis_points: number
  average_sale: number
  payments: PaymentTotals
}

export interface ReportDay {
  date: string
  sale_count: number
  total: number
  tax_total: number
  cost_total: number
  gross_profit: number
}

export interface ReportProduct {
  product_id: string
  name: string
  variant_label: string
  sku: string
  quantity: number
  revenue: number
  net_revenue: number
  cost_total: number
  gross_profit: number
  sale_count: number
}

export interface ReportCashier {
  user_id: string
  name: string
  sale_count: number
  total: number
  average_sale: number
}

export interface ReportShop {
  shop_id: string
  name: string
  sale_count: number
  total: number
  tax_total: number
  cost_total: number
  gross_profit: number
}

export interface StockTotals {
  product_count: number
  units: number
  value_at_cost: number
  value_at_price: number
  low_count: number
  out_count: number
}

export interface DeadStockItem {
  product_id: string
  name: string
  variant_label: string
  sku: string
  quantity: number
  value_at_cost: number
  last_sold_at: string | null
}

export interface InventoryReport {
  stock: StockTotals
  dead_stock_days: number
  dead_stock: DeadStockItem[]
}

export type ProductSort = 'revenue' | 'quantity' | 'profit'

export interface ReportFilter {
  from: string
  to: string
  shop: string
}

interface ApiEnvelope<Payload> {
  success: boolean
  message: string
  data: Payload
}

export const useReports = () => {
  const { $apiFetch } = useNuxtApp()
  const apiFetch = $apiFetch as typeof $fetch

  const summary = ref<ReportSummary | null>(null)
  const days = ref<ReportDay[]>([])
  const products = ref<ReportProduct[]>([])
  const cashiers = ref<ReportCashier[]>([])
  const shops = ref<ReportShop[]>([])
  const inventory = ref<InventoryReport | null>(null)
  const loading = ref(false)

  const rangeQuery = (filter: ReportFilter) => ({
    from: filter.from || undefined,
    to: filter.to || undefined,
    shop: filter.shop || undefined,
  })

  const fetchSalesReports = async (filter: ReportFilter, productSort: ProductSort): Promise<boolean> => {
    loading.value = true
    try {
      const query = rangeQuery(filter)
      const [summaryResponse, daysResponse, productsResponse, cashiersResponse, shopsResponse] = await Promise.all([
        apiFetch<ApiEnvelope<ReportSummary>>('/api/reports/summary', { query }),
        apiFetch<ApiEnvelope<ReportDay[]>>('/api/reports/daily', { query }),
        apiFetch<ApiEnvelope<ReportProduct[]>>('/api/reports/products', { query: { ...query, sort: productSort, limit: 100 } }),
        apiFetch<ApiEnvelope<ReportCashier[]>>('/api/reports/cashiers', { query }),
        apiFetch<ApiEnvelope<ReportShop[]>>('/api/reports/shops', { query }),
      ])
      summary.value = summaryResponse.data
      days.value = daysResponse.data
      products.value = productsResponse.data
      cashiers.value = cashiersResponse.data
      shops.value = shopsResponse.data
      return true
    } catch (error: any) {
      toast.error(error?.data?.message || 'Could not load the reports')
      return false
    } finally {
      loading.value = false
    }
  }

  const fetchProductRanking = async (filter: ReportFilter, productSort: ProductSort): Promise<void> => {
    try {
      const productsResponse = await apiFetch<ApiEnvelope<ReportProduct[]>>('/api/reports/products', { query: { ...rangeQuery(filter), sort: productSort, limit: 100 } })
      products.value = productsResponse.data
    } catch (error: any) {
      toast.error(error?.data?.message || 'Could not load the products')
    }
  }

  const fetchInventory = async (shop: string): Promise<void> => {
    try {
      const inventoryResponse = await apiFetch<ApiEnvelope<InventoryReport>>('/api/reports/inventory', { query: { shop: shop || undefined } })
      inventory.value = inventoryResponse.data
    } catch (error: any) {
      toast.error(error?.data?.message || 'Could not load the stock report')
    }
  }

  return {
    summary,
    days,
    products,
    cashiers,
    shops,
    inventory,
    loading,
    fetchSalesReports,
    fetchProductRanking,
    fetchInventory,
  }
}
