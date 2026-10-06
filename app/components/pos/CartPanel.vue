<script setup lang="ts">
import { Grid3x3, LoaderCircle, Minus, NotebookPen, Plus, ShoppingCart, Trash2, TriangleAlert, UserPlus, UserRound, X } from 'lucide-vue-next'
import CustomerPicker from '@/components/customers/CustomerPicker.vue'
import NumberPad from '@/components/pos/NumberPad.vue'
import LineDiscountPopover from '@/components/pos/LineDiscountPopover.vue'
import type { NumberPadKey } from '@/components/pos/NumberPad.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { LinePrice } from '@/composables/useTillQuote'
import type { SaleQuote } from '@/composables/useSales'
import { cartSlotCount } from '@/composables/useCart'
import { formatMoney } from '~/utils/money'

const props = defineProps<{
  quote: SaleQuote | null
  linePrices: LinePrice[]
  total: number
  isExact: boolean
  quoteError: string
  shortLineCount: number
  preparingPayment: boolean
  numpadEnabled: boolean
}>()
const emit = defineEmits<{ pay: []; clear: [] }>()

const {
  activeSlotIndex,
  activeSlot,
  lastAddedKey,
  selectedKey,
  numpadBuffer,
  unitCount,
  slotUnitCounts,
  setQuantity,
  setLineDiscount,
  setNote,
  setCustomer,
  selectSlot,
} = useCart()
const { t, formatNumber } = useI18n()
const { customersOn } = useFeatures()
const { hasPermission } = usePermissions()
const canDiscount = computed(() => hasPermission('till_discounts', 'create'))

const numpadOpenStorageKey = 'balce:till-numpad-open'

const lineList = ref<HTMLElement | null>(null)
const showNumpad = ref(true)
const flashingKey = ref<string | null>(null)
const showNote = ref(false)
const showCustomerPicker = ref(false)
let flashTimer: ReturnType<typeof setTimeout> | null = null

const hasLines = computed(() => activeSlot.value.lines.length > 0)
const canPay = computed(() => hasLines.value && !props.quoteError && props.shortLineCount === 0 && !props.preparingPayment)

const isShort = (lineIndex: number) => {
  const inStock = props.linePrices[lineIndex]?.inStock
  const cartLine = activeSlot.value.lines[lineIndex]
  return inStock != null && cartLine !== undefined && cartLine.quantity > inStock
}

const eachPrice = (lineIndex: number) => {
  const cartLine = activeSlot.value.lines[lineIndex]!
  const quotedLine = props.linePrices[lineIndex]?.quoted
  const addonsUnitTotal = quotedLine?.addons_unit_total ?? cartLine.addons.reduce((sum, addon) => sum + addon.price, 0)
  return (quotedLine?.unit_price ?? cartLine.price) + addonsUnitTotal
}

const typeQuantity = (lineKey: string, rawQuantity: string) => {
  const parsedQuantity = Number(rawQuantity)
  if (Number.isInteger(parsedQuantity) && parsedQuantity >= 0) setQuantity(lineKey, parsedQuantity)
}

const toggleSelected = (lineKey: string) => {
  if (!props.numpadEnabled) return
  selectedKey.value = selectedKey.value === lineKey ? null : lineKey
  numpadBuffer.value = ''
}

const selectedLine = computed(() => activeSlot.value.lines.find(cartLine => cartLine.key === selectedKey.value) ?? null)

const numpadPrompt = computed(() => {
  if (selectedLine.value) return t('pos.numpad.promptSelected', { name: selectedLine.value.name })
  if (numpadBuffer.value) return t('pos.numpad.promptBuffered')
  return t('pos.numpad.promptIdle')
})

const pressNumpad = (key: NumberPadKey) => {
  if (key === 'back') numpadBuffer.value = numpadBuffer.value.slice(0, -1)
  else if (key === 'clear') numpadBuffer.value = ''
  else if (key === 'enter') {
    if (selectedLine.value && numpadBuffer.value) setQuantity(selectedLine.value.key, Number(numpadBuffer.value))
    if (selectedLine.value) {
      selectedKey.value = null
      numpadBuffer.value = ''
    }
  } else if (key !== '.' && numpadBuffer.value.length < 6) {
    numpadBuffer.value = `${numpadBuffer.value}${key}`.replace(/^0+/, '')
  }
}

const toggleNumpad = () => {
  showNumpad.value = !showNumpad.value
  try {
    localStorage.setItem(numpadOpenStorageKey, String(showNumpad.value))
  } catch {
  }
}

onMounted(() => {
  try {
    showNumpad.value = localStorage.getItem(numpadOpenStorageKey) !== 'false'
  } catch {
  }
})

watch(lastAddedKey, async addedKey => {
  if (!addedKey) return
  flashingKey.value = addedKey
  if (flashTimer) clearTimeout(flashTimer)
  flashTimer = setTimeout(() => {
    flashingKey.value = null
    lastAddedKey.value = null
  }, 700)
  await nextTick()
  lineList.value?.querySelector(`[data-line-key="${CSS.escape(addedKey)}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
})

watch(activeSlotIndex, () => {
  showNote.value = Boolean(activeSlot.value.note)
}, { immediate: true })
</script>

<template>
  <div class="flex h-full min-h-0 flex-col bg-background">
    <div class="flex items-center gap-2 border-b px-3 py-2">
      <div class="flex flex-1 gap-1 rounded-lg bg-muted p-1" role="tablist" data-tour="pos-carts" :aria-label="t('pos.cart.heldCarts')">
        <button
          v-for="slotIndex in cartSlotCount"
          :key="slotIndex"
          type="button"
          role="tab"
          class="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium transition-colors"
          :class="activeSlotIndex === slotIndex - 1 ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
          :aria-selected="activeSlotIndex === slotIndex - 1"
          @click="selectSlot(slotIndex - 1)"
        >
          <span class="truncate">{{ t('pos.cart.slot', { number: slotIndex }) }}</span>
          <span
            v-if="slotUnitCounts[slotIndex - 1]"
            class="min-w-5 rounded-full bg-primary px-1.5 text-center text-xs tabular-nums text-primary-foreground"
          >{{ slotUnitCounts[slotIndex - 1] }}</span>
        </button>
      </div>
      <Button
        v-if="numpadEnabled"
        variant="ghost"
        size="icon"
        class="size-8"
        :class="showNumpad ? 'text-primary' : 'text-muted-foreground'"
        :aria-pressed="showNumpad"
        :aria-label="t('pos.cart.showNumpad')"
        @click="toggleNumpad"
      >
        <Grid3x3 />
      </Button>
      <Button variant="ghost" size="icon" class="size-8 text-muted-foreground" :disabled="!hasLines" :aria-label="t('pos.cart.clear')" @click="emit('clear')">
        <Trash2 />
      </Button>
    </div>

    <div v-if="customersOn" class="flex items-center gap-2 border-b px-3 py-1.5">
      <template v-if="activeSlot.customer">
        <button
          type="button"
          class="flex min-w-0 items-center gap-1.5 rounded-full bg-primary/10 py-1 pl-2.5 pr-3 text-sm font-medium text-primary hover:bg-primary/15"
          :title="t('pos.customer.change')"
          @click="showCustomerPicker = true"
        >
          <UserRound class="size-4 shrink-0" />
          <span class="truncate">{{ activeSlot.customer.name }}</span>
        </button>
        <Button variant="ghost" size="icon" class="size-7 text-muted-foreground" :aria-label="t('pos.customer.remove')" @click="setCustomer(null)">
          <X />
        </Button>
      </template>
      <button
        v-else
        type="button"
        class="flex items-center gap-1.5 rounded-full border border-dashed px-3 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        @click="showCustomerPicker = true"
      >
        <UserPlus class="size-4" />
        {{ t('pos.customer.add') }}
      </button>
    </div>
    <CustomerPicker
      v-if="customersOn"
      v-model:open="showCustomerPicker"
      @pick="customer => setCustomer({ id: customer.id, name: customer.name, phone: customer.phone })"
    />

    <div ref="lineList" class="min-h-0 flex-1 overflow-y-auto">
      <div v-if="!hasLines" class="flex h-full flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground">
        <span class="flex size-14 items-center justify-center rounded-full bg-muted">
          <ShoppingCart class="size-6" />
        </span>
        <div>
          <p class="font-medium text-foreground">{{ t('pos.cart.emptyTitle') }}</p>
          <p class="text-sm">{{ t('pos.cart.emptyHint') }}</p>
        </div>
      </div>

      <ul v-else class="divide-y">
        <li
          v-for="(cartLine, lineIndex) in activeSlot.lines"
          :key="cartLine.key"
          :data-line-key="cartLine.key"
          class="group relative flex flex-col gap-1.5 px-3 py-2.5 transition-colors"
          :class="[
            flashingKey === cartLine.key ? 'bg-primary/10' : '',
            selectedKey === cartLine.key ? 'bg-accent' : '',
            numpadEnabled ? 'cursor-pointer hover:bg-muted/50' : '',
          ]"
          :aria-selected="selectedKey === cartLine.key"
          @click="toggleSelected(cartLine.key)"
        >
          <span v-if="selectedKey === cartLine.key" class="absolute inset-y-0 left-0 w-1 bg-primary" />
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="truncate font-medium leading-tight">
                {{ cartLine.name }}<span v-if="cartLine.variantLabel" class="text-muted-foreground"> · {{ cartLine.variantLabel }}</span>
              </p>
              <p v-if="cartLine.addons.length" class="truncate text-xs text-muted-foreground">+ {{ cartLine.addons.map(addon => addon.name).join(', ') }}</p>
            </div>
            <span
              class="shrink-0 font-semibold tabular-nums transition-opacity"
              :class="linePrices[lineIndex]?.isExact ? '' : 'opacity-60'"
            >{{ formatMoney(linePrices[lineIndex]?.amount ?? 0) }}</span>
          </div>

          <div class="flex items-center gap-2">
            <div class="flex items-center rounded-md border" @click.stop>
              <button
                type="button"
                class="flex size-8 items-center justify-center rounded-l-md transition-colors hover:bg-muted"
                :aria-label="t('pos.cart.oneLess', { name: cartLine.name })"
                @click="setQuantity(cartLine.key, cartLine.quantity - 1)"
              >
                <Minus v-if="cartLine.quantity > 1" class="size-3.5" />
                <X v-else class="size-3.5 text-destructive" />
              </button>
              <input
                :value="cartLine.quantity"
                inputmode="numeric"
                class="h-8 w-11 border-x bg-transparent text-center text-sm tabular-nums outline-none focus:bg-muted"
                :aria-label="t('pos.cart.quantityOf', { name: cartLine.name })"
                @focus="($event.target as HTMLInputElement).select()"
                @change="typeQuantity(cartLine.key, ($event.target as HTMLInputElement).value)"
                @keydown.enter="($event.target as HTMLInputElement).blur()"
              >
              <button
                type="button"
                class="flex size-8 items-center justify-center rounded-r-md transition-colors hover:bg-muted"
                :aria-label="t('pos.cart.oneMore', { name: cartLine.name })"
                @click="setQuantity(cartLine.key, cartLine.quantity + 1)"
              >
                <Plus class="size-3.5" />
              </button>
            </div>
            <span class="text-xs text-muted-foreground tabular-nums">× {{ formatMoney(eachPrice(lineIndex)) }}</span>
            <div class="ml-auto flex flex-wrap items-center justify-end gap-1" @click.stop>
              <LineDiscountPopover
                v-if="canDiscount"
                :product-name="cartLine.name"
                :manual-discount="cartLine.manualDiscount"
                :gross-amount="eachPrice(lineIndex) * cartLine.quantity"
                @apply="manualDiscount => setLineDiscount(cartLine.key, manualDiscount)"
              />
              <Badge v-if="linePrices[lineIndex]?.quoted?.is_wholesale" variant="secondary" class="font-normal">{{ t('pos.cart.wholesale') }}</Badge>
              <Badge v-if="linePrices[lineIndex]?.quoted?.discount_name && (linePrices[lineIndex]?.quoted?.discount_amount ?? 0) > (linePrices[lineIndex]?.quoted?.manual_discount_amount ?? 0)" variant="outline" class="border-emerald-500/40 font-normal text-emerald-700 dark:text-emerald-400">
                {{ linePrices[lineIndex]?.quoted?.discount_name }}
              </Badge>
            </div>
          </div>

          <p v-if="isShort(lineIndex)" class="flex items-center gap-1 text-xs font-medium text-destructive">
            <TriangleAlert class="size-3.5" />
            {{ t('pos.cart.onlyLeft', { count: linePrices[lineIndex]?.inStock ?? 0, unit: cartLine.unit }) }}
          </p>
        </li>
      </ul>
    </div>

    <div v-if="numpadEnabled && showNumpad" class="border-t p-2">
      <div class="mb-2 flex items-center justify-between gap-3 rounded-md bg-muted px-3 py-1.5">
        <span class="truncate text-xs text-muted-foreground">{{ numpadPrompt }}</span>
        <span class="font-mono text-lg font-semibold tabular-nums">{{ numpadBuffer ? `× ${numpadBuffer}` : '' }}</span>
      </div>
      <NumberPad :enter-label="selectedLine ? t('pos.numpad.set') : t('pos.numpad.ok')" @press="pressNumpad" />
    </div>

    <div class="flex flex-col gap-2 border-t bg-muted/20 p-3">
      <template v-if="hasLines">
        <div v-if="showNote" class="relative">
          <Textarea
            :model-value="activeSlot.note"
            :placeholder="t('pos.cart.notePlaceholder')"
            maxlength="200"
            rows="2"
            class="min-h-0 resize-none pr-8 text-sm"
            @update:model-value="value => setNote(String(value))"
          />
          <button type="button" class="absolute right-2 top-2 text-muted-foreground hover:text-foreground" :aria-label="t('pos.cart.removeNote')" @click="setNote(''); showNote = false">
            <X class="size-4" />
          </button>
        </div>
        <button v-else type="button" class="flex items-center gap-1.5 self-start text-xs text-muted-foreground hover:text-foreground" @click="showNote = true">
          <NotebookPen class="size-3.5" />
          {{ t('pos.cart.addNote') }}
        </button>

        <dl class="flex flex-col gap-1 text-sm">
          <div class="flex justify-between text-muted-foreground">
            <dt>{{ t('pos.itemCount', { count: unitCount }) }}</dt>
            <dd class="tabular-nums">{{ quote && isExact ? formatMoney(quote.subtotal) : '' }}</dd>
          </div>
          <div v-if="isExact && quote?.discount_total" class="flex justify-between text-emerald-700 dark:text-emerald-400">
            <dt>{{ t('pos.cart.discounts') }}</dt>
            <dd class="tabular-nums">−{{ formatMoney(quote.discount_total) }}</dd>
          </div>
          <div v-if="isExact && quote?.tax_total" class="flex justify-between text-xs text-muted-foreground">
            <dt>{{ t('pos.cart.includesTax', { rate: formatNumber(quote.tax_rate_basis_points / 100) }) }}</dt>
            <dd class="tabular-nums">{{ formatMoney(quote.tax_total) }}</dd>
          </div>
        </dl>

        <p v-if="quoteError" class="flex items-start gap-1.5 rounded-md bg-destructive/10 px-2 py-1.5 text-sm text-destructive">
          <TriangleAlert class="mt-0.5 size-4 shrink-0" />
          {{ quoteError }}
        </p>
      </template>

      <Button class="h-14 justify-between px-4 text-base" data-tour="pos-pay" :disabled="!canPay" @click="emit('pay')">
        <span class="flex items-center gap-2">
          <LoaderCircle v-if="preparingPayment" class="animate-spin" />
          {{ t('pos.pay') }}
          <kbd class="hidden rounded border border-primary-foreground/30 px-1 text-[10px] font-normal opacity-70 xl:inline">F9</kbd>
        </span>
        <span class="text-xl font-bold tabular-nums transition-opacity" :class="isExact || !hasLines ? '' : 'opacity-70'">
          {{ formatMoney(hasLines ? total : 0) }}
        </span>
      </Button>
    </div>
  </div>
</template>
