import { toast } from 'vue-sonner'
import { useOnline } from '@vueuse/core'

export interface LocalBackup {
  date: string
  file_name: string
  size: number
  created_at: string
}

export interface CloudBackup {
  date: string
  key: string
  size: number
  download_url: string
}

export interface BackupStatus {
  cloud_available: boolean
  last_cloud_attempt_at: string | null
  last_cloud_success_at: string | null
  last_cloud_error: string
  restore_pending: boolean
  local_backups: LocalBackup[]
  before_restore_copy: LocalBackup | null
}

export const beforeRestoreBackupName = 'before-restore'

export type RestoreSource = 'local' | 'cloud' | 'file'

type BackupAction = 'backup' | 'export' | 'restore' | null

interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

const isTauri = () => process.client && '__TAURI_INTERNALS__' in window

const todayBackupDate = () => new Date().toLocaleDateString('en-CA')

const restoreEndpoints: Record<RestoreSource, string> = {
  local: '/api/backup/local/restore',
  cloud: '/api/backup/cloud/restore',
  file: '/api/backup/import',
}

export const useBackup = () => {
  const {
    public: { apiBase },
  } = useRuntimeConfig()
  const { $apiFetch } = useNuxtApp()
  const { logout } = useAuth()
  const isOnline = useOnline()

  const status = ref<BackupStatus | null>(null)
  const cloudBackups = ref<CloudBackup[]>([])
  const cloudListError = ref('')
  const loadingStatus = ref(false)
  const loadingCloud = ref(false)
  const activeAction = ref<BackupAction>(null)

  const readErrorMessage = (error: any, fallback: string): string =>
    error?.data?.message || fallback

  const fetchStatus = async (): Promise<void> => {
    loadingStatus.value = true
    try {
      const response = await $apiFetch<ApiResponse<BackupStatus>>(`${apiBase}/api/backup/status`, {
        credentials: 'include' as const,
      })
      status.value = response.data
    } catch (error: any) {
      toast.error(readErrorMessage(error, 'Could not load backup status'))
    } finally {
      loadingStatus.value = false
    }
  }

  const fetchCloudBackups = async (): Promise<void> => {
    if (!isOnline.value) {
      cloudBackups.value = []
      cloudListError.value = 'You are offline. Cloud backups will show when the internet is back.'
      return
    }

    loadingCloud.value = true
    cloudListError.value = ''
    try {
      const response = await $apiFetch<ApiResponse<CloudBackup[]>>(`${apiBase}/api/backup/cloud`, {
        credentials: 'include' as const,
      })
      cloudBackups.value = response.data ?? []
    } catch (error: any) {
      cloudBackups.value = []
      cloudListError.value = readErrorMessage(error, 'Could not reach cloud backups')
    } finally {
      loadingCloud.value = false
    }
  }

  const refresh = async (): Promise<void> => {
    await fetchStatus()
    if (status.value?.cloud_available) await fetchCloudBackups()
  }

  const saveBackupOnThisPC = async (): Promise<void> => {
    await $apiFetch(`${apiBase}/api/backup/local`, {
      method: 'POST' as const,
      credentials: 'include' as const,
    })
  }

  const backupNow = async (): Promise<void> => {
    activeAction.value = 'backup'
    try {
      await saveBackupOnThisPC()
    } catch (error: any) {
      toast.error(readErrorMessage(error, 'Backup failed'))
      activeAction.value = null
      return
    }

    try {
      if (!status.value?.cloud_available) {
        toast.success('Backup saved on this PC')
      } else if (!isOnline.value) {
        toast.success('Backup saved on this PC', {
          description: 'You are offline. The cloud copy will upload automatically when the internet is back.',
        })
      } else {
        await $apiFetch(`${apiBase}/api/backup/cloud`, {
          method: 'POST' as const,
          credentials: 'include' as const,
        })
        toast.success('Backup saved on this PC and in the cloud')
      }
    } catch (error: any) {
      toast.warning('Backup saved on this PC, but the cloud upload failed', {
        description: `${readErrorMessage(error, 'Cloud upload failed')}. It will be retried automatically.`,
      })
    } finally {
      activeAction.value = null
      await refresh()
    }
  }

  const exportToFile = async (): Promise<void> => {
    if (!isTauri()) {
      toast.error('Saving a backup file is only available in the desktop app')
      return
    }

    const { save } = await import('@tauri-apps/plugin-dialog')
    const savePath = await save({
      defaultPath: `balce-backup-${todayBackupDate()}.db.gz`,
      filters: [{ name: 'Balce backup', extensions: ['gz'] }],
    })
    if (!savePath) return

    activeAction.value = 'export'
    try {
      await $apiFetch(`${apiBase}/api/backup/export`, {
        method: 'POST' as const,
        body: { path: savePath },
        credentials: 'include' as const,
      })
      toast.success('Backup file saved', { description: savePath })
      await fetchStatus()
    } catch (error: any) {
      toast.error(readErrorMessage(error, 'Could not save the backup file'))
    } finally {
      activeAction.value = null
    }
  }

  const pickBackupFile = async (): Promise<string | null> => {
    if (!isTauri()) {
      toast.error('Restoring from a file is only available in the desktop app')
      return null
    }

    const { open } = await import('@tauri-apps/plugin-dialog')
    const pickedPath = await open({
      multiple: false,
      directory: false,
      filters: [{ name: 'Balce backup', extensions: ['gz'] }],
    })
    return typeof pickedPath === 'string' ? pickedPath : null
  }

  const restartToFinishRestore = async (): Promise<void> => {
    if (!isTauri()) {
      toast.success('Backup ready. Close and reopen Balce to finish restoring.')
      await fetchStatus()
      return
    }
    await logout()
    const { relaunch } = await import('@tauri-apps/plugin-process')
    await relaunch()
  }

  const restoreBackup = async (source: RestoreSource, target: string): Promise<boolean> => {
    activeAction.value = 'restore'
    try {
      await $apiFetch(`${apiBase}${restoreEndpoints[source]}`, {
        method: 'POST' as const,
        body: source === 'file' ? { path: target } : { date: target },
        credentials: 'include' as const,
      })
      await restartToFinishRestore()
      return true
    } catch (error: any) {
      toast.error(readErrorMessage(error, 'Restore failed'))
      return false
    } finally {
      activeAction.value = null
    }
  }

  return {
    status,
    cloudBackups,
    cloudListError,
    loadingStatus,
    loadingCloud,
    activeAction,
    isOnline,
    fetchStatus,
    fetchCloudBackups,
    refresh,
    backupNow,
    exportToFile,
    pickBackupFile,
    restoreBackup,
    restartToFinishRestore,
  }
}
