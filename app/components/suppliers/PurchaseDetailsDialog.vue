<script setup lang="ts">
import { Ban } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import ReasonDialog from '@/components/suppliers/ReasonDialog.vue'
import type { Purchase } from '@/composables/useSuppliers'
import { calendarDay } from '@/composables/useSuppliers'
import { productLabel } from '@/composables/useStock'
import { assetUrl } from '~/composables/useSettings'
import { formatMoney } from '~/utils/money'

const props = defineProps<{ purchaseId: string | null }>()
const emit = defineEmits<{ changed: [] }>()

const open = defineModel<boolean>('open', { default: false })

const { t, formatDate, formatDateTime } = useI18n()
const { canDelete } = usePermissions()
const { fetchPurchase, cancelPurchase, saving } = useSuppliers()

const purchase = ref<Purchase | null>(null)
const showCancel = ref(false)

watch([open, () => props.purchaseId], async ([isOpen]) => {
  if (!isOpen || !props.purchaseId) return
  purchase.value = null
  purchase.value = await fetchPurchase(props.purchaseId)
})

const confirmCancel = async (reason: string) => {
  if (!purchase.value) return
  try {
    purchase.value = await cancelPurchase(purchase.value.id, reason)
    showCancel.value = false
    emit('changed')
  } catch {
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle class="flex flex-wrap items-center gap-2">
          {{ purchase?.purchase_number ?? t('suppliers.arrived.title') }}
          <Badge v-if="purchase" :variant="purchase.status === 'cancelled' ? 'destructive' : 'secondary'">{{ t(`suppliers.status.${purchase.payment_status}`) }}</Badge>
        </DialogTitle>
        <DialogDescription v-if="purchase">
          {{ purchase.supplier_name ?? t('suppliers.arrived.noSupplier') }} · {{ purchase.shop_name }} · {{ formatDateTime(purchase.received_at) }}
        </DialogDescription>
      </DialogHeader>

      <Skeleton v-if="!purchase" class="h-32 w-full" />
      <div v-else class="flex flex-col gap-3 text-sm">
        <p v-if="purchase.status === 'cancelled'" class="rounded-md bg-destructive/10 px-3 py-2 text-destructive">
          {{ t('suppliers.purchases.cancelledBy', { name: purchase.cancelled_by_name ?? '—', reason: purchase.cancel_reason ?? '' }) }}
        </p>
        <dl class="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
          <template v-if="purchase.supplier_invoice_number">
            <dt>{{ t('suppliers.arrived.invoiceNumber') }}</dt><dd class="text-foreground">{{ purchase.supplier_invoice_number }}</dd>
          </template>
          <template v-if="purchase.invoice_date">
            <dt>{{ t('suppliers.arrived.invoiceDate') }}</dt><dd class="text-foreground">{{ formatDate(calendarDay(purchase.invoice_date)) }}</dd>
          </template>
          <template v-if="purchase.purchase_order_number">
            <dt>{{ t('suppliers.orders.order') }}</dt><dd class="text-foreground">{{ purchase.purchase_order_number }}</dd>
          </template>
          <dt>{{ t('suppliers.purchases.recordedBy') }}</dt><dd class="text-foreground">{{ purchase.created_by_name ?? '—' }}</dd>
        </dl>
        <p v-if="purchase.note" class="rounded-md bg-muted/40 px-3 py-2">{{ purchase.note }}</p>

        <div v-for="purchaseLine in purchase.lines" :key="purchaseLine.product_id" class="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
          <span class="min-w-0">
            <span class="block truncate font-medium">{{ productLabel(purchaseLine) }}</span>
            <span class="block text-xs text-muted-foreground tabular-nums">{{ purchaseLine.quantity }} {{ purchaseLine.unit }} × {{ formatMoney(purchaseLine.unit_cost) }}</span>
          </span>
          <span class="shrink-0 tabular-nums">{{ formatMoney(purchaseLine.line_total) }}</span>
        </div>

        <dl class="flex flex-col gap-1 rounded-lg bg-muted/40 px-3 py-2">
          <div v-if="purchase.vat_total" class="flex justify-between text-muted-foreground"><dt>{{ t('suppliers.arrived.subtotal') }}</dt><dd class="tabular-nums">{{ formatMoney(purchase.subtotal) }}</dd></div>
          <div v-if="purchase.vat_total" class="flex justify-between text-muted-foreground"><dt>{{ t('suppliers.arrived.vat') }}</dt><dd class="tabular-nums">{{ formatMoney(purchase.vat_total) }}</dd></div>
          <div class="flex justify-between font-semibold"><dt>{{ t('common.fields.total') }}</dt><dd class="tabular-nums">{{ formatMoney(purchase.total) }}</dd></div>
          <div v-if="purchase.status === 'received'" class="flex justify-between text-muted-foreground"><dt>{{ t('suppliers.purchases.paid') }}</dt><dd class="tabular-nums">{{ formatMoney(purchase.amount_paid) }}</dd></div>
          <div v-if="purchase.amount_due" class="flex justify-between font-medium text-amber-600"><dt>{{ t('suppliers.purchases.stillToPay') }}</dt><dd class="tabular-nums">{{ formatMoney(purchase.amount_due) }}</dd></div>
        </dl>

        <div v-if="purchase.payments?.length" class="flex flex-col gap-1">
          <p class="font-medium">{{ t('suppliers.page.paymentsTab') }}</p>
          <p v-for="payment in purchase.payments" :key="payment.id" class="flex justify-between gap-2 text-muted-foreground" :class="payment.is_voided ? 'line-through' : ''">
            <span>{{ payment.payment_number }} · {{ t(`suppliers.methods.${payment.method}`) }} · {{ formatDate(payment.paid_at) }}</span>
            <span class="tabular-nums">{{ formatMoney(payment.amount) }}</span>
          </p>
        </div>

        <a v-if="purchase.attachment_url" :href="assetUrl(purchase.attachment_url) ?? undefined" target="_blank" rel="noopener noreferrer">
          <img :src="assetUrl(purchase.attachment_url) ?? undefined" :alt="t('suppliers.arrived.photo')" class="max-h-64 w-full rounded-md border object-contain">
        </a>

        <Button
          v-if="purchase.status === 'received' && canDelete('purchases')"
          variant="outline"
          class="self-start text-destructive hover:text-destructive"
          @click="showCancel = true"
        >
          <Ban />
          {{ t('suppliers.purchases.cancel') }}
        </Button>
      </div>
    </DialogContent>
    <ReasonDialog
      v-model:open="showCancel"
      :title="t('suppliers.purchases.cancelTitle', { number: purchase?.purchase_number ?? '' })"
      :description="t('suppliers.purchases.cancelDescription')"
      :confirm-label="t('suppliers.purchases.cancel')"
      :busy="saving"
      @confirm="confirmCancel"
    />
  </Dialog>
</template>
