<script setup lang="ts">
import { ClipboardList } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import OrderDetailsDialog from '@/components/suppliers/OrderDetailsDialog.vue'
import type { PurchaseOrder } from '@/composables/useSuppliers'
import { calendarDay, supplierPageSize } from '@/composables/useSuppliers'
import { formatMoney } from '~/utils/money'

const props = defineProps<{ supplierId?: string }>()
const emit = defineEmits<{ changed: [] }>()

const { t, formatDate } = useI18n()
const { listOrders, loading } = useSuppliers()

const orders = ref<PurchaseOrder[]>([])
const totalOrders = ref(0)
const pageOffset = ref(0)
const openOrderId = ref<string | null>(null)
const showDetails = ref(false)

const reload = async () => {
  const orderPage = await listOrders({ supplierId: props.supplierId, offset: pageOffset.value })
  orders.value = orderPage.items
  totalOrders.value = orderPage.total
}
onMounted(reload)

const goToPage = (nextOffset: number) => {
  pageOffset.value = Math.max(nextOffset, 0)
  reload()
}

const openOrder = (orderId: string) => {
  openOrderId.value = orderId
  showDetails.value = true
}

const onChanged = () => {
  reload()
  emit('changed')
}

defineExpose({ reload, openOrder })
</script>

<template>
  <div class="flex flex-col gap-2">
    <div v-if="loading && !orders.length" class="flex flex-col gap-2">
      <Skeleton v-for="skeletonRow in 3" :key="skeletonRow" class="h-16 w-full" />
    </div>
    <div v-else-if="!orders.length" class="flex flex-col items-center gap-2 py-10 text-center">
      <ClipboardList class="size-10 text-muted-foreground/50" />
      <p class="text-sm text-muted-foreground">{{ t('suppliers.orders.empty') }}</p>
    </div>
    <button
      v-for="order in orders"
      :key="order.id"
      type="button"
      class="flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors hover:bg-accent"
      :class="order.status === 'cancelled' ? 'opacity-60' : ''"
      @click="openOrder(order.id)"
    >
      <span class="min-w-0 flex-1">
        <span class="block truncate text-sm font-medium">{{ order.supplier_name }}</span>
        <span class="block text-xs text-muted-foreground">
          {{ order.order_number }}<template v-if="order.expected_date"> · {{ t('suppliers.orders.expectedOn', { date: formatDate(calendarDay(order.expected_date)) }) }}</template>
        </span>
      </span>
      <span class="flex shrink-0 flex-col items-end gap-1">
        <span class="text-sm font-medium tabular-nums">{{ formatMoney(order.expected_total) }}</span>
        <Badge variant="outline">{{ t(`suppliers.orders.status.${order.status}`) }}</Badge>
      </span>
    </button>

    <div v-if="totalOrders > supplierPageSize" class="flex justify-end gap-2">
      <Button variant="outline" size="sm" :disabled="pageOffset === 0 || loading" @click="goToPage(pageOffset - supplierPageSize)">{{ t('common.pagination.previous') }}</Button>
      <Button variant="outline" size="sm" :disabled="pageOffset + supplierPageSize >= totalOrders || loading" @click="goToPage(pageOffset + supplierPageSize)">{{ t('common.pagination.next') }}</Button>
    </div>

    <OrderDetailsDialog v-model:open="showDetails" :order-id="openOrderId" @changed="onChanged" />
  </div>
</template>
