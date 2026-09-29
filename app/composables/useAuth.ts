import { toast } from 'vue-sonner'
import { isTauri } from '~/composables/usePlatform'

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

export interface CurrentUser {
  id: string
  name: string
  email: string
  role: string
  role_id: string
  is_owner: boolean
  company_id: string
  company_name: string
  shop_id: string | null
  shops: ShopSummary[]
  permissions: Permission[]
  locale: string | null
  must_change_password: boolean
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

      applyCurrentUser(loginResponse.data.user)
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
      toast.success(`Now working in ${activeShop?.name ?? 'the selected shop'}`)
    } catch (error: any) {
      toast.error(error?.data?.message || 'Could not switch shop')
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
      toast.success('Signed out')
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

  const checkSetup = async (): Promise<boolean> => {
    try {
      const statusResponse = await apiFetch<ApiEnvelope<{ configured: boolean }>>('/api/setup/status')
      return statusResponse.data?.configured ?? false
    } catch {
      return false
    }
  }

  return {
    user: readonly(user),
    isLoading: readonly(isLoading),
    login,
    logout,
    setup,
    setupAdmin: setup,
    checkSetup,
    fetchCurrentUser,
    switchShop,
  }
}
