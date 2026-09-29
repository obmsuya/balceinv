<script setup lang="ts">
import { Minus, Plus, ShoppingCart, Trash2, TriangleAlert } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import type { SaleQuote } from '@/composables/useSales'
import { cartSlotCount } from '@/composables/useCart'
import { formatMoney } from '~/utils/money'

const props = defineProps<{ quote: SaleQuote | null; quoteError: string; quoting: boolean }>()
const emit = defineEmits<{ pay: [] }>()

const { activeSlotIndex, activeSlot, unitCount, slotUnitCounts, setQuantity, clearActive, selectSlot } = useCart()

const quotedLine = (lineIndex: number) => props.quote?.lines[lineIndex]
const isShort = (lineIndex: number) => {
  const quoted = quotedLine(lineIndex)
  return quoted?.in_stock != null && quoted.quantity > quoted.in_stock
}
const hasShortLine = computed(() => activeSlot.value.lines.some((_, lineIndex) => isShort(lineIndex)))
const canPay = computed(() => activeSlot.value.lines.length > 0 && props.quote !== null && !props.quoting && !props.quoteError && !hasShortLine.value)

const typeQuantity = (lineKey: string, rawQuantity: string | number) => {
  const parsedQuantity = Number(rawQuantity)
  if (Number.isInteger(parsedQuantity) && parsedQuantity >= 0) setQuantity(lineKey, parsedQuantity)
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div class="flex items-center gap-1 border-b p-2">
      <button
        v-for="slotIndex in cartSlotCount"
        :key="slotIndex"
        type="button"
        class="flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors"
        :class="activeSlotIndex === slotIndex - 1 ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'"
        :aria-pressed="activeSlotIndex === slotIndex - 1"
        @click="selectSlot(slotIndex - 1)"
      >
        Cart {{ slotIndex }}
        <span v-if="slotUnitCounts[slotIndex - 1]" class="rounded-full bg-background/20 px-1.5 text-xs tabular-nums">{{ slotUnitCounts[slotIndex - 1] }}</span>
      </button>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto">
      <div v-if="!activeSlot.lines.length" class="flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
        <ShoppingCart class="size-10 opacity-40" />
        <p class="text-sm">Tap a product or scan a barcode</p>
      </div>
      <div v-else class="divide-y">
        <div v-for="(cartLine, lineIndex) in activeSlot.lines" :key="cartLine.key" class="flex flex-col gap-2 p-3">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="font-medium leading-tight">{{ cartLine.name }}<template v-if="cartLine.variantLabel"> · {{ cartLine.variantLabel }}</template></p>
              <p v-if="cartLine.addons.length" class="text-xs text-muted-foreground">+ {{ cartLine.addons.map(addon => addon.name).join(', ') }}</p>
              <div class="mt-1 flex flex-wrap gap-1">
                <Badge v-if="quotedLine(lineIndex)?.is_wholesale" variant="secondary" class="font-normal">Wholesale</Badge>
                <Badge v-if="quotedLine(lineIndex)?.discount_name" variant="outline" class="font-normal">{{ quotedLine(lineIndex)?.discount_name }} −{{ formatMoney(quotedLine(lineIndex)!.discount_amount) }}</Badge>
                <Badge v-if="isShort(lineIndex)" variant="destructive" class="gap-1 font-normal">
                  <TriangleAlert class="size-3" />
                  Only {{ quotedLine(lineIndex)?.in_stock }} left
                </Badge>
              </div>
            </div>
            <span class="shrink-0 font-semibold tabular-nums">{{ quotedLine(lineIndex) ? formatMoney(quotedLine(lineIndex)!.line_total) : '…' }}</span>
          </div>
          <div class="flex items-center gap-1">
            <Button variant="outline" size="icon" class="size-8" :aria-label="`One less ${cartLine.name}`" @click="setQuantity(cartLine.key, cartLine.quantity - 1)"><Minus /></Button>
            <Input
              :model-value="cartLine.quantity"
              inputmode="numeric"
              class="h-8 w-16 text-center tabular-nums"
              :aria-label="`Quantity of ${cartLine.name}`"
              @change="typeQuantity(cartLine.key, ($event.target as HTMLInputElement).value)"
            />
            <Button variant="outline" size="icon" class="size-8" :aria-label="`One more ${cartLine.name}`" @click="setQuantity(cartLine.key, cartLine.quantity + 1)"><Plus /></Button>
            <span class="ml-2 text-xs text-muted-foreground tabular-nums">× {{ formatMoney(quotedLine(lineIndex)?.unit_price ?? cartLine.price) }}</span>
            <Button variant="ghost" size="icon" class="ml-auto size-8 text-muted-foreground" :aria-label="`Remove ${cartLine.name}`" @click="setQuantity(cartLine.key, 0)"><Trash2 /></Button>
          </div>
        </div>
      </div>
    </div>

    <div class="flex flex-col gap-2 border-t p-3">
      <template v-if="activeSlot.lines.length">
        <div class="flex justify-between text-sm text-muted-foreground">
          <span>{{ unitCount }} {{ unitCount === 1 ? 'item' : 'items' }}</span>
          <span class="tabular-nums">{{ quote ? formatMoney(quote.subtotal) : '…' }}</span>
        </div>
        <div v-if="quote?.discount_total" class="flex justify-between text-sm text-emerald-600 dark:text-emerald-400">
          <span>Discounts</span>
          <span class="tabular-nums">−{{ formatMoney(quote.discount_total) }}</span>
        </div>
        <div v-if="quote?.tax_total" class="flex justify-between text-xs text-muted-foreground">
          <span>Includes tax ({{ (quote.tax_rate_basis_points / 100).toLocaleString() }}%)</span>
          <span class="tabular-nums">{{ formatMoney(quote.tax_total) }}</span>
        </div>
        <Separator />
        <div class="flex items-baseline justify-between">
          <span class="font-semibold">Total</span>
          <span class="text-2xl font-bold tabular-nums">{{ quote ? formatMoney(quote.total) : '…' }}</span>
        </div>
        <p v-if="quoteError" class="text-sm text-destructive">{{ quoteError }}</p>
      </template>
      <div class="flex gap-2">
        <Button variant="outline" :disabled="!activeSlot.lines.length" @click="clearActive">Clear</Button>
        <Button class="h-11 flex-1 text-base" :disabled="!canPay" @click="emit('pay')">Pay</Button>
      </div>
    </div>
  </div>
</template>
