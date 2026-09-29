<script setup lang="ts">
import { Barcode, GitBranch, ImageOff, Pencil } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import type { Product } from '@/composables/useProducts'
import { assetUrl } from '~/composables/useSettings'
import { formatMoney } from '~/utils/money'

const props = defineProps<{
  product: Product | null
  canEdit: boolean
}>()

const emit = defineEmits<{ edit: [product: Product] }>()

const open = defineModel<boolean>('open', { default: false })

const { t, formatDateTime } = useI18n()
const { fetchVariants } = useProducts()
const { addons, loading: addonsLoading, fetchAddons } = useAddons()

const variants = ref<Product[]>([])
const variantsLoading = ref(false)

const imageSource = computed(() => assetUrl(props.product?.image_url))

const stockVariant = (product: Product) => {
  if (product.quantity == null) return 'secondary'
  if (product.quantity === 0) return 'destructive'
  if (product.quantity <= (product.min_stock ?? 0)) return 'outline'
  return 'secondary'
}

const loadRelated = async () => {
  const shownProduct = props.product
  if (!shownProduct) return
  variants.value = []
  fetchAddons(shownProduct.id)
  if (shownProduct.variant_count === 0) return
  variantsLoading.value = true
  variants.value = await fetchVariants(shownProduct.id)
  variantsLoading.value = false
}

watch([open, () => props.product?.id], ([isOpen]) => {
  if (isOpen) loadRelated()
})

const editProduct = (product: Product) => {
  open.value = false
  emit('edit', product)
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{{ t('products.details.title') }}</DialogTitle>
        <DialogDescription class="sr-only">{{ t('products.details.description') }}</DialogDescription>
      </DialogHeader>

      <div v-if="product" class="flex flex-col gap-5">
        <div class="flex items-start gap-4">
          <div class="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
            <img v-if="imageSource" :src="imageSource" :alt="product.name" class="size-full object-cover">
            <ImageOff v-else class="size-7 text-muted-foreground/40" />
          </div>
          <div class="flex min-w-0 flex-1 flex-col gap-1">
            <h2 class="truncate text-lg font-semibold">{{ product.name }}</h2>
            <p class="font-mono text-sm text-muted-foreground">{{ product.sku }}</p>
            <div class="mt-1 flex flex-wrap items-center gap-2">
              <Badge v-if="product.category" variant="outline">{{ product.category }}</Badge>
              <Badge v-if="product.variant_label" variant="secondary">
                <GitBranch />
                {{ product.variant_label }}
              </Badge>
              <Badge v-if="!product.is_active" variant="secondary">{{ t('products.table.archived') }}</Badge>
            </div>
          </div>
          <Button v-if="canEdit && product.is_active" variant="outline" size="sm" @click="editProduct(product)">
            <Pencil />
            {{ t('common.actions.edit') }}
          </Button>
        </div>

        <Separator />

        <dl class="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt class="text-muted-foreground">{{ t('products.details.sellingPrice') }}</dt>
            <dd class="font-semibold tabular-nums">{{ formatMoney(product.price) }}</dd>
          </div>
          <div>
            <dt class="text-muted-foreground">{{ t('products.details.costPrice') }}</dt>
            <dd class="font-semibold tabular-nums">{{ formatMoney(product.cost_price) }}</dd>
          </div>
          <div>
            <dt class="text-muted-foreground">{{ t('products.details.wholesale') }}</dt>
            <dd class="tabular-nums">
              <template v-if="product.wholesale_price != null">
                {{ t('products.details.wholesaleFrom', { price: formatMoney(product.wholesale_price), quantity: product.wholesale_min }) }}
              </template>
              <template v-else>—</template>
            </dd>
          </div>
          <div>
            <dt class="text-muted-foreground">{{ t('products.details.stockHere') }}</dt>
            <dd>
              <Badge :variant="stockVariant(product)" class="tabular-nums">{{ product.quantity ?? '—' }} {{ product.unit }}</Badge>
            </dd>
          </div>
          <div>
            <dt class="text-muted-foreground">{{ t('products.details.warnAt') }}</dt>
            <dd class="tabular-nums">{{ product.min_stock ?? '—' }} {{ product.unit }}</dd>
          </div>
          <div>
            <dt class="text-muted-foreground">{{ t('products.details.piecesPer', { unit: product.unit }) }}</dt>
            <dd class="tabular-nums">{{ product.pieces_per_unit }}</dd>
          </div>
        </dl>

        <template v-if="product.barcodes.length">
          <Separator />
          <div class="flex flex-col gap-2">
            <p class="text-sm font-medium">{{ t('products.form.barcodes') }}</p>
            <div class="flex flex-wrap gap-2">
              <Badge v-for="barcode in product.barcodes" :key="barcode.code" variant="outline" class="gap-1.5 font-mono font-normal">
                <Barcode />
                {{ barcode.code }}
                <span v-if="barcode.pack_size > 1" class="font-sans text-muted-foreground">× {{ barcode.pack_size }}</span>
              </Badge>
            </div>
          </div>
        </template>

        <template v-if="Object.keys(product.metadata ?? {}).length">
          <Separator />
          <div class="flex flex-col gap-2">
            <p class="text-sm font-medium">{{ t('products.form.extraDetails') }}</p>
            <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div v-for="(detailValue, detailName) in product.metadata" :key="detailName" class="rounded-md border bg-muted/30 px-3 py-2">
                <p class="text-xs text-muted-foreground">{{ detailName }}</p>
                <p class="text-sm font-medium">{{ detailValue }}</p>
              </div>
            </div>
          </div>
        </template>

        <template v-if="product.variant_count > 0">
          <Separator />
          <div class="flex flex-col gap-2">
            <p class="text-sm font-medium">{{ t('products.details.variants') }}</p>
            <Skeleton v-if="variantsLoading" class="h-12 w-full" />
            <div v-for="variant in variants" :key="variant.id" class="flex items-center gap-3 rounded-md border px-3 py-2">
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium">{{ variant.variant_label }}</p>
                <p class="font-mono text-xs text-muted-foreground">{{ variant.sku }}</p>
              </div>
              <span class="text-sm tabular-nums">{{ formatMoney(variant.price) }}</span>
              <Badge :variant="stockVariant(variant)" class="tabular-nums">{{ variant.quantity ?? '—' }}</Badge>
              <Button v-if="canEdit && variant.is_active" variant="ghost" size="icon" :aria-label="t('products.details.editVariant', { name: variant.variant_label })" @click="editProduct(variant)">
                <Pencil />
              </Button>
            </div>
          </div>
        </template>

        <template v-if="addons.length || addonsLoading">
          <Separator />
          <div class="flex flex-col gap-2">
            <p class="text-sm font-medium">{{ t('products.form.addonsTab') }}</p>
            <Skeleton v-if="addonsLoading" class="h-10 w-full" />
            <div v-for="addon in addons" :key="addon.id" class="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <span :class="addon.is_active ? '' : 'text-muted-foreground line-through'">{{ addon.name }}</span>
              <span class="tabular-nums">+ {{ formatMoney(addon.price) }}</span>
            </div>
          </div>
        </template>

        <Separator />
        <p class="text-xs text-muted-foreground">
          {{ t('products.details.timestamps', { created: formatDateTime(product.created_at), updated: formatDateTime(product.updated_at) }) }}
        </p>
      </div>
    </DialogContent>
  </Dialog>
</template>
