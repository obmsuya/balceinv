<script setup lang="ts">
import { Trash2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import MoneyInput from '@/components/MoneyInput.vue'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import StockProductSearch from '@/components/stock/StockProductSearch.vue'
import type { StockLevel } from '@/composables/useStock'
import { productLabel } from '@/composables/useStock'
import type { PurchaseOrder, Supplier } from '@/composables/useSuppliers'
import { localDateText } from '@/composables/useSuppliers'
import { currencyCode, formatMoney, inputTextToMinor, minorToInputText } from '~/utils/money'

interface OrderRow {
  productId: string
  label: string
  unit: string
  stockHere: number | null
  quantityText: string
  costText: string
}

const props = defineProps<{ supplier?: Supplier | null; draftOrder?: PurchaseOrder | null }>()
const emit = defineEmits<{ saved: [order: PurchaseOrder] }>()

const open = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
const { activeSupplierOptions, createOrder, updateOrder, saving } = useSuppliers()

const suppliers = ref<Supplier[]>([])
const supplierId = ref('')
const expectedDate = ref('')
const note = ref('')
const rows = ref<OrderRow[]>([])

const chosenProductIds = computed(() => rows.value.map(row => row.productId))
const showsSupplierChoice = computed(() => !props.supplier && !props.draftOrder)

watch(open, async isOpen => {
  if (!isOpen) return
  const draftOrder = props.draftOrder
  supplierId.value = draftOrder?.supplier_id ?? props.supplier?.id ?? ''
  expectedDate.value = draftOrder?.expected_date ?? ''
  note.value = draftOrder?.note ?? ''
  rows.value = (draftOrder?.lines ?? []).map(orderLine => ({
    productId: orderLine.product_id,
    label: productLabel(orderLine),
    unit: orderLine.unit,
    stockHere: null,
    quantityText: String(orderLine.quantity_ordered),
    costText: orderLine.expected_unit_cost ? minorToInputText(orderLine.expected_unit_cost) : '',
  }))
  if (showsSupplierChoice.value) suppliers.value = await activeSupplierOptions()
})

const addRow = (level: StockLevel) => {
  rows.value.push({
    productId: level.product_id,
    label: productLabel(level),
    unit: level.unit,
    stockHere: level.quantity,
    quantityText: '1',
    costText: level.cost_price ? minorToInputText(level.cost_price) : '',
  })
}

const rowQuantity = (row: OrderRow): number | null => {
  const parsedQuantity = Number(row.quantityText.trim())
  return Number.isInteger(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : null
}

const rowCost = (row: OrderRow): number | null => {
  const unitCost = inputTextToMinor(row.costText) ?? 0
  return Number.isNaN(unitCost) ? null : unitCost
}

const expectedTotal = computed(() => rows.value.reduce((running, row) => running + (rowQuantity(row) ?? 0) * (rowCost(row) ?? 0), 0))

const submit = async (markAsSent: boolean) => {
  if (!supplierId.value) {
    toast.error(t('suppliers.payments.errors.chooseSupplier'))
    return
  }
  if (!rows.value.length) {
    toast.error(t('suppliers.arrived.errors.noProducts'))
    return
  }
  const badRow = rows.value.find(row => rowQuantity(row) == null || rowCost(row) == null)
  if (badRow) {
    toast.error(t('suppliers.arrived.errors.badLine', { product: badRow.label }))
    return
  }
  const orderFields = {
    supplier_id: supplierId.value,
    expected_date: expectedDate.value || null,
    note: note.value.trim() || null,
    send: markAsSent,
    lines: rows.value.map(row => ({ product_id: row.productId, quantity: rowQuantity(row)!, expected_unit_cost: rowCost(row)! })),
  }
  try {
    const savedOrder = props.draftOrder ? await updateOrder(props.draftOrder.id, orderFields) : await createOrder(orderFields)
    emit('saved', savedOrder)
    open.value = false
  } catch {
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{{ draftOrder ? t('suppliers.orders.editTitle', { number: draftOrder.order_number }) : t('suppliers.orders.newTitle') }}</DialogTitle>
        <DialogDescription>{{ t('suppliers.orders.description') }}</DialogDescription>
      </DialogHeader>

      <div class="flex flex-col gap-4">
        <div v-if="showsSupplierChoice" class="flex flex-col gap-1.5">
          <Label>{{ t('suppliers.arrived.supplier') }}</Label>
          <Select v-model="supplierId">
            <SelectTrigger class="w-full" :aria-label="t('suppliers.arrived.supplier')">
              <SelectValue :placeholder="t('suppliers.payments.chooseSupplier')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="option in suppliers" :key="option.id" :value="option.id">{{ option.name }}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p v-else class="text-sm font-medium">{{ draftOrder?.supplier_name ?? supplier?.name }}</p>

        <StockProductSearch :exclude-ids="chosenProductIds" :placeholder="t('suppliers.arrived.searchPlaceholder')" @pick="addRow" />

        <div v-for="(row, rowIndex) in rows" :key="row.productId" class="flex flex-col gap-2 rounded-lg border px-3 py-2">
          <div class="flex items-start gap-2">
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium">{{ row.label }}</p>
              <p v-if="row.stockHere != null" class="text-xs text-muted-foreground tabular-nums">{{ t('stock.send.here', { quantity: row.stockHere, unit: row.unit }) }}</p>
            </div>
            <Button variant="ghost" size="icon" :aria-label="t('suppliers.arrived.remove', { product: row.label })" @click="rows.splice(rowIndex, 1)">
              <Trash2 class="text-destructive" />
            </Button>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div class="flex flex-col gap-1">
              <Label :for="`order-quantity-${rowIndex}`" class="text-xs text-muted-foreground">{{ t('suppliers.arrived.quantity', { unit: row.unit }) }}</Label>
              <Input :id="`order-quantity-${rowIndex}`" v-model="row.quantityText" inputmode="numeric" />
            </div>
            <div class="flex flex-col gap-1">
              <Label :for="`order-cost-${rowIndex}`" class="text-xs text-muted-foreground">{{ t('suppliers.orders.expectedCost', { currency: currencyCode() }) }}</Label>
              <MoneyInput :id="`order-cost-${rowIndex}`" v-model="row.costText" />
            </div>
          </div>
        </div>

        <p class="flex justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm font-semibold">
          <span>{{ t('suppliers.orders.expectedTotal') }}</span>
          <span class="tabular-nums">{{ formatMoney(expectedTotal) }}</span>
        </p>

        <div class="flex flex-col gap-1.5">
          <Label for="order-expected">{{ t('suppliers.orders.expectedDate') }}</Label>
          <Input id="order-expected" v-model="expectedDate" type="date" :min="localDateText()" />
        </div>
        <div class="flex flex-col gap-1.5">
          <Label for="order-note">{{ t('common.fields.notes') }}</Label>
          <Input id="order-note" v-model="note" maxlength="500" />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="open = false">{{ t('common.actions.cancel') }}</Button>
        <Button variant="outline" :disabled="saving" @click="submit(false)">{{ t('suppliers.orders.saveDraft') }}</Button>
        <Button :disabled="saving" @click="submit(true)">{{ t('suppliers.orders.saveSent') }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
