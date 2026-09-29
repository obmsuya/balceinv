<script setup lang="ts">
import { Printer } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import type { Sale } from '@/composables/useSales'
import { paymentMethodLabels } from '@/composables/useSales'
import { formatMoney } from '~/utils/money'

const props = defineProps<{ saleId: string | null }>()

const open = defineModel<boolean>('open', { default: false })

const { fetchSale } = useSales()
const sale = ref<Sale | null>(null)

watch([open, () => props.saleId], async ([isOpen]) => {
  if (!isOpen || !props.saleId) return
  sale.value = null
  sale.value = (await fetchSale(props.saleId)) ?? null
})

const printReceipt = () => {
  if (sale.value) window.open(`/receipts/${sale.value.id}?print=1`, '_blank', 'width=420,height=720')
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{{ sale?.receipt_number ?? 'Sale' }}</DialogTitle>
        <DialogDescription v-if="sale">
          {{ new Date(sale.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) }} · {{ sale.cashier_name }} · {{ sale.shop_name }}
        </DialogDescription>
      </DialogHeader>

      <Skeleton v-if="!sale" class="h-40 w-full" />
      <div v-else class="flex flex-col gap-3">
        <div v-for="(saleLine, lineIndex) in sale.items" :key="lineIndex" class="flex items-start justify-between gap-3 text-sm">
          <div class="min-w-0">
            <p class="font-medium">{{ saleLine.product_name }}<template v-if="saleLine.variant_label"> · {{ saleLine.variant_label }}</template></p>
            <p class="text-xs text-muted-foreground tabular-nums">
              {{ saleLine.quantity }} × {{ formatMoney(saleLine.unit_price) }}
              <template v-if="saleLine.addons.length"> + {{ saleLine.addons.map(addon => addon.name).join(', ') }}</template>
            </p>
            <div class="mt-1 flex flex-wrap gap-1">
              <Badge v-if="saleLine.is_wholesale" variant="secondary" class="font-normal">Wholesale</Badge>
              <Badge v-if="saleLine.discount_name" variant="outline" class="font-normal">{{ saleLine.discount_name }} −{{ formatMoney(saleLine.discount_amount) }}</Badge>
            </div>
          </div>
          <span class="shrink-0 font-medium tabular-nums">{{ formatMoney(saleLine.line_total) }}</span>
        </div>

        <Separator />
        <dl class="flex flex-col gap-1 text-sm">
          <div v-if="sale.discount_total" class="flex justify-between text-muted-foreground"><dt>Before discounts</dt><dd class="tabular-nums">{{ formatMoney(sale.subtotal) }}</dd></div>
          <div v-if="sale.discount_total" class="flex justify-between text-muted-foreground"><dt>Discounts</dt><dd class="tabular-nums">−{{ formatMoney(sale.discount_total) }}</dd></div>
          <div class="flex justify-between text-base font-semibold"><dt>Total</dt><dd class="tabular-nums">{{ formatMoney(sale.total) }}</dd></div>
          <div class="flex justify-between text-xs text-muted-foreground"><dt>Includes tax ({{ (sale.tax_rate_basis_points / 100).toLocaleString() }}%)</dt><dd class="tabular-nums">{{ formatMoney(sale.tax_total) }}</dd></div>
          <div v-for="payment in sale.payments" :key="payment.method" class="flex justify-between"><dt>{{ paymentMethodLabels[payment.method] }}</dt><dd class="tabular-nums">{{ formatMoney(payment.amount) }}</dd></div>
          <div v-if="sale.change_given" class="flex justify-between"><dt>Change</dt><dd class="tabular-nums">{{ formatMoney(sale.change_given) }}</dd></div>
        </dl>
        <p v-if="sale.note" class="rounded-md bg-muted/40 px-3 py-2 text-sm">{{ sale.note }}</p>
      </div>

      <DialogFooter>
        <Button variant="outline" :disabled="!sale" @click="printReceipt"><Printer /> Print receipt</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
