<script setup lang="ts">
import { Download, Package, Plus, Search, Tags, Trash2, Upload } from 'lucide-vue-next'
import { useDebounceFn } from '@vueuse/core'
import { toast } from 'vue-sonner'
import { createColumns } from '@/components/products/columns'
import DataTable from '@/components/products/DataTable.vue'
import ProductDetailsDialog from '@/components/products/ProductDetailsDialog.vue'
import ProductFormDialog from '@/components/products/ProductFormDialog.vue'
import type { ProductFormMode } from '@/components/products/ProductFormDialog.vue'
import ProductImportDialog from '@/components/products/ProductImportDialog.vue'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import type { Product } from '@/composables/useProducts'
import { productPageSize } from '@/composables/useProducts'

const allCategories = 'all'

const { t, formatNumber } = useI18n()

const { canCreate, canEdit, canDelete } = usePermissions()
const {
  products,
  totalProducts,
  categories,
  loading,
  saving,
  fetchProducts,
  fetchCategories,
  fetchProduct,
  archiveProduct,
  deleteProducts,
  deleting,
  restoreProduct,
  downloadTemplate,
} = useProducts()

const searchText = ref('')
const categoryFilter = ref(allCategories)
const includeArchived = ref(false)
const pageOffset = ref(0)

const showFormDialog = ref(false)
const formMode = ref<ProductFormMode>('create')
const formProduct = ref<Product | null>(null)
const formParent = ref<Product | null>(null)
const showDetailsDialog = ref(false)
const detailsProduct = ref<Product | null>(null)
const showImportDialog = ref(false)
const showArchiveDialog = ref(false)
const archiveTarget = ref<Product | null>(null)
const selectedIds = ref<string[]>([])
const deleteTargets = ref<Product[]>([])
const showDeleteDialog = ref(false)

const askToDelete = (targets: Product[]) => {
  deleteTargets.value = targets
  showDeleteDialog.value = true
}

const skippedReasonLabel = (reason: string) => t(`products.delete.reasons.${reason}`)

const confirmDelete = async () => {
  const deleteResult = await deleteProducts(deleteTargets.value.map(product => product.id))
  if (!deleteResult) return
  showDeleteDialog.value = false
  selectedIds.value = selectedIds.value.filter(selectedId => !deleteResult.deleted.includes(selectedId))
  const deletedCount = deleteTargets.value.filter(product => deleteResult.deleted.includes(product.id)).length
  if (deleteResult.skipped.length === 0) {
    toast.success(t('products.delete.done', { count: deletedCount }))
  } else {
    const skippedText = deleteResult.skipped.map(skipped => `${skipped.name} (${skippedReasonLabel(skipped.reason)})`).join(', ')
    toast.warning(t('products.delete.partly', { deleted: deletedCount, skipped: deleteResult.skipped.length }), { description: t('products.delete.skippedHint', { names: skippedText }), duration: 15000 })
  }
  deleteTargets.value = []
  refreshAfterChange()
}

const pageEnd = computed(() => Math.min(pageOffset.value + products.value.length, totalProducts.value))
const hasPreviousPage = computed(() => pageOffset.value > 0)
const hasNextPage = computed(() => pageOffset.value + productPageSize < totalProducts.value)
const hasActiveFilter = computed(() => searchText.value.trim() !== '' || categoryFilter.value !== allCategories)

const loadProducts = () => fetchProducts({
  searchText: searchText.value.trim(),
  category: categoryFilter.value === allCategories ? '' : categoryFilter.value,
  includeArchived: includeArchived.value,
  offset: pageOffset.value,
})

const reloadFromFirstPage = () => {
  pageOffset.value = 0
  loadProducts()
}

const refreshAfterChange = () => {
  loadProducts()
  fetchCategories()
}

const searchAfterTyping = useDebounceFn(reloadFromFirstPage, 300)

watch(searchText, searchAfterTyping)
watch([categoryFilter, includeArchived], reloadFromFirstPage)

const goToPage = (nextOffset: number) => {
  pageOffset.value = Math.max(nextOffset, 0)
  loadProducts()
}

const openForm = (mode: ProductFormMode, product: Product | null, parent: Product | null) => {
  formMode.value = mode
  formProduct.value = product
  formParent.value = parent
  showFormDialog.value = true
}

const openDetails = (product: Product) => {
  detailsProduct.value = product
  showDetailsDialog.value = true
}

const onProductSaved = (savedProduct: Product) => {
  refreshAfterChange()
  if (detailsProduct.value?.id === savedProduct.id) detailsProduct.value = savedProduct
}

const confirmArchive = async () => {
  if (!archiveTarget.value) return
  try {
    await archiveProduct(archiveTarget.value.id)
    showArchiveDialog.value = false
    archiveTarget.value = null
    refreshAfterChange()
  } catch {
  }
}

const restore = async (product: Product) => {
  try {
    await restoreProduct(product.id)
    refreshAfterChange()
  } catch {
  }
}

const columns = computed(() => createColumns({
  canEdit: canEdit('products'),
  canDelete: canDelete('products'),
  onView: openDetails,
  onEdit: product => openForm('edit', product, null),
  onAddVariant: product => openForm('variant', null, product),
  onArchive: product => {
    archiveTarget.value = product
    showArchiveDialog.value = true
  },
  onRestore: restore,
  onDelete: product => askToDelete([product]),
  isSelected: product => selectedIds.value.includes(product.id),
  onToggleSelected: (product, isSelected) => {
    selectedIds.value = isSelected ? [...new Set([...selectedIds.value, product.id])] : selectedIds.value.filter(selectedId => selectedId !== product.id)
  },
  allSelected: products.value.length > 0 && products.value.every(product => selectedIds.value.includes(product.id)),
  onToggleAll: isSelected => {
    const pageIds = products.value.map(product => product.id)
    selectedIds.value = isSelected ? [...new Set([...selectedIds.value, ...pageIds])] : selectedIds.value.filter(selectedId => !pageIds.includes(selectedId))
  },
}))
const selectedProducts = computed(() => products.value.filter(product => selectedIds.value.includes(product.id)))

onMounted(() => {
  loadProducts()
  fetchCategories()
})

const route = useRoute()

watch(() => route.query.view, async viewedProductId => {
  if (typeof viewedProductId !== 'string' || viewedProductId === '') return
  const viewedProduct = await fetchProduct(viewedProductId)
  if (viewedProduct) openDetails(viewedProduct)
}, { immediate: true })
</script>

<template>
  <div class="container mx-auto flex flex-col gap-6 py-2 sm:px-4 sm:py-6">
    <div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">{{ t('products.page.title') }}</h1>
        <p class="mt-1 text-muted-foreground">{{ t('products.page.subtitle') }}</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button v-if="canCreate('products')" variant="outline" data-tour="products-import" @click="showImportDialog = true">
          <Upload />
          {{ t('products.page.import') }}
        </Button>
        <Button v-if="canCreate('products')" variant="outline" @click="downloadTemplate">
          <Download />
          {{ t('products.page.template') }}
        </Button>
        <Button v-if="canCreate('products')" data-tour="products-add" @click="openForm('create', null, null)">
          <Plus />
          {{ t('products.page.addProduct') }}
        </Button>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2">
          <CardTitle class="text-sm font-medium">{{ hasActiveFilter ? t('products.page.matchingProducts') : t('products.page.title') }}</CardTitle>
          <Package class="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <Skeleton v-if="loading && !products.length" class="h-8 w-16" />
          <p v-else class="text-2xl font-bold tabular-nums">{{ formatNumber(totalProducts) }}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2">
          <CardTitle class="text-sm font-medium">{{ t('products.page.categories') }}</CardTitle>
          <Tags class="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p class="text-2xl font-bold tabular-nums">{{ formatNumber(categories.length) }}</p>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardContent class="flex flex-col gap-4 px-3 sm:px-6">
        <div class="flex flex-col gap-3 md:flex-row md:items-center">
          <div class="relative flex-1" data-tour="products-search">
            <Search class="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input v-model="searchText" :placeholder="t('products.page.searchPlaceholder')" class="pl-8" :aria-label="t('products.page.searchLabel')" />
          </div>
          <Select v-model="categoryFilter">
            <SelectTrigger class="w-full md:w-48" :aria-label="t('products.page.filterByCategory')">
              <SelectValue :placeholder="t('products.page.allCategories')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem :value="allCategories">{{ t('products.page.allCategories') }}</SelectItem>
              <SelectItem v-for="category in categories" :key="category" :value="category">{{ category }}</SelectItem>
            </SelectContent>
          </Select>
          <div class="flex items-center gap-2">
            <Switch id="show-archived" v-model="includeArchived" />
            <Label for="show-archived" class="whitespace-nowrap font-normal">{{ t('products.page.showArchived') }}</Label>
          </div>
        </div>

        <div v-if="selectedIds.length" class="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
          <span class="font-medium">{{ t('products.delete.selected', { count: selectedIds.length }) }}</span>
          <div class="flex gap-2">
            <Button variant="ghost" size="sm" @click="selectedIds = []">{{ t('products.delete.clearSelection') }}</Button>
            <Button variant="destructive" size="sm" :disabled="!selectedProducts.length" @click="askToDelete(selectedProducts)"><Trash2 /> {{ t('products.delete.deleteSelected') }}</Button>
          </div>
        </div>
        <div v-if="loading && !products.length" class="flex flex-col gap-2">
          <Skeleton v-for="skeletonRow in 6" :key="skeletonRow" class="h-14 w-full" />
        </div>
        <DataTable v-else :columns="columns" :data="products">
          <template #empty>
            {{ hasActiveFilter ? t('products.page.emptyFiltered') : t('products.page.emptyNone') }}
          </template>
        </DataTable>

        <div class="flex flex-col items-center justify-between gap-2 sm:flex-row">
          <p class="text-sm text-muted-foreground tabular-nums">
            <template v-if="totalProducts">{{ t('common.pagination.showing', { from: formatNumber(pageOffset + 1), to: formatNumber(pageEnd), total: formatNumber(totalProducts) }) }}</template>
          </p>
          <div class="flex gap-2">
            <Button variant="outline" size="sm" :disabled="!hasPreviousPage || loading" @click="goToPage(pageOffset - productPageSize)">{{ t('common.pagination.previous') }}</Button>
            <Button variant="outline" size="sm" :disabled="!hasNextPage || loading" @click="goToPage(pageOffset + productPageSize)">{{ t('common.pagination.next') }}</Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <ProductFormDialog
      v-model:open="showFormDialog"
      :mode="formMode"
      :product="formProduct"
      :parent="formParent"
      :categories="categories"
      @saved="onProductSaved"
    />

    <ProductDetailsDialog
      v-model:open="showDetailsDialog"
      :product="detailsProduct"
      :can-edit="canEdit('products')"
      @edit="product => openForm('edit', product, null)"
    />

    <ProductImportDialog v-model:open="showImportDialog" @imported="refreshAfterChange" />

    <AlertDialog v-model:open="showArchiveDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{{ t('products.page.archiveTitle', { name: archiveTarget?.name ?? '' }) }}</AlertDialogTitle>
          <AlertDialogDescription>
            {{ t('products.page.archiveDescription') }}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{{ t('common.actions.cancel') }}</AlertDialogCancel>
          <AlertDialogAction :disabled="saving" @click="confirmArchive">
            {{ t('products.page.archive') }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog v-model:open="showDeleteDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {{ deleteTargets.length === 1 ? t('products.delete.titleOne', { name: deleteTargets[0]?.name ?? '' }) : t('products.delete.titleMany', { count: deleteTargets.length }) }}
          </AlertDialogTitle>
          <AlertDialogDescription>{{ t('products.delete.description') }}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{{ t('common.actions.cancel') }}</AlertDialogCancel>
          <AlertDialogAction class="bg-destructive text-white hover:bg-destructive/90" :disabled="deleting" @click.prevent="confirmDelete">
            {{ t('products.delete.confirm') }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
