<script setup lang="ts">
import type { Component } from 'vue'
import { BookOpen, Boxes, CalendarDays, Eye, FileSpreadsheet, FileText, HandCoins, Landmark, PackageX, Receipt, Scale, ShoppingBag, Store, TrendingUp, Truck, Users, Wallet } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import DocumentPreviewDialog from '@/components/reports/DocumentPreviewDialog.vue'
import { accountName } from '@/composables/useMoney'
import type { ProductSort } from '@/composables/useReports'
import type { DocumentSource, SalesReport, StatementReport, StockReport } from '@/composables/useStatements'
import { bookDocument, customersWhoOweDocument, salesDocument, stockDocument, suppliersWeOweDocument } from '@/composables/useStatements'
import type { RangePreset } from '~/utils/reportRanges'
import { presetRange, rangePresetLabel, todayIn } from '~/utils/reportRanges'

const activeShopScope = 'active'
const allShopsScope = 'all'

type ReportGroup = 'sales' | 'stock' | 'people' | 'books'
type ReportCovers = 'period' | 'now' | 'asAt'

interface ReportRow {
  id: string
  group: ReportGroup
  labelKey: string
  icon: Component
  covers: ReportCovers
  wholeBusiness: boolean
  picker?: 'productSort' | 'account'
  source: () => DocumentSource
}

const { user } = useAuth()
const { t, formatDate } = useI18n()
const { hasPermission } = usePermissions()
const { accountingOn, fullAccountingOn, vatOn, customersOn, suppliersOn } = useFeatures()
const { accounts, fetchAccounts } = useMoney()
const { saving, fetchDocument, saveDocument } = useStatements()

const today = todayIn(user.value?.branding?.timezone)
const presets: RangePreset[] = ['today', 'yesterday', 'last7', 'last30', 'thisMonth', 'lastMonth', 'custom']
const productSorts: ProductSort[] = ['revenue', 'quantity', 'profit']
const rangePreset = ref<RangePreset>('thisMonth')
const fromDate = ref(presetRange('thisMonth', today).from)
const toDate = ref(today)
const shopScope = ref(activeShopScope)
const productSort = ref<ProductSort>('revenue')
const chosenAccount = ref('cash')

watch(rangePreset, (preset) => {
  if (preset === 'custom') return
  const chosenRange = presetRange(preset, today)
  fromDate.value = chosenRange.from
  toDate.value = chosenRange.to
})
const onDateTyped = () => {
  rangePreset.value = 'custom'
}

const shopChoices = computed(() => user.value?.shops ?? [])
const showShopPicker = computed(() => shopChoices.value.length > 1 || user.value?.is_owner === true)
const activeShopName = computed(() => shopChoices.value.find(shop => shop.id === user.value?.shop_id)?.name ?? t('reports.scope.thisShop'))
const scopeLabel = computed(() => {
  if (shopScope.value === allShopsScope) return t('reports.scope.allShops')
  if (shopScope.value === activeShopScope) return activeShopName.value
  return shopChoices.value.find(shop => shop.id === shopScope.value)?.name ?? t('reports.scope.shop')
})
const shopQuery = computed(() => (shopScope.value === activeShopScope ? '' : shopScope.value))
const booksShop = computed(() => {
  const isWholeBusiness = shopScope.value === allShopsScope || shopChoices.value.length <= 1
  if (isWholeBusiness) return ''
  if (shopScope.value === activeShopScope) return user.value?.shop_id ?? ''
  return shopScope.value
})

const rangeInvalid = computed(() => !fromDate.value || !toDate.value || fromDate.value > toDate.value)
const filter = computed(() => ({ from: fromDate.value, to: toDate.value, shop: shopQuery.value }))
const shortDate = (isoDate: string) => formatDate(`${isoDate}T12:00:00`, { day: 'numeric', month: 'short', year: 'numeric' })
const rangeLabel = computed(() => (fromDate.value === toDate.value ? shortDate(fromDate.value) : `${shortDate(fromDate.value)} – ${shortDate(toDate.value)}`))

const statementAccounts = computed(() => accounts.value.filter(account => account.is_active && (fullAccountingOn.value || account.is_money)))

const salesRow = (id: SalesReport, labelKey: string, icon: Component): ReportRow => ({
  id, group: 'sales', labelKey, icon, covers: 'period', wholeBusiness: id === 'shops',
  picker: id === 'products' ? 'productSort' : undefined,
  source: () => salesDocument(id, filter.value, productSort.value),
})
const stockRow = (id: StockReport, labelKey: string, icon: Component): ReportRow => ({
  id, group: 'stock', labelKey, icon, covers: 'now', wholeBusiness: false,
  source: () => stockDocument(id, shopQuery.value, today),
})
const bookRow = (id: StatementReport, labelKey: string, icon: Component, covers: ReportCovers, wholeBusiness: boolean): ReportRow => ({
  id, group: 'books', labelKey, icon, covers, wholeBusiness,
  picker: id === 'statement' ? 'account' : undefined,
  source: () => bookDocument(id, { from: fromDate.value, to: toDate.value, shop: wholeBusiness ? '' : booksShop.value }, id === 'statement' ? chosenAccount.value : undefined),
})

const reportRows = computed<ReportRow[]>(() => {
  const rows: ReportRow[] = []
  if (hasPermission('reports', 'view')) {
    rows.push(
      salesRow('summary', 'reports.list.summary', Wallet),
      salesRow('daily', 'reports.list.daily', CalendarDays),
      salesRow('products', 'reports.list.products', ShoppingBag),
      salesRow('cashiers', 'reports.list.staff', Users),
    )
    if (shopScope.value === allShopsScope && shopChoices.value.length > 1) rows.push(salesRow('shops', 'reports.list.shops', Store))
    rows.push(stockRow('inventory', 'reports.list.stockOnHand', Boxes), stockRow('dead-stock', 'reports.list.notSelling', PackageX))
  }
  if (customersOn.value && hasPermission('customers', 'view')) {
    rows.push({ id: 'customers-who-owe', group: 'people', labelKey: 'reports.list.customersWhoOwe', icon: HandCoins, covers: 'asAt', wholeBusiness: true, source: () => customersWhoOweDocument(toDate.value) })
  }
  if (suppliersOn.value && hasPermission('suppliers', 'view')) {
    rows.push({ id: 'suppliers-we-owe', group: 'people', labelKey: 'reports.list.suppliersWeOwe', icon: Truck, covers: 'asAt', wholeBusiness: true, source: () => suppliersWeOweDocument(toDate.value) })
  }
  if (accountingOn.value && hasPermission('accounting', 'view')) {
    rows.push(
      bookRow('profit-and-loss', 'reports.books.profitAndLoss', TrendingUp, 'period', false),
      bookRow('balance-sheet', 'reports.books.balanceSheet', Scale, 'asAt', true),
      bookRow('overview', 'reports.books.overview', Wallet, 'period', false),
      bookRow('statement', 'reports.books.accountStatement', BookOpen, 'period', false),
    )
    if (fullAccountingOn.value) rows.push(bookRow('trial-balance', 'reports.books.trialBalance', Landmark, 'asAt', true))
    if (vatOn.value) rows.push(bookRow('vat', 'reports.books.vat', Receipt, 'period', true))
  }
  return rows
})

const groupOrder: ReportGroup[] = ['sales', 'stock', 'people', 'books']
const reportGroups = computed(() =>
  groupOrder
    .map(group => ({ group, rows: reportRows.value.filter(row => row.group === group) }))
    .filter(reportGroup => reportGroup.rows.length),
)

const coversLabel = (row: ReportRow) => {
  if (row.covers === 'now') return t('reports.list.rightNow')
  if (row.covers === 'asAt') return t('reports.books.asAt', { date: shortDate(toDate.value) })
  return rangeLabel.value
}
const scopeLabelFor = (row: ReportRow) => {
  if (row.wholeBusiness) return t('reports.scope.allShops')
  if (row.group === 'books' && !booksShop.value) return t('reports.scope.allShops')
  return scopeLabel.value
}
const rowBlocked = (row: ReportRow) => row.covers !== 'now' && rangeInvalid.value

const previewRow = ref<ReportRow | null>(null)
const previewOpen = ref(false)
const openPreview = (row: ReportRow) => {
  if (rowBlocked(row)) return
  previewRow.value = row
  previewOpen.value = true
}
const previewTitle = computed(() => {
  const row = previewRow.value
  if (!row) return ''
  if (row.picker === 'account') {
    const chosen = statementAccounts.value.find(account => account.system_key === chosenAccount.value || account.id === chosenAccount.value)
    if (chosen) return `${t('reports.books.accountStatement.short')} · ${accountName(chosen)}`
  }
  if (row.picker === 'productSort') return `${t(`${row.labelKey}.title`)} · ${t(`reports.sorts.${productSort.value}`)}`
  return t(`${row.labelKey}.title`)
})
const previewSubtitle = computed(() => (previewRow.value ? `${coversLabel(previewRow.value)} · ${scopeLabelFor(previewRow.value)}` : ''))
const loadPreview = () => fetchDocument(previewRow.value!.source(), 'pdf')

onMounted(() => {
  if (accountingOn.value && hasPermission('accounting', 'view') && !accounts.value.length) fetchAccounts()
})
</script>

<template>
  <div class="mx-auto flex max-w-6xl flex-col gap-5 py-2 sm:px-2 sm:py-4">
    <div>
      <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">{{ t('reports.title') }}</h1>
      <p class="mt-1 text-muted-foreground">{{ t('reports.subtitle') }}</p>
    </div>

    <div class="grid grid-cols-1 gap-3 rounded-xl border p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-4">
      <div class="flex flex-col gap-1.5">
        <Label for="report-period">{{ t('reports.list.periodLabel') }}</Label>
        <Select v-model="rangePreset">
          <SelectTrigger id="report-period" class="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="preset in presets" :key="preset" :value="preset">{{ rangePresetLabel(preset) }}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div class="flex flex-col gap-1.5">
        <Label for="report-from">{{ t('common.fields.from') }}</Label>
        <Input id="report-from" v-model="fromDate" type="date" :max="toDate || today" @input="onDateTyped" />
      </div>
      <div class="flex flex-col gap-1.5">
        <Label for="report-to">{{ t('common.fields.to') }}</Label>
        <Input id="report-to" v-model="toDate" type="date" :min="fromDate" :max="today" @input="onDateTyped" />
      </div>
      <div v-if="showShopPicker" class="flex flex-col gap-1.5">
        <Label for="report-shop">{{ t('reports.scope.label') }}</Label>
        <Select v-model="shopScope">
          <SelectTrigger id="report-shop" class="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem :value="activeShopScope">{{ t('reports.scope.current', { shop: activeShopName }) }}</SelectItem>
            <SelectItem :value="allShopsScope">{{ t('reports.scope.allShops') }}</SelectItem>
            <SelectItem v-for="shop in shopChoices.filter(shopChoice => shopChoice.id !== user?.shop_id)" :key="shop.id" :value="shop.id">{{ shop.name }}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <p v-if="rangeInvalid" class="text-sm text-destructive sm:col-span-2 lg:col-span-4">{{ t('reports.list.dateOrder') }}</p>
    </div>

    <div class="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead class="pl-4 sm:pl-5">{{ t('reports.books.report') }}</TableHead>
            <TableHead class="hidden md:table-cell">{{ t('reports.books.period') }}</TableHead>
            <TableHead class="pr-4 text-right sm:pr-5"><span class="sr-only">{{ t('reports.books.actions') }}</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-for="reportGroup in reportGroups" :key="reportGroup.group">
            <TableRow class="bg-muted/50 hover:bg-muted/50">
              <TableCell colspan="3" class="py-2 pl-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:pl-5">
                {{ t(`reports.groups.${reportGroup.group}`) }}
              </TableCell>
            </TableRow>
            <TableRow
              v-for="row in reportGroup.rows"
              :key="row.id"
              :class="rowBlocked(row) ? 'opacity-60' : 'cursor-pointer'"
              @click="openPreview(row)"
            >
              <TableCell class="py-3 pl-4 align-top sm:pl-5">
                <div class="flex items-start gap-3">
                  <span class="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <component :is="row.icon" class="size-4" />
                  </span>
                  <span class="min-w-0">
                    <span class="block font-medium">{{ t(`${row.labelKey}.title`) }}</span>
                    <span class="block text-sm text-muted-foreground">{{ t(`${row.labelKey}.description`) }}</span>
                    <span class="mt-0.5 block text-xs text-muted-foreground md:hidden">{{ coversLabel(row) }} · {{ scopeLabelFor(row) }}</span>
                    <span v-if="row.picker === 'account'" class="mt-2 block max-w-64" @click.stop>
                      <Select v-model="chosenAccount">
                        <SelectTrigger class="h-8 w-full" :aria-label="t('reports.books.account')">
                          <SelectValue :placeholder="t('reports.books.account')" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem v-for="account in statementAccounts" :key="account.id" :value="account.system_key ?? account.id">
                            {{ account.code }} · {{ accountName(account) }}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </span>
                    <span v-if="row.picker === 'productSort'" class="mt-2 block max-w-64" @click.stop>
                      <Select v-model="productSort">
                        <SelectTrigger class="h-8 w-full" :aria-label="t('reports.list.rankBy')">
                          <span class="flex min-w-0 items-center gap-1.5">
                            <span class="text-muted-foreground">{{ t('reports.list.rankBy') }}:</span>
                            <SelectValue />
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem v-for="sortChoice in productSorts" :key="sortChoice" :value="sortChoice">{{ t(`reports.sorts.${sortChoice}`) }}</SelectItem>
                        </SelectContent>
                      </Select>
                    </span>
                  </span>
                </div>
              </TableCell>
              <TableCell class="hidden whitespace-nowrap align-top text-sm text-muted-foreground md:table-cell">
                <span class="block">{{ coversLabel(row) }}</span>
                <span class="block">{{ scopeLabelFor(row) }}</span>
              </TableCell>
              <TableCell class="pr-4 text-right align-top sm:pr-5" @click.stop>
                <div class="flex items-center justify-end gap-1">
                  <Button size="sm" :disabled="rowBlocked(row)" @click="openPreview(row)">
                    <Eye />
                    {{ t('reports.books.preview') }}
                  </Button>
                  <Button variant="ghost" size="sm" class="hidden sm:inline-flex" :disabled="saving !== null || rowBlocked(row)" @click="saveDocument(row.source(), 'xlsx')">
                    <FileSpreadsheet />
                    {{ t('reports.excel') }}
                  </Button>
                  <Button variant="ghost" size="sm" class="hidden sm:inline-flex" :disabled="saving !== null || rowBlocked(row)" @click="saveDocument(row.source(), 'pdf')">
                    <FileText />
                    {{ t('reports.pdf') }}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </template>
        </TableBody>
      </Table>
    </div>

    <DocumentPreviewDialog
      v-model:open="previewOpen"
      :title="previewTitle"
      :subtitle="previewSubtitle"
      :load-pdf="loadPreview"
      :saving="saving"
      @download="(format) => previewRow && saveDocument(previewRow.source(), format)"
    />
  </div>
</template>
