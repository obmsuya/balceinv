<script setup lang="ts">
import { Trash2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import MoneyInput from '@/components/MoneyInput.vue'
import { Label } from '@/components/ui/label'
import StockProductSearch from '@/components/stock/StockProductSearch.vue'
import type { StockLevel } from '@/composables/useStock'
import { productLabel } from '@/composables/useStock'
import type { Supplier } from '@/composables/useSuppliers'
import { currencyCode, formatMoney, inputTextToMinor, minorToInputText } from '~/utils/money'

interface ReturnRow {
  level: StockLevel
  quantityText: string
  costText: string
}

const props = defineProps<{ supplier: Supplier }>()
const emit = defineEmits<{ returned: [] }>()

const open = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
const { returnStock, saving } = useSuppliers()

const rows = ref<ReturnRow[]>([])
const note = ref('')

const chosenProductIds = computed(() => rows.value.map(row => row.level.product_id))

watch(open, isOpen => {
  if (!isOpen) return
  rows.value = []
  note.value = ''
})

const addRow = (level: StockLevel) => {
  rows.value.push({ level, quantityText: '1', costText: minorToInputText(level.cost_price) })
}

const rowQuantity = (row: ReturnRow): number | null => {
  const parsedQuantity = Number(row.quantityText.trim())
  return Number.isInteger(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : null
}

const rowCost = (row: ReturnRow): number | null => {
  const unitCost = inputTextToMinor(row.costText) ?? 0
  return Number.isNaN(unitCost) ? null : unitCost
}

const total = computed(() => rows.value.reduce((running, row) => running + (rowQuantity(row) ?? 0) * (rowCost(row) ?? 0), 0))

const submit = async () => {
  if (!rows.value.length) {
    toast.error(t('suppliers.arrived.errors.noProducts'))
    return
  }
  const badRow = rows.value.find(row => rowQuantity(row) == null || rowCost(row) == null)
  if (badRow) {
    toast.error(t('suppliers.arrived.errors.badLine', { product: productLabel(badRow.level) }))
    return
  }
  const shortRow = rows.value.find(row => (rowQuantity(row) ?? 0) > row.level.quantity)
  if (shortRow) {
    toast.error(t('stock.send.errors.notEnough', { quantity: shortRow.level.quantity, unit: shortRow.level.unit, product: productLabel(shortRow.level) }))
    return
  }
  try {
    await returnStock({
      supplier_id: props.supplier.id,
      note: note.value.trim() || null,
      lines: rows.value.map(row => ({ product_id: row.level.product_id, quantity: rowQuantity(row)!, unit_cost: rowCost(row)! })),
    })
    emit('returned')
    open.value = false
  } catch {
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{{ t('suppliers.returns.title', { supplier: supplier.name }) }}</DialogTitle>
        <DialogDescription>{{ t('suppliers.returns.description') }}</DialogDescription>
      </DialogHeader>

      <div class="flex flex-col gap-4">
        <StockProductSearch :exclude-ids="chosenProductIds" :placeholder="t('suppliers.arrived.searchPlaceholder')" @pick="addRow" />

        <div v-for="(row, rowIndex) in rows" :key="row.level.product_id" class="flex flex-col gap-2 rounded-lg border px-3 py-2">
          <div class="flex items-start gap-2">
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium">{{ productLabel(row.level) }}</p>
              <p class="text-xs text-muted-foreground tabular-nums">{{ t('stock.send.here', { quantity: row.level.quantity, unit: row.level.unit }) }}</p>
            </div>
            <Button variant="ghost" size="icon" :aria-label="t('suppliers.arrived.remove', { product: productLabel(row.level) })" @click="rows.splice(rowIndex, 1)">
              <Trash2 class="text-destructive" />
            </Button>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div class="flex flex-col gap-1">
              <Label :for="`return-quantity-${rowIndex}`" class="text-xs text-muted-foreground">{{ t('suppliers.arrived.quantity', { unit: row.level.unit }) }}</Label>
              <Input :id="`return-quantity-${rowIndex}`" v-model="row.quantityText" inputmode="numeric" />
            </div>
            <div class="flex flex-col gap-1">
              <Label :for="`return-cost-${rowIndex}`" class="text-xs text-muted-foreground">{{ t('suppliers.returns.creditPerUnit', { currency: currencyCode() }) }}</Label>
              <MoneyInput :id="`return-cost-${rowIndex}`" v-model="row.costText" />
            </div>
          </div>
        </div>

        <p class="flex justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm font-semibold">
          <span>{{ t('suppliers.returns.lowersDebt') }}</span>
          <span class="tabular-nums">{{ formatMoney(total) }}</span>
        </p>

        <div class="flex flex-col gap-1.5">
          <Label for="return-note">{{ t('suppliers.returns.why') }}</Label>
          <Input id="return-note" v-model="note" :placeholder="t('suppliers.returns.whyPlaceholder')" maxlength="500" />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="open = false">{{ t('common.actions.cancel') }}</Button>
        <Button :disabled="saving" @click="submit">{{ t('suppliers.returns.save') }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
