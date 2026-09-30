import type { ProductSort, ReportDay, ReportProduct, ReportSummary, StockTotals } from '~/composables/useReports'
import { apiErrorMessage, t } from '~/utils/i18n'

export interface RecentSale {
  id: string
  receipt_number: string
  shop_name: string
  cashier_name: string
  total: number
  created_at: string
}

export interface GettingStarted {
  business_details: boolean
  logo: boolean
  first_product: boolean
  first_cashier: boolean
  first_sale: boolean
}

export interface Dashboard {
  today: ReportSummary
  yesterday: ReportSummary
  month_to_date: ReportSummary
  last_two_weeks: ReportDay[]
  top_products: ReportProduct[]
  stock: StockTotals
  recent_sales: RecentSale[]
  getting_started: GettingStarted
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
  const loadFailure = shallowRef<any>(null)
  const ratesFailed = ref(false)

  const loadError = computed(() => {
    if (!loadFailure.value) return ''
    const isOffline = !loadFailure.value?.status && !loadFailure.value?.statusCode
    return isOffline ? t('dashboard.errors.offline') : apiErrorMessage(loadFailure.value, 'dashboard.errors.loadFailed')
  })
  const ratesError = computed(() => (ratesFailed.value ? t('dashboard.exchangeRates.loadFailed') : ''))

  const fetchDashboard = async (shop: string): Promise<void> => {
    loading.value = true
    try {
      const dashboardResponse = await apiFetch<ApiEnvelope<Dashboard>>('/api/dashboard', { query: { shop: shop || undefined } })
      dashboard.value = dashboardResponse.data
      loadFailure.value = null
    } catch (error: any) {
      loadFailure.value = error
    } finally {
      loading.value = false
    }
  }

  const fetchExchangeRates = async (): Promise<void> => {
    try {
      const ratesResponse = await apiFetch<ApiEnvelope<ExchangeRates>>('/api/exchange-rates')
      exchangeRates.value = ratesResponse.data
      ratesFailed.value = false
    } catch {
      ratesFailed.value = true
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
