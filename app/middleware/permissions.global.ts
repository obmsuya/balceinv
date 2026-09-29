import type { CurrentUser, Permission } from '~/composables/useAuth'
import { featuresOff } from '~/composables/useFeatures'
import type { CompanyFeatures } from '~/composables/useFeatures'

const routePermissions: Record<string, { resource: string; action: string }> = {
  '/dashboard': { resource: 'reports', action: 'view' },
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
  '/suppliers': { resource: 'suppliers', action: 'view' },
  '/customers': { resource: 'customers', action: 'view' },
  '/orders': { resource: 'orders', action: 'view' },
  '/money': { resource: 'accounting', action: 'view' },
}

const routeFeatures: Record<string, (companyFeatures: CompanyFeatures) => boolean> = {
  '/suppliers': companyFeatures => companyFeatures.suppliers_enabled,
  '/customers': companyFeatures => companyFeatures.customers_enabled,
  '/orders': companyFeatures => companyFeatures.customers_enabled && companyFeatures.customer_orders_enabled,
  '/money': companyFeatures => companyFeatures.accounting_mode !== 'off',
}

const publicRoutes = ['/', '/login', '/setup', '/unauthorized', '/display']

export default defineNuxtRouteMiddleware((to) => {
  if (publicRoutes.includes(to.path)) return

  const user = useState<CurrentUser | null>('auth:user')
  const userPermissions = useState<Permission[]>('perms:user', () => [])

  if (!user.value) return navigateTo('/login')

  const featurePath = Object.keys(routeFeatures).find(
    routePath => to.path === routePath || to.path.startsWith(`${routePath}/`),
  )
  const isFeatureOff = featurePath !== undefined && !routeFeatures[featurePath]!(user.value.features ?? featuresOff)
  if (isFeatureOff) return navigateTo('/settings?tab=features')

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
