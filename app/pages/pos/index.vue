<script setup lang="ts">
import { ChevronUp, CircleCheck, FileDown, Monitor, Printer, ReceiptText, ScanBarcode, Share2, X } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { useDebounceFn, useEventListener } from '@vueuse/core'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import AddonPicker from '@/components/pos/AddonPicker.vue'
import CartPanel from '@/components/pos/CartPanel.vue'
import PaymentDialog from '@/components/pos/PaymentDialog.vue'
import ProductGrid from '@/components/pos/ProductGrid.vue'
import VariantPicker from '@/components/pos/VariantPicker.vue'
import type { ProductAddon } from '@/composables/useAddons'
import type { CartAddon } from '@/composables/useCart'
import type { Product } from '@/composables/useProducts'
import type { PaymentInput, Sale, SaleFiscal, TillOptions } from '@/composables/useSales'
import { fiscalStatusLabel } from '@/composables/useSales'
import { formatMoney } from '~/utils/money'
import { apiErrorMessage } from '~/utils/i18n'

const allCategories = ''
const efdRetryMilliseconds = 5 * 60 * 1000

const { products, totalProducts, categories, loading, fetchProducts, fetchCategories, lookupProduct } = useProducts()
const { fetchActiveAddons } = useAddons()
const { activeSlot, activeSlotIndex, unitCount, loadCarts, addLine, clearActive, restoreSlot, takeMultiplier, checkoutReference } = useCart()
const { createSale, saving, fetchTillOptions, sendToEfd, sendWaitingToEfd, downloadingDocument, downloadSaleDocument, shareSaleReceipt } = useSales()
const { publish: publishToDisplay, openDisplay } = useCustomerDisplay()
const { user } = useAuth()
const { t } = useI18n()
const { customersOn } = useFeatures()
const { quote, quoteError, quoting, cartItems, linePrices, total, isExact, shortLineCount, requestQuote, settleQuote } = useTillQuote()

const searchText = ref('')
const categoryFilter = ref(allCategories)
const showPayment = ref(false)
const preparingPayment = ref(false)
const showCartSheet = ref(false)
const completedSale = ref<Sale | null>(null)
const variantParent = ref<Product | null>(null)
const pendingQuantity = ref(1)
const showVariants = ref(false)
const addonProduct = ref<Product | null>(null)
const addonChoices = ref<ProductAddon[]>([])
const showAddons = ref(false)
const addonCache = new Map<string, ProductAddon[]>()
const searchInput = ref<InstanceType<typeof Input> | null>(null)
const nextSaleButton = ref<InstanceType<typeof Button> | null>(null)
const tillOptions = ref<TillOptions | null>(null)
const saleFiscal = ref<SaleFiscal | null>(null)
const sendingFiscal = ref(false)
let efdRetryTimer: ReturnType<typeof setInterval> | null = null

const numpadEnabled = computed(() => tillOptions.value?.numpad_enabled ?? false)
const saleCustomer = computed(() => (customersOn.value ? activeSlot.value.customer ?? null : null))
const customerDisplayEnabled = computed(() => tillOptions.value?.customer_display_enabled ?? false)

const productFilter = () => ({ searchText: searchText.value.trim(), category: categoryFilter.value })
const loadProducts = () => fetchProducts(productFilter())
const loadMoreProducts = () => fetchProducts({ ...productFilter(), offset: products.value.length }, true)

watch(searchText, useDebounceFn(loadProducts, 250))
watch(categoryFilter, loadProducts)

const hasPreciseMouse = () => window.matchMedia('(pointer: fine)').matches

const focusSearch = () => {
  const searchElement = searchInput.value?.$el as HTMLInputElement | undefined
  searchElement?.focus()
  searchElement?.select()
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
  if (hasPreciseMouse()) nextTick(focusSearch)
}

const chooseProduct = async (product: Product, quantity = 1, offerVariants = true) => {
  pendingQuantity.value = quantity * takeMultiplier()
  if (offerVariants && product.variant_count > 0) {
    variantParent.value = product
    showVariants.value = true
    return
  }
  let productAddons = addonCache.get(product.id)
  if (!productAddons) {
    productAddons = await fetchActiveAddons(product.id)
    addonCache.set(product.id, productAddons)
  }
  if (productAddons.length) {
    addonProduct.value = product
    addonChoices.value = productAddons
    showAddons.value = true
    return
  }
  putInCart(product, [], pendingQuantity.value)
}

const scanCode = async () => {
  const scannedCode = searchText.value.trim()
  if (!scannedCode) return
  try {
    const foundLookup = await lookupProduct(scannedCode)
    if (foundLookup) {
      searchText.value = ''
      await chooseProduct(foundLookup.product, foundLookup.pack_size)
      return
    }
    if (products.value.length === 1) {
      searchText.value = ''
      await chooseProduct(products.value[0]!)
      return
    }
    toast.error(t('pos.search.noMatch', { text: scannedCode }))
    focusSearch()
  } catch {
    toast.error(t('pos.search.lookupOffline'))
  }
}

const clearCart = () => {
  const clearedSlotIndex = activeSlotIndex.value
  const clearedSlot = clearActive()
  toast(t('pos.toasts.cartCleared'), {
    action: { label: t('pos.toasts.undo'), onClick: () => restoreSlot(clearedSlotIndex, clearedSlot) },
  })
}

const startPayment = async () => {
  if (!activeSlot.value.lines.length || preparingPayment.value || showPayment.value) return
  preparingPayment.value = true
  try {
    if (!isExact.value || quoting.value) await settleQuote()
  } finally {
    preparingPayment.value = false
  }
  if (quoteError.value || shortLineCount.value > 0 || !isExact.value) {
    const isCartOnScreen = window.matchMedia('(min-width: 768px)').matches
    if (!isCartOnScreen) showCartSheet.value = true
    return
  }
  showCartSheet.value = false
  showPayment.value = true
}

const completeSale = async (payments: PaymentInput[]) => {
  const clientRef = checkoutReference()
  try {
    const sale = await createSale(clientRef, cartItems.value, payments, activeSlot.value.note.trim() || null, saleCustomer.value?.id ?? null)
    showPayment.value = false
    clearActive()
    saleFiscal.value = sale.fiscal
    completedSale.value = sale
    if (tillOptions.value?.print_receipt_automatically) printReceipt(sale.id)
    if (sale.fiscal) sendSaleToEfd(sale.id)
    await nextTick()
    const nextSaleElement = nextSaleButton.value?.$el as HTMLButtonElement | undefined
    nextSaleElement?.focus()
  } catch (error: any) {
    const isOffline = !error?.status && !error?.statusCode
    toast.error(isOffline ? t('pos.toasts.saleOffline') : apiErrorMessage(error, 'pos.toasts.saleFailed'))
    if (!isOffline) {
      showPayment.value = false
      requestQuote()
    }
  }
}

const { printSaleReceipt } = usePrint()

const printReceipt = (saleId: string) => {
  const hasCashPayment = completedSale.value?.payments.some(payment => payment.method === 'cash') ?? false
  printSaleReceipt(saleId, hasCashPayment)
}

const sendSaleToEfd = async (saleId: string) => {
  sendingFiscal.value = true
  const sentFiscal = await sendToEfd(saleId)
  sendingFiscal.value = false
  if (completedSale.value?.id === saleId && sentFiscal) saleFiscal.value = sentFiscal
}

const displayState = computed(() => {
  const companyName = user.value?.company_name ?? ''
  const logoUrl = user.value?.branding?.logo_url ?? null
  if (completedSale.value) {
    const paidAmount = completedSale.value.amount_paid
    return { phase: 'paid' as const, companyName, logoUrl, lines: [], itemCount: 0, total: formatMoney(completedSale.value.total), discount: null, paid: formatMoney(paidAmount), change: formatMoney(completedSale.value.change_given) }
  }
  const displayLines = activeSlot.value.lines.map((cartLine, lineIndex) => ({
    name: cartLine.variantLabel ? `${cartLine.name} · ${cartLine.variantLabel}` : cartLine.name,
    quantity: cartLine.quantity,
    amount: formatMoney(linePrices.value[lineIndex]?.amount ?? 0),
  }))
  const discountTotal = isExact.value ? quote.value?.discount_total ?? 0 : 0
  return {
    phase: displayLines.length ? 'cart' as const : 'idle' as const,
    companyName,
    logoUrl,
    lines: displayLines,
    itemCount: unitCount.value,
    total: formatMoney(displayLines.length ? total.value : 0),
    discount: discountTotal ? formatMoney(discountTotal) : null,
    paid: null,
    change: null,
  }
})

watch([displayState, customerDisplayEnabled], ([nextDisplayState, isDisplayOn]) => {
  if (isDisplayOn) publishToDisplay(nextDisplayState)
}, { deep: true })

const startNextSale = () => {
  completedSale.value = null
  loadProducts()
  nextTick(focusSearch)
}

useEventListener(window, 'keydown', (keyEvent: KeyboardEvent) => {
  if (keyEvent.key === 'F2') {
    keyEvent.preventDefault()
    focusSearch()
  } else if (keyEvent.key === 'F9') {
    keyEvent.preventDefault()
    startPayment()
  }
})

onMounted(async () => {
  loadCarts()
  loadProducts()
  fetchCategories()
  if (cartItems.value.length) requestQuote()
  focusSearch()
  tillOptions.value = await fetchTillOptions()
  if (!tillOptions.value?.efd_enabled) return
  sendWaitingToEfd(false)
  efdRetryTimer = setInterval(() => sendWaitingToEfd(false), efdRetryMilliseconds)
})

onBeforeUnmount(() => {
  if (efdRetryTimer) clearInterval(efdRetryTimer)
  if (customerDisplayEnabled.value) publishToDisplay({ ...displayState.value, phase: 'idle', lines: [] })
})
</script>

<template>
  <div class="-m-4 flex h-[calc(100dvh-4rem)] min-h-0 md:-m-6">
    <section class="flex min-w-0 flex-1 flex-col gap-3 p-3 md:p-4">
      <div class="flex gap-2">
        <form class="relative flex-1" data-tour="pos-search" @submit.prevent="scanCode">
          <ScanBarcode class="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref="searchInput"
            v-model="searchText"
            :placeholder="t('pos.search.placeholder')"
            class="h-12 pl-10 pr-20 text-base"
            :aria-label="t('pos.search.label')"
            autocomplete="off"
            @keydown.esc="searchText = ''"
          />
          <button
            v-if="searchText"
            type="button"
            class="absolute right-12 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
            :aria-label="t('pos.search.clear')"
            @click="searchText = ''; focusSearch()"
          >
            <X class="size-4" />
          </button>
          <kbd class="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border px-1.5 text-[10px] text-muted-foreground xl:block">F2</kbd>
        </form>
        <Button
          v-if="customerDisplayEnabled"
          variant="outline"
          class="h-12 shrink-0"
          :title="t('pos.customerScreen.open')"
          @click="openDisplay"
        >
          <Monitor />
          <span class="hidden lg:inline">{{ t('pos.customerScreen.button') }}</span>
        </Button>
      </div>

      <div v-if="categories.length" class="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        <button
          v-for="category in [allCategories, ...categories]"
          :key="category || 'all'"
          type="button"
          class="shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors"
          :class="categoryFilter === category ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted'"
          @click="categoryFilter = category"
        >
          {{ category || t('common.states.all') }}
        </button>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto pb-24 md:pb-0" data-tour="pos-products">
        <ProductGrid
          :products="products"
          :total-products="totalProducts"
          :loading="loading"
          :search-text="searchText.trim()"
          @choose="product => chooseProduct(product)"
          @more="loadMoreProducts"
        />
      </div>
    </section>

    <aside class="hidden w-[340px] shrink-0 border-l md:flex md:flex-col lg:w-[400px]">
      <CartPanel
        :quote="quote"
        :line-prices="linePrices"
        :total="total"
        :is-exact="isExact"
        :quote-error="quoteError"
        :short-line-count="shortLineCount"
        :preparing-payment="preparingPayment"
        :numpad-enabled="numpadEnabled"
        @pay="startPayment"
        @clear="clearCart"
      />
    </aside>

    <div class="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 backdrop-blur md:hidden">
      <div class="flex gap-2">
        <Button variant="outline" class="h-12 flex-1 justify-between" @click="showCartSheet = true">
          <span class="flex items-center gap-2">
            <ChevronUp />
            {{ t('pos.itemCount', { count: unitCount }) }}
          </span>
          <span class="font-semibold tabular-nums">{{ formatMoney(unitCount ? total : 0) }}</span>
        </Button>
        <Button class="h-12 px-6 text-base" data-tour="pos-pay" :disabled="!unitCount || preparingPayment" @click="startPayment">{{ t('pos.pay') }}</Button>
      </div>
    </div>

    <Sheet v-model:open="showCartSheet">
      <SheetContent side="bottom" class="h-[88dvh] gap-0 rounded-t-2xl p-0">
        <SheetHeader class="sr-only"><SheetTitle>{{ t('pos.cart.title') }}</SheetTitle></SheetHeader>
        <CartPanel
          :quote="quote"
          :line-prices="linePrices"
          :total="total"
          :is-exact="isExact"
          :quote-error="quoteError"
          :short-line-count="shortLineCount"
          :preparing-payment="preparingPayment"
          :numpad-enabled="numpadEnabled"
            @pay="startPayment"
          @clear="clearCart"
        />
      </SheetContent>
    </Sheet>

    <PaymentDialog v-model:open="showPayment" :total="quote?.total ?? 0" :saving="saving" :numpad-enabled="numpadEnabled" :customer="saleCustomer" @pay="completeSale" />
    <VariantPicker v-model:open="showVariants" :parent="variantParent" @pick="variant => chooseProduct(variant, pendingQuantity, false)" />
    <AddonPicker v-model:open="showAddons" :product-name="addonProduct?.name ?? ''" :addons="addonChoices" @confirm="addons => addonProduct && putInCart(addonProduct, addons, pendingQuantity)" />

    <Dialog :open="completedSale !== null" @update:open="isOpen => { if (!isOpen) startNextSale() }">
      <DialogContent class="sm:max-w-sm">
        <DialogHeader class="items-center text-center">
          <CircleCheck class="size-12 text-emerald-500" />
          <DialogTitle>{{ t('pos.complete.title') }}</DialogTitle>
          <DialogDescription>{{ t('pos.complete.description', { number: completedSale?.receipt_number ?? '', total: formatMoney(completedSale?.total ?? 0) }) }}</DialogDescription>
        </DialogHeader>
        <div v-if="completedSale" class="flex flex-col items-center gap-1 rounded-xl bg-muted/50 py-4">
          <span class="text-sm text-muted-foreground">{{ t('pos.complete.changeToGive') }}</span>
          <span class="text-4xl font-bold tabular-nums">{{ formatMoney(completedSale.change_given) }}</span>
        </div>
        <p v-if="completedSale?.credit_amount" class="rounded-lg border px-3 py-2 text-center text-sm">
          {{ t('pos.complete.onAccount', { name: completedSale.customer_name ?? '', amount: formatMoney(completedSale.credit_amount) }) }}
        </p>
        <div v-if="saleFiscal" class="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
          <span class="flex items-center gap-2">
            <ReceiptText class="size-4 text-muted-foreground" />
            {{ sendingFiscal ? t('sales.efd.sending') : fiscalStatusLabel(saleFiscal.status) }}
          </span>
          <Button
            v-if="!sendingFiscal && saleFiscal.status !== 'sent'"
            variant="ghost"
            size="sm"
            @click="completedSale && sendSaleToEfd(completedSale.id)"
          >
            {{ t('common.actions.retry') }}
          </Button>
        </div>
        <div v-if="completedSale" class="grid grid-cols-2 gap-2">
          <Button variant="outline" :disabled="downloadingDocument" @click="shareSaleReceipt(completedSale.id, completedSale.receipt_number)"><Share2 /> {{ t('sales.details.share') }}</Button>
          <Button variant="outline" :disabled="downloadingDocument" @click="downloadSaleDocument(completedSale.id, completedSale.receipt_number, 'receipt')"><FileDown /> {{ t('sales.details.receiptPdf') }}</Button>
        </div>
        <DialogFooter class="gap-2 sm:justify-center">
          <Button variant="outline" @click="completedSale && printReceipt(completedSale.id)"><Printer /> {{ t('pos.complete.printReceipt') }}</Button>
          <Button ref="nextSaleButton" @click="startNextSale">{{ t('pos.complete.nextSale') }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
