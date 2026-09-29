<script setup lang="ts">
import { Ban, PackageCheck, Send } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import ReasonDialog from '@/components/suppliers/ReasonDialog.vue'
import StockArrivedDialog from '@/components/suppliers/StockArrivedDialog.vue'
import type { PurchaseOrder } from '@/composables/useSuppliers'
import { calendarDay } from '@/composables/useSuppliers'
import { productLabel } from '@/composables/useStock'
import { formatMoney } from '~/utils/money'

const props = defineProps<{ orderId: string | null }>()
const emit = defineEmits<{ changed: [] }>()

const open = defineModel<boolean>('open', { default: false })

const { t, formatDate, formatDateTime } = useI18n()
const { canCreate, canEdit, canDelete } = usePermissions()
const { fetchOrder, sendOrder, cancelOrder, saving } = useSuppliers()

const order = ref<PurchaseOrder | null>(null)
const showCancel = ref(false)
const showReceive = ref(false)

const isOpenOrder = computed(() => order.value != null && !['received', 'cancelled'].includes(order.value.status))

const load = async () => {
  if (!props.orderId) return
  order.value = await fetchOrder(props.orderId)
}

watch([open, () => props.orderId], async ([isOpen]) => {
  if (!isOpen) return
  order.value = null
  await load()
})

const markSent = async () => {
  if (!order.value) return
  try {
    order.value = await sendOrder(order.value.id)
    emit('changed')
  } catch {
  }
}

const confirmCancel = async (reason: string) => {
  if (!order.value) return
  try {
    order.value = await cancelOrder(order.value.id, reason)
    showCancel.value = false
    emit('changed')
  } catch {
  }
}

const onReceived = async () => {
  await load()
  emit('changed')
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle class="flex flex-wrap items-center gap-2">
          {{ order?.order_number ?? t('suppliers.orders.order') }}
          <Badge v-if="order" variant="outline">{{ t(`suppliers.orders.status.${order.status}`) }}</Badge>
        </DialogTitle>
        <DialogDescription v-if="order">{{ order.supplier_name }} · {{ order.shop_name }} · {{ formatDateTime(order.created_at) }}</DialogDescription>
      </DialogHeader>

      <Skeleton v-if="!order" class="h-32 w-full" />
      <div v-else class="flex flex-col gap-3 text-sm">
        <p v-if="order.expected_date" class="text-muted-foreground">{{ t('suppliers.orders.expectedOn', { date: formatDate(calendarDay(order.expected_date)) }) }}</p>
        <p v-if="order.note" class="rounded-md bg-muted/40 px-3 py-2">{{ order.note }}</p>
        <p v-if="order.status === 'cancelled'" class="rounded-md bg-destructive/10 px-3 py-2 text-destructive">
          {{ t('suppliers.purchases.cancelledBy', { name: order.cancelled_by_name ?? '—', reason: order.cancel_reason ?? '' }) }}
        </p>

        <div v-for="orderLine in order.lines" :key="orderLine.product_id" class="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
          <span class="min-w-0">
            <span class="block truncate font-medium">{{ productLabel(orderLine) }}</span>
            <span class="block text-xs text-muted-foreground tabular-nums">
              {{ t('suppliers.orders.arrivedOf', { received: orderLine.quantity_received, ordered: orderLine.quantity_ordered, unit: orderLine.unit }) }}
            </span>
          </span>
          <span class="shrink-0 tabular-nums">{{ formatMoney(orderLine.quantity_ordered * orderLine.expected_unit_cost) }}</span>
        </div>
        <p class="flex justify-between rounded-lg bg-muted/40 px-3 py-2 font-semibold">
          <span>{{ t('suppliers.orders.expectedTotal') }}</span>
          <span class="tabular-nums">{{ formatMoney(order.expected_total) }}</span>
        </p>

        <div v-if="isOpenOrder" class="flex flex-wrap gap-2">
          <Button v-if="canCreate('purchases')" @click="showReceive = true"><PackageCheck /> {{ t('suppliers.orders.receive') }}</Button>
          <Button v-if="order.status === 'draft' && canEdit('purchases')" variant="outline" :disabled="saving" @click="markSent"><Send /> {{ t('suppliers.orders.markSent') }}</Button>
          <Button v-if="canDelete('purchases')" variant="outline" class="text-destructive hover:text-destructive" @click="showCancel = true"><Ban /> {{ t('suppliers.orders.cancel') }}</Button>
        </div>
      </div>
    </DialogContent>
    <ReasonDialog
      v-model:open="showCancel"
      :title="t('suppliers.orders.cancelTitle', { number: order?.order_number ?? '' })"
      :description="t('suppliers.orders.cancelDescription')"
      :confirm-label="t('suppliers.orders.cancel')"
      :busy="saving"
      @confirm="confirmCancel"
    />
    <StockArrivedDialog v-model:open="showReceive" :order="order" @saved="onReceived" />
  </Dialog>
</template>
