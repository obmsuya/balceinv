export interface PlatformInfo {
  mode: 'cloud' | 'desktop'
  lan_available: boolean
  lan_enabled: boolean
  lan_urls: string[]
  listen_address?: string
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

let platformRequest: Promise<PlatformInfo | null> | null = null

export const usePlatform = () => {
  const { $apiFetch } = useNuxtApp()
  const platform = useState<PlatformInfo | null>('platform:info', () => null)

  const loadPlatform = async (): Promise<PlatformInfo | null> => {
    try {
      const platformResponse = await ($apiFetch as typeof $fetch)<ApiEnvelope<PlatformInfo>>('/api/platform')
      platform.value = platformResponse.data
    } catch {
      platform.value = null
    }
    return platform.value
  }

  const fetchPlatform = (forceRefresh = false): Promise<PlatformInfo | null> => {
    if (platform.value && !forceRefresh) return Promise.resolve(platform.value)
    if (!platformRequest || forceRefresh) {
      platformRequest = loadPlatform().finally(() => { platformRequest = null })
    }
    return platformRequest
  }

  const isCloud = computed(() => platform.value?.mode === 'cloud')
  const isDesktopInstall = computed(() => platform.value?.mode === 'desktop')

  const setLanEnabled = async (lanEnabled: boolean): Promise<void> => {
    await ($apiFetch as typeof $fetch)('/api/platform/network', { method: 'PUT', body: { lan_enabled: lanEnabled } })
  }

  return {
    platform,
    fetchPlatform,
    setLanEnabled,
    isCloud,
    isDesktopInstall,
    isTauri: isTauri(),
  }
}
