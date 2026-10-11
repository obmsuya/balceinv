import { toast } from 'vue-sonner'
import { apiErrorMessage, formatDate, t } from '~/utils/i18n'

export type AdminRole = 'admin' | 'support'

export interface AdminStaff {
  id: string
  email: string
  name: string
  role: AdminRole
}

export interface AdminShopRow {
  company_id: string
  name: string
  phone: string | null
  owner_name: string | null
  owner_email: string | null
  user_count: number
  shop_count: number
  sales_last_30_days: number
  last_sale_at: string | null
  is_trial: boolean | null
  subscription_ends_at: string | null
  created_at: string
}

export interface AdminShopUser {
  id: string
  name: string
  email: string
  role_name: string
  is_owner: boolean
  is_active: boolean
  must_change_password: boolean
}

export interface AdminAuditEntry {
  id: string
  staff_name: string
  action: string
  company_id: string | null
  company_name: string | null
  details: string
  created_at: string
}

export interface AdminShopDetail extends AdminShopRow {
  subscription_id: string
  currency_code: string
  shop_names: string[]
  users: AdminShopUser[]
  recent_audit: AdminAuditEntry[]
}

export interface AdminShopPage {
  items: AdminShopRow[]
  total: number
}

export interface AdminSupportMessage {
  id: string
  company_id: string
  company_name: string
  user_name: string | null
  topic: string
  message: string
  contact_email: string | null
  contact_phone: string | null
  email_status: string
  created_at: string
  handled_at: string | null
  handled_by_name: string | null
}

export interface AdminNewShop {
  business_name: string
  shop_name: string
  owner_name: string
  owner_email: string
}

export interface AdminOneTimePassword {
  email: string
  one_time_password: string
}

export interface WapangajiStatus {
  connected: boolean
  name: string
}

export interface AdminLicence {
  license_key: string
  phone: string
  package: string | null
  expires_at: string
  days_granted: number
  max_devices: number
  device_count: number
}

export interface AdminLicenceLookup {
  found: boolean
  licence: AdminLicence | null
  company_id: string | null
  company_name: string | null
}

export interface AdminLicencePackage {
  id: number
  name: string
  price: string
  days_granted: number
  max_devices: number
}

export interface AdminLicencePayment {
  phone: string
  package: string | null
  amount: string
  method: string
  reference: string
  processed_by: string | null
  created_at: string
}

export interface AdminLicencePaymentInput {
  hardware_id: string
  phone: string
  package_id: number
  amount: number
  method: 'cash' | 'mobile_money' | 'bank_transfer'
  reference: string
}

export interface AdminLicenceDevices {
  license_key: string
  hardware_ids: string[]
  max_devices: number
}

interface ApiEnvelope<Payload> {
  success: boolean
  message: string
  data: Payload
}

export const adminPageSize = 50

export const useAdmin = () => {
  const runtimeConfig = useRuntimeConfig()
  const adminFetch = $fetch.create({ baseURL: String(runtimeConfig.public.apiBase), credentials: 'include' })
  const staff = useState<AdminStaff | null>('admin:staff', () => null)
  const busy = useState<boolean>('admin:busy', () => false)

  const fetchMe = async (): Promise<AdminStaff | null> => {
    try {
      const meResponse = await adminFetch<ApiEnvelope<AdminStaff>>('/api/admin/me')
      staff.value = meResponse.data
    } catch {
      staff.value = null
    }
    return staff.value
  }

  const signIn = async (email: string, password: string, code: string): Promise<boolean> => {
    busy.value = true
    try {
      const signInResponse = await adminFetch<ApiEnvelope<AdminStaff>>('/api/admin/sign-in', { method: 'POST', body: { email, password, code } })
      staff.value = signInResponse.data
      return true
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'admin.signIn.failed'))
      return false
    } finally {
      busy.value = false
    }
  }

  const signOut = async () => {
    try {
      await adminFetch('/api/admin/sign-out', { method: 'POST' })
    } catch {
    } finally {
      staff.value = null
      await navigateTo('/admin/login')
    }
  }

  const fetchShops = async (search: string, offset: number): Promise<AdminShopPage> => {
    try {
      const shopsResponse = await adminFetch<ApiEnvelope<AdminShopPage>>('/api/admin/shops', { query: { search, offset } })
      return shopsResponse.data
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'admin.toasts.loadFailed'))
      return { items: [], total: 0 }
    }
  }

  const fetchShop = async (companyId: string): Promise<AdminShopDetail | null> => {
    try {
      const shopResponse = await adminFetch<ApiEnvelope<AdminShopDetail>>(`/api/admin/shops/${companyId}`)
      return shopResponse.data
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'admin.toasts.loadFailed'))
      return null
    }
  }

  const createShop = async (newShop: AdminNewShop): Promise<AdminOneTimePassword | null> => {
    busy.value = true
    try {
      const createResponse = await adminFetch<ApiEnvelope<{ company_id: string; owner_email: string; one_time_password: string }>>('/api/admin/shops', { method: 'POST', body: newShop })
      toast.success(t('admin.toasts.shopCreated'))
      return { email: createResponse.data.owner_email, one_time_password: createResponse.data.one_time_password }
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'admin.toasts.createFailed'))
      return null
    } finally {
      busy.value = false
    }
  }

  const extendTrial = async (companyId: string, days: number): Promise<string | null> => {
    busy.value = true
    try {
      const extendResponse = await adminFetch<ApiEnvelope<{ trial_ends_at: string }>>(`/api/admin/shops/${companyId}/extend-trial`, { method: 'POST', body: { days } })
      toast.success(t('admin.toasts.trialExtended'))
      return extendResponse.data.trial_ends_at
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'admin.toasts.extendFailed'))
      return null
    } finally {
      busy.value = false
    }
  }

  const resetPassword = async (companyId: string, userId: string): Promise<AdminOneTimePassword | null> => {
    busy.value = true
    try {
      const resetResponse = await adminFetch<ApiEnvelope<AdminOneTimePassword>>(`/api/admin/shops/${companyId}/users/${userId}/reset-password`, { method: 'POST' })
      toast.success(t('admin.toasts.passwordReset'))
      return resetResponse.data
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'admin.toasts.resetFailed'))
      return null
    } finally {
      busy.value = false
    }
  }

  const fetchSupport = async (showAll: boolean): Promise<AdminSupportMessage[]> => {
    try {
      const supportResponse = await adminFetch<ApiEnvelope<AdminSupportMessage[]>>('/api/admin/support', { query: { show: showAll ? 'all' : 'open' } })
      return supportResponse.data
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'admin.toasts.loadFailed'))
      return []
    }
  }

  const markHandled = async (messageId: string): Promise<boolean> => {
    busy.value = true
    try {
      await adminFetch(`/api/admin/support/${messageId}/handled`, { method: 'POST' })
      toast.success(t('admin.toasts.handled'))
      return true
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'admin.toasts.handleFailed'))
      return false
    } finally {
      busy.value = false
    }
  }

  const fetchAudit = async (): Promise<AdminAuditEntry[]> => {
    try {
      const auditResponse = await adminFetch<ApiEnvelope<AdminAuditEntry[]>>('/api/admin/audit')
      return auditResponse.data
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'admin.toasts.loadFailed'))
      return []
    }
  }

  const wapangaji = useState<WapangajiStatus>('admin:wapangaji', () => ({ connected: false, name: '' }))
  const isDeviceRemovalMissing = useState<boolean>('admin:deviceRemovalMissing', () => false)

  const fetchWapangajiStatus = async () => {
    try {
      const statusResponse = await adminFetch<ApiEnvelope<WapangajiStatus>>('/api/admin/wapangaji')
      wapangaji.value = statusResponse.data
    } catch {
      wapangaji.value = { connected: false, name: '' }
    }
  }

  const forgetWapangajiWhenExpired = (error: any) => {
    if (error?.data?.code === 'wapangaji_not_connected') wapangaji.value = { connected: false, name: '' }
  }

  const connectWapangaji = async (phone: string, password: string): Promise<boolean> => {
    busy.value = true
    try {
      const connectResponse = await adminFetch<ApiEnvelope<WapangajiStatus>>('/api/admin/wapangaji/connect', { method: 'POST', body: { phone, password } })
      wapangaji.value = connectResponse.data
      toast.success(t('admin.licences.connected', { name: connectResponse.data.name }))
      return true
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'admin.licences.connectFailed'))
      return false
    } finally {
      busy.value = false
    }
  }

  const disconnectWapangaji = async () => {
    try {
      await adminFetch('/api/admin/wapangaji/disconnect', { method: 'POST' })
    } catch {
    } finally {
      wapangaji.value = { connected: false, name: '' }
    }
  }

  const lookupLicence = async (hardwareId: string, phone: string): Promise<AdminLicenceLookup | null> => {
    try {
      const lookupResponse = await adminFetch<ApiEnvelope<AdminLicenceLookup>>('/api/admin/licences/lookup', { method: 'POST', body: { hardware_id: hardwareId, phone } })
      return lookupResponse.data
    } catch (error: any) {
      forgetWapangajiWhenExpired(error)
      toast.error(apiErrorMessage(error, 'admin.licences.lookupFailed'))
      return null
    }
  }

  const fetchPackages = async (): Promise<AdminLicencePackage[]> => {
    try {
      const packagesResponse = await adminFetch<ApiEnvelope<AdminLicencePackage[]>>('/api/admin/licences/packages')
      return packagesResponse.data
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'admin.toasts.loadFailed'))
      return []
    }
  }

  const fetchLicencePayments = async (hardwareId: string): Promise<AdminLicencePayment[]> => {
    try {
      const paymentsResponse = await adminFetch<ApiEnvelope<AdminLicencePayment[]>>('/api/admin/licences/payments', { method: 'POST', body: { hardware_id: hardwareId } })
      return paymentsResponse.data
    } catch (error: any) {
      forgetWapangajiWhenExpired(error)
      return []
    }
  }

  const recordLicencePayment = async (payment: AdminLicencePaymentInput): Promise<AdminLicence | null> => {
    busy.value = true
    try {
      const recordResponse = await adminFetch<ApiEnvelope<AdminLicence>>('/api/admin/licences/record-payment', { method: 'POST', body: payment })
      toast.success(t('admin.licences.activated'))
      return recordResponse.data
    } catch (error: any) {
      forgetWapangajiWhenExpired(error)
      toast.error(apiErrorMessage(error, 'admin.licences.activateFailed'))
      return null
    } finally {
      busy.value = false
    }
  }

  const fetchLicenceDevices = async (hardwareId: string): Promise<AdminLicenceDevices | null> => {
    try {
      const devicesResponse = await adminFetch<ApiEnvelope<AdminLicenceDevices>>('/api/admin/licences/devices', { method: 'POST', body: { hardware_id: hardwareId } })
      isDeviceRemovalMissing.value = false
      return devicesResponse.data
    } catch (error: any) {
      forgetWapangajiWhenExpired(error)
      if (error?.data?.code === 'wapangaji_update_required') {
        isDeviceRemovalMissing.value = true
        return null
      }
      toast.error(apiErrorMessage(error, 'admin.toasts.loadFailed'))
      return null
    }
  }

  const removeLicenceDevice = async (hardwareId: string, removeHardwareId: string): Promise<AdminLicenceDevices | null> => {
    busy.value = true
    try {
      const removeResponse = await adminFetch<ApiEnvelope<AdminLicenceDevices>>('/api/admin/licences/remove-device', { method: 'POST', body: { hardware_id: hardwareId, remove_hardware_id: removeHardwareId } })
      toast.success(t('admin.licences.deviceRemoved'))
      return removeResponse.data
    } catch (error: any) {
      forgetWapangajiWhenExpired(error)
      toast.error(apiErrorMessage(error, 'admin.licences.removeFailed'))
      return null
    } finally {
      busy.value = false
    }
  }

  return {
    staff,
    busy,
    fetchMe,
    signIn,
    signOut,
    fetchShops,
    fetchShop,
    createShop,
    extendTrial,
    resetPassword,
    fetchSupport,
    markHandled,
    fetchAudit,
    wapangaji,
    isDeviceRemovalMissing,
    fetchWapangajiStatus,
    connectWapangaji,
    disconnectWapangaji,
    lookupLicence,
    fetchPackages,
    fetchLicencePayments,
    recordLicencePayment,
    fetchLicenceDevices,
    removeLicenceDevice,
  }
}

export const adminPlanLabel = (shopRow: AdminShopRow): { text: string; tone: 'trial' | 'paid' | 'ended' | 'none' } => {
  if (!shopRow.subscription_ends_at) return { text: t('admin.shops.noPlan'), tone: 'none' }
  const endsAt = new Date(shopRow.subscription_ends_at)
  const date = formatDate(endsAt)
  if (endsAt.getTime() < Date.now()) return { text: t('admin.shops.ended', { date }), tone: 'ended' }
  if (shopRow.is_trial) return { text: t('admin.shops.trialUntil', { date }), tone: 'trial' }
  return { text: t('admin.shops.planUntil', { date }), tone: 'paid' }
}
