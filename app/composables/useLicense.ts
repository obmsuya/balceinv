import type { MobileMoneyProvider } from '~/utils/mobileMoney'
import { activeLocale, apiErrorMessage, t } from '~/utils/i18n'

export type LockReason = '' | 'missing' | 'expired' | 'clock'

export interface LicenseStatus {
  licensed: boolean
  expires_at?: string
  days_remaining?: number
  grace_days_remaining?: number
  is_grace_period?: boolean
  is_trial?: boolean
  plan?: number
  max_devices?: number
  lock_reason?: LockReason
}

export interface LicensePackage {
  id: number
  name: string
  price: string
  days_granted: number
  max_devices: number
}

export interface LicensePaymentInput {
  phone: string
  provider: MobileMoneyProvider
  package_id: number
}

export type PaymentWaitResult = 'paid' | 'timeout' | 'cancelled'

export interface PaymentWaitHandle {
  cancelled: boolean
}

interface ApiResponse<T> {
  success: boolean
  message?: string
  error?: string
  data?: T
}

const expiringSoonDays = 7
const paymentPollIntervalMilliseconds = 5000
const paymentWaitLimitMilliseconds = 120000

const wait = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds))

export const readLicenseError = (error: any, fallbackKey: string): string =>
  (activeLocale.value === 'en' && error?.data?.error) || apiErrorMessage(error, fallbackKey)

export const useLicense = () => {
  const runtimeConfig = useRuntimeConfig()
  const apiBaseUrl = runtimeConfig.public.apiBase
  const nuxtApp = useNuxtApp()
  const apiFetch = nuxtApp.$apiFetch as typeof $fetch

  const licenseStatus = useState<LicenseStatus | null>('license:status', () => null)
  const licensePackages = useState<LicensePackage[]>('license:packages', () => [])
  const packagesError = useState<string>('license:packages-error', () => '')
  const packagesLoading = useState<boolean>('license:packages-loading', () => false)
  const paymentDialogOpen = useState<boolean>('license:payment-dialog-open', () => false)
  const hardwareId = useState<string | null>('license:hardware-id', () => null)
  const loading = ref(false)

  const fetchLicenseStatus = async (): Promise<void> => {
    loading.value = true
    try {
      const response = await apiFetch<ApiResponse<LicenseStatus>>(`${apiBaseUrl}/api/license/status`, {
        credentials: 'include'
      })
      licenseStatus.value = response.data ?? null
    } catch {
      return
    } finally {
      loading.value = false
    }
  }

  const refreshLicense = async (): Promise<LicenseStatus | null> => {
    const response = await apiFetch<ApiResponse<LicenseStatus>>(`${apiBaseUrl}/api/license/refresh`, {
      method: 'POST',
      credentials: 'include'
    })
    licenseStatus.value = response.data ?? licenseStatus.value
    return licenseStatus.value
  }

  const fetchHardwareId = async (): Promise<void> => {
    try {
      const response = await apiFetch<{ success: boolean; hardware_id?: string }>(
        `${apiBaseUrl}/api/license/hardware-id`,
        { credentials: 'include' }
      )
      hardwareId.value = response.hardware_id ?? null
    } catch {
      hardwareId.value = null
    }
  }

  const fetchPackages = async (): Promise<void> => {
    packagesLoading.value = true
    packagesError.value = ''
    try {
      const response = await apiFetch<ApiResponse<LicensePackage[]>>(`${apiBaseUrl}/api/license/packages`, {
        credentials: 'include'
      })
      licensePackages.value = [...(response.data ?? [])].sort((first, second) => first.days_granted - second.days_granted)
    } catch (error: any) {
      packagesError.value = readLicenseError(error, 'license.payment.packagesFailed')
    } finally {
      packagesLoading.value = false
    }
  }

  const currentPackage = computed<LicensePackage | null>(() => {
    const currentPlanDays = licenseStatus.value?.plan
    if (!currentPlanDays || licenseStatus.value?.is_trial) return null
    return licensePackages.value.find(licensePackage => licensePackage.days_granted === currentPlanDays) ?? null
  })

  const payForLicense = async (input: LicensePaymentInput): Promise<void> => {
    const response = await apiFetch<ApiResponse<unknown>>(`${apiBaseUrl}/api/license/pay`, {
      method: 'POST',
      body: input,
      credentials: 'include'
    })
    if (response?.success === false) {
      throw { data: { error: response.error || response.message || t('license.payment.startFailed') } }
    }
  }

  const waitForPayment = async (
    statusBeforePayment: LicenseStatus | null,
    waitHandle: PaymentWaitHandle,
  ): Promise<PaymentWaitResult> => {
    const expiryBeforePayment = statusBeforePayment?.expires_at
    const wasTrialBeforePayment = statusBeforePayment?.is_trial === true
    const wasLicensedBeforePayment = statusBeforePayment?.licensed === true
    const waitDeadline = Date.now() + paymentWaitLimitMilliseconds

    while (Date.now() < waitDeadline) {
      await wait(paymentPollIntervalMilliseconds)
      if (waitHandle.cancelled) return 'cancelled'

      try {
        const latestStatus = await refreshLicense()
        const subscriptionChanged =
          latestStatus?.licensed === true &&
          (!wasLicensedBeforePayment ||
            (wasTrialBeforePayment && latestStatus.is_trial !== true) ||
            latestStatus.expires_at !== expiryBeforePayment)
        if (subscriptionChanged) return 'paid'
      } catch {
        continue
      }
    }
    return 'timeout'
  }

  const openPaymentDialog = (): void => {
    paymentDialogOpen.value = true
    if (licensePackages.value.length === 0 && !packagesLoading.value) fetchPackages()
  }

  const isLicensed = computed(() => licenseStatus.value?.licensed === true)
  const isTrial = computed(() => licenseStatus.value?.is_trial === true)
  const isInGracePeriod = computed(() => licenseStatus.value?.is_grace_period === true)
  const isHardLocked = computed(() => licenseStatus.value !== null && !isLicensed.value)
  const lockReason = computed<LockReason>(() => licenseStatus.value?.lock_reason ?? '')
  const isExpiringSoon = computed(() =>
    isLicensed.value &&
    !isInGracePeriod.value &&
    (licenseStatus.value?.days_remaining ?? Number.POSITIVE_INFINITY) <= expiringSoonDays
  )

  return {
    licenseStatus,
    licensePackages,
    packagesError,
    packagesLoading,
    paymentDialogOpen,
    currentPackage,
    hardwareId,
    loading,
    isLicensed,
    isTrial,
    isHardLocked,
    isInGracePeriod,
    isExpiringSoon,
    lockReason,
    fetchLicenseStatus,
    refreshLicense,
    fetchPackages,
    fetchHardwareId,
    payForLicense,
    waitForPayment,
    openPaymentDialog,
  }
}
