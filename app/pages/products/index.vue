<script setup lang="ts">
import { Download, Package, Plus, Search, Tags, Upload } from 'lucide-vue-next'
import { useDebounceFn } from '@vueuse/core'
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
}))

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
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Products</h1>
        <p class="mt-1 text-muted-foreground">Your items, variants and add-ons</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button v-if="canCreate('products')" variant="outline" @click="showImportDialog = true">
          <Upload />
          Import
        </Button>
        <Button v-if="canCreate('products')" variant="outline" @click="downloadTemplate">
          <Download />
          Template
        </Button>
        <Button v-if="canCreate('products')" @click="openForm('create', null, null)">
          <Plus />
          Add product
        </Button>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2">
          <CardTitle class="text-sm font-medium">{{ hasActiveFilter ? 'Matching products' : 'Products' }}</CardTitle>
          <Package class="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <Skeleton v-if="loading && !products.length" class="h-8 w-16" />
          <p v-else class="text-2xl font-bold tabular-nums">{{ totalProducts.toLocaleString() }}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2">
          <CardTitle class="text-sm font-medium">Categories</CardTitle>
          <Tags class="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p class="text-2xl font-bold tabular-nums">{{ categories.length.toLocaleString() }}</p>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardContent class="flex flex-col gap-4 px-3 sm:px-6">
        <div class="flex flex-col gap-3 md:flex-row md:items-center">
          <div class="relative flex-1">
            <Search class="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input v-model="searchText" placeholder="Search by name, SKU or barcode" class="pl-8" aria-label="Search products" />
          </div>
          <Select v-model="categoryFilter">
            <SelectTrigger class="w-full md:w-48" aria-label="Filter by category">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem :value="allCategories">All categories</SelectItem>
              <SelectItem v-for="category in categories" :key="category" :value="category">{{ category }}</SelectItem>
            </SelectContent>
          </Select>
          <div class="flex items-center gap-2">
            <Switch id="show-archived" v-model="includeArchived" />
            <Label for="show-archived" class="whitespace-nowrap font-normal">Show archived</Label>
          </div>
        </div>

        <div v-if="loading && !products.length" class="flex flex-col gap-2">
          <Skeleton v-for="skeletonRow in 6" :key="skeletonRow" class="h-14 w-full" />
        </div>
        <DataTable v-else :columns="columns" :data="products">
          <template #empty>
            {{ hasActiveFilter ? 'No products match this search.' : 'No products yet. Add one or import a spreadsheet.' }}
          </template>
        </DataTable>

        <div class="flex flex-col items-center justify-between gap-2 sm:flex-row">
          <p class="text-sm text-muted-foreground tabular-nums">
            <template v-if="totalProducts">Showing {{ pageOffset + 1 }}–{{ pageEnd }} of {{ totalProducts.toLocaleString() }}</template>
          </p>
          <div class="flex gap-2">
            <Button variant="outline" size="sm" :disabled="!hasPreviousPage || loading" @click="goToPage(pageOffset - productPageSize)">Previous</Button>
            <Button variant="outline" size="sm" :disabled="!hasNextPage || loading" @click="goToPage(pageOffset + productPageSize)">Next</Button>
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
          <AlertDialogTitle>Archive {{ archiveTarget?.name }}?</AlertDialogTitle>
          <AlertDialogDescription>
            It disappears from the till and product list, together with its variants. Past sales keep it, and you can restore it from “Show archived”.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction class="bg-destructive text-white hover:bg-destructive/90" :disabled="saving" @click="confirmArchive">
            Archive
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
