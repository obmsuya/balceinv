import { toast } from 'vue-sonner'
import { saveFile } from '~/utils/download'
import { activeLocale, apiErrorMessage, t } from '~/utils/i18n'

export type StatementReport = 'overview' | 'profit-and-loss' | 'balance-sheet' | 'statement' | 'trial-balance' | 'vat'
export type StatementFormat = 'pdf' | 'xlsx'

export interface StatementFilter {
  from: string
  to: string
  shop: string
}

export interface DocumentSource {
  path: string
  query: Record<string, string | undefined>
  fileName: string
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

export const bookDocument = (report: StatementReport, filter: StatementFilter, account?: string): DocumentSource => ({
  path: `/api/accounting/${report}`,
  query: { from: filter.from, to: filter.to, shop: filter.shop || undefined, account },
  fileName: [report, account, filter.from, 'to', filter.to].filter(Boolean).join('-'),
})

export const useStatements = () => {
  const { $apiFetch } = useNuxtApp()
  const apiFetch = $apiFetch as typeof $fetch
  const saving = ref<StatementFormat | null>(null)

  const fetchDocument = async (source: DocumentSource, format: StatementFormat): Promise<Uint8Array> => {
    try {
      const fileBytes = await apiFetch<ArrayBuffer>(source.path, {
        query: { ...source.query, format, lang: activeLocale.value },
        responseType: 'arrayBuffer',
      })
      return new Uint8Array(fileBytes)
    } catch (error: any) {
      throw readableError(error)
    }
  }

  const saveDocument = async (source: DocumentSource, format: StatementFormat): Promise<void> => {
    saving.value = format
    try {
      const fileBytes = await fetchDocument(source, format)
      const fileType = format === 'pdf' ? { name: t('reports.pdfFileType'), extensions: ['pdf'] } : { name: t('reports.excelFileType'), extensions: ['xlsx'] }
      const savedName = await saveFile(fileBytes, `${source.fileName}.${format}`, fileType)
      if (savedName) toast.success(t('reports.toasts.saved'), { description: savedName })
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'reports.toasts.saveFailed'))
    } finally {
      saving.value = null
    }
  }

  return { saving, fetchDocument, saveDocument }
}
