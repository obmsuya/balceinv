import type { CurrentUser, Permission } from '~/composables/useAuth'

const routePermissions: Record<string, { resource: string; action: string }> = {
  '/pos': { resource: 'sales', action: 'create' },
  '/sales': { resource: 'sales', action: 'view' },
  '/products': { resource: 'products', action: 'view' },
  '/stock': { resource: 'stock_movements', action: 'view' },
  '/discounts': { resource: 'discounts', action: 'view' },
  '/reports': { resource: 'reports', action: 'view' },
  '/notifications': { resource: 'notifications', action: 'view' },
  '/shops': { resource: 'shops', action: 'view' },
  '/users': { resource: 'users', action: 'view' },
  '/roles': { resource: 'roles', action: 'view' },
  '/settings': { resource: 'settings', action: 'view' },
}

const publicRoutes = ['/', '/login', '/setup', '/admin-page', '/unauthorized']

export default defineNuxtRouteMiddleware((to) => {
  if (publicRoutes.includes(to.path)) return

  const user = useState<CurrentUser | null>('auth:user')
  const userPermissions = useState<Permission[]>('perms:user', () => [])

  if (!user.value) return navigateTo('/login')
  if (user.value.is_owner) return

  const matchedPath = Object.keys(routePermissions).find(
    routePath => to.path === routePath || to.path.startsWith(`${routePath}/`),
  )
  if (!matchedPath) return

  const requiredPermission = routePermissions[matchedPath]!
  const isAllowed = userPermissions.value.some(
    permission => permission.resource === requiredPermission.resource && permission.action === requiredPermission.action,
  )
  if (!isAllowed) return navigateTo('/unauthorized')
})
