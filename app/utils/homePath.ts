export const homePathFor = (can: (resource: string, action: string) => boolean): string => {
  if (can('sales', 'create')) return '/pos'
  if (can('reports', 'view')) return '/dashboard'
  if (can('products', 'view')) return '/products'
  if (can('users', 'view')) return '/users'
  if (can('roles', 'view')) return '/roles'
  return '/unauthorized'
}
