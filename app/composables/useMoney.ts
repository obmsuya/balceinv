import { toast } from 'vue-sonner'
import { activeLocale, apiErrorMessage, t } from '~/utils/i18n'
import { saveFile } from '~/utils/download'

export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense'
export type MoneyKind = 'expense' | 'owner_in' | 'owner_out' | 'money_move' | 'other_income'
export type MoneyPlace = 'cash' | 'mobile_money' | 'bank' | 'card_clearing'
export type MoneyReport = 'profit-and-loss' | 'balance-sheet' | 'trial-balance' | 'statement' | 'vat'
export type MoneyExportFormat = 'xlsx' | 'pdf'

export const moneyPlaces: MoneyPlace[] = ['cash', 'mobile_money', 'bank']
export const moneyPageSources = ['expense', 'owner_in', 'owner_out', 'money_move', 'other_income', 'reversal', 'opening', 'manual']

export interface BooksStatus {
  mode: 'off' | 'simple' | 'full'
  vat_registered: boolean
  vat_rate_basis_points: number
  started: boolean
  started_on: string | null
  start_mode: 'today' | 'history' | null
  closed_until: string | null
  today: string
  first_record_date: string | null
  suggested_start_mode: 'today' | 'history'
  unposted_count: number
}

export interface BooksAccount {
  id: string
  code: string
  system_key: string | null
  name: string | null
  type: AccountType
  is_system: boolean
  is_active: boolean
  is_money: boolean
  is_spendable: boolean
}

export interface EntryLine {
  line_no: number
  account_id: string
  account_code: string
  account_key: string | null
  account_name: string | null
  account_type: AccountType
  debit: number
  credit: number
  shop_id: string | null
  shop_name: string | null
}

export interface BooksEntry {
  id: string
  entry_number: number
  number: string
  entry_date: string
  source_type: string
  source_id: string | null
  memo: string | null
  shop_id: string | null
  shop_name: string | null
  has_attachment: boolean
  receipt_number: string | null
  supplier_tin: string | null
  reverses_entry_id: string | null
  reversed_by_entry_id: string | null
  is_reversible: boolean
  created_by_name: string | null
  created_at: string
  amount: number
  lines: EntryLine[]
}

export interface AccountAmount {
  account_id: string
  code: string
  system_key: string | null
  name: string | null
  type: AccountType
  amount: number
}

export interface BooksOverview {
  from: string
  to: string
  money_in: number
  money_out: number
  income: number
  costs: number
  profit: number
  balances: { cash: number; mobile_money: number; bank: number; card_clearing: number }
  what_i_own: number
  what_i_owe: number
  customers_owe: number
  owed_to_suppliers: number
  vat: { charged: number; reclaimable: number; to_pay: number; due_date: string } | null
}

export interface ProfitAndLoss {
  from: string
  to: string
  income: AccountAmount[]
  total_income: number
  cost_of_goods: number
  gross_profit: number
  expenses: AccountAmount[]
  total_expenses: number
  net_profit: number
}

export interface BalanceSheet {
  as_of: string
  assets: AccountAmount[]
  total_assets: number
  liabilities: AccountAmount[]
  total_liabilities: number
  equity: AccountAmount[]
  profit_to_date: number
  total_equity: number
  is_balanced: boolean
}

export interface TrialBalanceRow extends AccountAmount {
  total_debit: number
  total_credit: number
  debit_balance: number
  credit_balance: number
}

export interface TrialBalance {
  as_of: string
  rows: TrialBalanceRow[]
  total_debit_balance: number
  total_credit_balance: number
  is_balanced: boolean
}

export interface BooksStatementLine {
  entry_id: string
  number: string
  entry_date: string
  source_type: string
  memo: string | null
  debit: number
  credit: number
  balance: number
  shop_name: string | null
}

export interface AccountStatement {
  account: BooksAccount
  from: string
  to: string
  opening_balance: number
  total_debit: number
  total_credit: number
  closing_balance: number
  lines: BooksStatementLine[]
}

export interface VatReport {
  from: string
  to: string
  months: Array<{ month: string; charged: number; reclaimable: number; to_pay: number; due_date: string }>
  total_charged: number
  total_reclaimable: number
  total_to_pay: number
}

export interface BooksCheck {
  from: string
  to: string
  total_debit: number
  total_credit: number
  is_balanced: boolean
  vat_registered: boolean
  ledger_sales: number
  sales_report_total: number
  sales_report_tax: number
  expected_ledger_sales: number
  sales_difference: number
  unposted_count: number
  inventory_account: number
  live_stock_value: number
  inventory_difference: number
}

export interface MoneyFields {
  client_ref: string
  kind: MoneyKind
  entry_date: string
  amount: number
  money_account: MoneyPlace
  to_money_account?: MoneyPlace | null
  expense_account_id?: string | null
  fee?: number
  shop_id?: string | null
  note?: string | null
  attachment_key?: string | null
  includes_vat?: boolean
  vat_amount?: number | null
  supplier_tin?: string | null
  receipt_number?: string | null
}

export interface ManualLine {
  account_id: string
  debit: number
  credit: number
  shop_id: string | null
}

export interface EntryFilter {
  from?: string
  to?: string
  source_type?: string
  account_id?: string
  shop?: string
}

export interface ReportPeriod {
  from?: string
  to?: string
  shop?: string
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

export const entryPageSize = 30

export const accountName = (account: { system_key?: string | null; account_key?: string | null; name?: string | null; account_name?: string | null }): string => {
  const systemKey = account.system_key ?? account.account_key
  if (systemKey) return t(`money.accounts.${systemKey}`)
  return account.name ?? account.account_name ?? ''
}

export const newClientRef = (): string => `money-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

const cleanQuery = (query: Record<string, string | undefined>) =>
  Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined && value !== ''))

export const useMoney = () => {
  const { $apiFetch } = useNuxtApp()
  const apiFetch = $apiFetch as typeof $fetch

  const status = useState<BooksStatus | null>('money:status', () => null)
  const accounts = useState<BooksAccount[]>('money:accounts', () => [])
  const saving = ref(false)
  const exporting = ref<MoneyExportFormat | null>(null)

  const fetchStatus = async (): Promise<BooksStatus | null> => {
    try {
      const statusResponse = await apiFetch<ApiEnvelope<BooksStatus>>('/api/accounting/status')
      status.value = statusResponse.data
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'money.toasts.loadFailed'))
    }
    return status.value
  }

  const fetchAccounts = async (): Promise<void> => {
    try {
      const accountsResponse = await apiFetch<ApiEnvelope<BooksAccount[]>>('/api/accounting/accounts')
      accounts.value = accountsResponse.data ?? []
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'money.toasts.loadFailed'))
    }
  }

  const fetchReport = async <Report>(path: string, query: Record<string, string | undefined>): Promise<Report | null> => {
    try {
      const reportResponse = await apiFetch<ApiEnvelope<Report>>(path, { query: cleanQuery(query) })
      return reportResponse.data
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'money.toasts.loadFailed'))
      return null
    }
  }

  const fetchOverview = (period: ReportPeriod) => fetchReport<BooksOverview>('/api/accounting/overview', { ...period })
  const fetchProfitAndLoss = (period: ReportPeriod) => fetchReport<ProfitAndLoss>('/api/accounting/profit-and-loss', { ...period })
  const fetchBalanceSheet = (asOf: string) => fetchReport<BalanceSheet>('/api/accounting/balance-sheet', { as_of: asOf })
  const fetchTrialBalance = (asOf: string) => fetchReport<TrialBalance>('/api/accounting/trial-balance', { as_of: asOf })
  const fetchStatement = (account: string, period: ReportPeriod) => fetchReport<AccountStatement>('/api/accounting/statement', { ...period, account })
  const fetchVatReport = (period: ReportPeriod) => fetchReport<VatReport>('/api/accounting/vat', { from: period.from, to: period.to })
  const fetchBooksCheck = (period: ReportPeriod) => fetchReport<BooksCheck>('/api/accounting/integrity', { from: period.from, to: period.to })

  const fetchEntries = async (filter: EntryFilter, offset = 0, limit = entryPageSize): Promise<Page<BooksEntry> | null> => {
    try {
      const entryResponse = await apiFetch<ApiEnvelope<Page<BooksEntry>>>('/api/accounting/entries', {
        query: { ...cleanQuery({ ...filter }), limit, offset },
      })
      return entryResponse.data
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'money.toasts.loadFailed'))
      return null
    }
  }

  const startBooks = async (answers: { mode: 'today' | 'history'; cash_in_drawer: number; mobile_money: number; bank: number }): Promise<boolean> => {
    saving.value = true
    try {
      const startResponse = await apiFetch<ApiEnvelope<BooksStatus>>('/api/accounting/start', { method: 'POST', body: answers })
      status.value = startResponse.data
      toast.success(t('money.toasts.started'))
      return true
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'money.toasts.startFailed'))
      return false
    } finally {
      saving.value = false
    }
  }

  const catchUp = async (): Promise<void> => {
    saving.value = true
    try {
      const catchUpResponse = await apiFetch<ApiEnvelope<{ posted: number }>>('/api/accounting/catch-up', { method: 'POST' })
      toast.success(t('money.toasts.caughtUp', { count: catchUpResponse.data.posted }))
      await fetchStatus()
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'money.toasts.catchUpFailed'))
    } finally {
      saving.value = false
    }
  }

  const uploadReceipt = async (photo: File): Promise<string | null> => {
    const formData = new FormData()
    formData.append('image', photo)
    try {
      const uploadResponse = await apiFetch<ApiEnvelope<{ attachment_key: string }>>('/api/accounting/receipts', { method: 'POST', body: formData })
      return uploadResponse.data.attachment_key
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'money.toasts.photoFailed'))
      return null
    }
  }

  const recordMoney = async (fields: MoneyFields): Promise<BooksEntry | null> => {
    saving.value = true
    try {
      const recordResponse = await apiFetch<ApiEnvelope<BooksEntry>>('/api/accounting/money', { method: 'POST', body: fields })
      toast.success(t('money.toasts.recorded'))
      return recordResponse.data
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'money.toasts.recordFailed'))
      return null
    } finally {
      saving.value = false
    }
  }

  const reverseEntry = async (entryId: string, reason: string): Promise<BooksEntry | null> => {
    saving.value = true
    try {
      const reverseResponse = await apiFetch<ApiEnvelope<BooksEntry>>(`/api/accounting/entries/${entryId}/reverse`, { method: 'POST', body: { reason } })
      toast.success(t('money.toasts.reversed'))
      return reverseResponse.data
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'money.toasts.reverseFailed'))
      return null
    } finally {
      saving.value = false
    }
  }

  const postManual = async (fields: { client_ref: string; entry_date: string; reason: string; lines: ManualLine[] }): Promise<BooksEntry | null> => {
    saving.value = true
    try {
      const manualResponse = await apiFetch<ApiEnvelope<BooksEntry>>('/api/accounting/manual', { method: 'POST', body: fields })
      toast.success(t('money.toasts.manualPosted'))
      return manualResponse.data
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'money.toasts.manualFailed'))
      return null
    } finally {
      saving.value = false
    }
  }

  const closePeriod = async (closedUntil: string): Promise<boolean> => {
    saving.value = true
    try {
      const closeResponse = await apiFetch<ApiEnvelope<BooksStatus>>('/api/accounting/close', { method: 'POST', body: { closed_until: closedUntil } })
      status.value = closeResponse.data
      toast.success(t('money.toasts.closed'))
      return true
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'money.toasts.closeFailed'))
      return false
    } finally {
      saving.value = false
    }
  }

  const createAccount = async (fields: { code: string; name: string; type: AccountType }): Promise<boolean> => {
    saving.value = true
    try {
      await apiFetch<ApiEnvelope<BooksAccount>>('/api/accounting/accounts', { method: 'POST', body: fields })
      toast.success(t('money.toasts.accountAdded'))
      await fetchAccounts()
      return true
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'money.toasts.accountFailed'))
      return false
    } finally {
      saving.value = false
    }
  }

  const setAccountActive = async (accountId: string, isActive: boolean): Promise<void> => {
    saving.value = true
    try {
      await apiFetch<ApiEnvelope<BooksAccount>>(`/api/accounting/accounts/${accountId}`, { method: 'PUT', body: { is_active: isActive } })
      toast.success(t(isActive ? 'money.toasts.accountOn' : 'money.toasts.accountOff'))
      await fetchAccounts()
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'money.toasts.accountFailed'))
    } finally {
      saving.value = false
    }
  }

  const receiptPhotoUrl = async (entryId: string): Promise<string | null> => {
    try {
      const photoBlob = await apiFetch<Blob>(`/api/accounting/entries/${entryId}/receipt`, { responseType: 'blob' })
      return URL.createObjectURL(photoBlob)
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'money.toasts.photoLoadFailed'))
      return null
    }
  }

  const exportReport = async (report: MoneyReport, format: MoneyExportFormat, query: Record<string, string | undefined>): Promise<void> => {
    exporting.value = format
    try {
      const fileBytes = await apiFetch<ArrayBuffer>(`/api/accounting/${report}`, {
        query: { ...cleanQuery(query), format, lang: activeLocale.value },
        responseType: 'arrayBuffer',
      })
      const fileType = format === 'pdf' ? { name: t('reports.pdfFileType'), extensions: ['pdf'] } : { name: t('reports.excelFileType'), extensions: ['xlsx'] }
      const periodPart = query.as_of ?? [query.from, query.to].filter(Boolean).join('-to-')
      const savedName = await saveFile(new Uint8Array(fileBytes), `${report}-${periodPart || status.value?.today}.${format}`, fileType)
      if (savedName) toast.success(t('reports.toasts.saved'), { description: savedName })
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'reports.toasts.saveFailed'))
    } finally {
      exporting.value = null
    }
  }

  return {
    status,
    accounts,
    saving,
    exporting,
    fetchStatus,
    fetchAccounts,
    fetchOverview,
    fetchProfitAndLoss,
    fetchBalanceSheet,
    fetchTrialBalance,
    fetchStatement,
    fetchVatReport,
    fetchBooksCheck,
    fetchEntries,
    startBooks,
    catchUp,
    uploadReceipt,
    recordMoney,
    reverseEntry,
    postManual,
    closePeriod,
    createAccount,
    setAccountActive,
    receiptPhotoUrl,
    exportReport,
  }
}

const moneyKeys = ['cash', 'mobile_money', 'bank', 'card_clearing']

const isMoneyLine = (line: EntryLine): boolean => line.account_key !== null && moneyKeys.includes(line.account_key)

export const entryTitle = (entry: BooksEntry): string => {
  if (entry.source_type === 'expense') {
    const expenseLine = entry.lines.find(line => line.account_type === 'expense')
    if (expenseLine) return accountName(expenseLine)
  }
  return t(`money.sources.${entry.source_type}`)
}

export const entryPlaces = (entry: BooksEntry): string => {
  const moneyLines = entry.lines.filter(isMoneyLine)
  const fromLine = moneyLines.find(line => line.credit > 0)
  const toLine = moneyLines.find(line => line.debit > 0)
  if (fromLine && toLine) return t('money.entries.fromTo', { from: accountName(fromLine), to: accountName(toLine) })
  if (fromLine) return t('money.entries.from', { place: accountName(fromLine) })
  if (toLine) return t('money.entries.to', { place: accountName(toLine) })
  return ''
}
