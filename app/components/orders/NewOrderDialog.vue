<script setup lang="ts">
import { FilePen, Handshake, Trash2, UserPlus, UserRound } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { useDebounceFn } from '@vueuse/core'
import HelpTip from '@/components/HelpTip.vue'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import MoneyInput from '@/components/MoneyInput.vue'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import CustomerPicker from '@/components/customers/CustomerPicker.vue'
import PaymentMethodChoice from '@/components/customers/PaymentMethodChoice.vue'
import LineDiscountPopover from '@/components/pos/LineDiscountPopover.vue'
import LineExtraPopover from '@/components/pos/LineExtraPopover.vue'
import WingaLineDialog from '@/components/pos/WingaLineDialog.vue'
import StockProductSearch from '@/components/stock/StockProductSearch.vue'
import type { CartCustomer } from '@/composables/useCart'
import type { CustomerPaymentMethod } from '@/composables/useCustomers'
import type { Order, OrderLine } from '@/composables/useOrders'
import type { ManualDiscount, SaleQuote, WingaLineInput } from '@/composables/useSales'
import type { StockLevel } from '@/composables/useStock'
import { productLabel } from '@/composables/useStock'
import { currencyCode, formatMoney, inputTextToMinor } from '~/utils/money'

interface OrderRow {
  level: StockLevel
  quantityText: string
  manualDiscount: ManualDiscount | null
  extra: ManualDiscount | null
}

const props = defineProps<{ draftOrder?: Order | null }>()
const emit = defineEmits<{ created: [order: Order] }>()

const open = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
const { saveOrder, saving } = useOrders()
const { findLevel } = useStock()
const { quoteSale } = useSales()
const { wingaOn } = useFeatures()
const { hasPermission } = usePermissions()
const canDiscount = computed(() => hasPermission('till_discounts', 'create'))

const customer = ref<CartCustomer | null>(null)
const rows = ref<OrderRow[]>([])
const wingaRows = ref<WingaLineInput[]>([])
const showWingaDialog = ref(false)
const quote = ref<SaleQuote | null>(null)
const dueDate = ref('')
const note = ref('')
const depositText = ref('')
const depositMethod = ref<CustomerPaymentMethod | null>('cash')
const showCustomerPicker = ref(false)
const quotedTotal = ref<number | null>(null)
const loadingDraft = ref(false)

const chosenProductIds = computed(() => rows.value.map(row => row.level.product_id))

const rowQuantity = (row: OrderRow): number | null => {
  const parsedQuantity = Number(row.quantityText.trim())
  return Number.isInteger(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : null
}

const orderItems = computed(() => rows.value
  .filter(row => rowQuantity(row) != null)
  .map(row => ({
    product_id: row.level.product_id,
    quantity: rowQuantity(row)!,
    ...(row.manualDiscount ? { manual_discount: row.manualDiscount } : {}),
    ...(row.extra ? { extra: row.extra } : {}),
  })))

const wingaTotal = computed(() => wingaRows.value.reduce((sum, wingaRow) => sum + wingaRow.quantity * wingaRow.unit_price, 0))
const estimatedTotal = computed(() => rows.value.reduce((sum, row) => sum + row.level.price * (rowQuantity(row) ?? 0), 0) + wingaTotal.value)
const quotedLine = (rowIndex: number) => {
  const row = rows.value[rowIndex]!
  const quotedRowIndex = rows.value.filter(candidate => rowQuantity(candidate) != null).indexOf(row)
  return quotedRowIndex >= 0 ? quote.value?.lines[quotedRowIndex] ?? null : null
}
const quotedLineTotal = (rowIndex: number): number | null => quotedLine(rowIndex)?.line_total ?? null
const orderTotal = computed(() => quotedTotal.value ?? estimatedTotal.value)

let quoteGeneration = 0
const refreshQuote = useDebounceFn(async () => {
  const generation = quoteGeneration
  if (!orderItems.value.length && !wingaRows.value.length) {
    quotedTotal.value = null
    quote.value = null
    return
  }
  try {
    const freshQuote = await quoteSale(orderItems.value.map(item => ({ ...item, addon_ids: [] })), wingaRows.value)
    if (generation !== quoteGeneration) return
    quote.value = freshQuote
    quotedTotal.value = freshQuote.total
  } catch {
    if (generation !== quoteGeneration) return
    quote.value = null
    quotedTotal.value = null
  }
}, 250)

watch([orderItems, wingaRows], () => {
  quoteGeneration++
  quotedTotal.value = null
  refreshQuote()
}, { deep: true })

const amountEach = (amount: number, quantity: number): ManualDiscount | null => (amount > 0 ? { kind: 'amount', value: Math.max(Math.round(amount / quantity), 1) } : null)

const levelForLine = async (orderLine: OrderLine): Promise<StockLevel> => {
  const currentLevel = await findLevel(orderLine.product_id)
  return currentLevel ?? {
    product_id: orderLine.product_id,
    parent_id: null,
    name: orderLine.product_name,
    variant_label: orderLine.variant_label,
    sku: orderLine.sku,
    unit: orderLine.unit,
    category: null,
    price: orderLine.unit_price - orderLine.extra_unit_amount,
    cost_price: 0,
    quantity: 0,
    min_stock: 0,
    status: 'out',
  }
}

const fillFromDraft = async (draftOrder: Order) => {
  loadingDraft.value = true
  customer.value = { id: draftOrder.customer_id, name: draftOrder.customer_name, phone: draftOrder.customer_phone }
  dueDate.value = draftOrder.due_date ?? ''
  note.value = draftOrder.note ?? ''
  const levels = await Promise.all(draftOrder.lines.map(levelForLine))
  rows.value = draftOrder.lines.map((orderLine, lineIndex) => ({
    level: levels[lineIndex]!,
    quantityText: String(orderLine.quantity),
    manualDiscount: amountEach(orderLine.manual_discount_amount, orderLine.quantity),
    extra: amountEach(orderLine.extra_unit_amount, 1),
  }))
  wingaRows.value = (draftOrder.winga_lines ?? []).map(wingaLine => ({ name: wingaLine.name, quantity: wingaLine.quantity, unit_price: wingaLine.unit_price, winga_share: wingaLine.winga_share }))
  loadingDraft.value = false
}

watch(open, isOpen => {
  if (!isOpen) return
  customer.value = null
  rows.value = []
  wingaRows.value = []
  quote.value = null
  dueDate.value = ''
  note.value = ''
  depositText.value = ''
  depositMethod.value = 'cash'
  quotedTotal.value = null
  if (props.draftOrder) fillFromDraft(props.draftOrder)
})

const addRow = (level: StockLevel) => {
  rows.value.push({ level, quantityText: '1', manualDiscount: null, extra: null })
}

const submit = async (asDraft: boolean) => {
  if (!customer.value) {
    toast.error(t('orders.new.errors.chooseCustomer'))
    return
  }
  if (!rows.value.length && !wingaRows.value.length) {
    toast.error(t('orders.new.errors.noProducts'))
    return
  }
  const badRow = rows.value.find(row => rowQuantity(row) == null)
  if (badRow) {
    toast.error(t('orders.new.errors.badQuantity', { product: productLabel(badRow.level) }))
    return
  }
  const shortRow = asDraft ? undefined : rows.value.find(row => (rowQuantity(row) ?? 0) > row.level.quantity)
  if (shortRow) {
    toast.error(t('orders.new.errors.notEnough', { quantity: shortRow.level.quantity, unit: shortRow.level.unit, product: productLabel(shortRow.level) }))
    return
  }
  const depositAmount = asDraft ? null : inputTextToMinor(depositText.value)
  if (Number.isNaN(depositAmount)) {
    toast.error(t('orders.deposit.errors.badAmount'))
    return
  }
  if (quotedTotal.value != null && (depositAmount ?? 0) > quotedTotal.value) {
    toast.error(t('orders.deposit.errors.tooMuch', { amount: formatMoney(quotedTotal.value) }))
    return
  }
  try {
    const savedOrder = await saveOrder({
      customer_id: customer.value.id,
      items: orderItems.value,
      winga_lines: wingaRows.value,
      due_date: dueDate.value || null,
      note: note.value.trim() || null,
      deposit: depositAmount ? { method: depositMethod.value ?? 'cash', amount: depositAmount } : null,
      draft: asDraft,
    }, props.draftOrder?.id ?? null)
    emit('created', savedOrder)
    open.value = false
  } catch {
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{{ draftOrder ? t('orders.draft.editTitle', { number: draftOrder.number }) : t('orders.page.newOrder') }}</DialogTitle>
        <DialogDescription>{{ draftOrder ? t('orders.draft.description') : t('orders.new.description') }}</DialogDescription>
      </DialogHeader>

      <div v-if="loadingDraft" class="flex flex-col gap-2"><Skeleton v-for="skeletonRow in 3" :key="skeletonRow" class="h-12 w-full" /></div>
      <form v-else class="flex flex-col gap-4" @submit.prevent="submit(false)">
        <div class="flex flex-col gap-1.5">
          <Label>{{ t('orders.fields.customer') }}</Label>
          <button
            type="button"
            class="flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm hover:bg-accent"
            :class="customer ? '' : 'border-dashed text-muted-foreground'"
            @click="showCustomerPicker = true"
          >
            <UserRound v-if="customer" class="size-4 shrink-0" />
            <UserPlus v-else class="size-4 shrink-0" />
            <span class="min-w-0 flex-1 truncate">{{ customer ? customer.name : t('orders.new.chooseCustomer') }}</span>
            <span v-if="customer?.phone" class="text-xs text-muted-foreground tabular-nums">{{ customer.phone }}</span>
          </button>
        </div>

        <div class="flex flex-col gap-1.5">
          <Label>{{ t('orders.fields.products') }}</Label>
          <StockProductSearch :exclude-ids="chosenProductIds" :placeholder="t('orders.new.searchPlaceholder')" @pick="addRow" />
        </div>

        <div v-for="(row, rowIndex) in rows" :key="row.level.product_id" class="flex flex-col gap-2 rounded-lg border px-3 py-2">
          <div class="flex items-center gap-2">
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium">{{ productLabel(row.level) }}</p>
              <p class="text-xs text-muted-foreground tabular-nums">{{ formatMoney(row.level.price) }} · {{ t('orders.new.inShop', { quantity: row.level.quantity, unit: row.level.unit }) }}</p>
            </div>
            <Input v-model="row.quantityText" inputmode="numeric" class="w-20" :aria-label="t('orders.new.quantityOf', { product: productLabel(row.level) })" />
            <Button type="button" variant="ghost" size="icon" :aria-label="t('orders.new.remove', { product: productLabel(row.level) })" @click="rows.splice(rowIndex, 1)">
              <Trash2 class="text-destructive" />
            </Button>
          </div>
          <div class="flex items-center gap-1">
            <LineDiscountPopover
              v-if="canDiscount"
              :product-name="productLabel(row.level)"
              :manual-discount="row.manualDiscount"
              :item-price="quotedLine(rowIndex)?.unit_price ?? row.level.price"
              :quantity="rowQuantity(row) ?? 0"
              @apply="manualDiscount => row.manualDiscount = manualDiscount"
            />
            <LineExtraPopover
              :product-name="productLabel(row.level)"
              :extra="row.extra"
              :list-unit-price="row.level.price"
              :quantity="rowQuantity(row) ?? 0"
              @apply="extra => row.extra = extra"
            />
            <span v-if="quotedLineTotal(rowIndex) != null" class="ml-auto text-sm font-medium tabular-nums">{{ formatMoney(quotedLineTotal(rowIndex)!) }}</span>
          </div>
        </div>

        <div v-for="(wingaRow, wingaIndex) in wingaRows" :key="wingaIndex" class="flex items-center gap-2 rounded-lg border border-amber-500/30 px-3 py-2">
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium">{{ t('pos.winga.badge') }} · {{ wingaRow.name }}</p>
            <p class="text-xs text-muted-foreground tabular-nums">
              {{ wingaRow.quantity }} × {{ formatMoney(wingaRow.unit_price) }}<template v-if="wingaRow.winga_share"> · {{ t('pos.winga.shareShort', { amount: formatMoney(wingaRow.winga_share) }) }}</template>
            </p>
          </div>
          <span class="text-sm font-medium tabular-nums">{{ formatMoney(wingaRow.quantity * wingaRow.unit_price) }}</span>
          <Button type="button" variant="ghost" size="icon" :aria-label="t('pos.winga.remove', { name: wingaRow.name })" @click="wingaRows.splice(wingaIndex, 1)">
            <Trash2 class="text-destructive" />
          </Button>
        </div>
        <div v-if="wingaOn" class="flex items-center gap-1 self-start">
          <Button type="button" variant="outline" size="sm" @click="showWingaDialog = true">
            <Handshake />
            {{ t('pos.winga.addLine') }}
          </Button>
          <HelpTip :title="t('common.help.brkTitle')" :text="t('common.help.brkText')" />
        </div>
        <WingaLineDialog v-if="wingaOn" v-model:open="showWingaDialog" @add="wingaLine => wingaRows.push(wingaLine)" />

        <div v-if="rows.length || wingaRows.length" class="flex items-baseline justify-between rounded-lg bg-muted/60 px-3 py-2">
          <span class="text-sm text-muted-foreground">{{ quotedTotal == null ? t('orders.new.aboutTotal') : t('common.fields.total') }}</span>
          <span class="text-xl font-bold tabular-nums">{{ formatMoney(orderTotal) }}</span>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="flex flex-col gap-1.5">
            <Label for="order-due">{{ t('orders.fields.dueDate') }}</Label>
            <Input id="order-due" v-model="dueDate" type="date" />
          </div>
          <div class="flex flex-col gap-1.5">
            <Label for="order-note">{{ t('orders.fields.note') }}</Label>
            <Input id="order-note" v-model="note" maxlength="200" :placeholder="t('orders.new.notePlaceholder')" />
          </div>
        </div>

        <div class="flex flex-col gap-2 rounded-lg border p-3">
          <Label for="order-deposit">{{ t('orders.fields.deposit', { currency: currencyCode() }) }}</Label>
          <MoneyInput id="order-deposit" v-model="depositText" placeholder="0" />
          <PaymentMethodChoice v-if="inputTextToMinor(depositText)" v-model="depositMethod" />
          <p class="text-xs text-muted-foreground">{{ t('orders.new.depositDraftHint') }}</p>
        </div>

        <DialogFooter class="gap-2">
          <Button type="button" variant="ghost" @click="open = false">{{ t('common.actions.cancel') }}</Button>
          <Button type="button" variant="outline" :disabled="saving" @click="submit(true)">
            <FilePen />
            {{ t('orders.new.saveDraft') }}
          </Button>
          <Button type="submit" :disabled="saving">{{ saving ? t('common.actions.saving') : t('orders.new.create') }}</Button>
        </DialogFooter>
      </form>

      <CustomerPicker v-model:open="showCustomerPicker" @pick="picked => customer = { id: picked.id, name: picked.name, phone: picked.phone }" />
    </DialogContent>
  </Dialog>
</template>
