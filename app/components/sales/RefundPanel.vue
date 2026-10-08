<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { RefundMethod, Sale } from '@/composables/useSales'
import { paymentMethodLabel } from '@/composables/useSales'
import { formatMoney } from '~/utils/money'

const props = defineProps<{ sale: Sale }>()
const emit = defineEmits<{ refunded: [sale: Sale]; cancel: [] }>()

const { t } = useI18n()
const { refundingSale, refundSale } = useSales()

const refundableLines = computed(() => props.sale.items
  .map(saleLine => ({ saleLine, quantityLeft: saleLine.quantity - (saleLine.refunded_quantity ?? 0) }))
  .filter(refundable => refundable.saleLine.item_id && refundable.quantityLeft > 0))

const quantities = ref<Record<string, number>>({})
const method = ref<RefundMethod>(props.sale.credit_amount > 0 ? 'credit' : 'cash')
const restock = ref(true)
const reason = ref('')

const methods = computed<RefundMethod[]>(() => (props.sale.credit_amount > 0 ? ['credit', 'cash', 'mobile', 'card'] : ['cash', 'mobile', 'card']))

const setQuantity = (itemId: string, rawQuantity: string, quantityLeft: number) => {
  const typedQuantity = Math.floor(Number(rawQuantity))
  quantities.value[itemId] = Number.isFinite(typedQuantity) ? Math.min(Math.max(typedQuantity, 0), quantityLeft) : 0
}

const estimatedTotal = computed(() => refundableLines.value.reduce((sum, { saleLine }) => {
  const quantity = quantities.value[saleLine.item_id!] ?? 0
  return sum + Math.round((saleLine.line_total * quantity) / saleLine.quantity)
}, 0))

const chosenLines = computed(() => refundableLines.value
  .map(({ saleLine }) => ({ item_id: saleLine.item_id!, quantity: quantities.value[saleLine.item_id!] ?? 0 }))
  .filter(chosenLine => chosenLine.quantity > 0))

const canRefund = computed(() => chosenLines.value.length > 0 && reason.value.trim().length >= 3 && !refundingSale.value)

const submit = async () => {
  if (!canRefund.value) return
  const refundedSale = await refundSale(props.sale.id, { method: method.value, restock: restock.value, reason: reason.value.trim(), lines: chosenLines.value })
  if (refundedSale) emit('refunded', refundedSale)
}
</script>

<template>
  <div class="flex flex-col gap-3 rounded-md border p-3">
    <p class="text-sm font-medium">{{ t('sales.refund.title', { number: sale.receipt_number }) }}</p>
    <p v-if="!refundableLines.length" class="text-sm text-muted-foreground">{{ t('sales.refund.nothingLeft') }}</p>
    <div v-for="{ saleLine, quantityLeft } in refundableLines" :key="saleLine.item_id" class="flex items-center justify-between gap-3 text-sm">
      <div class="min-w-0">
        <p class="truncate font-medium">{{ saleLine.product_name }}<template v-if="saleLine.variant_label"> · {{ saleLine.variant_label }}</template></p>
        <p class="text-xs text-muted-foreground">{{ t('sales.refund.canReturn', { count: quantityLeft }) }}</p>
      </div>
      <input
        :value="quantities[saleLine.item_id!] ?? 0"
        inputmode="numeric"
        class="h-8 w-16 rounded-md border bg-transparent text-center tabular-nums"
        :aria-label="t('sales.refund.quantityOf', { name: saleLine.product_name })"
        @focus="($event.target as HTMLInputElement).select()"
        @input="setQuantity(saleLine.item_id!, ($event.target as HTMLInputElement).value, quantityLeft)"
      >
    </div>

    <div class="grid gap-3 sm:grid-cols-2">
      <div class="flex flex-col gap-1.5">
        <Label for="refund-method">{{ t('sales.refund.method') }}</Label>
        <Select v-model="method">
          <SelectTrigger id="refund-method" class="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem v-for="choice in methods" :key="choice" :value="choice">{{ choice === 'credit' ? t('sales.refund.toAccount') : paymentMethodLabel(choice) }}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <label class="flex items-center gap-2 self-end pb-2 text-sm">
        <Checkbox v-model="restock" />
        {{ t('sales.refund.restock') }}
      </label>
    </div>
    <Textarea v-model="reason" :placeholder="t('sales.refund.reasonPlaceholder')" maxlength="200" rows="2" />
    <div class="flex items-center justify-between gap-2">
      <span class="text-sm font-semibold tabular-nums">{{ t('sales.refund.total', { amount: formatMoney(estimatedTotal) }) }}</span>
      <div class="flex gap-2">
        <Button variant="ghost" size="sm" @click="emit('cancel')">{{ t('common.actions.cancel') }}</Button>
        <Button size="sm" :disabled="!canRefund" @click="submit">{{ t('sales.refund.confirm') }}</Button>
      </div>
    </div>
  </div>
</template>
