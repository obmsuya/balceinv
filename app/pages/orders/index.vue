<script setup lang="ts">
import { ClipboardList, Plus, Search } from 'lucide-vue-next'
import { useDebounceFn } from '@vueuse/core'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import NewOrderDialog from '@/components/orders/NewOrderDialog.vue'
import OrderDetailsSheet from '@/components/orders/OrderDetailsSheet.vue'
import type { Order, OrderStatus } from '@/composables/useOrders'
import { orderPageSize, orderStatuses } from '@/composables/useOrders'
import { formatMoney } from '~/utils/money'

const { t, formatDate } = useI18n()
const { user } = useAuth()
const { canCreate } = usePermissions()
const { orders, totalOrders, loading, fetchOrders } = useOrders()

const activeStatus = ref<OrderStatus>('open')
const searchText = ref('')
const pageOffset = ref(0)
const showNewOrder = ref(false)
const showDetails = ref(false)
const openOrderId = ref<string | null>(null)

const activeShopName = computed(() => user.value?.shops.find(shop => shop.id === user.value?.shop_id)?.name)

const reload = () => fetchOrders({ status: activeStatus.value, searchText: searchText.value.trim(), offset: pageOffset.value })

const reloadFromFirstPage = () => {
  pageOffset.value = 0
  reload()
}

watch(searchText, useDebounceFn(reloadFromFirstPage, 300))
watch(activeStatus, reloadFromFirstPage)

const goToPage = (nextOffset: number) => {
  pageOffset.value = Math.max(nextOffset, 0)
  reload()
}

const openOrder = (orderId: string) => {
  openOrderId.value = orderId
  showDetails.value = true
}

const showCreatedOrder = (createdOrder: Order) => {
  if (activeStatus.value === 'open') reload()
  else activeStatus.value = 'open'
  openOrder(createdOrder.id)
}

const dueDateLabel = (dueDate: string): string => formatDate(`${dueDate}T00:00:00`)

onMounted(reload)
</script>

<template>
  <div class="container mx-auto flex max-w-5xl flex-col gap-6 py-2 sm:px-4 sm:py-6">
    <div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">{{ t('orders.page.title') }}</h1>
        <p class="mt-1 text-muted-foreground">{{ activeShopName ? t('orders.page.subtitleShop', { shop: activeShopName }) : t('orders.page.subtitle') }}</p>
      </div>
      <Button v-if="canCreate('orders')" @click="showNewOrder = true">
        <Plus />
        {{ t('orders.page.newOrder') }}
      </Button>
    </div>

    <Card>
      <CardContent class="flex flex-col gap-4 px-3 sm:px-6">
        <Tabs v-model="activeStatus">
          <TabsList class="w-full justify-start overflow-x-auto sm:w-auto">
            <TabsTrigger v-for="status in orderStatuses" :key="status" :value="status" class="flex-none">{{ t(`orders.status.${status}`) }}</TabsTrigger>
          </TabsList>
        </Tabs>

        <div class="relative">
          <Label for="order-search" class="sr-only">{{ t('orders.page.searchPlaceholder') }}</Label>
          <Search class="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input id="order-search" v-model="searchText" :placeholder="t('orders.page.searchPlaceholder')" class="pl-8" autocomplete="off" />
        </div>

        <div v-if="loading && !orders.length" class="flex flex-col gap-2">
          <Skeleton v-for="skeletonRow in 4" :key="skeletonRow" class="h-12 w-full" />
        </div>
        <div v-else-if="!orders.length" class="flex flex-col items-center gap-2 py-12 text-center">
          <ClipboardList class="size-10 text-muted-foreground/50" />
          <p class="font-medium">{{ searchText.trim() ? t('orders.page.noMatch') : t(`orders.empty.${activeStatus}`) }}</p>
        </div>
        <div v-else class="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{{ t('orders.fields.order') }}</TableHead>
                <TableHead>{{ t('orders.fields.customer') }}</TableHead>
                <TableHead class="hidden sm:table-cell">{{ t('orders.fields.dueDate') }}</TableHead>
                <TableHead class="hidden text-right sm:table-cell">{{ t('common.fields.total') }}</TableHead>
                <TableHead class="text-right">{{ activeStatus === 'open' || activeStatus === 'ready' ? t('orders.detail.stillToPay') : t('common.fields.total') }}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="order in orders" :key="order.id" class="cursor-pointer" @click="openOrder(order.id)">
                <TableCell>
                  <p class="font-mono text-sm font-medium">{{ order.number }}</p>
                  <p class="text-xs text-muted-foreground">{{ formatDate(order.created_at) }} · {{ t('orders.lineCount', { count: order.line_count }) }}</p>
                </TableCell>
                <TableCell>
                  <p class="text-sm font-medium">{{ order.customer_name }}</p>
                  <p v-if="order.due_date" class="text-xs text-muted-foreground sm:hidden">{{ t('orders.detail.due', { date: dueDateLabel(order.due_date) }) }}</p>
                </TableCell>
                <TableCell class="hidden text-sm sm:table-cell">{{ order.due_date ? dueDateLabel(order.due_date) : '—' }}</TableCell>
                <TableCell class="hidden text-right tabular-nums sm:table-cell">{{ formatMoney(order.total) }}</TableCell>
                <TableCell class="text-right font-semibold tabular-nums">
                  {{ activeStatus === 'open' || activeStatus === 'ready' ? formatMoney(order.balance_due) : formatMoney(order.total) }}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <div v-if="totalOrders > orderPageSize" class="flex justify-end gap-2">
          <Button variant="outline" size="sm" :disabled="pageOffset === 0 || loading" @click="goToPage(pageOffset - orderPageSize)">{{ t('common.pagination.previous') }}</Button>
          <Button variant="outline" size="sm" :disabled="pageOffset + orderPageSize >= totalOrders || loading" @click="goToPage(pageOffset + orderPageSize)">{{ t('common.pagination.next') }}</Button>
        </div>
      </CardContent>
    </Card>

    <NewOrderDialog v-if="canCreate('orders')" v-model:open="showNewOrder" @created="showCreatedOrder" />
    <OrderDetailsSheet v-model:open="showDetails" :order-id="openOrderId" @changed="reload" />
  </div>
</template>
