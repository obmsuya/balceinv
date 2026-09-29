export const portedRoutePaths = ['/users', '/roles', '/settings', '/unauthorized']

export const isPortedRoute = (path: string): boolean =>
  portedRoutePaths.some(portedPath => path === portedPath || path.startsWith(`${portedPath}/`))

export const homePathFor = (canView: (resource: string) => boolean): string => {
  if (canView('users')) return '/users'
  if (canView('roles')) return '/roles'
  return '/unauthorized'
}
