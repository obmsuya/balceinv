export interface PlatformInfo {
  mode: 'cloud' | 'desktop'
  lan_enabled: boolean
  lan_urls: string[]
}

interface ApiEnvelope<Payload> {
  success: boolean
  message: string
  data: Payload
}

const serverUrlStorageKey = 'balce:server-url'
const desktopDefaultServerUrl = 'http://localhost:8080'

export const isTauri = (): boolean => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

const readStoredServerUrl = (): string | null => {
  try {
    return localStorage.getItem(serverUrlStorageKey)
  } catch {
    return null
  }
}

export const resolveApiBase = (configuredApiBase: string): string => {
  if (isTauri()) {
    return readStoredServerUrl() ?? desktopDefaultServerUrl
  }
  if (configuredApiBase) {
    return configuredApiBase.replace(/\/$/, '')
  }
  if (import.meta.dev) {
    return desktopDefaultServerUrl
  }
  return window.location.origin
}

export const usePlatform = () => {
  const { $apiFetch } = useNuxtApp()
  const platform = useState<PlatformInfo | null>('platform:info', () => null)

  const fetchPlatform = async (): Promise<PlatformInfo | null> => {
    if (platform.value) return platform.value
    try {
      const platformResponse = await ($apiFetch as typeof $fetch)<ApiEnvelope<PlatformInfo>>('/api/platform')
      platform.value = platformResponse.data
    } catch {
      platform.value = null
    }
    return platform.value
  }

  const isCloud = computed(() => platform.value?.mode === 'cloud')

  return {
    platform,
    fetchPlatform,
    isCloud,
    isTauri: isTauri(),
  }
}
