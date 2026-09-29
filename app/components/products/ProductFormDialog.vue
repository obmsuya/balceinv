<script setup lang="ts">
import { ImageOff, ImageUp, Plus, Puzzle, Trash2, X } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import CatalogPicker from '@/components/catalog/CatalogPicker.vue'
import type { CatalogProduct } from '@/composables/useCatalog'
import type { NewProductFields, Product, ProductFields } from '@/composables/useProducts'
import { productImageLimitBytes } from '@/composables/useProducts'
import type { ProductAddon } from '@/composables/useAddons'
import { assetUrl } from '~/composables/useSettings'
import { currencyCode, formatMoney, inputTextToMinor, minorToInputText } from '~/utils/money'

export type ProductFormMode = 'create' | 'edit' | 'variant'

interface KeyValueRow {
  key: string
  value: string
}

interface BarcodeRow {
  code: string
  packSize: string
}

const props = defineProps<{
  mode: ProductFormMode
  product: Product | null
  parent: Product | null
  categories: string[]
}>()

const emit = defineEmits<{ saved: [product: Product] }>()

const open = defineModel<boolean>('open', { default: false })

const { createProduct, updateProduct, saving } = useProducts()
const { addons, loading: addonsLoading, fetchAddons, createAddon, updateAddon, deleteAddon } = useAddons()

const defaultMinimumStock = '5'

const blankForm = () => ({
  name: '',
  sku: '',
  variantLabel: '',
  price: '',
  costPrice: '',
  wholesalePrice: '',
  wholesaleMin: '1',
  category: '',
  unit: 'pcs',
  piecesPerUnit: '1',
  openingQuantity: '0',
  minStock: defaultMinimumStock,
})

const form = ref(blankForm())
const metadataRows = ref<KeyValueRow[]>([])
const barcodeRows = ref<BarcodeRow[]>([])
const activeTab = ref('details')
const imageFile = ref<File | null>(null)
const imageObjectUrl = ref<string | null>(null)
const imageInput = ref<HTMLInputElement | null>(null)
const newAddonName = ref('')
const newAddonPrice = ref('')

const isEditing = computed(() => props.mode === 'edit')
const isVariant = computed(() => props.mode === 'variant' || (isEditing.value && props.product?.parent_id != null))

const imagePreview = computed(() => imageObjectUrl.value ?? (isEditing.value ? assetUrl(props.product?.image_url) : null))

const dialogTitle = computed(() => {
  if (props.mode === 'variant') return `Add variant of ${props.parent?.name ?? ''}`
  if (isEditing.value) return 'Edit product'
  return 'Add product'
})

const dialogDescription = computed(() => {
  if (props.mode === 'variant') return 'A variant keeps the product name but has its own SKU, price and stock.'
  if (isEditing.value) return 'Update the details, photo and add-ons.'
  return 'Pick a common product to fill the form, or type the details yourself.'
})

const submitLabel = computed(() => {
  if (isEditing.value) return 'Save changes'
  if (props.mode === 'variant') return 'Add variant'
  return 'Add product'
})

const rowsFromMetadata = (metadata: Record<string, unknown> | null | undefined): KeyValueRow[] =>
  Object.entries(metadata ?? {}).map(([key, value]) => ({ key, value: String(value) }))

const formFromProduct = (sourceProduct: Product, isNewVariant: boolean) => ({
  name: sourceProduct.name,
  sku: isNewVariant ? '' : sourceProduct.sku,
  variantLabel: isNewVariant ? '' : sourceProduct.variant_label,
  price: minorToInputText(sourceProduct.price),
  costPrice: minorToInputText(sourceProduct.cost_price),
  wholesalePrice: minorToInputText(sourceProduct.wholesale_price),
  wholesaleMin: String(sourceProduct.wholesale_min || 1),
  category: sourceProduct.category ?? '',
  unit: sourceProduct.unit,
  piecesPerUnit: String(sourceProduct.pieces_per_unit || 1),
  openingQuantity: '0',
  minStock: String(sourceProduct.min_stock ?? defaultMinimumStock),
})

const clearImage = () => {
  if (imageObjectUrl.value) URL.revokeObjectURL(imageObjectUrl.value)
  imageObjectUrl.value = null
  imageFile.value = null
  if (imageInput.value) imageInput.value.value = ''
}

const resetForm = () => {
  clearImage()
  activeTab.value = 'details'
  newAddonName.value = ''
  newAddonPrice.value = ''

  if (isEditing.value && props.product) {
    form.value = formFromProduct(props.product, false)
    metadataRows.value = rowsFromMetadata(props.product.metadata)
    barcodeRows.value = props.product.barcodes.map(barcode => ({ code: barcode.code, packSize: String(barcode.pack_size) }))
    fetchAddons(props.product.id)
    return
  }
  if (props.mode === 'variant' && props.parent) {
    form.value = formFromProduct(props.parent, true)
    metadataRows.value = []
    barcodeRows.value = []
    return
  }
  form.value = blankForm()
  metadataRows.value = []
  barcodeRows.value = []
}

watch(open, isOpen => {
  if (isOpen) resetForm()
  else clearImage()
})

const prefillFromCatalog = (catalogProduct: CatalogProduct) => {
  form.value.name = catalogProduct.name
  form.value.category = catalogProduct.category ?? ''
  form.value.unit = catalogProduct.unit
  form.value.sku = catalogProduct.sku_prefix ? `${catalogProduct.sku_prefix}-` : ''
  form.value.price = catalogProduct.default_price ? String(catalogProduct.default_price) : ''
  metadataRows.value = rowsFromMetadata(catalogProduct.metadata)
}

const onImagePicked = (event: Event) => {
  const pickedFile = (event.target as HTMLInputElement).files?.[0]
  if (!pickedFile) return
  if (pickedFile.size > productImageLimitBytes) {
    toast.error('The image must be 2 MB or smaller')
    return
  }
  clearImage()
  imageFile.value = pickedFile
  imageObjectUrl.value = URL.createObjectURL(pickedFile)
}

const readCount = (inputText: string, fallback: number): number => {
  const trimmedText = inputText.trim()
  if (trimmedText === '') return fallback
  const parsedCount = Number(trimmedText)
  return Number.isInteger(parsedCount) && parsedCount >= 0 ? parsedCount : Number.NaN
}

const buildFields = (): ProductFields | string => {
  const productName = isVariant.value && props.mode === 'variant' ? props.parent?.name ?? '' : form.value.name.trim()
  if (!productName) return 'Enter the product name'
  if (!form.value.sku.trim()) return 'Enter the SKU'
  if (isVariant.value && !form.value.variantLabel.trim()) return 'Enter a variant label, for example Red / Large'

  const price = inputTextToMinor(form.value.price)
  if (price == null) return 'Enter the selling price'
  const costPrice = inputTextToMinor(form.value.costPrice) ?? 0
  const wholesalePrice = inputTextToMinor(form.value.wholesalePrice)
  const hasBadMoney = [price, costPrice, wholesalePrice ?? 0].some(amount => Number.isNaN(amount))
  if (hasBadMoney) return 'Prices must be numbers of zero or more'

  const wholesaleMin = readCount(form.value.wholesaleMin, 1)
  const piecesPerUnit = readCount(form.value.piecesPerUnit, 1)
  const minStock = readCount(form.value.minStock, Number(defaultMinimumStock))
  const hasBadCount = [wholesaleMin, piecesPerUnit, minStock].some(count => Number.isNaN(count))
  if (hasBadCount) return 'Quantities must be whole numbers'

  const barcodes = barcodeRows.value
    .filter(barcodeRow => barcodeRow.code.trim() !== '')
    .map(barcodeRow => ({ code: barcodeRow.code.trim(), pack_size: readCount(barcodeRow.packSize, 1) || 1 }))
  const metadataEntries = metadataRows.value
    .filter(metadataRow => metadataRow.key.trim() !== '')
    .map(metadataRow => [metadataRow.key.trim(), metadataRow.value])

  return {
    sku: form.value.sku.trim(),
    name: productName,
    variant_label: form.value.variantLabel.trim(),
    price,
    cost_price: costPrice,
    wholesale_price: wholesalePrice,
    wholesale_min: Math.max(wholesaleMin, 1),
    category: form.value.category.trim() || null,
    unit: form.value.unit.trim() || 'pcs',
    pieces_per_unit: Math.max(piecesPerUnit, 1),
    metadata: Object.fromEntries(metadataEntries),
    barcodes,
    min_stock: minStock,
  }
}

const submit = async () => {
  const builtFields = buildFields()
  if (typeof builtFields === 'string') {
    toast.error(builtFields)
    return
  }

  try {
    if (isEditing.value && props.product) {
      const updatedProduct = await updateProduct(props.product.id, builtFields, imageFile.value)
      if (updatedProduct) emit('saved', updatedProduct)
      open.value = false
      return
    }

    const openingQuantity = readCount(form.value.openingQuantity, 0)
    if (Number.isNaN(openingQuantity)) {
      toast.error('Opening stock must be a whole number')
      return
    }
    const newFields: NewProductFields = {
      ...builtFields,
      parent_id: props.mode === 'variant' ? props.parent?.id ?? null : null,
      opening_quantity: openingQuantity,
    }
    const createdProduct = await createProduct(newFields, imageFile.value)
    if (createdProduct) emit('saved', createdProduct)
    open.value = false
  } catch {
  }
}

const addAddon = async () => {
  if (!props.product) return
  const addonPrice = inputTextToMinor(newAddonPrice.value) ?? 0
  if (!newAddonName.value.trim() || Number.isNaN(addonPrice)) {
    toast.error('Enter an add-on name and a price of zero or more')
    return
  }
  try {
    await createAddon(props.product.id, { name: newAddonName.value.trim(), price: addonPrice, is_active: true })
    newAddonName.value = ''
    newAddonPrice.value = ''
  } catch {
  }
}

const toggleAddon = async (addon: ProductAddon, isActive: boolean) => {
  try {
    await updateAddon(addon.id, { name: addon.name, price: addon.price, is_active: isActive })
  } catch {
  }
}

const removeAddon = async (addon: ProductAddon) => {
  try {
    await deleteAddon(addon.id)
  } catch {
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{{ dialogTitle }}</DialogTitle>
        <DialogDescription>{{ dialogDescription }}</DialogDescription>
      </DialogHeader>

      <Tabs v-model="activeTab">
        <TabsList v-if="isEditing" class="w-full">
          <TabsTrigger value="details" class="flex-1">Details</TabsTrigger>
          <TabsTrigger value="addons" class="flex-1">
            <Puzzle />
            Add-ons
            <span v-if="addons.length" class="rounded-full bg-muted px-1.5 text-xs tabular-nums">{{ addons.length }}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" class="mt-4 flex flex-col gap-4">
          <CatalogPicker v-if="mode === 'create'" @pick="prefillFromCatalog" />

          <div class="flex items-center gap-4">
            <div class="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
              <img v-if="imagePreview" :src="imagePreview" alt="Product photo" class="size-full object-cover">
              <ImageOff v-else class="size-7 text-muted-foreground/40" />
            </div>
            <div class="flex flex-col gap-2">
              <input ref="imageInput" type="file" accept="image/png,image/jpeg,image/webp" class="hidden" @change="onImagePicked">
              <Button variant="outline" size="sm" type="button" @click="imageInput?.click()">
                <ImageUp />
                {{ imagePreview ? 'Change photo' : 'Add photo' }}
              </Button>
              <Button v-if="imageFile" variant="ghost" size="sm" type="button" @click="clearImage">
                <X />
                Undo photo
              </Button>
              <p class="text-xs text-muted-foreground">PNG, JPEG or WebP, up to 2 MB</p>
            </div>
          </div>

          <Separator />

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="flex flex-col gap-1.5">
              <Label for="product-name">Product name</Label>
              <Input id="product-name" v-model="form.name" placeholder="Coca Cola 500ml" :disabled="isVariant" />
            </div>
            <div class="flex flex-col gap-1.5">
              <Label for="product-sku">SKU</Label>
              <Input id="product-sku" v-model="form.sku" placeholder="COCA-500" autocapitalize="characters" />
            </div>
            <div v-if="isVariant" class="flex flex-col gap-1.5 sm:col-span-2">
              <Label for="product-variant-label">Variant label</Label>
              <Input id="product-variant-label" v-model="form.variantLabel" placeholder="Red / Large" />
            </div>
            <div class="flex flex-col gap-1.5">
              <Label for="product-category">Category</Label>
              <Input id="product-category" v-model="form.category" list="product-category-options" placeholder="Drinks" />
              <datalist id="product-category-options">
                <option v-for="category in categories" :key="category" :value="category" />
              </datalist>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div class="flex flex-col gap-1.5">
                <Label for="product-unit">Unit</Label>
                <Input id="product-unit" v-model="form.unit" placeholder="pcs" />
              </div>
              <div class="flex flex-col gap-1.5">
                <Label for="product-pieces">Pieces per unit</Label>
                <Input id="product-pieces" v-model="form.piecesPerUnit" inputmode="numeric" />
              </div>
            </div>
          </div>

          <Separator />

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="flex flex-col gap-1.5">
              <Label for="product-price">Selling price ({{ currencyCode() }})</Label>
              <Input id="product-price" v-model="form.price" inputmode="decimal" placeholder="1000" />
            </div>
            <div class="flex flex-col gap-1.5">
              <Label for="product-cost">Cost price ({{ currencyCode() }})</Label>
              <Input id="product-cost" v-model="form.costPrice" inputmode="decimal" placeholder="700" />
            </div>
            <div class="flex flex-col gap-1.5">
              <Label for="product-wholesale-price">Wholesale price (optional)</Label>
              <Input id="product-wholesale-price" v-model="form.wholesalePrice" inputmode="decimal" placeholder="850" />
            </div>
            <div class="flex flex-col gap-1.5">
              <Label for="product-wholesale-min">Wholesale from quantity</Label>
              <Input id="product-wholesale-min" v-model="form.wholesaleMin" inputmode="numeric" />
            </div>
          </div>

          <Separator />

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div v-if="!isEditing" class="flex flex-col gap-1.5">
              <Label for="product-opening">Opening stock</Label>
              <Input id="product-opening" v-model="form.openingQuantity" inputmode="numeric" />
            </div>
            <div v-else class="flex flex-col gap-1.5">
              <Label>Current stock</Label>
              <p class="flex h-9 items-center text-sm tabular-nums">{{ product?.quantity ?? '—' }} {{ product?.unit }}</p>
            </div>
            <div class="flex flex-col gap-1.5">
              <Label for="product-min-stock">Warn when stock is at or below</Label>
              <Input id="product-min-stock" v-model="form.minStock" inputmode="numeric" />
            </div>
          </div>

          <Separator />

          <div class="flex flex-col gap-3">
            <div class="flex items-center justify-between gap-2">
              <div>
                <Label>Barcodes</Label>
                <p class="mt-0.5 text-xs text-muted-foreground">A box barcode can sell several pieces at once.</p>
              </div>
              <Button variant="outline" size="sm" type="button" @click="barcodeRows.push({ code: '', packSize: '1' })">
                <Plus />
                Barcode
              </Button>
            </div>
            <div v-for="(barcodeRow, rowIndex) in barcodeRows" :key="rowIndex" class="flex items-center gap-2">
              <Input v-model="barcodeRow.code" placeholder="Scan or type" class="flex-1" :aria-label="`Barcode ${rowIndex + 1}`" />
              <Input v-model="barcodeRow.packSize" inputmode="numeric" class="w-20" :aria-label="`Pieces for barcode ${rowIndex + 1}`" />
              <Button variant="ghost" size="icon" type="button" aria-label="Remove barcode" @click="barcodeRows.splice(rowIndex, 1)">
                <X />
              </Button>
            </div>
          </div>

          <Separator />

          <div class="flex flex-col gap-3">
            <div class="flex items-center justify-between gap-2">
              <div>
                <Label>Extra details</Label>
                <p class="mt-0.5 text-xs text-muted-foreground">Anything else worth knowing, like strength or size.</p>
              </div>
              <Button variant="outline" size="sm" type="button" @click="metadataRows.push({ key: '', value: '' })">
                <Plus />
                Detail
              </Button>
            </div>
            <div v-for="(metadataRow, rowIndex) in metadataRows" :key="rowIndex" class="flex items-center gap-2">
              <Input v-model="metadataRow.key" placeholder="Name" class="w-2/5" :aria-label="`Detail name ${rowIndex + 1}`" />
              <Input v-model="metadataRow.value" placeholder="Value" class="flex-1" :aria-label="`Detail value ${rowIndex + 1}`" />
              <Button variant="ghost" size="icon" type="button" aria-label="Remove detail" @click="metadataRows.splice(rowIndex, 1)">
                <X />
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent v-if="isEditing" value="addons" class="mt-4 flex flex-col gap-4">
          <div class="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3 sm:flex-row">
            <Input v-model="newAddonName" placeholder="Add-on name, e.g. Delivery" class="flex-1" aria-label="Add-on name" />
            <Input v-model="newAddonPrice" inputmode="decimal" :placeholder="`Price (${currencyCode()})`" class="sm:w-36" aria-label="Add-on price" />
            <Button type="button" :disabled="addonsLoading || !newAddonName.trim()" @click="addAddon">
              <Plus />
              Add
            </Button>
          </div>
          <p v-if="!addons.length" class="py-8 text-center text-sm text-muted-foreground">No add-ons yet.</p>
          <div v-for="addon in addons" :key="addon.id" class="flex items-center gap-3 rounded-md border px-3 py-2">
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium">{{ addon.name }}</p>
              <p class="text-xs text-muted-foreground tabular-nums">+ {{ formatMoney(addon.price) }}</p>
            </div>
            <Switch :model-value="addon.is_active" :disabled="addonsLoading" :aria-label="`Offer ${addon.name}`" @update:model-value="toggleAddon(addon, $event)" />
            <Button variant="ghost" size="icon" :disabled="addonsLoading" :aria-label="`Delete ${addon.name}`" @click="removeAddon(addon)">
              <Trash2 class="text-destructive" />
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <DialogFooter>
        <Button variant="outline" @click="open = false">Cancel</Button>
        <Button v-if="activeTab === 'details'" :disabled="saving" @click="submit">{{ submitLabel }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
