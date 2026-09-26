import { toast } from 'vue-sonner'
import type { Update } from '@tauri-apps/plugin-updater'

type UpdaterStatus = 'idle' | 'checking' | 'up-to-date' | 'available' | 'downloading' | 'installing' | 'downloaded' | 'error'

const isTauri = () => process.client && '__TAURI_INTERNALS__' in window

const isWindows = () => process.client && navigator.userAgent.includes('Windows')

let pendingUpdate: Update | null = null

export const useUpdater = () => {
  const status = useState<UpdaterStatus>('updater:status', () => 'idle')
  const currentVersion = useState<string>('updater:current-version', () => '')
  const latestVersion = useState<string>('updater:latest-version', () => '')
  const releaseNotes = useState<string>('updater:release-notes', () => '')
  const errorMessage = useState<string>('updater:error', () => '')
  const downloadProgress = useState<number | null>('updater:download-progress', () => null)
  const { saveBackupOnThisPC } = useBackup()

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

    const updateIsInProgress = ['downloading', 'installing', 'downloaded'].includes(status.value)
    if (updateIsInProgress) return

    if (!silent) {
      status.value = 'checking'
      errorMessage.value = ''
    }

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
      if (silent) return
      status.value = 'error'
      errorMessage.value = error?.message ?? 'Could not check for updates'
      toast.error(errorMessage.value)
    }
  }

  const relaunchApp = async (): Promise<void> => {
    if (!isTauri()) return
    const { relaunch } = await import('@tauri-apps/plugin-process')
    await relaunch()
  }

  const downloadAndInstall = async (): Promise<void> => {
    if (!pendingUpdate) await checkForUpdate(true)
    const update = pendingUpdate
    if (!update) return

    status.value = 'downloading'
    downloadProgress.value = null
    errorMessage.value = ''
    let totalBytes = 0
    let receivedBytes = 0
    let backendWasStopped = false

    try {
      await update.download((downloadEvent) => {
        if (downloadEvent.event === 'Started') totalBytes = downloadEvent.data.contentLength ?? 0
        if (downloadEvent.event !== 'Progress' || totalBytes === 0) return
        receivedBytes += downloadEvent.data.chunkLength
        downloadProgress.value = Math.min(100, Math.round((receivedBytes / totalBytes) * 100))
      })

      status.value = 'installing'
      try {
        await saveBackupOnThisPC()
      } catch {
        toast.warning('Could not save a backup before updating', {
          description: 'Your data stays on this PC and is not touched by the update.',
        })
      }

      if (isWindows()) {
        const { invoke } = await import('@tauri-apps/api/core')
        await invoke('stop_backend')
        backendWasStopped = true
      }

      await update.install()
      pendingUpdate = null
      status.value = 'downloaded'
      await relaunchApp()
    } catch (error: any) {
      status.value = pendingUpdate ? 'available' : 'error'
      errorMessage.value = error?.message ?? String(error ?? 'Update failed')
      toast.error('Update failed', { description: errorMessage.value })
      if (backendWasStopped) await relaunchApp()
    }
  }

  return {
    status,
    currentVersion,
    latestVersion,
    releaseNotes,
    errorMessage,
    downloadProgress,
    fetchCurrentVersion,
    checkForUpdate,
    downloadAndInstall,
    relaunchApp,
  }
}
