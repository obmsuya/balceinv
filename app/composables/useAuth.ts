import { toast } from 'vue-sonner'

interface User {
  id: number
  name: string
  email: string
  role: string
  company_id: number
}

const isTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

export const useAuth = () => {
  const config = useRuntimeConfig()
  const baseUrl = config.public.apiBase
  const { $apiFetch } = useNuxtApp()
  const { setToken, clearTokens } = useSecureStorage()

  const user = useState<User | null>('auth:user', () => null)
  const userPermissions = useState<any[]>('perms:user', () => [])
  const isLoading = ref(false)

  if (typeof globalThis !== 'undefined' && !user.value) {
    const stored = localStorage.getItem('user')
    if (stored) {
      try { user.value = JSON.parse(stored) }
      catch { localStorage.removeItem('user') }
    }
  }

  const login = async (credentials: { email: string; password: string }) => {
    isLoading.value = true
    try {
      const res = await $fetch<{ success: boolean; data?: { user: User; access_token: string; refresh_token: string }; message: string }>(
        `${baseUrl}/api/auth/login`,
        { method: 'POST', body: credentials, credentials: 'include' }
      )

      if (res.success && res.data?.user) {
        user.value = res.data.user
        if (typeof globalThis !== 'undefined') localStorage.setItem('user', JSON.stringify(res.data.user))

        if (isTauri()) {
          await setToken('access_token', res.data.access_token)
          await setToken('refresh_token', res.data.refresh_token)
        }

        try {
          const permRes = await ($apiFetch as typeof $fetch)<{ success: boolean; data: any[] }>(
            `${baseUrl}/api/permissions/user/${res.data.user.id}`,
          )
          if (permRes.success) userPermissions.value = permRes.data ?? []
        } catch {}

        return res
      }

      throw new Error(res.message || 'Login failed')
    } catch (err: any) {
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const logout = async () => {
    isLoading.value = true
    try {
      await ($apiFetch as typeof $fetch)(`${baseUrl}/api/auth/logout`, { method: 'POST' })
    } catch {}
    finally {
      user.value = null
      userPermissions.value = []
      if (typeof globalThis !== 'undefined') localStorage.removeItem('user')
      if (isTauri()) await clearTokens()
      isLoading.value = false
      toast.success('Signed out successfully')
      await navigateTo('/login')
    }
  }

  const setup = async (values: {
    business_name: string
    business_type: string
    phone?: string
    address?: string
    tin?: string
    owner_name: string
    owner_email: string
    owner_password: string
  }) => {
    isLoading.value = true
    try {
      const res = await $fetch<{ success: boolean; message: string }>(
        `${baseUrl}/api/setup`,
        { method: 'POST', body: values, credentials: 'include' }
      )
      return res
    } catch (err: any) {
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const checkSetup = async () => {
    try {
      const res = await ($apiFetch as typeof $fetch)<{ success: boolean; data?: { configured: boolean } }>(
        `${baseUrl}/api/setup/status`,
      )
      return res.data?.configured ?? false
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
  }
}