import { toast } from 'vue-sonner'

export interface CompanyProfile {
  id: string
  name: string
  business_type: string
  phone: string | null
  address: string | null
  tin: string | null
  logo_url: string | null
  primary_color: string
  currency_code: string
  currency_decimals: number
  timezone: string
  default_locale: string
  receipt_header: string | null
  receipt_footer: string | null
}

export interface Settings {
  company: CompanyProfile
  tax_rate: number
  date_format: string
  receipt_number_format: string
  receipt_language: string
  efd_enabled: boolean
  efd_endpoint: string | null
  efd_api_key_set: boolean
  low_stock_threshold: number
  email_notifications_enabled: boolean
  notification_email: string | null
  alert_sound_enabled: boolean
  alert_on_low_stock: boolean
  alert_on_out_of_stock: boolean
  alert_on_dead_stock: boolean
  dead_stock_days: number
  print_receipt_automatically: boolean
  show_tax_on_receipt: boolean
  show_barcodes_on_receipt: boolean
  printer_enabled: boolean
  printer_port: string
  printer_model: string
  printer_baud_rate: number
  printer_paper_width: number
  open_cash_drawer: boolean
  updated_at: string
}

export interface UpdateSettingsInput {
  business_name?: string
  business_type?: string
  business_phone?: string
  business_address?: string
  business_tin?: string
  receipt_header?: string
  receipt_footer?: string
  primary_color?: string
  currency_code?: string
  currency_decimals?: number
  timezone?: string
  default_locale?: string
  tax_rate?: number
  date_format?: string
  receipt_number_format?: string
  receipt_language?: string
  efd_enabled?: boolean
  efd_endpoint?: string
  efd_api_key?: string
  low_stock_threshold?: number
  email_notifications_enabled?: boolean
  notification_email?: string
  alert_sound_enabled?: boolean
  alert_on_low_stock?: boolean
  alert_on_out_of_stock?: boolean
  alert_on_dead_stock?: boolean
  dead_stock_days?: number
  print_receipt_automatically?: boolean
  show_tax_on_receipt?: boolean
  show_barcodes_on_receipt?: boolean
  printer_enabled?: boolean
  printer_port?: string
  printer_model?: string
  printer_baud_rate?: number
  printer_paper_width?: number
  open_cash_drawer?: boolean
}

interface ApiEnvelope<Payload> {
  success: boolean
  message: string
  data: Payload
}

const brandingFields: Array<keyof UpdateSettingsInput> = ['business_name', 'primary_color', 'currency_code', 'currency_decimals', 'timezone', 'default_locale']

export const assetUrl = (assetPath: string | null | undefined): string | null => {
  if (!assetPath) return null
  const { public: { apiBase } } = useRuntimeConfig()
  return `${apiBase}${assetPath}`
}

export const useSettings = () => {
  const { $apiFetch } = useNuxtApp()
  const apiFetch = $apiFetch as typeof $fetch
  const { fetchCurrentUser } = useAuth()

  const settings = useState<Settings | null>('settings:current', () => null)
  const loading = ref(false)

  const fetchSettings = async (): Promise<void> => {
    loading.value = true
    try {
      const settingsResponse = await apiFetch<ApiEnvelope<Settings>>('/api/settings')
      settings.value = settingsResponse.data
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to load settings')
    } finally {
      loading.value = false
    }
  }

  const updateSettings = async (changes: UpdateSettingsInput): Promise<void> => {
    loading.value = true
    try {
      const updateResponse = await apiFetch<ApiEnvelope<Settings>>('/api/settings', {
        method: 'PUT',
        body: changes,
      })
      settings.value = updateResponse.data
      const touchesBranding = brandingFields.some(fieldName => fieldName in changes)
      if (touchesBranding) await fetchCurrentUser()
      toast.success(updateResponse.message)
    } catch (error: any) {
      const fieldErrors: Array<{ field: string; message: string }> = error?.data?.fields ?? []
      const firstFieldError = fieldErrors[0]
      toast.error(firstFieldError ? `${firstFieldError.field} ${firstFieldError.message}` : error?.data?.message || 'Failed to save settings')
      throw error
    } finally {
      loading.value = false
    }
  }

  const uploadLogo = async (logoFile: File): Promise<void> => {
    loading.value = true
    try {
      const logoForm = new FormData()
      logoForm.append('file', logoFile)
      const uploadResponse = await apiFetch<ApiEnvelope<Settings>>('/api/settings/upload-logo', {
        method: 'POST',
        body: logoForm,
      })
      settings.value = uploadResponse.data
      await fetchCurrentUser()
      toast.success(uploadResponse.message)
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to upload logo')
      throw error
    } finally {
      loading.value = false
    }
  }

  return {
    settings,
    loading,
    fetchSettings,
    updateSettings,
    uploadLogo,
  }
}
