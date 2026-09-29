import type { ProductSort, ReportDay, ReportProduct, ReportSummary, StockTotals } from '~/composables/useReports'

export interface RecentSale {
  id: string
  receipt_number: string
  shop_name: string
  cashier_name: string
  total: number
  created_at: string
}

export interface Dashboard {
  today: ReportSummary
  yesterday: ReportSummary
  month_to_date: ReportSummary
  last_two_weeks: ReportDay[]
  top_products: ReportProduct[]
  stock: StockTotals
  recent_sales: RecentSale[]
}

export interface ExchangeRate {
  code: string
  value: number
}

export interface ExchangeRates {
  available: boolean
  base_currency: string
  rates: ExchangeRate[]
  provider_updated_at: string | null
  fetched_at: string | null
  is_stale: boolean
  problem: string
  source_name: string
  source_url: string
}

interface ApiEnvelope<Payload> {
  success: boolean
  message: string
  data: Payload
}

export type { ProductSort }

export const useDashboard = () => {
  const { $apiFetch } = useNuxtApp()
  const apiFetch = $apiFetch as typeof $fetch

  const dashboard = ref<Dashboard | null>(null)
  const exchangeRates = ref<ExchangeRates | null>(null)
  const loading = ref(false)
  const loadError = ref('')
  const ratesError = ref('')

  const fetchDashboard = async (shop: string): Promise<void> => {
    loading.value = true
    try {
      const dashboardResponse = await apiFetch<ApiEnvelope<Dashboard>>('/api/dashboard', { query: { shop: shop || undefined } })
      dashboard.value = dashboardResponse.data
      loadError.value = ''
    } catch (error: any) {
      const isOffline = !error?.status && !error?.statusCode
      loadError.value = isOffline ? 'Cannot reach the server. Showing the last figures loaded.' : error?.data?.message || 'Could not load the dashboard'
    } finally {
      loading.value = false
    }
  }

  const fetchExchangeRates = async (): Promise<void> => {
    try {
      const ratesResponse = await apiFetch<ApiEnvelope<ExchangeRates>>('/api/exchange-rates')
      exchangeRates.value = ratesResponse.data
      ratesError.value = ''
    } catch {
      ratesError.value = 'Cannot reach the server for exchange rates.'
    }
  }

  return {
    dashboard,
    exchangeRates,
    loading,
    loadError,
    ratesError,
    fetchDashboard,
    fetchExchangeRates,
  }
}
