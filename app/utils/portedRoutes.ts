export const portedRoutePaths = ['/pos', '/sales', '/receipts', '/products', '/stock', '/discounts', '/notifications', '/shops', '/users', '/roles', '/settings', '/unauthorized']

export const isPortedRoute = (path: string): boolean =>
  portedRoutePaths.some(portedPath => path === portedPath || path.startsWith(`${portedPath}/`))

export const homePathFor = (can: (resource: string, action: string) => boolean): string => {
  if (can('sales', 'create')) return '/pos'
  if (can('products', 'view')) return '/products'
  if (can('users', 'view')) return '/users'
  if (can('roles', 'view')) return '/roles'
  return '/unauthorized'
}
