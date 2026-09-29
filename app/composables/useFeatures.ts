import { toast } from 'vue-sonner'
import { apiErrorMessage, t } from '~/utils/i18n'

export type AccountingMode = 'off' | 'simple' | 'full'

export interface CompanyFeatures {
  suppliers_enabled: boolean
  purchase_orders_enabled: boolean
  customers_enabled: boolean
  credit_sales_enabled: boolean
  customer_orders_enabled: boolean
  accounting_mode: AccountingMode
  vat_registered: boolean
  vat_number: string | null
}

interface ApiEnvelope<Payload> {
  success: boolean
  message: string
  data: Payload
}

export const featuresOff: CompanyFeatures = {
  suppliers_enabled: false,
  purchase_orders_enabled: false,
  customers_enabled: false,
  credit_sales_enabled: false,
  customer_orders_enabled: false,
  accounting_mode: 'off',
  vat_registered: false,
  vat_number: null,
}

export const useFeatures = () => {
  const { $apiFetch } = useNuxtApp()
  const apiFetch = $apiFetch as typeof $fetch
  const { user, fetchCurrentUser } = useAuth()
  const savingFeatures = useState<boolean>('features:saving', () => false)

  const features = computed<CompanyFeatures>(() => user.value?.features ?? featuresOff)
  const suppliersOn = computed(() => features.value.suppliers_enabled)
  const purchaseOrdersOn = computed(() => features.value.suppliers_enabled && features.value.purchase_orders_enabled)
  const customersOn = computed(() => features.value.customers_enabled)
  const creditSalesOn = computed(() => features.value.customers_enabled && features.value.credit_sales_enabled)
  const customerOrdersOn = computed(() => features.value.customers_enabled && features.value.customer_orders_enabled)
  const accountingOn = computed(() => features.value.accounting_mode !== 'off')
  const fullAccountingOn = computed(() => features.value.accounting_mode === 'full')
  const vatOn = computed(() => features.value.vat_registered)

  const saveFeatures = async (changes: Partial<CompanyFeatures>): Promise<boolean> => {
    savingFeatures.value = true
    try {
      await apiFetch<ApiEnvelope<CompanyFeatures>>('/api/features', { method: 'PUT', body: changes })
      await fetchCurrentUser()
      toast.success(t('settings.features.toasts.saved'))
      return true
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'settings.features.toasts.saveFailed'))
      return false
    } finally {
      savingFeatures.value = false
    }
  }

  return {
    features,
    suppliersOn,
    purchaseOrdersOn,
    customersOn,
    creditSalesOn,
    customerOrdersOn,
    accountingOn,
    fullAccountingOn,
    vatOn,
    savingFeatures: readonly(savingFeatures),
    saveFeatures,
  }
}
