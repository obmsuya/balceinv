import { resolveApiBase } from '~/composables/usePlatform'

export default defineNuxtPlugin({
  name: 'platform',
  enforce: 'pre',
  setup() {
    const runtimeConfig = useRuntimeConfig()
    runtimeConfig.public.apiBase = resolveApiBase(String(runtimeConfig.public.apiBase ?? ''))
  },
})
