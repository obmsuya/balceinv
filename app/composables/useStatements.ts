import { toast } from 'vue-sonner'
import { saveFile } from '~/utils/download'
import { activeLocale, apiErrorMessage, t } from '~/utils/i18n'

export type StatementReport = 'profit-and-loss'
export type StatementFormat = 'pdf' | 'xlsx'

export interface StatementFilter {
  from: string
  to: string
  shop: string
}

const readableError = (error: any): any => {
  const errorBody = error?.data
  if (errorBody instanceof ArrayBuffer) {
    try {
      error.data = JSON.parse(new TextDecoder().decode(errorBody))
    } catch {
      error.data = undefined
    }
  }
  return error
}

export const useStatements = () => {
  const { $apiFetch } = useNuxtApp()
  const apiFetch = $apiFetch as typeof $fetch
  const saving = ref<StatementFormat | null>(null)

  const fetchStatementFile = async (report: StatementReport, format: StatementFormat, filter: StatementFilter): Promise<Uint8Array> => {
    try {
      const fileBytes = await apiFetch<ArrayBuffer>(`/api/accounting/${report}`, {
        query: { from: filter.from, to: filter.to, shop: filter.shop || undefined, format, lang: activeLocale.value },
        responseType: 'arrayBuffer',
      })
      return new Uint8Array(fileBytes)
    } catch (error: any) {
      throw readableError(error)
    }
  }

  const saveStatement = async (report: StatementReport, format: StatementFormat, filter: StatementFilter): Promise<void> => {
    saving.value = format
    try {
      const fileBytes = await fetchStatementFile(report, format, filter)
      const fileType = format === 'pdf' ? { name: t('reports.pdfFileType'), extensions: ['pdf'] } : { name: t('reports.excelFileType'), extensions: ['xlsx'] }
      const savedName = await saveFile(fileBytes, `${report}-${filter.from}-to-${filter.to}.${format}`, fileType)
      if (savedName) toast.success(t('reports.toasts.saved'), { description: savedName })
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'reports.toasts.saveFailed'))
    } finally {
      saving.value = null
    }
  }

  return { saving, fetchStatementFile, saveStatement }
}
