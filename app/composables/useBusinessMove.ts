import { toast } from 'vue-sonner'
import { readableError } from '~/composables/useStatements'
import { saveFile } from '~/utils/download'
import { apiErrorMessage, t } from '~/utils/i18n'

export interface MoveResult {
  business_name: string
  owner_email: string
  media_count: number
}

interface ApiEnvelope<Payload> {
  success: boolean
  message: string
  data: Payload
}

export const movingFileSizeLimit = 64 * 1024 * 1024

export const useBusinessMove = () => {
  const { $apiFetch } = useNuxtApp()
  const apiFetch = $apiFetch as typeof $fetch
  const savingFile = ref(false)
  const moving = ref(false)

  const saveMovingFile = async (businessName: string): Promise<void> => {
    savingFile.value = true
    try {
      const fileBytes = await apiFetch<ArrayBuffer>('/api/move-to-web/file', { method: 'POST', responseType: 'arrayBuffer' })
      const fileName = `${businessName.trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'business'}-move-online.balce`
      const savedName = await saveFile(new Uint8Array(fileBytes), fileName, { name: t('backup.move.fileType'), extensions: ['balce'] })
      if (savedName) toast.success(t('backup.move.saved'), { description: savedName })
    } catch (error: any) {
      toast.error(apiErrorMessage(readableError(error), 'backup.move.saveFailed'))
    } finally {
      savingFile.value = false
    }
  }

  const moveFromDesktop = async (movingFile: File): Promise<MoveResult | null> => {
    if (movingFile.size > movingFileSizeLimit) {
      toast.error(t('errors.move_file_too_large'))
      return null
    }
    moving.value = true
    try {
      const uploadBody = new FormData()
      uploadBody.append('file', movingFile)
      const response = await apiFetch<ApiEnvelope<MoveResult>>('/api/setup/move-from-desktop', { method: 'POST', body: uploadBody })
      return response.data
    } catch (error: any) {
      toast.error(t('setup.move.failed'), { description: apiErrorMessage(error, 'setup.move.failedHint') })
      return null
    } finally {
      moving.value = false
    }
  }

  return { savingFile, moving, saveMovingFile, moveFromDesktop }
}
