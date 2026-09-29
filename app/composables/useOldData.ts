import { toast } from 'vue-sonner'
import { apiErrorMessage, t } from '~/utils/i18n'
import { setMoneyFormat } from '~/utils/money'

interface ApiEnvelope<Payload> {
  success: boolean
  message: string
  data: Payload
}

export interface OldUser {
  id: number
  name: string
  email: string
}

export interface OldDataPreview {
  business_name: string
  currency_code: string
  currency_decimals: number
  counts: {
    products: number
    users: number
    sales: number
    sale_lines: number
    suppliers: number
    discounts: number
  }
  first_sale_at: string | null
  last_sale_at: string | null
  owner_choices: OldUser[]
  default_owner_id: number | null
  passwords_kept: boolean
}

export interface CountCheck {
  old: number
  new: number
  matched: boolean
}

export interface OldDataSelfCheck {
  products: CountCheck
  users: CountCheck
  sales: CountCheck
  sale_lines: CountCheck
  suppliers: CountCheck | null
  sales_value: CountCheck
  stock_value: CountCheck
  matched: boolean
}

export interface RenamedValue {
  name: string
  old: string
  new: string
}

export interface OldDataImportResult {
  company_id: string
  owner_email: string
  passwords_kept: boolean
  temporary_passwords: { name: string; email: string; password: string }[]
  self_check: OldDataSelfCheck
  renamed_skus: RenamedValue[]
  renamed_barcodes: RenamedValue[]
  changed_emails: RenamedValue[]
  notes: { code: string; count: number }[]
}

export interface OldDataImportValues {
  business_name: string
  owner_id: number | null
}

export const useOldData = () => {
  const { $apiFetch } = useNuxtApp()
  const apiFetch = $apiFetch as typeof $fetch

  const preview = ref<OldDataPreview | null>(null)
  const previewError = ref('')
  const isLoadingPreview = ref(false)
  const isImporting = ref(false)
  const importResult = ref<OldDataImportResult | null>(null)
  const mismatch = ref<OldDataSelfCheck | null>(null)

  const loadPreview = async () => {
    isLoadingPreview.value = true
    previewError.value = ''
    try {
      const previewResponse = await apiFetch<ApiEnvelope<OldDataPreview>>('/api/setup/import-old/preview')
      preview.value = previewResponse.data
      setMoneyFormat(previewResponse.data.currency_code, previewResponse.data.currency_decimals)
    } catch (error: any) {
      previewError.value = apiErrorMessage(error, 'setup.importOld.toasts.previewFailed')
    } finally {
      isLoadingPreview.value = false
    }
  }

  const importOldData = async (values: OldDataImportValues): Promise<OldDataImportResult | null> => {
    isImporting.value = true
    mismatch.value = null
    try {
      const importResponse = await apiFetch<ApiEnvelope<OldDataImportResult>>('/api/setup/import-old', {
        method: 'POST',
        body: values,
      })
      importResult.value = importResponse.data
      toast.success(t('setup.importOld.toasts.imported'))
      return importResponse.data
    } catch (error: any) {
      if (error?.data?.code === 'import_mismatch') mismatch.value = error.data.data ?? null
      toast.error(apiErrorMessage(error, 'setup.importOld.toasts.failed'))
      return null
    } finally {
      isImporting.value = false
    }
  }

  return {
    preview: readonly(preview),
    previewError: readonly(previewError),
    isLoadingPreview: readonly(isLoadingPreview),
    isImporting: readonly(isImporting),
    importResult: readonly(importResult),
    mismatch: readonly(mismatch),
    loadPreview,
    importOldData,
  }
}
