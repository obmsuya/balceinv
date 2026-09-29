<script setup lang="ts">
import { Trash2, UserPlus, UserRound } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { useDebounceFn } from '@vueuse/core'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import CustomerPicker from '@/components/customers/CustomerPicker.vue'
import PaymentMethodChoice from '@/components/customers/PaymentMethodChoice.vue'
import StockProductSearch from '@/components/stock/StockProductSearch.vue'
import type { CartCustomer } from '@/composables/useCart'
import type { CustomerPaymentMethod } from '@/composables/useCustomers'
import type { Order } from '@/composables/useOrders'
import type { StockLevel } from '@/composables/useStock'
import { productLabel } from '@/composables/useStock'
import { currencyCode, formatMoney, inputTextToMinor } from '~/utils/money'

interface OrderRow {
  level: StockLevel
  quantityText: string
}

const emit = defineEmits<{ created: [order: Order] }>()

const open = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
const { createOrder, saving } = useOrders()
const { quoteSale } = useSales()

const customer = ref<CartCustomer | null>(null)
const rows = ref<OrderRow[]>([])
const dueDate = ref('')
const note = ref('')
const depositText = ref('')
const depositMethod = ref<CustomerPaymentMethod | null>('cash')
const showCustomerPicker = ref(false)
const quotedTotal = ref<number | null>(null)

const chosenProductIds = computed(() => rows.value.map(row => row.level.product_id))

const rowQuantity = (row: OrderRow): number | null => {
  const parsedQuantity = Number(row.quantityText.trim())
  return Number.isInteger(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : null
}

const orderItems = computed(() => rows.value
  .filter(row => rowQuantity(row) != null)
  .map(row => ({ product_id: row.level.product_id, quantity: rowQuantity(row)! })))

const estimatedTotal = computed(() => rows.value.reduce((sum, row) => sum + row.level.price * (rowQuantity(row) ?? 0), 0))
const orderTotal = computed(() => quotedTotal.value ?? estimatedTotal.value)

const refreshQuote = useDebounceFn(async () => {
  if (!orderItems.value.length) {
    quotedTotal.value = null
    return
  }
  try {
    const quote = await quoteSale(orderItems.value.map(item => ({ ...item, addon_ids: [] })))
    quotedTotal.value = quote.total
  } catch {
    quotedTotal.value = null
  }
}, 250)

watch(orderItems, () => {
  quotedTotal.value = null
  refreshQuote()
}, { deep: true })

watch(open, isOpen => {
  if (!isOpen) return
  customer.value = null
  rows.value = []
  dueDate.value = ''
  note.value = ''
  depositText.value = ''
  depositMethod.value = 'cash'
  quotedTotal.value = null
})

const addRow = (level: StockLevel) => {
  rows.value.push({ level, quantityText: '1' })
}

const submit = async () => {
  if (!customer.value) {
    toast.error(t('orders.new.errors.chooseCustomer'))
    return
  }
  if (!rows.value.length) {
    toast.error(t('orders.new.errors.noProducts'))
    return
  }
  const badRow = rows.value.find(row => rowQuantity(row) == null)
  if (badRow) {
    toast.error(t('orders.new.errors.badQuantity', { product: productLabel(badRow.level) }))
    return
  }
  const shortRow = rows.value.find(row => (rowQuantity(row) ?? 0) > row.level.quantity)
  if (shortRow) {
    toast.error(t('orders.new.errors.notEnough', { quantity: shortRow.level.quantity, unit: shortRow.level.unit, product: productLabel(shortRow.level) }))
    return
  }
  const depositAmount = inputTextToMinor(depositText.value)
  if (Number.isNaN(depositAmount)) {
    toast.error(t('orders.deposit.errors.badAmount'))
    return
  }
  if (quotedTotal.value != null && (depositAmount ?? 0) > quotedTotal.value) {
    toast.error(t('orders.deposit.errors.tooMuch', { amount: formatMoney(quotedTotal.value) }))
    return
  }
  try {
    const createdOrder = await createOrder({
      customer_id: customer.value.id,
      items: orderItems.value,
      due_date: dueDate.value || null,
      note: note.value.trim() || null,
      deposit: depositAmount ? { method: depositMethod.value ?? 'cash', amount: depositAmount } : null,
    })
    emit('created', createdOrder)
    open.value = false
  } catch {
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{{ t('orders.page.newOrder') }}</DialogTitle>
        <DialogDescription>{{ t('orders.new.description') }}</DialogDescription>
      </DialogHeader>

      <form class="flex flex-col gap-4" @submit.prevent="submit">
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

        <div v-for="(row, rowIndex) in rows" :key="row.level.product_id" class="flex items-center gap-2 rounded-lg border px-3 py-2">
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium">{{ productLabel(row.level) }}</p>
            <p class="text-xs text-muted-foreground tabular-nums">{{ formatMoney(row.level.price) }} · {{ t('orders.new.inShop', { quantity: row.level.quantity, unit: row.level.unit }) }}</p>
          </div>
          <Input v-model="row.quantityText" inputmode="numeric" class="w-20" :aria-label="t('orders.new.quantityOf', { product: productLabel(row.level) })" />
          <Button type="button" variant="ghost" size="icon" :aria-label="t('orders.new.remove', { product: productLabel(row.level) })" @click="rows.splice(rowIndex, 1)">
            <Trash2 class="text-destructive" />
          </Button>
        </div>

        <div v-if="rows.length" class="flex items-baseline justify-between rounded-lg bg-muted/60 px-3 py-2">
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
          <Input id="order-deposit" v-model="depositText" inputmode="decimal" placeholder="0" />
          <PaymentMethodChoice v-if="inputTextToMinor(depositText)" v-model="depositMethod" />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" @click="open = false">{{ t('common.actions.cancel') }}</Button>
          <Button type="submit" :disabled="saving">{{ saving ? t('common.actions.saving') : t('orders.new.create') }}</Button>
        </DialogFooter>
      </form>

      <CustomerPicker v-model:open="showCustomerPicker" @pick="picked => customer = { id: picked.id, name: picked.name, phone: picked.phone }" />
    </DialogContent>
  </Dialog>
</template>
