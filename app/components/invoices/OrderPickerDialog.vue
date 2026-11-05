<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import { ClipboardList, Loader2, Search } from 'lucide-vue-next'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { Order, OrderStatus } from '@/composables/useOrders'
import { orderStatusLabel } from '@/composables/useOrders'
import { formatMoney } from '~/utils/money'

const emit = defineEmits<{ pick: [order: Order] }>()
const open = defineModel<boolean>('open', { default: false })

const { t, formatDate } = useI18n()
const { orders, loading, fetchOrders, fetchOrder } = useOrders()

const pickableStatuses: OrderStatus[] = ['open', 'ready', 'collected']
const status = ref<OrderStatus>('open')
const searchText = ref('')
const pickingId = ref<string | null>(null)

const load = () => fetchOrders({ status: status.value, searchText: searchText.value.trim(), offset: 0 })
const searchLater = useDebounceFn(load, 300)

watch(open, isOpen => {
  if (!isOpen) return
  searchText.value = ''
  load()
})
watch(status, load)
watch(searchText, searchLater)

const pick = async (order: Order) => {
  pickingId.value = order.id
  const fullOrder = await fetchOrder(order.id)
  pickingId.value = null
  if (!fullOrder) return
  emit('pick', fullOrder)
  open.value = false
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{{ t('invoices.fromOrder.title') }}</DialogTitle>
        <DialogDescription>{{ t('invoices.fromOrder.description') }}</DialogDescription>
      </DialogHeader>

      <div class="grid grid-cols-3 gap-1 rounded-md bg-muted p-1" role="tablist">
        <button
          v-for="choice in pickableStatuses"
          :key="choice"
          type="button"
          role="tab"
          :aria-selected="status === choice"
          class="rounded px-2 py-1.5 text-sm transition-colors"
          :class="status === choice ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground'"
          @click="status = choice"
        >
          {{ orderStatusLabel(choice) }}
        </button>
      </div>
      <div class="relative">
        <Search class="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input v-model="searchText" class="pl-8" :placeholder="t('invoices.fromOrder.search')" />
      </div>

      <div class="flex min-h-40 flex-col gap-2">
        <div v-if="loading" class="flex flex-1 items-center justify-center py-8 text-muted-foreground">
          <Loader2 class="size-5 animate-spin" />
        </div>
        <p v-else-if="!orders.length" class="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center text-sm text-muted-foreground">
          <ClipboardList class="size-6" />
          {{ t('invoices.fromOrder.none') }}
        </p>
        <button
          v-for="order in loading ? [] : orders"
          :key="order.id"
          type="button"
          class="group flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 disabled:opacity-60"
          :disabled="pickingId != null"
          @click="pick(order)"
        >
          <div class="min-w-0 flex-1">
            <p class="flex items-center gap-2 text-sm font-medium">
              <span class="tabular-nums">{{ order.number }}</span>
              <span class="truncate text-muted-foreground">· {{ order.customer_name }}</span>
            </p>
            <p class="text-xs text-muted-foreground">
              {{ formatDate(order.created_at) }} · {{ t('invoices.fromOrder.lines', { count: order.line_count }) }}
            </p>
          </div>
          <Loader2 v-if="pickingId === order.id" class="size-4 animate-spin text-muted-foreground" />
          <span v-else class="shrink-0 text-sm font-semibold tabular-nums">{{ formatMoney(order.total) }}</span>
        </button>
      </div>
    </DialogContent>
  </Dialog>
</template>
