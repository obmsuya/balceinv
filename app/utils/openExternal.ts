import { isTauri } from '~/composables/usePlatform'

export const openExternal = async (url: string): Promise<void> => {
  if (isTauri()) {
    try {
      const { open } = await import('@tauri-apps/plugin-shell')
      await open(url)
      return
    } catch {
    }
  }
  window.open(url, '_blank', 'noopener')
}
