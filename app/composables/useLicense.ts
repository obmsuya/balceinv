import { toast } from 'vue-sonner'

export interface LicenseStatus {
  licensed: boolean
  expires_at?: string
  days_remaining?: number
  is_grace_period?: boolean
  is_trial?: boolean
  plan?: number
  max_devices?: number
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
  provider: 'Mpesa' | 'Tigo' | 'Airtel' | 'Halopesa' | 'Azampesa'
  package_id: number
}

interface ApiResponse<T> {
  success: boolean
  message?: string
  data?: T
}

export const useLicense = () => {
  const runtimeConfig = useRuntimeConfig()
  const apiBaseUrl = runtimeConfig.public.apiBase
  const nuxtApp = useNuxtApp()
  const apiFetch = nuxtApp.$apiFetch as typeof $fetch

  const licenseStatus = useState<LicenseStatus | null>('license:status', () => null)
  const licensePackages = useState<LicensePackage[]>('license:packages', () => [])
  const lastPackage = useState<LicensePackage | null>('license:last-package', () => null)
  const bannerDismissed = useState<boolean>('license:banner-dismissed', () => false)
  const loading = ref(false)

  const fetchLicenseStatus = async (): Promise<void> => {
    loading.value = true
    try {
      const response = await apiFetch<ApiResponse<LicenseStatus>>(`${apiBaseUrl}/api/license/status`, {
        credentials: 'include'
      })
      licenseStatus.value = response.data ?? null
    } catch {
      licenseStatus.value = {
        licensed: false,
        is_grace_period: false,
        is_trial: false
      }
    } finally {
      loading.value = false
    }
  }

  const fetchPackages = async (): Promise<void> => {
    loading.value = true
    try {
      const response = await apiFetch<ApiResponse<LicensePackage[]>>(`${apiBaseUrl}/api/license/packages`, {
        credentials: 'include'
      })
      licensePackages.value = response.data ?? []
    } catch (error: any) {
      toast.error(error?.data?.message || 'Could not load subscription packages')
    } finally {
      loading.value = false
    }
  }

  const fetchLastPackage = async (): Promise<void> => {
    const currentPlan = licenseStatus.value?.plan
    if (!currentPlan || licensePackages.value.length === 0) {
      lastPackage.value = null
      return
    }

    let matchingPackage: LicensePackage | null = null
    for (const candidatePackage of licensePackages.value) {
      if (candidatePackage.days_granted === currentPlan) {
        matchingPackage = candidatePackage
      }
    }
    lastPackage.value = matchingPackage
  }

  const payForLicense = async (input: LicensePaymentInput): Promise<ApiResponse<any>> => {
    try {
      const response = await apiFetch<ApiResponse<any>>(`${apiBaseUrl}/api/license/pay`, {
        method: 'POST',
        body: input,
        credentials: 'include'
      })
      return response
    } catch (error: any) {
      toast.error(error?.data?.message || 'Payment could not be started')
      throw error
    }
  }

  const pollUntilLicensed = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      const pollTimeoutMilliseconds = 90000
      const pollIntervalMilliseconds = 4000
      let elapsedMilliseconds = 0

      const interval = setInterval(async () => {
        elapsedMilliseconds += pollIntervalMilliseconds
        await fetchLicenseStatus()

        if (licenseStatus.value?.licensed === true) {
          clearInterval(interval)
          resolve()
          return
        }

        if (elapsedMilliseconds >= pollTimeoutMilliseconds) {
          clearInterval(interval)
          reject(new Error('Polling timeout'))
        }
      }, pollIntervalMilliseconds)
    })
  }

  const dismissBanner = (): void => {
    bannerDismissed.value = true
  }

  const isLicensed = computed(() => {
    return licenseStatus.value?.licensed === true
  })

  const isTrial = computed(() => {
    return licenseStatus.value?.is_trial === true
  })

  const isInGracePeriod = computed(() => {
    return licenseStatus.value?.is_grace_period === true
  })

  const isHardLocked = computed(() => {
    if (!licenseStatus.value) return false
    return !isLicensed.value && !isInGracePeriod.value
  })

  const showGraceBanner = computed(() => {
    return isInGracePeriod.value && !bannerDismissed.value
  })

  const showTrialBanner = computed(() => {
    return isLicensed.value && isTrial.value && !bannerDismissed.value
  })

  return {
    licenseStatus,
    licensePackages,
    lastPackage,
    bannerDismissed,
    loading,
    isLicensed,
    isTrial,
    isHardLocked,
    isInGracePeriod,
    showGraceBanner,
    showTrialBanner,
    fetchLicenseStatus,
    fetchPackages,
    fetchLastPackage,
    payForLicense,
    pollUntilLicensed,
    dismissBanner,
  }
}
