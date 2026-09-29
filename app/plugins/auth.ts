import { isTauri } from '~/composables/usePlatform'
import { lastErrorRequestId } from '~/composables/useSupport'

export default defineNuxtPlugin((nuxtApp) => {
  const runtimeConfig = useRuntimeConfig()
  const { getToken } = useSecureStorage()

  let licenseRecheck: Promise<void> | null = null

  const resolveRequestUrl = (request: Parameters<typeof $fetch>[0]): string => {
    if (typeof request === 'string') return request
    if (request instanceof URL) return request.toString()
    return request.url
  }

  const forgetSession = async () => {
    useState('auth:user').value = null
    useState('perms:user').value = []
    try {
      localStorage.removeItem('pos-cart-state')
    } catch {}
    await nuxtApp.runWithContext(() => navigateTo('/login'))
  }

  const apiFetch = $fetch.create({
    baseURL: String(runtimeConfig.public.apiBase),
    credentials: 'include',
    async onRequest({ options }) {
      if (!isTauri()) return
      const sessionToken = await getToken('session_token')
      if (!sessionToken) return
      const headers = new Headers(options.headers)
      headers.set('Authorization', `Bearer ${sessionToken}`)
      options.headers = headers
    },
    async onResponseError({ response, request }) {
      const requestUrl = resolveRequestUrl(request)
      const isSignInRequest = requestUrl.includes('/api/auth/login')

      const isSupportRequest = requestUrl.includes('/api/support')
      if (response.status !== 401 && !isSupportRequest) {
        lastErrorRequestId.value = response._data?.requestId || response.headers.get('X-Request-Id') || lastErrorRequestId.value
      }

      if (response.status === 401 && !isSignInRequest) {
        await forgetSession()
      }

      if (response.status === 402 && !licenseRecheck) {
        licenseRecheck = nuxtApp
          .runWithContext(() => useLicense().fetchLicenseStatus())
          .finally(() => { licenseRecheck = null })
      }
    },
  })

  return { provide: { apiFetch } }
})
