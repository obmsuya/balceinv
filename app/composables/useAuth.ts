import { toast } from 'vue-sonner'
import { isTauri } from '~/composables/usePlatform'
import { applyBrandColor } from '~/utils/brandTheme'
import { setMoneyFormat } from '~/utils/money'
import type { CompanyFeatures } from '~/composables/useFeatures'
import { activeLocale, apiErrorMessage, setActiveLocale, t } from '~/utils/i18n'

export interface ShopSummary {
  id: string
  name: string
}

export interface Permission {
  id: string
  resource: string
  action: 'view' | 'create' | 'edit' | 'delete'
  description: string
}

export interface Branding {
  logo_url: string | null
  primary_color: string
  currency_code: string
  currency_decimals: number
  timezone: string
  default_locale: string
}

export interface CurrentUser {
  id: string
  name: string
  email: string
  role: string
  role_id: string
  is_owner: boolean
  company_id: string
  company_name: string
  branding: Branding
  shop_id: string | null
  shops: ShopSummary[]
  permissions: Permission[]
  locale: string | null
  must_change_password: boolean
  features: CompanyFeatures
  seen_tours?: string[]
}

interface ApiEnvelope<Payload> {
  success: boolean
  message: string
  data: Payload
}

interface LoginPayload {
  user: CurrentUser
  session_token?: string
}

export interface SetupStatus {
  configured: boolean
  old_data_found: boolean
  signup_open: boolean
}

const signedInBeforeKey = 'balce:signed-in-before'

export const hasSignedInBefore = (): boolean => {
  try {
    return localStorage.getItem(signedInBeforeKey) === '1'
  } catch {
    return false
  }
}

const rememberSignedIn = (): void => {
  try {
    localStorage.setItem(signedInBeforeKey, '1')
  } catch {
  }
}

export interface SetupValues {
  business_name: string
  business_type: string
  phone?: string
  address?: string
  tin?: string
  owner_name: string
  owner_email: string
  owner_password: string
}

export const useAuth = () => {
  const { $apiFetch } = useNuxtApp()
  const apiFetch = $apiFetch as typeof $fetch
  const { setToken, clearTokens } = useSecureStorage()

  const user = useState<CurrentUser | null>('auth:user', () => null)
  const userPermissions = useState<Permission[]>('perms:user', () => [])
  const isLoading = useState<boolean>('auth:loading', () => false)

  const applyCurrentUser = (currentUser: CurrentUser) => {
    user.value = currentUser
    userPermissions.value = currentUser.permissions ?? []
    applyBrandColor(currentUser.branding?.primary_color)
    setMoneyFormat(currentUser.branding?.currency_code ?? 'TZS', currentUser.branding?.currency_decimals ?? 0)
    setActiveLocale(currentUser.locale ?? currentUser.branding?.default_locale)
  }

  const login = async (credentials: { email: string; password: string }): Promise<CurrentUser> => {
    isLoading.value = true
    try {
      const desktopHeaders: Record<string, string> = isTauri() ? { 'X-Balce-Client': 'desktop' } : {}
      const loginResponse = await apiFetch<ApiEnvelope<LoginPayload>>('/api/auth/login', {
        method: 'POST',
        body: credentials,
        headers: desktopHeaders,
      })

      const sessionToken = loginResponse.data.session_token
      if (isTauri() && sessionToken) {
        await setToken('session_token', sessionToken)
      }

      rememberSignedIn()
      const localeChosenBeforeSignIn = activeLocale.value
      applyCurrentUser(loginResponse.data.user)
      const hasNoSavedLocale = loginResponse.data.user.locale == null
      if (hasNoSavedLocale && localeChosenBeforeSignIn !== activeLocale.value) {
        await useI18n().chooseLanguage(localeChosenBeforeSignIn)
      }
      return loginResponse.data.user
    } finally {
      isLoading.value = false
    }
  }

  const fetchCurrentUser = async (): Promise<CurrentUser> => {
    const meResponse = await apiFetch<ApiEnvelope<CurrentUser>>('/api/auth/me')
    applyCurrentUser(meResponse.data)
    return meResponse.data
  }

  const switchShop = async (shopId: string): Promise<void> => {
    try {
      const switchResponse = await apiFetch<ApiEnvelope<CurrentUser>>('/api/auth/switch-shop', {
        method: 'POST',
        body: { shop_id: shopId },
      })
      applyCurrentUser(switchResponse.data)
      const activeShop = switchResponse.data.shops.find(shop => shop.id === shopId)
      toast.success(t('nav.shopSwitcher.switched', { name: activeShop?.name ?? t('nav.shopSwitcher.selectedShop') }))
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'nav.shopSwitcher.failed'))
      throw error
    }
  }

  const logout = async () => {
    isLoading.value = true
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' })
    } catch {}
    finally {
      user.value = null
      userPermissions.value = []
      if (isTauri()) await clearTokens()
      isLoading.value = false
      toast.success(t('nav.header.signedOut'))
      await navigateTo('/login')
    }
  }

  const setup = async (values: SetupValues) => {
    isLoading.value = true
    try {
      return await apiFetch<ApiEnvelope<unknown>>('/api/setup', {
        method: 'POST',
        body: values,
      })
    } finally {
      isLoading.value = false
    }
  }

  const fetchSetupStatus = async (): Promise<SetupStatus> => {
    try {
      const statusResponse = await apiFetch<ApiEnvelope<SetupStatus>>('/api/setup/status')
      return {
        configured: statusResponse.data?.configured ?? false,
        old_data_found: statusResponse.data?.old_data_found ?? false,
        signup_open: statusResponse.data?.signup_open ?? false,
      }
    } catch {
      return { configured: false, old_data_found: false, signup_open: false }
    }
  }

  const checkSetup = async (): Promise<boolean> => (await fetchSetupStatus()).configured

  return {
    user: readonly(user),
    isLoading: readonly(isLoading),
    login,
    logout,
    setup,
    checkSetup,
    fetchSetupStatus,
    fetchCurrentUser,
    switchShop,
    applyCurrentUser,
  }
}
