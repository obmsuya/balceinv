<script setup lang="ts">
import { BadgePercent, Banknote, CreditCard, FileSpreadsheet, PiggyBank, Printer, Receipt, Smartphone, Wallet } from 'lucide-vue-next'
import * as XLSX from 'xlsx'
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
import StatCard from '@/components/reports/StatCard.vue'
import TrendChart from '@/components/reports/TrendChart.vue'
import type { ProductSort } from '@/composables/useReports'
import { currencyDecimals, formatMoney } from '~/utils/money'
import { saveFile } from '~/utils/download'
import type { RangePreset } from '~/utils/reportRanges'
import { marginText, presetRange, rangePresetLabels, todayIn } from '~/utils/reportRanges'

const activeShopScope = 'active'
const allShopsScope = 'all'

const { user } = useAuth()
const { summary, days, products, cashiers, shops, inventory, loading, fetchSalesReports, fetchProductRanking, fetchInventory } = useReports()

const today = todayIn(user.value?.branding?.timezone)
const rangePreset = ref<RangePreset>('last30')
const fromDate = ref(presetRange('last30', today).from)
const toDate = ref(today)
const shopScope = ref(activeShopScope)
const productSort = ref<ProductSort>('revenue')
const activeTab = ref('overview')
const exporting = ref(false)

const presets: RangePreset[] = ['today', 'yesterday', 'last7', 'last30', 'thisMonth', 'lastMonth']
const productSorts: { value: ProductSort; label: string }[] = [
  { value: 'revenue', label: 'Sales' },
  { value: 'quantity', label: 'Quantity' },
  { value: 'profit', label: 'Profit' },
]

const shopChoices = computed(() => user.value?.shops ?? [])
const showShopPicker = computed(() => shopChoices.value.length > 1 || user.value?.is_owner === true)
const activeShopName = computed(() => shopChoices.value.find(shop => shop.id === user.value?.shop_id)?.name ?? 'This shop')
const scopeLabel = computed(() => {
  if (shopScope.value === allShopsScope) return 'All shops'
  if (shopScope.value === activeShopScope) return activeShopName.value
  return shopChoices.value.find(shop => shop.id === shopScope.value)?.name ?? 'Shop'
})
const shopQuery = computed(() => (shopScope.value === activeShopScope ? '' : shopScope.value))
const filter = computed(() => ({ from: fromDate.value, to: toDate.value, shop: shopQuery.value }))
const rangeLabel = computed(() => {
  const format = (isoDate: string) => new Date(`${isoDate}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  return fromDate.value === toDate.value ? format(fromDate.value) : `${format(fromDate.value)} – ${format(toDate.value)}`
})
const paymentRows = computed(() => {
  const paymentTotals = summary.value?.payments
  if (!paymentTotals) return []
  const paidTotal = paymentTotals.cash + paymentTotals.card + paymentTotals.mobile
  return [
    { label: 'Cash', icon: Banknote, amount: paymentTotals.cash },
    { label: 'Card', icon: CreditCard, amount: paymentTotals.card },
    { label: 'Mobile money', icon: Smartphone, amount: paymentTotals.mobile },
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
    toast.error('The start date is after the end date')
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
const lastSoldText = (isoDate: string | null) => (isoDate ? new Date(isoDate).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'Never sold')

const toMajor = (minorUnits: number) => minorUnits / 10 ** currencyDecimals()

const exportExcel = async () => {
  if (!summary.value) return
  exporting.value = true
  try {
    const workbook = XLSX.utils.book_new()
    const summaryRows = [
      { Item: 'Period', Value: rangeLabel.value },
      { Item: 'Shops', Value: scopeLabel.value },
      { Item: 'Sales', Value: summary.value.sale_count },
      { Item: 'Items sold', Value: summary.value.units_sold },
      { Item: 'Takings (incl. tax)', Value: toMajor(summary.value.total) },
      { Item: 'Tax', Value: toMajor(summary.value.tax_total) },
      { Item: 'Net sales', Value: toMajor(summary.value.net_sales) },
      { Item: 'Cost of goods', Value: toMajor(summary.value.cost_total) },
      { Item: 'Gross profit', Value: toMajor(summary.value.gross_profit) },
      { Item: 'Margin %', Value: summary.value.margin_basis_points / 100 },
      { Item: 'Discounts given', Value: toMajor(summary.value.discount_total) },
      { Item: 'Cash', Value: toMajor(summary.value.payments.cash) },
      { Item: 'Card', Value: toMajor(summary.value.payments.card) },
      { Item: 'Mobile money', Value: toMajor(summary.value.payments.mobile) },
    ]
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), 'Summary')
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(days.value.map(day => ({
      Date: day.date, Sales: day.sale_count, Takings: toMajor(day.total), Tax: toMajor(day.tax_total), Cost: toMajor(day.cost_total), 'Gross profit': toMajor(day.gross_profit),
    }))), 'Days')
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(products.value.map(product => ({
      Product: product.variant_label ? `${product.name} ${product.variant_label}` : product.name, SKU: product.sku, Quantity: product.quantity, Takings: toMajor(product.revenue), 'Net sales': toMajor(product.net_revenue), Cost: toMajor(product.cost_total), 'Gross profit': toMajor(product.gross_profit),
    }))), 'Products')
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(cashiers.value.map(cashier => ({
      Staff: cashier.name, Sales: cashier.sale_count, Takings: toMajor(cashier.total), 'Average sale': toMajor(cashier.average_sale),
    }))), 'Staff')
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(shops.value.map(shopRow => ({
      Shop: shopRow.name, Sales: shopRow.sale_count, Takings: toMajor(shopRow.total), Tax: toMajor(shopRow.tax_total), Cost: toMajor(shopRow.cost_total), 'Gross profit': toMajor(shopRow.gross_profit),
    }))), 'Shops')
    const workbookBytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
    const savedName = await saveFile(new Uint8Array(workbookBytes), `report-${fromDate.value}-to-${toDate.value}.xlsx`, { name: 'Excel Workbook', extensions: ['xlsx'] })
    if (savedName) toast.success('Report saved', { description: savedName })
  } catch (error: any) {
    toast.error(error?.message || 'The report could not be saved')
  } finally {
    exporting.value = false
  }
}

const printReport = () => window.print()

onMounted(reload)
</script>

<template>
  <div class="mx-auto flex max-w-7xl flex-col gap-5 py-2 sm:px-2 sm:py-4">
    <div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Reports</h1>
        <p class="mt-1 text-muted-foreground">{{ rangeLabel }} · {{ scopeLabel }}</p>
      </div>
      <div class="flex gap-2 print:hidden">
        <Button variant="outline" :disabled="!summary || exporting" @click="exportExcel">
          <FileSpreadsheet />
          {{ exporting ? 'Saving…' : 'Excel' }}
        </Button>
        <Button variant="outline" :disabled="!summary" @click="printReport">
          <Printer />
          Print or PDF
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
          {{ rangePresetLabels[preset] }}
        </button>
      </div>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div class="flex items-center gap-2">
          <Label for="report-from" class="w-10 shrink-0 text-sm text-muted-foreground">From</Label>
          <Input id="report-from" v-model="fromDate" type="date" :max="toDate" @input="onDateTyped" />
        </div>
        <div class="flex items-center gap-2">
          <Label for="report-to" class="w-10 shrink-0 text-sm text-muted-foreground">To</Label>
          <Input id="report-to" v-model="toDate" type="date" :min="fromDate" :max="today" @input="onDateTyped" />
        </div>
        <Select v-if="showShopPicker" v-model="shopScope">
          <SelectTrigger class="w-full" aria-label="Which shops">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem :value="activeShopScope">{{ activeShopName }} (current)</SelectItem>
            <SelectItem :value="allShopsScope">All shops</SelectItem>
            <SelectItem v-for="shop in shopChoices.filter(shopChoice => shopChoice.id !== user?.shop_id)" :key="shop.id" :value="shop.id">{{ shop.name }}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <Tabs v-model="activeTab">
      <TabsList class="print:hidden">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="products">Products</TabsTrigger>
        <TabsTrigger value="staff">Staff</TabsTrigger>
        <TabsTrigger v-if="shopScope === allShopsScope" value="shops">Shops</TabsTrigger>
        <TabsTrigger value="stock">Stock</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" class="mt-4 flex flex-col gap-4">
        <div class="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCard
            title="Takings"
            :value="summary ? formatMoney(summary.total) : null"
            :hint="summary ? `${summary.sale_count} sales · ${summary.units_sold} items` : ''"
            :icon="Wallet"
          />
          <StatCard
            title="Gross profit"
            :value="summary ? formatMoney(summary.gross_profit) : null"
            :hint="summary ? `${marginText(summary.margin_basis_points)} of net sales` : ''"
            :icon="PiggyBank"
          />
          <StatCard
            title="Net sales"
            :value="summary ? formatMoney(summary.net_sales) : null"
            :hint="summary ? `After ${formatMoney(summary.tax_total)} tax` : ''"
            :icon="Receipt"
          />
          <StatCard
            title="Discounts given"
            :value="summary ? formatMoney(summary.discount_total) : null"
            :hint="summary ? `Average sale ${formatMoney(summary.average_sale)}` : ''"
            :icon="BadgePercent"
          />
        </div>

        <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card class="lg:col-span-2">
            <CardHeader>
              <CardTitle class="text-base">Day by day</CardTitle>
              <CardDescription>Takings and gross profit, in company time</CardDescription>
            </CardHeader>
            <CardContent>
              <Skeleton v-if="loading && !days.length" class="h-64 w-full" />
              <TrendChart v-else :days="days" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle class="text-base">How customers paid</CardTitle>
              <CardDescription>Cash is after change given</CardDescription>
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
        <div class="flex items-center justify-between gap-2 print:hidden">
          <p class="text-sm text-muted-foreground">Top 100 products in this period</p>
          <div class="flex rounded-lg bg-muted p-1 text-sm" role="group" aria-label="Rank products by">
            <button
              v-for="sortChoice in productSorts"
              :key="sortChoice.value"
              type="button"
              class="rounded-md px-3 py-1 font-medium transition-colors"
              :class="productSort === sortChoice.value ? 'bg-background shadow-sm' : 'text-muted-foreground'"
              :aria-pressed="productSort === sortChoice.value"
              @click="productSort = sortChoice.value"
            >
              {{ sortChoice.label }}
            </button>
          </div>
        </div>
        <div class="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead class="text-right">Sold</TableHead>
                <TableHead class="text-right">Takings</TableHead>
                <TableHead class="hidden text-right md:table-cell">Cost</TableHead>
                <TableHead class="text-right">Profit</TableHead>
                <TableHead class="hidden text-right sm:table-cell">Margin</TableHead>
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
                <TableCell colspan="6" class="h-24 text-center text-muted-foreground">No products sold in this period.</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <p class="text-xs text-muted-foreground">Profit per product removes tax line by line, so it can differ from the overview by a few units of currency.</p>
      </TabsContent>

      <TabsContent value="staff" class="mt-4">
        <div class="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff</TableHead>
                <TableHead class="text-right">Sales</TableHead>
                <TableHead class="text-right">Takings</TableHead>
                <TableHead class="text-right">Average sale</TableHead>
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
                <TableCell colspan="4" class="h-24 text-center text-muted-foreground">No sales in this period.</TableCell>
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
                <TableHead>Shop</TableHead>
                <TableHead class="text-right">Sales</TableHead>
                <TableHead class="text-right">Takings</TableHead>
                <TableHead class="hidden text-right sm:table-cell">Tax</TableHead>
                <TableHead class="text-right">Profit</TableHead>
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
                <TableCell colspan="5" class="h-24 text-center text-muted-foreground">No sales in this period.</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="stock" class="mt-4 flex flex-col gap-4">
        <p class="text-sm text-muted-foreground">Stock as it is now, whatever the dates above.</p>
        <div class="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCard title="Stock value at cost" :value="inventory ? formatMoney(inventory.stock.value_at_cost) : null" :hint="inventory ? `${inventory.stock.units} items on hand` : ''" />
          <StatCard title="Stock value at price" :value="inventory ? formatMoney(inventory.stock.value_at_price) : null" :hint="inventory ? `${inventory.stock.product_count} products` : ''" />
          <StatCard title="Running low" :value="inventory ? String(inventory.stock.low_count) : null" hint="At or below their warning level" />
          <StatCard title="Out of stock" :value="inventory ? String(inventory.stock.out_count) : null" hint="Nothing left" />
        </div>
        <Card>
          <CardHeader>
            <CardTitle class="text-base">Not selling</CardTitle>
            <CardDescription>In stock but unsold for {{ inventory?.dead_stock_days ?? '…' }} days, most money tied up first</CardDescription>
          </CardHeader>
          <CardContent>
            <div class="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead class="text-right">On hand</TableHead>
                    <TableHead class="text-right">Value at cost</TableHead>
                    <TableHead class="hidden text-right sm:table-cell">Last sold</TableHead>
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
                    <TableCell colspan="4" class="h-24 text-center text-muted-foreground">Everything in stock has sold recently.</TableCell>
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
