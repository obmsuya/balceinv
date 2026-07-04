const isTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

export default defineNuxtRouteMiddleware(async (to) => {
  const publicRoutes = ['/login', '/admin-page', '/setup']
  if (publicRoutes.includes(to.path)) return

  const config = useRuntimeConfig()
  const baseUrl = config.public.apiBase
  const { $apiFetch } = useNuxtApp()
  const { getToken, setToken } = useSecureStorage()

  const user = useState<{ id: number; name: string; email: string; role: string; company_id: number } | null>('auth:user')
  const userPermissions = useState<Array<{ id: number; resource: string; action: string }>>('perms:user', () => [])

  const restorePermissions = async (userId: number) => {
    if (userPermissions.value.length > 0) return
    try {
      const res = await ($apiFetch as typeof $fetch)<{ success: boolean; data: Array<{ id: number; resource: string; action: string }> }>(
        `${baseUrl}/api/permissions/user/${userId}`,
      )
      if (res.success) userPermissions.value = res.data ?? []
    } catch { }
  }

  if (user.value) {
    await restorePermissions(user.value.id)
    return
  }

  if (isTauri()) {
    const token = await getToken('access_token')
    if (!token) {
      user.value = null
      userPermissions.value = []
      return navigateTo('/login')
    }
  }

  const fetchMe = async (): Promise<boolean> => {
    try {
      const res = await ($apiFetch as typeof $fetch)<{ success: boolean; data: { id: number; name: string; email: string; role: string; company_id: number } }>(
        `${baseUrl}/api/auth/me`,
      )
      if (res.success && res.data) {
        user.value = res.data
        await restorePermissions(res.data.id)
        return true
      }
      return false
    } catch {
      return false
    }
  }

  const sessionRestored = await fetchMe()
  if (sessionRestored) return

  try {
    if (isTauri()) {
      const refreshToken = await getToken('refresh_token')
      const refreshRes = await $fetch<{ data?: { access_token: string; refresh_token: string } }>(
        `${baseUrl}/api/auth/refresh`,
        { method: 'POST', headers: { Authorization: `Bearer ${refreshToken}` } },
      )
      if (refreshRes.data) {
        await setToken('access_token', refreshRes.data.access_token)
        await setToken('refresh_token', refreshRes.data.refresh_token)
      }
    } else {
      await $fetch(`${baseUrl}/api/auth/refresh`, {
        method: 'POST' as const,
        credentials: 'include' as const,
      })
    }
    const restoredAfterRefresh = await fetchMe()
    if (restoredAfterRefresh) return
  } catch { }

  user.value = null
  userPermissions.value = []
  return navigateTo('/login')
})