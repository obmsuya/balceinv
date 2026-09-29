<script setup lang="ts">
import { BadgePercent, Receipt, Search, Send, Wallet } from 'lucide-vue-next'
import { useDebounceFn } from '@vueuse/core'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import SaleDetailsDialog from '@/components/sales/SaleDetailsDialog.vue'
import { fiscalStatusLabels, paymentMethodLabels, salePageSize } from '@/composables/useSales'
import { formatMoney } from '~/utils/money'

const { user } = useAuth()
const { sales, totalSales, totals, loading, fetchSales, fetchTillOptions, sendWaitingToEfd } = useSales()

const localToday = () => {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

const searchText = ref('')
const fromDate = ref(localToday())
const toDate = ref(localToday())
const pageOffset = ref(0)
const openSaleId = ref<string | null>(null)
const showDetails = ref(false)
const efdEnabled = ref(false)
const fiscalWaiting = ref(false)
const sendingWaiting = ref(false)

const activeShopName = computed(() => user.value?.shops.find(shop => shop.id === user.value?.shop_id)?.name)

const reload = () => fetchSales({ searchText: searchText.value.trim(), fromDate: fromDate.value, toDate: toDate.value, offset: pageOffset.value, fiscalWaiting: fiscalWaiting.value })

const reloadFromFirstPage = () => {
  pageOffset.value = 0
  reload()
}

watch(searchText, useDebounceFn(reloadFromFirstPage, 300))
watch([fromDate, toDate, fiscalWaiting], reloadFromFirstPage)

const goToPage = (nextOffset: number) => {
  pageOffset.value = Math.max(nextOffset, 0)
  reload()
}

const openSale = (saleId: string) => {
  openSaleId.value = saleId
  showDetails.value = true
}

const formatTime = (isoDate: string): string =>
  new Date(isoDate).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })

const sendWaiting = async () => {
  sendingWaiting.value = true
  await sendWaitingToEfd(true)
  sendingWaiting.value = false
  reload()
}

onMounted(async () => {
  reload()
  efdEnabled.value = (await fetchTillOptions())?.efd_enabled ?? false
})
</script>

<template>
  <div class="container mx-auto flex flex-col gap-6 py-2 sm:px-4 sm:py-6">
    <div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Sales</h1>
        <p class="mt-1 text-muted-foreground">Every receipt<template v-if="activeShopName"> from {{ activeShopName }}</template></p>
      </div>
      <div v-if="efdEnabled" class="flex flex-wrap gap-2">
        <Button :variant="fiscalWaiting ? 'default' : 'outline'" size="sm" :aria-pressed="fiscalWaiting" @click="fiscalWaiting = !fiscalWaiting">
          Waiting for EFD
        </Button>
        <Button variant="outline" size="sm" :disabled="sendingWaiting" @click="sendWaiting">
          <Send />
          {{ sendingWaiting ? 'Sending…' : 'Send waiting to EFD' }}
        </Button>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div class="relative sm:col-span-1">
        <Label for="sales-search" class="sr-only">Receipt number</Label>
        <Search class="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input id="sales-search" v-model="searchText" placeholder="Receipt number" class="pl-8" />
      </div>
      <div class="flex items-center gap-2">
        <Label for="sales-from" class="w-10 shrink-0 text-sm text-muted-foreground">From</Label>
        <Input id="sales-from" v-model="fromDate" type="date" />
      </div>
      <div class="flex items-center gap-2">
        <Label for="sales-to" class="w-10 shrink-0 text-sm text-muted-foreground">To</Label>
        <Input id="sales-to" v-model="toDate" type="date" />
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2">
          <CardTitle class="text-sm font-medium">Sales</CardTitle>
          <Receipt class="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <Skeleton v-if="!totals" class="h-7 w-12" />
          <p v-else class="text-xl font-bold tabular-nums sm:text-2xl">{{ totals.sale_count.toLocaleString() }}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2">
          <CardTitle class="text-sm font-medium">Takings</CardTitle>
          <Wallet class="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <Skeleton v-if="!totals" class="h-7 w-24" />
          <p v-else class="text-xl font-bold tabular-nums sm:text-2xl">{{ formatMoney(totals.total) }}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2">
          <CardTitle class="text-sm font-medium">Tax included</CardTitle>
          <Receipt class="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <Skeleton v-if="!totals" class="h-7 w-24" />
          <p v-else class="text-xl font-bold tabular-nums sm:text-2xl">{{ formatMoney(totals.tax_total) }}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2">
          <CardTitle class="text-sm font-medium">Discounts given</CardTitle>
          <BadgePercent class="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <Skeleton v-if="!totals" class="h-7 w-24" />
          <p v-else class="text-xl font-bold tabular-nums sm:text-2xl">{{ formatMoney(totals.discount_total) }}</p>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardContent class="flex flex-col gap-4 px-3 sm:px-6">
        <div v-if="loading && !sales.length" class="flex flex-col gap-2">
          <Skeleton v-for="skeletonRow in 5" :key="skeletonRow" class="h-12 w-full" />
        </div>
        <div v-else class="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt</TableHead>
                <TableHead class="hidden sm:table-cell">Cashier</TableHead>
                <TableHead class="hidden md:table-cell">Paid by</TableHead>
                <TableHead class="hidden text-right sm:table-cell">Items</TableHead>
                <TableHead class="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="sale in sales" :key="sale.id" class="cursor-pointer" @click="openSale(sale.id)">
                <TableCell>
                  <p class="flex flex-wrap items-center gap-1.5 font-mono text-sm font-medium">
                    {{ sale.receipt_number }}
                    <Badge v-if="sale.fiscal_status && sale.fiscal_status !== 'sent'" :variant="sale.fiscal_status === 'failed' ? 'destructive' : 'secondary'" class="font-sans font-normal">
                      {{ fiscalStatusLabels[sale.fiscal_status] }}
                    </Badge>
                  </p>
                  <p class="text-xs text-muted-foreground">{{ formatTime(sale.created_at) }}</p>
                </TableCell>
                <TableCell class="hidden text-sm sm:table-cell">{{ sale.cashier_name }}</TableCell>
                <TableCell class="hidden md:table-cell">
                  <div class="flex flex-wrap gap-1">
                    <Badge v-for="method in sale.payment_methods" :key="method" variant="outline" class="font-normal">{{ paymentMethodLabels[method] }}</Badge>
                  </div>
                </TableCell>
                <TableCell class="hidden text-right tabular-nums sm:table-cell">{{ sale.unit_count }}</TableCell>
                <TableCell class="text-right font-semibold tabular-nums">{{ formatMoney(sale.total) }}</TableCell>
              </TableRow>
              <TableRow v-if="!sales.length">
                <TableCell colspan="5" class="h-24 text-center text-muted-foreground">No sales in this period.</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <div v-if="totalSales > salePageSize" class="flex justify-end gap-2">
          <Button variant="outline" size="sm" :disabled="pageOffset === 0 || loading" @click="goToPage(pageOffset - salePageSize)">Previous</Button>
          <Button variant="outline" size="sm" :disabled="pageOffset + salePageSize >= totalSales || loading" @click="goToPage(pageOffset + salePageSize)">Next</Button>
        </div>
      </CardContent>
    </Card>

    <SaleDetailsDialog v-model:open="showDetails" :sale-id="openSaleId" @changed="reload" />
  </div>
</template>
