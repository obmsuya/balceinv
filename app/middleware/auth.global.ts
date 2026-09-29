import { isTauri } from '~/composables/usePlatform'
import type { CurrentUser, Permission } from '~/composables/useAuth'
import { homePathFor, isPortedRoute } from '~/utils/portedRoutes'

export default defineNuxtRouteMiddleware(async (to) => {
  const publicRoutes = ['/', '/login', '/setup', '/display']
  if (publicRoutes.includes(to.path)) return

  const user = useState<CurrentUser | null>('auth:user')
  const userPermissions = useState<Permission[]>('perms:user', () => [])

  if (!user.value) {
    if (isTauri()) {
      const sessionToken = await useSecureStorage().getToken('session_token')
      if (!sessionToken) return navigateTo('/login')
    }

    try {
      await useAuth().fetchCurrentUser()
    } catch {
      return navigateTo('/login')
    }
  }

  if (!isPortedRoute(to.path)) {
    const can = (resource: string, action: string) =>
      user.value?.is_owner === true || userPermissions.value.some(permission => permission.resource === resource && permission.action === action)
    return navigateTo(homePathFor(can))
  }
})
