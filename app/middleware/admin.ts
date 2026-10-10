export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/admin/login') return
  const { staff, fetchMe } = useAdmin()
  const signedInStaff = staff.value ?? await fetchMe()
  if (!signedInStaff) return navigateTo('/admin/login')
  if (to.path.startsWith('/admin/audit') && signedInStaff.role !== 'admin') return navigateTo('/admin')
})
