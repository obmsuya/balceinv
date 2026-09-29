<script setup lang="ts">
import { ImageOff, ImageUp, Plus, Puzzle, Smartphone, Trash2, X } from 'lucide-vue-next'
import PhonePhotoDialog from '@/components/products/PhonePhotoDialog.vue'
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

const { t } = useI18n()

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
const showPhonePhoto = ref(false)
const newAddonName = ref('')
const newAddonPrice = ref('')

const isEditing = computed(() => props.mode === 'edit')
const isVariant = computed(() => props.mode === 'variant' || (isEditing.value && props.product?.parent_id != null))

const imagePreview = computed(() => imageObjectUrl.value ?? (isEditing.value ? assetUrl(props.product?.image_url) : null))

const dialogTitle = computed(() => {
  if (props.mode === 'variant') return t('products.form.variantTitle', { name: props.parent?.name ?? '' })
  if (isEditing.value) return t('products.form.editTitle')
  return t('products.form.createTitle')
})

const dialogDescription = computed(() => {
  if (props.mode === 'variant') return t('products.form.variantDescription')
  if (isEditing.value) return t('products.form.editDescription')
  return t('products.form.createDescription')
})

const submitLabel = computed(() => {
  if (isEditing.value) return t('common.actions.saveChanges')
  if (props.mode === 'variant') return t('products.form.addVariant')
  return t('products.form.createTitle')
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

const usePhonePhoto = (photoFile: File) => {
  clearImage()
  imageFile.value = photoFile
  imageObjectUrl.value = URL.createObjectURL(photoFile)
}

const onImagePicked = (event: Event) => {
  const pickedFile = (event.target as HTMLInputElement).files?.[0]
  if (!pickedFile) return
  if (pickedFile.size > productImageLimitBytes) {
    toast.error(t('products.form.imageTooBig'))
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
  if (!productName) return t('products.form.errors.nameRequired')
  if (!form.value.sku.trim()) return t('products.form.errors.skuRequired')
  if (isVariant.value && !form.value.variantLabel.trim()) return t('products.form.errors.variantLabelRequired')

  const price = inputTextToMinor(form.value.price)
  if (price == null) return t('products.form.errors.priceRequired')
  const costPrice = inputTextToMinor(form.value.costPrice) ?? 0
  const wholesalePrice = inputTextToMinor(form.value.wholesalePrice)
  const hasBadMoney = [price, costPrice, wholesalePrice ?? 0].some(amount => Number.isNaN(amount))
  if (hasBadMoney) return t('products.form.errors.badPrice')

  const wholesaleMin = readCount(form.value.wholesaleMin, 1)
  const piecesPerUnit = readCount(form.value.piecesPerUnit, 1)
  const minStock = readCount(form.value.minStock, Number(defaultMinimumStock))
  const hasBadCount = [wholesaleMin, piecesPerUnit, minStock].some(count => Number.isNaN(count))
  if (hasBadCount) return t('products.form.errors.badQuantity')

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
      toast.error(t('products.form.errors.badOpeningStock'))
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
    toast.error(t('products.form.errors.badAddon'))
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
          <TabsTrigger value="details" class="flex-1">{{ t('products.form.detailsTab') }}</TabsTrigger>
          <TabsTrigger value="addons" class="flex-1">
            <Puzzle />
            {{ t('products.form.addonsTab') }}
            <span v-if="addons.length" class="rounded-full bg-muted px-1.5 text-xs tabular-nums">{{ addons.length }}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" class="mt-4 flex flex-col gap-4">
          <CatalogPicker v-if="mode === 'create'" @pick="prefillFromCatalog" />

          <div class="flex items-center gap-4">
            <div class="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
              <img v-if="imagePreview" :src="imagePreview" :alt="t('products.form.photoAlt')" class="size-full object-cover">
              <ImageOff v-else class="size-7 text-muted-foreground/40" />
            </div>
            <div class="flex flex-col gap-2">
              <input ref="imageInput" type="file" accept="image/png,image/jpeg,image/webp" class="hidden" @change="onImagePicked">
              <div class="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" type="button" @click="imageInput?.click()">
                  <ImageUp />
                  {{ imagePreview ? t('products.form.changePhoto') : t('products.form.addPhoto') }}
                </Button>
                <Button variant="outline" size="sm" type="button" @click="showPhonePhoto = true">
                  <Smartphone />
                  {{ t('products.form.usePhone') }}
                </Button>
              </div>
              <Button v-if="imageFile" variant="ghost" size="sm" type="button" @click="clearImage">
                <X />
                {{ t('products.form.undoPhoto') }}
              </Button>
              <p class="text-xs text-muted-foreground">{{ t('products.form.photoHint') }}</p>
            </div>
          </div>

          <Separator />

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="flex flex-col gap-1.5">
              <Label for="product-name">{{ t('products.form.name') }}</Label>
              <Input id="product-name" v-model="form.name" placeholder="Coca Cola 500ml" :disabled="isVariant" />
            </div>
            <div class="flex flex-col gap-1.5">
              <Label for="product-sku">SKU</Label>
              <Input id="product-sku" v-model="form.sku" placeholder="COCA-500" autocapitalize="characters" />
            </div>
            <div v-if="isVariant" class="flex flex-col gap-1.5 sm:col-span-2">
              <Label for="product-variant-label">{{ t('products.form.variantLabel') }}</Label>
              <Input id="product-variant-label" v-model="form.variantLabel" :placeholder="t('products.form.variantLabelPlaceholder')" />
            </div>
            <div class="flex flex-col gap-1.5">
              <Label for="product-category">{{ t('products.form.category') }}</Label>
              <Input id="product-category" v-model="form.category" list="product-category-options" :placeholder="t('products.form.categoryPlaceholder')" />
              <datalist id="product-category-options">
                <option v-for="category in categories" :key="category" :value="category" />
              </datalist>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div class="flex flex-col gap-1.5">
                <Label for="product-unit">{{ t('products.form.unit') }}</Label>
                <Input id="product-unit" v-model="form.unit" placeholder="pcs" />
              </div>
              <div class="flex flex-col gap-1.5">
                <Label for="product-pieces">{{ t('products.form.piecesPerUnit') }}</Label>
                <Input id="product-pieces" v-model="form.piecesPerUnit" inputmode="numeric" />
              </div>
            </div>
          </div>

          <Separator />

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="flex flex-col gap-1.5">
              <Label for="product-price">{{ t('products.form.sellingPrice', { currency: currencyCode() }) }}</Label>
              <Input id="product-price" v-model="form.price" inputmode="decimal" placeholder="1000" />
            </div>
            <div class="flex flex-col gap-1.5">
              <Label for="product-cost">{{ t('products.form.costPrice', { currency: currencyCode() }) }}</Label>
              <Input id="product-cost" v-model="form.costPrice" inputmode="decimal" placeholder="700" />
            </div>
            <div class="flex flex-col gap-1.5">
              <Label for="product-wholesale-price">{{ t('products.form.wholesalePrice') }}</Label>
              <Input id="product-wholesale-price" v-model="form.wholesalePrice" inputmode="decimal" placeholder="850" />
            </div>
            <div class="flex flex-col gap-1.5">
              <Label for="product-wholesale-min">{{ t('products.form.wholesaleMin') }}</Label>
              <Input id="product-wholesale-min" v-model="form.wholesaleMin" inputmode="numeric" />
            </div>
          </div>

          <Separator />

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div v-if="!isEditing" class="flex flex-col gap-1.5">
              <Label for="product-opening">{{ t('products.form.openingStock') }}</Label>
              <Input id="product-opening" v-model="form.openingQuantity" inputmode="numeric" />
            </div>
            <div v-else class="flex flex-col gap-1.5">
              <Label>{{ t('products.form.currentStock') }}</Label>
              <p class="flex h-9 items-center text-sm tabular-nums">{{ product?.quantity ?? '—' }} {{ product?.unit }}</p>
            </div>
            <div class="flex flex-col gap-1.5">
              <Label for="product-min-stock">{{ t('products.form.minStock') }}</Label>
              <Input id="product-min-stock" v-model="form.minStock" inputmode="numeric" />
            </div>
          </div>

          <Separator />

          <div class="flex flex-col gap-3">
            <div class="flex items-center justify-between gap-2">
              <div>
                <Label>{{ t('products.form.barcodes') }}</Label>
                <p class="mt-0.5 text-xs text-muted-foreground">{{ t('products.form.barcodesHint') }}</p>
              </div>
              <Button variant="outline" size="sm" type="button" @click="barcodeRows.push({ code: '', packSize: '1' })">
                <Plus />
                {{ t('products.form.addBarcode') }}
              </Button>
            </div>
            <div v-for="(barcodeRow, rowIndex) in barcodeRows" :key="rowIndex" class="flex items-center gap-2">
              <Input v-model="barcodeRow.code" :placeholder="t('products.form.barcodePlaceholder')" class="flex-1" :aria-label="t('products.form.barcodeLabel', { number: rowIndex + 1 })" />
              <Input v-model="barcodeRow.packSize" inputmode="numeric" class="w-20" :aria-label="t('products.form.barcodePiecesLabel', { number: rowIndex + 1 })" />
              <Button variant="ghost" size="icon" type="button" :aria-label="t('products.form.removeBarcode')" @click="barcodeRows.splice(rowIndex, 1)">
                <X />
              </Button>
            </div>
          </div>

          <Separator />

          <div class="flex flex-col gap-3">
            <div class="flex items-center justify-between gap-2">
              <div>
                <Label>{{ t('products.form.extraDetails') }}</Label>
                <p class="mt-0.5 text-xs text-muted-foreground">{{ t('products.form.extraDetailsHint') }}</p>
              </div>
              <Button variant="outline" size="sm" type="button" @click="metadataRows.push({ key: '', value: '' })">
                <Plus />
                {{ t('products.form.addDetail') }}
              </Button>
            </div>
            <div v-for="(metadataRow, rowIndex) in metadataRows" :key="rowIndex" class="flex items-center gap-2">
              <Input v-model="metadataRow.key" :placeholder="t('products.form.detailNamePlaceholder')" class="w-2/5" :aria-label="t('products.form.detailNameLabel', { number: rowIndex + 1 })" />
              <Input v-model="metadataRow.value" :placeholder="t('products.form.detailValuePlaceholder')" class="flex-1" :aria-label="t('products.form.detailValueLabel', { number: rowIndex + 1 })" />
              <Button variant="ghost" size="icon" type="button" :aria-label="t('products.form.removeDetail')" @click="metadataRows.splice(rowIndex, 1)">
                <X />
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent v-if="isEditing" value="addons" class="mt-4 flex flex-col gap-4">
          <div class="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3 sm:flex-row">
            <Input v-model="newAddonName" :placeholder="t('products.form.addonNamePlaceholder')" class="flex-1" :aria-label="t('products.form.addonName')" />
            <Input v-model="newAddonPrice" inputmode="decimal" :placeholder="t('products.form.addonPricePlaceholder', { currency: currencyCode() })" class="sm:w-36" :aria-label="t('products.form.addonPrice')" />
            <Button type="button" :disabled="addonsLoading || !newAddonName.trim()" @click="addAddon">
              <Plus />
              {{ t('common.actions.add') }}
            </Button>
          </div>
          <p v-if="!addons.length" class="py-8 text-center text-sm text-muted-foreground">{{ t('products.form.noAddons') }}</p>
          <div v-for="addon in addons" :key="addon.id" class="flex items-center gap-3 rounded-md border px-3 py-2">
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium">{{ addon.name }}</p>
              <p class="text-xs text-muted-foreground tabular-nums">+ {{ formatMoney(addon.price) }}</p>
            </div>
            <Switch :model-value="addon.is_active" :disabled="addonsLoading" :aria-label="t('products.form.offerAddon', { name: addon.name })" @update:model-value="toggleAddon(addon, $event)" />
            <Button variant="ghost" size="icon" :disabled="addonsLoading" :aria-label="t('products.form.deleteAddon', { name: addon.name })" @click="removeAddon(addon)">
              <Trash2 class="text-destructive" />
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <DialogFooter>
        <Button variant="outline" @click="open = false">{{ t('common.actions.cancel') }}</Button>
        <Button v-if="activeTab === 'details'" :disabled="saving" @click="submit">{{ submitLabel }}</Button>
      </DialogFooter>
    </DialogContent>
    <PhonePhotoDialog v-model:open="showPhonePhoto" @photo="usePhonePhoto" />
  </Dialog>
</template>
