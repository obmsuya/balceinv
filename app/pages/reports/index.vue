<script setup lang="ts">
import { BadgePercent, Banknote, CreditCard, FileSpreadsheet, FileText, PiggyBank, Printer, Receipt, Smartphone, Wallet } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import BooksPanel from '@/components/reports/BooksPanel.vue'
import StatCard from '@/components/reports/StatCard.vue'
import TrendChart from '@/components/reports/TrendChart.vue'
import type { ExportFormat, ProductSort, ReportExport } from '@/composables/useReports'
import { formatMoney } from '~/utils/money'
import type { RangePreset } from '~/utils/reportRanges'
import { marginText, presetRange, rangePresetLabel, todayIn } from '~/utils/reportRanges'

const activeShopScope = 'active'
const allShopsScope = 'all'

const { user } = useAuth()
const { t, formatDate } = useI18n()
const { summary, days, products, cashiers, shops, inventory, loading, exporting, exportReport, fetchSalesReports, fetchProductRanking, fetchInventory } = useReports()

const today = todayIn(user.value?.branding?.timezone)
const rangePreset = ref<RangePreset>('last30')
const fromDate = ref(presetRange('last30', today).from)
const toDate = ref(today)
const shopScope = ref(activeShopScope)
const productSort = ref<ProductSort>('revenue')
const activeTab = ref('overview')

const presets: RangePreset[] = ['today', 'yesterday', 'last7', 'last30', 'thisMonth', 'lastMonth']
const productSorts: ProductSort[] = ['revenue', 'quantity', 'profit']

const shopChoices = computed(() => user.value?.shops ?? [])
const showShopPicker = computed(() => shopChoices.value.length > 1 || user.value?.is_owner === true)
const activeShopName = computed(() => shopChoices.value.find(shop => shop.id === user.value?.shop_id)?.name ?? t('reports.scope.thisShop'))
const scopeLabel = computed(() => {
  if (shopScope.value === allShopsScope) return t('reports.scope.allShops')
  if (shopScope.value === activeShopScope) return activeShopName.value
  return shopChoices.value.find(shop => shop.id === shopScope.value)?.name ?? t('reports.scope.shop')
})
const shopQuery = computed(() => (shopScope.value === activeShopScope ? '' : shopScope.value))
const filter = computed(() => ({ from: fromDate.value, to: toDate.value, shop: shopQuery.value }))
const rangeLabel = computed(() => {
  const format = (isoDate: string) => formatDate(`${isoDate}T12:00:00`, { day: 'numeric', month: 'short', year: 'numeric' })
  return fromDate.value === toDate.value ? format(fromDate.value) : `${format(fromDate.value)} – ${format(toDate.value)}`
})
const paymentRows = computed(() => {
  const paymentTotals = summary.value?.payments
  if (!paymentTotals) return []
  const paidTotal = paymentTotals.cash + paymentTotals.card + paymentTotals.mobile
  return [
    { label: t('reports.columns.cash'), icon: Banknote, amount: paymentTotals.cash },
    { label: t('reports.columns.card'), icon: CreditCard, amount: paymentTotals.card },
    { label: t('reports.columns.mobileMoney'), icon: Smartphone, amount: paymentTotals.mobile },
  ].map(paymentRow => ({ ...paymentRow, share: paidTotal ? (paymentRow.amount / paidTotal) * 100 : 0 }))
})

const choosePreset = (preset: RangePreset) => {
  rangePreset.value = preset
  const chosenRange = presetRange(preset, today)
  fromDate.value = chosenRange.from
  toDate.value = chosenRange.to
}

const onDateTyped = () => {
  rangePreset.value = 'custom'
}

const reload = () => {
  if (!fromDate.value || !toDate.value) return
  if (fromDate.value > toDate.value) {
    toast.error(t('reports.toasts.dateOrder'))
    return
  }
  fetchSalesReports(filter.value, productSort.value)
  if (activeTab.value === 'stock') fetchInventory(shopQuery.value)
}

watch([fromDate, toDate, shopScope], reload)
watch(shopScope, chosenScope => {
  if (chosenScope !== allShopsScope && activeTab.value === 'shops') activeTab.value = 'overview'
})
watch(productSort, () => fetchProductRanking(filter.value, productSort.value))
watch(activeTab, openedTab => {
  if (openedTab === 'stock') fetchInventory(shopQuery.value)
})

const marginOf = (profit: number, netRevenue: number) => (netRevenue > 0 ? marginText(Math.round((profit / netRevenue) * 10000)) : '—')
const lastSoldText = (isoDate: string | null) => (isoDate ? formatDate(isoDate) : t('reports.deadStock.neverSold'))

const exportsByTab: Record<string, ReportExport> = {
  overview: 'summary',
  products: 'products',
  staff: 'cashiers',
  shops: 'shops',
  stock: 'inventory',
}

const downloadReport = (format: ExportFormat) => exportReport(exportsByTab[activeTab.value] ?? 'summary', format, filter.value, productSort.value)

const printReport = () => window.print()

const { accountingOn } = useFeatures()
const { hasPermission } = usePermissions()
const showBooks = computed(() => accountingOn.value && hasPermission('accounting', 'view'))
const statementShop = computed(() => {
  const isWholeBusiness = shopScope.value === allShopsScope || shopChoices.value.length <= 1
  if (isWholeBusiness) return ''
  if (shopScope.value === activeShopScope) return user.value?.shop_id ?? ''
  return shopScope.value
})
const statementScopeLabel = computed(() => (statementShop.value ? scopeLabel.value : t('reports.scope.allShops')))

onMounted(reload)
</script>

<template>
  <div class="mx-auto flex max-w-7xl flex-col gap-5 py-2 sm:px-2 sm:py-4">
    <div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">{{ t('reports.title') }}</h1>
        <p class="mt-1 text-muted-foreground">{{ rangeLabel }} · {{ scopeLabel }}</p>
      </div>
      <div v-if="activeTab !== 'books'" class="flex gap-2 print:hidden">
        <Button variant="outline" :disabled="!summary || exporting !== null" :title="t('reports.downloadHint')" @click="downloadReport('xlsx')">
          <FileSpreadsheet />
          {{ exporting === 'xlsx' ? t('common.actions.saving') : t('reports.excel') }}
        </Button>
        <Button variant="outline" :disabled="!summary || exporting !== null" :title="t('reports.downloadHint')" @click="downloadReport('pdf')">
          <FileText />
          {{ exporting === 'pdf' ? t('common.actions.saving') : t('reports.pdf') }}
        </Button>
        <Button variant="outline" :disabled="!summary" @click="printReport">
          <Printer />
          {{ t('reports.print') }}
        </Button>
      </div>
    </div>

    <div class="flex flex-col gap-3 rounded-xl border p-3 print:hidden">
      <div class="flex gap-1.5 overflow-x-auto pb-1">
        <button
          v-for="preset in presets"
          :key="preset"
          type="button"
          class="shrink-0 rounded-full border px-3 py-1 text-sm font-medium transition-colors"
          :class="rangePreset === preset ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted'"
          @click="choosePreset(preset)"
        >
          {{ rangePresetLabel(preset) }}
        </button>
      </div>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div class="flex items-center gap-2">
          <Label for="report-from" class="min-w-10 shrink-0 text-sm text-muted-foreground">{{ t('common.fields.from') }}</Label>
          <Input id="report-from" v-model="fromDate" type="date" :max="toDate" @input="onDateTyped" />
        </div>
        <div class="flex items-center gap-2">
          <Label for="report-to" class="min-w-10 shrink-0 text-sm text-muted-foreground">{{ t('common.fields.to') }}</Label>
          <Input id="report-to" v-model="toDate" type="date" :min="fromDate" :max="today" @input="onDateTyped" />
        </div>
        <Select v-if="showShopPicker" v-model="shopScope">
          <SelectTrigger class="w-full" :aria-label="t('reports.scope.label')">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem :value="activeShopScope">{{ t('reports.scope.current', { shop: activeShopName }) }}</SelectItem>
            <SelectItem :value="allShopsScope">{{ t('reports.scope.allShops') }}</SelectItem>
            <SelectItem v-for="shop in shopChoices.filter(shopChoice => shopChoice.id !== user?.shop_id)" :key="shop.id" :value="shop.id">{{ shop.name }}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <Tabs v-model="activeTab">
      <TabsList class="print:hidden">
        <TabsTrigger value="overview">{{ t('reports.tabs.overview') }}</TabsTrigger>
        <TabsTrigger value="products">{{ t('reports.tabs.products') }}</TabsTrigger>
        <TabsTrigger value="staff">{{ t('reports.tabs.staff') }}</TabsTrigger>
        <TabsTrigger v-if="shopScope === allShopsScope" value="shops">{{ t('reports.tabs.shops') }}</TabsTrigger>
        <TabsTrigger value="stock">{{ t('reports.tabs.stock') }}</TabsTrigger>
        <TabsTrigger v-if="showBooks" value="books">{{ t('reports.tabs.books') }}</TabsTrigger>
      </TabsList>

      <TabsContent v-if="showBooks" value="books" class="mt-4">
        <BooksPanel :from="fromDate" :to="toDate" :shop="statementShop" :range-label="rangeLabel" :scope-label="statementScopeLabel" />
      </TabsContent>

      <TabsContent value="overview" class="mt-4 flex flex-col gap-4">
        <div class="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCard
            :title="t('reports.stats.takings')"
            :value="summary ? formatMoney(summary.total) : null"
            :hint="summary ? `${t('reports.counts.sales', { count: summary.sale_count })} · ${t('reports.counts.items', { count: summary.units_sold })}` : ''"
            :icon="Wallet"
          />
          <StatCard
            :title="t('reports.stats.grossProfit')"
            :value="summary ? formatMoney(summary.gross_profit) : null"
            :hint="summary ? t('reports.stats.marginOfNetSales', { margin: marginText(summary.margin_basis_points) }) : ''"
            :icon="PiggyBank"
          />
          <StatCard
            :title="t('reports.stats.netSales')"
            :value="summary ? formatMoney(summary.net_sales) : null"
            :hint="summary ? t('reports.stats.afterTax', { amount: formatMoney(summary.tax_total) }) : ''"
            :icon="Receipt"
          />
          <StatCard
            :title="t('reports.stats.discountsGiven')"
            :value="summary ? formatMoney(summary.discount_total) : null"
            :hint="summary ? t('reports.stats.averageSale', { amount: formatMoney(summary.average_sale) }) : ''"
            :icon="BadgePercent"
          />
        </div>

        <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card class="lg:col-span-2">
            <CardHeader>
              <CardTitle class="text-base">{{ t('reports.dayByDay.title') }}</CardTitle>
              <CardDescription>{{ t('reports.dayByDay.description') }}</CardDescription>
            </CardHeader>
            <CardContent>
              <Skeleton v-if="loading && !days.length" class="h-64 w-full" />
              <TrendChart v-else :days="days" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle class="text-base">{{ t('reports.payments.title') }}</CardTitle>
              <CardDescription>{{ t('reports.payments.description') }}</CardDescription>
            </CardHeader>
            <CardContent class="flex flex-col gap-4">
              <Skeleton v-if="!summary" class="h-32 w-full" />
              <div v-for="paymentRow in paymentRows" :key="paymentRow.label" class="flex flex-col gap-1.5">
                <div class="flex items-center justify-between text-sm">
                  <span class="flex items-center gap-2">
                    <component :is="paymentRow.icon" class="size-4 text-muted-foreground" />
                    {{ paymentRow.label }}
                  </span>
                  <span class="font-semibold tabular-nums">{{ formatMoney(paymentRow.amount) }}</span>
                </div>
                <div class="h-2 overflow-hidden rounded-full bg-muted">
                  <div class="h-full rounded-full bg-primary" :style="{ width: `${paymentRow.share}%` }" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="products" class="mt-4 flex flex-col gap-3">
        <div class="flex flex-wrap items-center justify-between gap-2 print:hidden">
          <p class="min-w-0 text-sm text-muted-foreground">{{ t('reports.products.topInPeriod') }}</p>
          <div class="flex rounded-lg bg-muted p-1 text-sm" role="group" :aria-label="t('reports.products.rankBy')">
            <button
              v-for="sortChoice in productSorts"
              :key="sortChoice"
              type="button"
              class="rounded-md px-3 py-1 font-medium transition-colors"
              :class="productSort === sortChoice ? 'bg-background shadow-sm' : 'text-muted-foreground'"
              :aria-pressed="productSort === sortChoice"
              @click="productSort = sortChoice"
            >
              {{ t(`reports.sorts.${sortChoice}`) }}
            </button>
          </div>
        </div>
        <div class="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{{ t('reports.columns.product') }}</TableHead>
                <TableHead class="text-right">{{ t('reports.columns.sold') }}</TableHead>
                <TableHead class="text-right">{{ t('reports.columns.takings') }}</TableHead>
                <TableHead class="hidden text-right md:table-cell">{{ t('reports.columns.cost') }}</TableHead>
                <TableHead class="text-right">{{ t('reports.columns.profit') }}</TableHead>
                <TableHead class="hidden text-right sm:table-cell">{{ t('reports.columns.margin') }}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="product in products" :key="product.product_id">
                <TableCell>
                  <p class="font-medium">{{ product.name }}<span v-if="product.variant_label" class="text-muted-foreground"> · {{ product.variant_label }}</span></p>
                  <p class="font-mono text-xs text-muted-foreground">{{ product.sku }}</p>
                </TableCell>
                <TableCell class="text-right tabular-nums">{{ product.quantity }}</TableCell>
                <TableCell class="text-right tabular-nums">{{ formatMoney(product.revenue) }}</TableCell>
                <TableCell class="hidden text-right tabular-nums md:table-cell">{{ formatMoney(product.cost_total) }}</TableCell>
                <TableCell class="text-right font-medium tabular-nums" :class="product.gross_profit < 0 ? 'text-destructive' : ''">{{ formatMoney(product.gross_profit) }}</TableCell>
                <TableCell class="hidden text-right tabular-nums sm:table-cell">{{ marginOf(product.gross_profit, product.net_revenue) }}</TableCell>
              </TableRow>
              <TableRow v-if="!products.length">
                <TableCell colspan="6" class="h-24 text-center text-muted-foreground">{{ t('reports.products.empty') }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <p class="text-xs text-muted-foreground">{{ t('reports.products.profitNote') }}</p>
      </TabsContent>

      <TabsContent value="staff" class="mt-4">
        <div class="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{{ t('reports.columns.staff') }}</TableHead>
                <TableHead class="text-right">{{ t('reports.columns.sales') }}</TableHead>
                <TableHead class="text-right">{{ t('reports.columns.takings') }}</TableHead>
                <TableHead class="text-right">{{ t('reports.columns.averageSale') }}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="cashier in cashiers" :key="cashier.user_id">
                <TableCell class="font-medium">{{ cashier.name }}</TableCell>
                <TableCell class="text-right tabular-nums">{{ cashier.sale_count }}</TableCell>
                <TableCell class="text-right tabular-nums">{{ formatMoney(cashier.total) }}</TableCell>
                <TableCell class="text-right tabular-nums">{{ formatMoney(cashier.average_sale) }}</TableCell>
              </TableRow>
              <TableRow v-if="!cashiers.length">
                <TableCell colspan="4" class="h-24 text-center text-muted-foreground">{{ t('reports.noSales') }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="shops" class="mt-4">
        <div class="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{{ t('reports.columns.shop') }}</TableHead>
                <TableHead class="text-right">{{ t('reports.columns.sales') }}</TableHead>
                <TableHead class="text-right">{{ t('reports.columns.takings') }}</TableHead>
                <TableHead class="hidden text-right sm:table-cell">{{ t('reports.columns.tax') }}</TableHead>
                <TableHead class="text-right">{{ t('reports.columns.profit') }}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="shopRow in shops" :key="shopRow.shop_id">
                <TableCell class="font-medium">{{ shopRow.name }}</TableCell>
                <TableCell class="text-right tabular-nums">{{ shopRow.sale_count }}</TableCell>
                <TableCell class="text-right tabular-nums">{{ formatMoney(shopRow.total) }}</TableCell>
                <TableCell class="hidden text-right tabular-nums sm:table-cell">{{ formatMoney(shopRow.tax_total) }}</TableCell>
                <TableCell class="text-right font-medium tabular-nums">{{ formatMoney(shopRow.gross_profit) }}</TableCell>
              </TableRow>
              <TableRow v-if="!shops.length">
                <TableCell colspan="5" class="h-24 text-center text-muted-foreground">{{ t('reports.noSales') }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="stock" class="mt-4 flex flex-col gap-4">
        <p class="text-sm text-muted-foreground">{{ t('reports.stock.note') }}</p>
        <div class="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCard :title="t('reports.stock.valueAtCost')" :value="inventory ? formatMoney(inventory.stock.value_at_cost) : null" :hint="inventory ? t('reports.stock.itemsOnHand', { count: inventory.stock.units }) : ''" />
          <StatCard :title="t('reports.stock.valueAtPrice')" :value="inventory ? formatMoney(inventory.stock.value_at_price) : null" :hint="inventory ? t('reports.counts.products', { count: inventory.stock.product_count }) : ''" />
          <StatCard :title="t('reports.stock.runningLow')" :value="inventory ? String(inventory.stock.low_count) : null" :hint="t('reports.stock.runningLowHint')" />
          <StatCard :title="t('reports.stock.outOfStock')" :value="inventory ? String(inventory.stock.out_count) : null" :hint="t('reports.stock.outOfStockHint')" />
        </div>
        <Card>
          <CardHeader>
            <CardTitle class="text-base">{{ t('reports.deadStock.title') }}</CardTitle>
            <CardDescription>{{ t('reports.deadStock.description', { days: inventory?.dead_stock_days ?? '…' }) }}</CardDescription>
          </CardHeader>
          <CardContent>
            <div class="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{{ t('reports.columns.product') }}</TableHead>
                    <TableHead class="text-right">{{ t('reports.columns.onHand') }}</TableHead>
                    <TableHead class="text-right">{{ t('reports.columns.valueAtCost') }}</TableHead>
                    <TableHead class="hidden text-right sm:table-cell">{{ t('reports.columns.lastSold') }}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="deadItem in inventory?.dead_stock ?? []" :key="deadItem.product_id">
                    <TableCell>
                      <p class="font-medium">{{ deadItem.name }}<span v-if="deadItem.variant_label" class="text-muted-foreground"> · {{ deadItem.variant_label }}</span></p>
                      <p class="font-mono text-xs text-muted-foreground">{{ deadItem.sku }}</p>
                    </TableCell>
                    <TableCell class="text-right tabular-nums">{{ deadItem.quantity }}</TableCell>
                    <TableCell class="text-right tabular-nums">{{ formatMoney(deadItem.value_at_cost) }}</TableCell>
                    <TableCell class="hidden text-right sm:table-cell">
                      <Badge :variant="deadItem.last_sold_at ? 'outline' : 'secondary'" class="font-normal">{{ lastSoldText(deadItem.last_sold_at) }}</Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow v-if="inventory && !inventory.dead_stock.length">
                    <TableCell colspan="4" class="h-24 text-center text-muted-foreground">{{ t('reports.deadStock.empty') }}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  </div>
</template>
