<script setup lang="ts">
import { CircleCheck, ImageOff, Printer, ScanBarcode, ShoppingCart } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { useDebounceFn } from '@vueuse/core'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import AddonPicker from '@/components/pos/AddonPicker.vue'
import CartPanel from '@/components/pos/CartPanel.vue'
import PaymentDialog from '@/components/pos/PaymentDialog.vue'
import VariantPicker from '@/components/pos/VariantPicker.vue'
import type { ProductAddon } from '@/composables/useAddons'
import type { CartAddon } from '@/composables/useCart'
import type { Product } from '@/composables/useProducts'
import type { PaymentInput, Sale, SaleQuote } from '@/composables/useSales'
import { assetUrl } from '~/composables/useSettings'
import { formatMoney } from '~/utils/money'

const allCategories = ''

const { $apiFetch } = useNuxtApp()
const apiFetch = $apiFetch as typeof $fetch
const { products, categories, loading, fetchProducts, fetchCategories } = useProducts()
const { activeSlot, unitCount, loadCarts, addLine, clearActive, checkoutReference } = useCart()
const { quoteSale, createSale, saving } = useSales()

const searchText = ref('')
const categoryFilter = ref(allCategories)
const quote = ref<SaleQuote | null>(null)
const quoteError = ref('')
const quoting = ref(false)
const showPayment = ref(false)
const showCartSheet = ref(false)
const completedSale = ref<Sale | null>(null)
const variantParent = ref<Product | null>(null)
const showVariants = ref(false)
const addonProduct = ref<Product | null>(null)
const addonChoices = ref<ProductAddon[]>([])
const showAddons = ref(false)
const addonCache = new Map<string, ProductAddon[]>()
const searchInput = ref<InstanceType<typeof Input> | null>(null)

const cartItems = computed(() => activeSlot.value.lines.map(cartLine => ({
  product_id: cartLine.productId,
  quantity: cartLine.quantity,
  addon_ids: cartLine.addons.map(addon => addon.id),
})))

const loadProducts = () => fetchProducts({ searchText: searchText.value.trim(), category: categoryFilter.value })

watch(searchText, useDebounceFn(loadProducts, 250))
watch(categoryFilter, loadProducts)

const refreshQuote = useDebounceFn(async () => {
  if (!cartItems.value.length) {
    quote.value = null
    quoteError.value = ''
    return
  }
  quoting.value = true
  try {
    quote.value = await quoteSale(cartItems.value)
    quoteError.value = ''
  } catch (error: any) {
    quote.value = null
    quoteError.value = error?.data?.message || 'Could not price the cart; check the connection'
  } finally {
    quoting.value = false
  }
}, 200)

watch(cartItems, () => {
  quoting.value = true
  refreshQuote()
}, { deep: true })

const focusSearch = () => {
  const searchElement = searchInput.value?.$el as HTMLInputElement | undefined
  searchElement?.focus()
}

const putInCart = (product: Product, addons: CartAddon[], quantity: number) => {
  addLine({
    productId: product.id,
    name: product.name,
    variantLabel: product.variant_label,
    sku: product.sku,
    unit: product.unit,
    price: product.price,
    addons,
  }, quantity)
}

const chooseProduct = async (product: Product, quantity = 1, offerVariants = true) => {
  if (offerVariants && product.variant_count > 0) {
    variantParent.value = product
    showVariants.value = true
    return
  }
  let productAddons = addonCache.get(product.id)
  if (!productAddons) {
    try {
      const addonResponse = await apiFetch<{ data: ProductAddon[] }>(`/api/products/${product.id}/addons`)
      productAddons = addonResponse.data.filter(addon => addon.is_active)
    } catch {
      productAddons = []
    }
    addonCache.set(product.id, productAddons)
  }
  if (productAddons.length) {
    addonProduct.value = product
    addonChoices.value = productAddons
    showAddons.value = true
    return
  }
  putInCart(product, [], quantity)
}

const scanCode = async () => {
  const scannedCode = searchText.value.trim()
  if (!scannedCode) return
  try {
    const lookupResponse = await apiFetch<{ data: { product: Product; pack_size: number } }>('/api/products/lookup', { query: { code: scannedCode } })
    searchText.value = ''
    await chooseProduct(lookupResponse.data.product, lookupResponse.data.pack_size)
  } catch {
    if (products.value.length === 1) {
      searchText.value = ''
      await chooseProduct(products.value[0]!)
      return
    }
    toast.error(`Nothing matches “${scannedCode}”`)
  }
}

const startPayment = () => {
  showCartSheet.value = false
  showPayment.value = true
}

const completeSale = async (payments: PaymentInput[]) => {
  const clientRef = checkoutReference()
  try {
    const sale = await createSale(clientRef, cartItems.value, payments, activeSlot.value.note.trim() || null)
    showPayment.value = false
    clearActive()
    completedSale.value = sale
  } catch (error: any) {
    const isOffline = !error?.status && !error?.statusCode
    toast.error(isOffline ? 'The sale did not reach the server. Try again; it will not be charged twice.' : error?.data?.message || 'The sale failed')
    if (!isOffline) refreshQuote()
  }
}

const printReceipt = (saleId: string) => {
  window.open(`/receipts/${saleId}?print=1`, '_blank', 'width=420,height=720')
}

const startNextSale = () => {
  completedSale.value = null
  nextTick(focusSearch)
}

onMounted(() => {
  loadCarts()
  loadProducts()
  fetchCategories()
  if (cartItems.value.length) refreshQuote()
  focusSearch()
})
</script>

<template>
  <div class="-m-4 flex h-[calc(100dvh-4rem)] min-h-0 md:-m-6">
    <section class="flex min-w-0 flex-1 flex-col gap-3 p-3 md:p-4">
      <form class="relative" @submit.prevent="scanCode">
        <ScanBarcode class="pointer-events-none absolute left-3 top-3 size-5 text-muted-foreground" />
        <Input ref="searchInput" v-model="searchText" placeholder="Scan a barcode or search" class="h-11 pl-10 text-base" aria-label="Scan or search products" autocomplete="off" />
      </form>

      <div v-if="categories.length" class="flex gap-2 overflow-x-auto pb-1">
        <Button size="sm" :variant="categoryFilter === allCategories ? 'default' : 'outline'" class="shrink-0" @click="categoryFilter = allCategories">All</Button>
        <Button
          v-for="category in categories"
          :key="category"
          size="sm"
          :variant="categoryFilter === category ? 'default' : 'outline'"
          class="shrink-0"
          @click="categoryFilter = category"
        >
          {{ category }}
        </Button>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto">
        <div v-if="loading && !products.length" class="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
          <Skeleton v-for="skeletonTile in 8" :key="skeletonTile" class="h-36" />
        </div>
        <p v-else-if="!products.length" class="py-16 text-center text-sm text-muted-foreground">No products match.</p>
        <div v-else class="grid grid-cols-2 gap-2 pb-20 sm:grid-cols-3 lg:pb-0 xl:grid-cols-4">
          <button
            v-for="product in products"
            :key="product.id"
            type="button"
            class="flex flex-col overflow-hidden rounded-lg border text-left transition-colors hover:border-primary disabled:opacity-50"
            :disabled="product.variant_count === 0 && (product.quantity ?? 0) <= 0"
            @click="chooseProduct(product)"
          >
            <div class="flex aspect-[4/3] items-center justify-center bg-muted">
              <img v-if="product.image_url" :src="assetUrl(product.image_url)!" :alt="product.name" class="size-full object-cover" loading="lazy">
              <ImageOff v-else class="size-6 text-muted-foreground/40" />
            </div>
            <div class="flex flex-1 flex-col gap-1 p-2">
              <span class="line-clamp-2 text-sm font-medium leading-tight">{{ product.name }}</span>
              <span class="mt-auto flex items-center justify-between gap-1">
                <span class="text-sm font-semibold tabular-nums">{{ formatMoney(product.price) }}</span>
                <Badge v-if="product.variant_count" variant="outline" class="px-1.5 font-normal">{{ product.variant_count + 1 }} options</Badge>
                <span v-else class="text-xs tabular-nums" :class="(product.quantity ?? 0) <= (product.min_stock ?? 0) ? 'text-amber-600' : 'text-muted-foreground'">{{ product.quantity ?? 0 }}</span>
              </span>
            </div>
          </button>
        </div>
      </div>
    </section>

    <aside class="hidden w-[380px] shrink-0 border-l lg:flex lg:flex-col">
      <CartPanel :quote="quote" :quote-error="quoteError" :quoting="quoting" @pay="startPayment" />
    </aside>

    <div class="fixed inset-x-0 bottom-0 z-40 border-t bg-background p-3 lg:hidden">
      <Button class="h-12 w-full justify-between text-base" @click="showCartSheet = true">
        <span class="flex items-center gap-2"><ShoppingCart /> {{ unitCount }} {{ unitCount === 1 ? 'item' : 'items' }}</span>
        <span class="tabular-nums">{{ quote ? formatMoney(quote.total) : '' }}</span>
      </Button>
    </div>

    <Sheet v-model:open="showCartSheet">
      <SheetContent side="bottom" class="h-[85dvh] p-0">
        <SheetHeader class="sr-only"><SheetTitle>Cart</SheetTitle></SheetHeader>
        <CartPanel :quote="quote" :quote-error="quoteError" :quoting="quoting" @pay="startPayment" />
      </SheetContent>
    </Sheet>

    <PaymentDialog v-model:open="showPayment" :total="quote?.total ?? 0" :saving="saving" @pay="completeSale" />
    <VariantPicker v-model:open="showVariants" :parent="variantParent" @pick="variant => chooseProduct(variant, 1, false)" />
    <AddonPicker v-model:open="showAddons" :product-name="addonProduct?.name ?? ''" :addons="addonChoices" @confirm="addons => addonProduct && putInCart(addonProduct, addons, 1)" />

    <Dialog :open="completedSale !== null" @update:open="isOpen => { if (!isOpen) startNextSale() }">
      <DialogContent class="sm:max-w-sm">
        <DialogHeader class="items-center text-center">
          <CircleCheck class="size-12 text-emerald-500" />
          <DialogTitle>Sale complete</DialogTitle>
          <DialogDescription>Receipt {{ completedSale?.receipt_number }}</DialogDescription>
        </DialogHeader>
        <div v-if="completedSale" class="flex flex-col items-center gap-1 py-2">
          <span class="text-sm text-muted-foreground">Change</span>
          <span class="text-4xl font-bold tabular-nums">{{ formatMoney(completedSale.change_given) }}</span>
        </div>
        <DialogFooter class="gap-2 sm:justify-center">
          <Button variant="outline" @click="completedSale && printReceipt(completedSale.id)"><Printer /> Print receipt</Button>
          <Button @click="startNextSale">Next sale</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
