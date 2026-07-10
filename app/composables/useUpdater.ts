import { toast } from 'vue-sonner'
import type { Update } from '@tauri-apps/plugin-updater'

type UpdaterStatus = 'idle' | 'checking' | 'up-to-date' | 'available' | 'downloading' | 'downloaded' | 'error'

const isTauri = () => process.client && '__TAURI_INTERNALS__' in window

export const useUpdater = () => {
  const status = useState<UpdaterStatus>('updater:status', () => 'idle')
  const currentVersion = useState<string>('updater:current-version', () => '')
  const latestVersion = useState<string>('updater:latest-version', () => '')
  const releaseNotes = useState<string>('updater:release-notes', () => '')
  const errorMessage = useState<string>('updater:error', () => '')

  let pendingUpdate: Update | null = null

  const fetchCurrentVersion = async (): Promise<void> => {
    if (!isTauri()) return
    const { getVersion } = await import('@tauri-apps/api/app')
    currentVersion.value = await getVersion()
  }

  const checkForUpdate = async (silent = false): Promise<void> => {
    if (!isTauri()) {
      if (!silent) toast.error('Updates are only available in the desktop app')
      return
    }

    status.value = 'checking'
    errorMessage.value = ''

    try {
      const { check } = await import('@tauri-apps/plugin-updater')
      const update = await check()

      if (update) {
        pendingUpdate = update
        latestVersion.value = update.version
        releaseNotes.value = update.body ?? ''
        status.value = 'available'
      } else {
        pendingUpdate = null
        status.value = 'up-to-date'
        if (!silent) toast.success('You are on the latest version')
      }
    } catch (error: any) {
      status.value = 'error'
      errorMessage.value = error?.message ?? 'Could not check for updates'
      if (!silent) toast.error(errorMessage.value)
    }
  }

  const downloadAndInstall = async (): Promise<void> => {
    if (!pendingUpdate) return

    status.value = 'downloading'
    errorMessage.value = ''

    try {
      await pendingUpdate.downloadAndInstall()
      status.value = 'downloaded'
    } catch (error: any) {
      status.value = 'error'
      errorMessage.value = error?.message ?? 'Update failed to download'
      toast.error(errorMessage.value)
    }
  }

  const relaunchApp = async (): Promise<void> => {
    if (!isTauri()) return
    const { relaunch } = await import('@tauri-apps/plugin-process')
    await relaunch()
  }

  return {
    status,
    currentVersion,
    latestVersion,
    releaseNotes,
    errorMessage,
    fetchCurrentVersion,
    checkForUpdate,
    downloadAndInstall,
    relaunchApp,
  }
}
