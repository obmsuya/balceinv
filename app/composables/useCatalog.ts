import { toast } from 'vue-sonner'
import { saveFile } from '~/utils/download'

export interface CatalogProduct {
  id: string
  business_type: string
  name: string
  category: string | null
  sub_category: string | null
  unit: string
  sku_prefix: string
  default_price: number
  metadata: Record<string, string>
}

export interface CatalogCount {
  business_type: string
  count: number
}

export interface CatalogSummary {
  company_business_type: string
  counts: CatalogCount[]
}

export type CatalogImportMode = 'merge' | 'replace'

export interface CatalogRowProblem {
  row: number
  name?: string
  problem: string
}

export interface CatalogImportResult {
  business_type: string
  mode: CatalogImportMode
  rows_read: number
  added: number
  updated: number
  skipped: number
  total_in_list: number
  problems: CatalogRowProblem[]
  problems_total: number
}

export class CatalogImportError extends Error {
  constructor(message: string, public result: CatalogImportResult | null) {
    super(message)
  }
}

interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

export const catalogUploadLimitBytes = 4 * 1024 * 1024
export const catalogFileExtensions = ['.xlsx', '.csv']

const supportPasscodeHeader = 'X-Support-Passcode'

export const readCatalogError = (error: any, fallback: string): string => {
  if (error?.statusCode === 413 || error?.status === 413) return 'This file is too big. Keep it under 4 MB.'
  if (!error?.statusCode && !error?.status && error?.name === 'FetchError') return 'The POS service is not responding. Try again in a moment.'
  return error?.data?.message || error?.data?.error || fallback
}

export const catalogFileProblem = (file: File): string | null => {
  const lowerName = file.name.toLowerCase()
  if (!catalogFileExtensions.some(extension => lowerName.endsWith(extension))) {
    return 'Use an Excel (.xlsx) or CSV (.csv) file. Old .xls files must be saved again as .xlsx.'
  }
  if (file.size === 0) return 'This file is empty.'
  if (file.size > catalogUploadLimitBytes) return 'This file is too big. Keep it under 4 MB, or split it.'
  return null
}

export const matchesCatalogSearch = (catalogProduct: CatalogProduct, query: string): boolean => {
  const searchWords = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (searchWords.length === 0) return true
  const searchableText = [catalogProduct.name, catalogProduct.category, catalogProduct.sub_category]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return searchWords.every(searchWord => searchableText.includes(searchWord))
}

export const useCatalog = () => {
  const { $apiFetch } = useNuxtApp()
  const apiFetch = $apiFetch as typeof $fetch

  const catalog = useState<CatalogProduct[]>('catalog:products', () => [])
  const catalogLoaded = useState<boolean>('catalog:loaded', () => false)
  const loading = ref(false)
  const loadError = ref('')

  const teamPasscode = useState<string>('catalog:team-passcode', () => '')
  const teamSummary = useState<CatalogSummary | null>('catalog:team-summary', () => null)
  const teamUnlocked = computed(() => teamPasscode.value !== '')

  const fetchCatalog = async (options: { force?: boolean } = {}): Promise<void> => {
    if (catalogLoaded.value && !options.force) return
    loading.value = true
    loadError.value = ''
    try {
      const response = await apiFetch<ApiResponse<CatalogProduct[]>>('/api/catalog')
      catalog.value = response.data ?? []
      catalogLoaded.value = true
    } catch (error: any) {
      loadError.value = readCatalogError(error, 'Could not load the common products')
    } finally {
      loading.value = false
    }
  }

  const searchCatalog = (query: string): CatalogProduct[] =>
    catalog.value.filter(catalogProduct => matchesCatalogSearch(catalogProduct, query))

  const teamHeaders = (passcode = teamPasscode.value) => ({ [supportPasscodeHeader]: passcode })

  const lockTeamTools = (): void => {
    teamPasscode.value = ''
    teamSummary.value = null
  }

  const handleTeamRejection = (error: any): void => {
    const status = error?.statusCode ?? error?.status
    if (status === 403 || status === 503) lockTeamTools()
  }

  const unlockTeamTools = async (passcode: string): Promise<void> => {
    const response = await apiFetch<ApiResponse<CatalogSummary>>(`/api/catalog/team/summary`, {
      headers: teamHeaders(passcode),
    })
    teamPasscode.value = passcode
    teamSummary.value = response.data
  }

  const fetchTeamSummary = async (): Promise<void> => {
    try {
      const response = await apiFetch<ApiResponse<CatalogSummary>>(`/api/catalog/team/summary`, {
        headers: teamHeaders(),
      })
      teamSummary.value = response.data
    } catch (error: any) {
      handleTeamRejection(error)
      toast.error(readCatalogError(error, 'Could not count the common products'))
    }
  }

  const fetchTeamItems = async (businessType: string): Promise<CatalogProduct[]> => {
    try {
      const response = await apiFetch<ApiResponse<CatalogProduct[]>>(`/api/catalog/team/items`, {
        query: { business_type: businessType },
        headers: teamHeaders(),
      })
      return response.data ?? []
    } catch (error: any) {
      handleTeamRejection(error)
      throw error
    }
  }

  const afterTeamListChanged = async (businessType: string): Promise<void> => {
    await fetchTeamSummary()
    if (teamSummary.value?.company_business_type === businessType) await fetchCatalog({ force: true })
  }

  const importCatalogFile = async (
    file: File,
    businessType: string,
    mode: CatalogImportMode,
  ): Promise<CatalogImportResult> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('business_type', businessType)
    formData.append('mode', mode)

    try {
      const response = await apiFetch<ApiResponse<CatalogImportResult>>(`/api/catalog/team/import`, {
        method: 'POST',
        body: formData,
        headers: teamHeaders(),
      })
      await afterTeamListChanged(businessType)
      return response.data
    } catch (error: any) {
      handleTeamRejection(error)
      throw new CatalogImportError(readCatalogError(error, 'Could not save the list'), error?.data?.data ?? null)
    }
  }

  const clearCatalog = async (businessType: string): Promise<boolean> => {
    try {
      const response = await apiFetch<ApiResponse<{ removed: number }>>(`/api/catalog/team`, {
        method: 'DELETE',
        query: { business_type: businessType },
        headers: teamHeaders(),
      })
      toast.success(response.message || 'List cleared')
      await afterTeamListChanged(businessType)
      return true
    } catch (error: any) {
      handleTeamRejection(error)
      toast.error(readCatalogError(error, 'Could not clear the list'))
      return false
    }
  }

  const downloadCatalogTemplate = async (): Promise<void> => {
    try {
      const templateBytes = await apiFetch<ArrayBuffer>(`/api/catalog/team/template`, {
        headers: teamHeaders(),
        responseType: 'arrayBuffer',
      })
      const savePath = await saveFile(
        new Uint8Array(templateBytes),
        'common-products-template.xlsx',
        { name: 'Excel Workbook', extensions: ['xlsx'] },
      )
      if (savePath) toast.success('Template saved', { description: savePath })
    } catch (error: any) {
      handleTeamRejection(error)
      toast.error(readCatalogError(error, 'Could not save the template'))
    }
  }

  const exportCatalogJson = async (businessType: string): Promise<void> => {
    try {
      const catalogProducts = await fetchTeamItems(businessType)
      if (catalogProducts.length === 0) {
        toast.error('This list is empty, there is nothing to export')
        return
      }
      const seedEntries = catalogProducts.map(({ id: _id, business_type: _businessType, ...seedEntry }) => seedEntry)
      const seedJson = `${JSON.stringify(seedEntries, null, 2)}\n`
      const savePath = await saveFile(
        new TextEncoder().encode(seedJson),
        `${businessType}.json`,
        { name: 'JSON', extensions: ['json'] },
      )
      if (savePath) toast.success(`${catalogProducts.length} products exported`, { description: savePath })
    } catch (error: any) {
      toast.error(readCatalogError(error, 'Could not export the list'))
    }
  }

  return {
    catalog,
    catalogLoaded,
    loading,
    loadError,
    fetchCatalog,
    searchCatalog,
    teamUnlocked,
    teamSummary,
    unlockTeamTools,
    lockTeamTools,
    fetchTeamSummary,
    fetchTeamItems,
    importCatalogFile,
    clearCatalog,
    downloadCatalogTemplate,
    exportCatalogJson,
  }
}
