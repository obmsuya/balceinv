import { toast } from 'vue-sonner'

export interface LicenseStatus {
  success: boolean
  licensed: boolean
  expires_at?: string
  days_remaining?: number
  is_grace_period?: boolean
  plan?: number
  max_devices?: number
  message?: string
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
  const { public: { apiBase } } = useRuntimeConfig()
  const { $apiFetch } = useNuxtApp()

  const licenseStatus = useState<LicenseStatus | null>('license:status', () => null)
  const licensePackages = useState<LicensePackage[]>('license:packages', () => [])
  const lastPackage = useState<LicensePackage | null>('license:last-package', () => null)
  const bannerDismissed = useState<boolean>('license:banner-dismissed', () => false)
  const loading = ref(false)

  const fetchLicenseStatus = async (): Promise<void> => {
    loading.value = true
    try {
      const res = await $apiFetch<ApiResponse<LicenseStatus>>(`${apiBase}/api/license/status`, {
        credentials: 'include'
      })
      licenseStatus.value = res.data || null
    } catch {
      if (!licenseStatus.value) {
        licenseStatus.value = {
          success: false,
          licensed: false,
          is_grace_period: false
        }
      }
    } finally {
      loading.value = false
    }
  }

  const fetchPackages = async (): Promise<void> => {
    loading.value = true
    try {
      const res = await $apiFetch<ApiResponse<LicensePackage[]>>(`${apiBase}/api/license/packages`, {
        credentials: 'include'
      })
      licensePackages.value = res.data || []
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to fetch packages')
    } finally {
      loading.value = false
    }
  }

  const fetchLastPackage = async (): Promise<void> => {
    if (!licenseStatus.value?.plan || licensePackages.value.length === 0) {
      lastPackage.value = null
      return
    }

    const match = licensePackages.value.find(pkg => pkg.days_granted === licenseStatus.value!.plan)
    lastPackage.value = match || null
  }

  const payForLicense = async (input: LicensePaymentInput): Promise<ApiResponse<any>> => {
    try {
      const res = await $apiFetch<ApiResponse<any>>(`${apiBase}/api/license/pay`, {
        method: 'POST',
        body: input,
        credentials: 'include'
      })
      return res
    } catch (error: any) {
      toast.error(error?.data?.message || 'Payment failed')
      throw error
    }
  }

  const pollUntilLicensed = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      let elapsed = 0
      const interval = setInterval(async () => {
        elapsed += 4000
        await fetchLicenseStatus()

        if (licenseStatus.value?.licensed === true) {
          clearInterval(interval)
          resolve()
          return
        }

        if (elapsed >= 90000) {
          clearInterval(interval)
          reject(new Error('Polling timeout'))
        }
      }, 4000)
    })
  }

  const dismissBanner = (): void => {
    bannerDismissed.value = true
  }

  const isHardLocked = computed(() => {
    if (!licenseStatus.value) return false
    return !licenseStatus.value.licensed && !licenseStatus.value.is_grace_period
  })

  const isInGracePeriod = computed(() => {
    return licenseStatus.value?.is_grace_period === true
  })

  const showGraceBanner = computed(() => {
    return isInGracePeriod.value && !bannerDismissed.value
  })

  return {
    licenseStatus,
    licensePackages,
    lastPackage,
    bannerDismissed,
    loading,
    isHardLocked,
    isInGracePeriod,
    showGraceBanner,
    fetchLicenseStatus,
    fetchPackages,
    fetchLastPackage,
    payForLicense,
    pollUntilLicensed,
    dismissBanner,
  }
}
