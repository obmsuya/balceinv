import { toast } from 'vue-sonner'
import { formatMoney } from '~/utils/money'
import { apiErrorMessage, t } from '~/utils/i18n'

export type CustomerPaymentMethod = 'cash' | 'card' | 'mobile'
export type CustomerSort = 'name' | 'recent'

export interface DebtAging {
  days_0_30: number
  days_31_60: number
  days_61_90: number
  days_over_90: number
}

export interface Customer {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  tin: string | null
  credit_limit: number | null
  opening_balance: number
  notes: string | null
  is_active: boolean
  balance: number
  available_credit: number | null
  overdue_amount: number
  oldest_debt_at: string | null
  aging: DebtAging
  last_visit_at: string | null
  created_at: string
  updated_at: string
}

export interface CustomerFields {
  name: string
  phone: string | null
  email: string | null
  address: string | null
  tin: string | null
  credit_limit: number | null
  opening_balance: number
  notes: string | null
}

export interface CustomerPayment {
  id: string
  customer_id: string
  amount: number
  method: CustomerPaymentMethod
  reference: string | null
  received_at: string
  shop_name: string | null
  created_by_name: string
  voided_at: string | null
  voided_by_name: string | null
  void_reason: string | null
}

export interface CustomerPaymentFields {
  amount: number
  method: CustomerPaymentMethod
  reference: string | null
}

export interface CustomerSale {
  id: string
  receipt_number: string
  shop_name: string
  total: number
  credit_amount: number
  created_at: string
}

export interface StatementEntry {
  at: string
  kind: 'credit_sale' | 'payment'
  sale_id: string | null
  payment_id: string | null
  reference: string
  debit: number
  credit: number
  balance: number
}

export interface CustomerStatement {
  customer: { id: string; name: string; phone: string | null }
  from: string
  to: string
  opening_balance: number
  entries: StatementEntry[]
  total_debits: number
  total_credits: number
  closing_balance: number
}

export interface DebtorsReport {
  as_of: string
  customers: Customer[]
  totals: { balance: number; aging: DebtAging }
}

export interface CustomerFilter {
  searchText: string
  includeInactive: boolean
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

export const customerPageSize = 50
export const customerSalePageSize = 20

export const agingBuckets: (keyof DebtAging)[] = ['days_0_30', 'days_31_60', 'days_61_90', 'days_over_90']

export const agingLabel = (bucket: keyof DebtAging): string => t(`customers.aging.${bucket}`)

export const whatsappReminderUrl = (customer: Pick<Customer, 'name' | 'phone' | 'balance'>, shopName: string): string | null => {
  if (!customer.phone) return null
  const internationalPhone = `255${customer.phone.replace(/\D/g, '').replace(/^0/, '')}`
  const reminderMessage = t('customers.whatsapp.message', { name: customer.name, shop: shopName, amount: formatMoney(customer.balance) })
  return `https://wa.me/${internationalPhone}?text=${encodeURIComponent(reminderMessage)}`
}

export const useCustomers = () => {
  const { $apiFetch } = useNuxtApp()
  const apiFetch = $apiFetch as typeof $fetch

  const customers = ref<Customer[]>([])
  const totalCustomers = ref(0)
  const loading = ref(false)
  const saving = ref(false)

  const fetchCustomers = async (filter: CustomerFilter): Promise<void> => {
    loading.value = true
    try {
      const customerPage = await apiFetch<ApiEnvelope<Page<Customer>>>('/api/customers', {
        query: {
          q: filter.searchText || undefined,
          include_inactive: filter.includeInactive || undefined,
          limit: customerPageSize,
          offset: filter.offset,
        },
      })
      customers.value = customerPage.data.items
      totalCustomers.value = customerPage.data.total
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'customers.toasts.loadFailed'))
    } finally {
      loading.value = false
    }
  }

  const searchCustomers = async (searchText: string, sort: CustomerSort, limit = 8): Promise<Customer[]> => {
    const customerPage = await apiFetch<ApiEnvelope<Page<Customer>>>('/api/customers', {
      query: { q: searchText || undefined, sort, limit },
    })
    return customerPage.data.items
  }

  const fetchCustomer = async (customerId: string): Promise<Customer | null> => {
    try {
      const customerResponse = await apiFetch<ApiEnvelope<Customer>>(`/api/customers/${customerId}`)
      return customerResponse.data
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'customers.toasts.customerLoadFailed'))
      return null
    }
  }

  const saveCustomer = async (customerId: string | null, customerFields: CustomerFields): Promise<Customer> => {
    saving.value = true
    try {
      const saveResponse = await apiFetch<ApiEnvelope<Customer>>(customerId ? `/api/customers/${customerId}` : '/api/customers', {
        method: customerId ? 'PUT' : 'POST',
        body: customerFields,
      })
      toast.success(t(customerId ? 'customers.toasts.saved' : 'customers.toasts.created'))
      return saveResponse.data
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'customers.toasts.saveFailed'))
      throw error
    } finally {
      saving.value = false
    }
  }

  const deactivateCustomer = async (customerId: string): Promise<Customer> => {
    saving.value = true
    try {
      const deactivateResponse = await apiFetch<ApiEnvelope<Customer>>(`/api/customers/${customerId}`, { method: 'DELETE' })
      toast.success(t('customers.toasts.deactivated'))
      return deactivateResponse.data
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'customers.toasts.deactivateFailed'))
      throw error
    } finally {
      saving.value = false
    }
  }

  const restoreCustomer = async (customerId: string): Promise<Customer> => {
    saving.value = true
    try {
      const restoreResponse = await apiFetch<ApiEnvelope<Customer>>(`/api/customers/${customerId}/restore`, { method: 'POST' })
      toast.success(t('customers.toasts.restored'))
      return restoreResponse.data
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'customers.toasts.restoreFailed'))
      throw error
    } finally {
      saving.value = false
    }
  }

  const fetchDebtors = async (): Promise<DebtorsReport | null> => {
    loading.value = true
    try {
      const debtorsResponse = await apiFetch<ApiEnvelope<DebtorsReport>>('/api/customers/debtors')
      return debtorsResponse.data
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'customers.toasts.debtorsLoadFailed'))
      return null
    } finally {
      loading.value = false
    }
  }

  const fetchCustomerSales = async (customerId: string, offset: number): Promise<Page<CustomerSale> | null> => {
    try {
      const salePage = await apiFetch<ApiEnvelope<Page<CustomerSale>>>(`/api/customers/${customerId}/sales`, {
        query: { limit: customerSalePageSize, offset },
      })
      return salePage.data
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'customers.toasts.salesLoadFailed'))
      return null
    }
  }

  const fetchPayments = async (customerId: string): Promise<CustomerPayment[]> => {
    try {
      const paymentsResponse = await apiFetch<ApiEnvelope<CustomerPayment[]>>(`/api/customers/${customerId}/payments`)
      return paymentsResponse.data ?? []
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'customers.toasts.paymentsLoadFailed'))
      return []
    }
  }

  const recordPayment = async (customerId: string, paymentFields: CustomerPaymentFields): Promise<CustomerPayment> => {
    saving.value = true
    try {
      const paymentResponse = await apiFetch<ApiEnvelope<CustomerPayment>>(`/api/customers/${customerId}/payments`, {
        method: 'POST',
        body: paymentFields,
      })
      toast.success(t('customers.toasts.paymentRecorded'))
      return paymentResponse.data
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'customers.toasts.paymentFailed'))
      throw error
    } finally {
      saving.value = false
    }
  }

  const voidPayment = async (customerId: string, paymentId: string, reason: string): Promise<CustomerPayment> => {
    saving.value = true
    try {
      const voidResponse = await apiFetch<ApiEnvelope<CustomerPayment>>(`/api/customers/${customerId}/payments/${paymentId}/void`, {
        method: 'POST',
        body: { reason },
      })
      toast.success(t('customers.toasts.paymentVoided'))
      return voidResponse.data
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'customers.toasts.voidFailed'))
      throw error
    } finally {
      saving.value = false
    }
  }

  const fetchStatement = async (customerId: string, fromDate: string, toDate: string): Promise<CustomerStatement | null> => {
    loading.value = true
    try {
      const statementResponse = await apiFetch<ApiEnvelope<CustomerStatement>>(`/api/customers/${customerId}/statement`, {
        query: { from: fromDate || undefined, to: toDate || undefined },
      })
      return statementResponse.data
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'customers.toasts.statementLoadFailed'))
      return null
    } finally {
      loading.value = false
    }
  }

  return {
    customers,
    totalCustomers,
    loading,
    saving,
    fetchCustomers,
    searchCustomers,
    fetchCustomer,
    saveCustomer,
    deactivateCustomer,
    restoreCustomer,
    fetchDebtors,
    fetchCustomerSales,
    fetchPayments,
    recordPayment,
    voidPayment,
    fetchStatement,
  }
}
