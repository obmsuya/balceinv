import { toast } from 'vue-sonner'
import { saveFile } from '~/utils/download'
import { apiErrorMessage, t } from '~/utils/i18n'

export interface ProductBarcode {
  code: string
  pack_size: number
}

export interface Product {
  id: string
  parent_id: string | null
  sku: string
  name: string
  variant_label: string
  price: number
  cost_price: number
  wholesale_price: number | null
  wholesale_min: number
  category: string | null
  unit: string
  pieces_per_unit: number
  image_url: string | null
  metadata: Record<string, string | number | boolean>
  is_active: boolean
  quantity: number | null
  min_stock: number | null
  variant_count: number
  preferred_supplier_id: string | null
  barcodes: ProductBarcode[]
  created_at: string
  updated_at: string
}

export interface ProductFields {
  sku: string
  name: string
  variant_label: string
  price: number
  cost_price: number
  wholesale_price: number | null
  wholesale_min: number
  category: string | null
  unit: string
  pieces_per_unit: number
  metadata: Record<string, string | number | boolean>
  barcodes: ProductBarcode[]
  min_stock: number
  preferred_supplier_id?: string
}

export interface NewProductFields extends ProductFields {
  parent_id: string | null
  opening_quantity: number
  shop_id: string | null
}

export interface ProductListFilter {
  searchText: string
  category: string
  includeArchived: boolean
  offset: number
}

export interface ProductImportProblem {
  row: number
  column?: string
  problem: string
}

export interface ProductImportResult {
  rows_read: number
  created: number
  problems: ProductImportProblem[]
  problems_total: number
}

export class ProductImportError extends Error {
  constructor(message: string, public result: ProductImportResult | null) {
    super(message)
  }
}

interface ApiEnvelope<Payload> {
  success: boolean
  message: string
  data: Payload
}

interface Page<Item> {
  items: Item[]
  total: number
  limit: number
  offset: number
}

export interface ProductLookup {
  product: Product
  pack_size: number
}

export interface PhoneUploadLink {
  token: string
  upload_urls: string[]
  reachable: boolean
  reason: string
  expires_at: string
}

export interface PhoneUploadState {
  status: 'pending' | 'done'
  content_type?: string
  image?: string
}

export const productPageSize = 50
export const productImageLimitBytes = 2 * 1024 * 1024
export const productImportLimitBytes = 5 * 1024 * 1024

export interface SkippedProduct {
  id: string
  name: string
  reason: 'sold' | 'bought' | 'returned_to_supplier' | 'ordered' | 'transferred'
}

export interface ProductDeleteResult {
  deleted: string[]
  skipped: SkippedProduct[]
}

export const useProducts = () => {
  const { $apiFetch } = useNuxtApp()
  const apiFetch = $apiFetch as typeof $fetch

  const products = ref<Product[]>([])
  const totalProducts = ref(0)
  const categories = ref<string[]>([])
  const loading = ref(false)
  const saving = ref(false)

  const fetchProducts = async (filter: Partial<ProductListFilter> = {}, append = false): Promise<void> => {
    loading.value = true
    try {
      const productPage = await apiFetch<ApiEnvelope<Page<Product>>>('/api/products', {
        query: {
          q: filter.searchText || undefined,
          category: filter.category || undefined,
          include_archived: filter.includeArchived || undefined,
          limit: productPageSize,
          offset: filter.offset ?? 0,
        },
      })
      products.value = append ? [...products.value, ...productPage.data.items] : productPage.data.items
      totalProducts.value = productPage.data.total
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'products.toasts.loadFailed'))
    } finally {
      loading.value = false
    }
  }

  const lookupProduct = async (code: string): Promise<ProductLookup | null> => {
    try {
      const lookupResponse = await apiFetch<ApiEnvelope<ProductLookup>>('/api/products/lookup', { query: { code } })
      return lookupResponse.data
    } catch (error: any) {
      if ((error?.statusCode ?? error?.status) === 404) return null
      throw error
    }
  }

  const startPhoneUpload = async (): Promise<PhoneUploadLink | null> => {
    try {
      const linkResponse = await apiFetch<ApiEnvelope<PhoneUploadLink>>('/api/phone-uploads', { method: 'POST' })
      return linkResponse.data
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'products.toasts.phoneLinkFailed'))
      return null
    }
  }

  const checkPhoneUpload = async (token: string): Promise<PhoneUploadState | null> => {
    try {
      const stateResponse = await apiFetch<ApiEnvelope<PhoneUploadState>>(`/api/phone-uploads/${token}`)
      return stateResponse.data
    } catch (error: any) {
      if ((error?.statusCode ?? error?.status) === 404) return null
      throw error
    }
  }

  const fetchCategories = async (): Promise<void> => {
    try {
      const categoryResponse = await apiFetch<ApiEnvelope<string[]>>('/api/products/categories')
      categories.value = categoryResponse.data ?? []
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'products.toasts.categoriesFailed'))
    }
  }

  const fetchProduct = async (productId: string): Promise<Product | undefined> => {
    try {
      const productResponse = await apiFetch<ApiEnvelope<Product>>(`/api/products/${productId}`)
      return productResponse.data
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'products.toasts.productFailed'))
    }
  }

  const fetchVariants = async (parentId: string): Promise<Product[]> => {
    try {
      const variantResponse = await apiFetch<ApiEnvelope<Product[]>>(`/api/products/${parentId}/variants`)
      return variantResponse.data ?? []
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'products.toasts.variantsFailed'))
      return []
    }
  }

  const uploadImage = async (productId: string, imageFile: File): Promise<Product> => {
    const imageForm = new FormData()
    imageForm.append('image', imageFile)
    const imageResponse = await apiFetch<ApiEnvelope<Product>>(`/api/products/${productId}/image`, {
      method: 'POST',
      body: imageForm,
    })
    return imageResponse.data
  }

  const createProduct = async (newFields: NewProductFields, imageFile: File | null): Promise<Product | undefined> => {
    saving.value = true
    try {
      const createResponse = await apiFetch<ApiEnvelope<Product>>('/api/products', {
        method: 'POST',
        body: newFields,
      })
      const createdProduct = imageFile ? await uploadImage(createResponse.data.id, imageFile) : createResponse.data
      toast.success(t('products.toasts.created'))
      return createdProduct
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'products.toasts.createFailed'))
      throw error
    } finally {
      saving.value = false
    }
  }

  const updateProduct = async (productId: string, changedFields: ProductFields, imageFile: File | null): Promise<Product | undefined> => {
    saving.value = true
    try {
      const updateResponse = await apiFetch<ApiEnvelope<Product>>(`/api/products/${productId}`, {
        method: 'PUT',
        body: changedFields,
      })
      const updatedProduct = imageFile ? await uploadImage(productId, imageFile) : updateResponse.data
      toast.success(t('products.toasts.saved'))
      return updatedProduct
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'products.toasts.saveFailed'))
      throw error
    } finally {
      saving.value = false
    }
  }

  const deleting = ref(false)

  const deleteProducts = async (productIds: string[]): Promise<ProductDeleteResult | null> => {
    deleting.value = true
    try {
      const deleteResponse = await apiFetch<ApiEnvelope<ProductDeleteResult>>('/api/products/delete', { method: 'POST', body: { product_ids: productIds } })
      return deleteResponse.data
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'products.delete.failed'))
      return null
    } finally {
      deleting.value = false
    }
  }

  const archiveProduct = async (productId: string): Promise<void> => {
    saving.value = true
    try {
      const archiveResponse = await apiFetch<ApiEnvelope<null>>(`/api/products/${productId}`, {
        method: 'DELETE',
      })
      toast.success(t('products.toasts.archived'))
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'products.toasts.archiveFailed'))
      throw error
    } finally {
      saving.value = false
    }
  }

  const restoreProduct = async (productId: string): Promise<void> => {
    saving.value = true
    try {
      const restoreResponse = await apiFetch<ApiEnvelope<Product>>(`/api/products/${productId}/restore`, {
        method: 'POST',
      })
      toast.success(t('products.toasts.restored'))
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'products.toasts.restoreFailed'))
      throw error
    } finally {
      saving.value = false
    }
  }

  const importProducts = async (spreadsheetFile: File): Promise<ProductImportResult> => {
    saving.value = true
    try {
      const importForm = new FormData()
      importForm.append('file', spreadsheetFile)
      const importResponse = await apiFetch<ApiEnvelope<ProductImportResult>>('/api/products/upload', {
        method: 'POST',
        body: importForm,
      })
      toast.success(t('products.toasts.imported', { count: importResponse.data.created }))
      return importResponse.data
    } catch (error: any) {
      throw new ProductImportError(apiErrorMessage(error, 'products.toasts.importFailed'), error?.data?.data ?? null)
    } finally {
      saving.value = false
    }
  }

  const downloadTemplate = async (): Promise<void> => {
    try {
      const templateBytes = await apiFetch<ArrayBuffer>('/api/products/template', {
        responseType: 'arrayBuffer',
      })
      const savedName = await saveFile(new Uint8Array(templateBytes), 'products-template.xlsx', {
        name: t('products.toasts.excelWorkbook'),
        extensions: ['xlsx'],
      })
      if (savedName) toast.success(t('products.toasts.templateSaved'), { description: savedName })
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'products.toasts.templateFailed'))
    }
  }

  return {
    deleting,
    deleteProducts,
    products,
    totalProducts,
    categories,
    loading,
    saving,
    fetchProducts,
    fetchCategories,
    lookupProduct,
    startPhoneUpload,
    checkPhoneUpload,
    fetchProduct,
    fetchVariants,
    createProduct,
    updateProduct,
    archiveProduct,
    restoreProduct,
    importProducts,
    downloadTemplate,
  }
}
