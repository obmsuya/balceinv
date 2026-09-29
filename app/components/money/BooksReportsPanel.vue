<script setup lang="ts">
import { CircleAlert, CircleCheck } from 'lucide-vue-next'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import MoneyExportButtons from '@/components/money/MoneyExportButtons.vue'
import type { AccountStatement, BooksCheck, ReportPeriod, TrialBalance, VatReport } from '@/composables/useMoney'
import { accountName } from '@/composables/useMoney'
import { formatMoney } from '~/utils/money'

type BooksReport = 'trial-balance' | 'statement' | 'vat' | 'check'

const props = defineProps<{ period: ReportPeriod; reloadKey: number }>()

const { t, formatDate } = useI18n()
const { vatOn } = useFeatures()
const { accounts, fetchAccounts, fetchTrialBalance, fetchStatement, fetchVatReport, fetchBooksCheck } = useMoney()

const chosenReport = ref<BooksReport>('statement')
const statementAccount = ref('cash')
const trialBalance = ref<TrialBalance | null>(null)
const statement = ref<AccountStatement | null>(null)
const vatReport = ref<VatReport | null>(null)
const booksCheck = ref<BooksCheck | null>(null)
const loading = ref(false)

const reportChoices = computed(() => [
  { value: 'statement', label: t('money.reports.statement') },
  { value: 'trial-balance', label: t('money.reports.trialBalance') },
  ...(vatOn.value ? [{ value: 'vat', label: t('money.reports.vat') }] : []),
  { value: 'check', label: t('money.reports.check') },
])
const statementQuery = computed(() => ({ ...props.period, account: statementAccount.value }))
const dayText = (isoDate: string) => formatDate(`${isoDate}T12:00:00`, { day: 'numeric', month: 'short', year: 'numeric' })
const monthText = (month: string) => formatDate(`${month}-15T12:00:00`, { month: 'long', year: 'numeric' })

const load = async () => {
  loading.value = true
  const asOf = props.period.to ?? ''
  if (chosenReport.value === 'trial-balance') trialBalance.value = await fetchTrialBalance(asOf)
  if (chosenReport.value === 'statement') statement.value = await fetchStatement(statementAccount.value, props.period)
  if (chosenReport.value === 'vat') vatReport.value = await fetchVatReport({ from: `${asOf.slice(0, 4)}-01-01`, to: asOf })
  if (chosenReport.value === 'check') booksCheck.value = await fetchBooksCheck(props.period)
  loading.value = false
}

watch(() => [chosenReport.value, statementAccount.value, props.period, props.reloadKey], load, { deep: true, immediate: true })
onMounted(() => {
  if (accounts.value.length === 0) fetchAccounts()
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div class="flex flex-col gap-1.5">
          <Label>{{ t('money.reports.choose') }}</Label>
          <Select v-model="chosenReport">
            <SelectTrigger class="w-full sm:w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem v-for="choice in reportChoices" :key="choice.value" :value="choice.value">{{ choice.label }}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div v-if="chosenReport === 'statement'" class="flex flex-col gap-1.5">
          <Label>{{ t('money.reports.account') }}</Label>
          <Select v-model="statementAccount">
            <SelectTrigger class="w-full sm:w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem v-for="account in accounts" :key="account.id" :value="account.system_key ?? account.id">{{ account.code }} · {{ accountName(account) }}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <MoneyExportButtons v-if="chosenReport === 'statement'" report="statement" :query="statementQuery" />
      <MoneyExportButtons v-else-if="chosenReport === 'trial-balance'" report="trial-balance" :query="{ as_of: period.to }" />
      <MoneyExportButtons v-else-if="chosenReport === 'vat'" report="vat" :query="{ from: `${(period.to ?? '').slice(0, 4)}-01-01`, to: period.to }" />
    </div>

    <Skeleton v-if="loading" class="h-64 w-full" />

    <template v-else-if="chosenReport === 'statement' && statement">
      <div class="grid grid-cols-2 gap-3 text-sm">
        <div class="rounded-lg border p-3"><p class="text-muted-foreground">{{ t('money.reports.openingBalance') }}</p><p class="text-lg font-semibold tabular-nums">{{ formatMoney(statement.opening_balance) }}</p></div>
        <div class="rounded-lg border p-3"><p class="text-muted-foreground">{{ t('money.reports.closingBalance') }}</p><p class="text-lg font-semibold tabular-nums">{{ formatMoney(statement.closing_balance) }}</p></div>
      </div>
      <p v-if="statement.lines.length === 0" class="py-4 text-center text-sm text-muted-foreground">{{ t('money.reports.noLines') }}</p>
      <div v-else class="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{{ t('common.fields.date') }}</TableHead>
              <TableHead>{{ t('money.reports.description') }}</TableHead>
              <TableHead class="text-right">{{ t('money.entries.debit') }}</TableHead>
              <TableHead class="text-right">{{ t('money.entries.credit') }}</TableHead>
              <TableHead class="text-right">{{ t('money.reports.balance') }}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="line in statement.lines" :key="`${line.entry_id}-${line.debit}-${line.credit}`">
              <TableCell class="whitespace-nowrap text-xs">{{ dayText(line.entry_date) }}<span class="block text-muted-foreground">{{ line.number }}</span></TableCell>
              <TableCell class="min-w-40">{{ t(`money.sources.${line.source_type}`) }}<span v-if="line.memo" class="block text-xs text-muted-foreground">{{ line.memo }}</span></TableCell>
              <TableCell class="text-right tabular-nums">{{ line.debit ? formatMoney(line.debit) : '' }}</TableCell>
              <TableCell class="text-right tabular-nums">{{ line.credit ? formatMoney(line.credit) : '' }}</TableCell>
              <TableCell class="text-right tabular-nums">{{ formatMoney(line.balance) }}</TableCell>
            </TableRow>
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colspan="2">{{ t('money.reports.totals') }}</TableCell>
              <TableCell class="text-right tabular-nums">{{ formatMoney(statement.total_debit) }}</TableCell>
              <TableCell class="text-right tabular-nums">{{ formatMoney(statement.total_credit) }}</TableCell>
              <TableCell class="text-right tabular-nums">{{ formatMoney(statement.closing_balance) }}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </template>

    <div v-else-if="chosenReport === 'trial-balance' && trialBalance" class="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{{ t('money.reports.account') }}</TableHead>
            <TableHead class="text-right">{{ t('money.entries.debit') }}</TableHead>
            <TableHead class="text-right">{{ t('money.entries.credit') }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="row in trialBalance.rows" :key="row.account_id">
            <TableCell><span class="font-mono text-xs text-muted-foreground">{{ row.code }}</span> {{ accountName(row) }}</TableCell>
            <TableCell class="text-right tabular-nums">{{ row.debit_balance ? formatMoney(row.debit_balance) : '' }}</TableCell>
            <TableCell class="text-right tabular-nums">{{ row.credit_balance ? formatMoney(row.credit_balance) : '' }}</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow :class="trialBalance.is_balanced ? '' : 'text-destructive'">
            <TableCell>{{ t('money.reports.totals') }}</TableCell>
            <TableCell class="text-right tabular-nums">{{ formatMoney(trialBalance.total_debit_balance) }}</TableCell>
            <TableCell class="text-right tabular-nums">{{ formatMoney(trialBalance.total_credit_balance) }}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>

    <div v-else-if="chosenReport === 'vat' && vatReport" class="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{{ t('money.reports.month') }}</TableHead>
            <TableHead class="text-right">{{ t('money.reports.vatCharged') }}</TableHead>
            <TableHead class="text-right">{{ t('money.reports.vatReclaimable') }}</TableHead>
            <TableHead class="text-right">{{ t('money.reports.vatToPay') }}</TableHead>
            <TableHead class="text-right">{{ t('money.reports.dueDate') }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="month in vatReport.months" :key="month.month">
            <TableCell>{{ monthText(month.month) }}</TableCell>
            <TableCell class="text-right tabular-nums">{{ formatMoney(month.charged) }}</TableCell>
            <TableCell class="text-right tabular-nums">{{ formatMoney(month.reclaimable) }}</TableCell>
            <TableCell class="text-right font-medium tabular-nums">{{ formatMoney(month.to_pay) }}</TableCell>
            <TableCell class="whitespace-nowrap text-right">{{ dayText(month.due_date) }}</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>{{ t('money.reports.totals') }}</TableCell>
            <TableCell class="text-right tabular-nums">{{ formatMoney(vatReport.total_charged) }}</TableCell>
            <TableCell class="text-right tabular-nums">{{ formatMoney(vatReport.total_reclaimable) }}</TableCell>
            <TableCell class="text-right tabular-nums">{{ formatMoney(vatReport.total_to_pay) }}</TableCell>
            <TableCell />
          </TableRow>
        </TableFooter>
      </Table>
    </div>

    <ul v-else-if="chosenReport === 'check' && booksCheck" class="flex flex-col gap-3 text-sm">
      <li class="flex gap-3 rounded-lg border p-3">
        <component :is="booksCheck.is_balanced ? CircleCheck : CircleAlert" class="size-5 shrink-0" :class="booksCheck.is_balanced ? 'text-emerald-600' : 'text-destructive'" />
        <span>{{ booksCheck.is_balanced ? t('money.reports.checkTrial') : t('money.reports.checkTrialBad') }}</span>
      </li>
      <li class="flex gap-3 rounded-lg border p-3">
        <component :is="booksCheck.sales_difference === 0 ? CircleCheck : CircleAlert" class="size-5 shrink-0" :class="booksCheck.sales_difference === 0 ? 'text-emerald-600' : 'text-amber-600'" />
        <span>
          {{ booksCheck.sales_difference === 0 ? t('money.reports.checkSales') : t('money.reports.checkSalesBad', { amount: formatMoney(booksCheck.sales_difference) }) }}
          <span class="block text-xs text-muted-foreground">{{ t('money.reports.checkSalesHelp', { ledger: formatMoney(booksCheck.ledger_sales), report: formatMoney(booksCheck.expected_ledger_sales) }) }}</span>
        </span>
      </li>
      <li class="flex gap-3 rounded-lg border p-3">
        <component :is="booksCheck.inventory_difference === 0 ? CircleCheck : CircleAlert" class="size-5 shrink-0" :class="booksCheck.inventory_difference === 0 ? 'text-emerald-600' : 'text-amber-600'" />
        <span>
          {{ booksCheck.inventory_difference === 0 ? t('money.reports.checkStock') : t('money.reports.checkStockBad', { amount: formatMoney(booksCheck.inventory_difference) }) }}
          <span class="block text-xs text-muted-foreground">{{ t('money.reports.checkStockHelp', { ledger: formatMoney(booksCheck.inventory_account), live: formatMoney(booksCheck.live_stock_value) }) }}</span>
        </span>
      </li>
      <li v-if="booksCheck.unposted_count > 0" class="flex gap-3 rounded-lg border p-3">
        <CircleAlert class="size-5 shrink-0 text-amber-600" />
        <span>{{ t('money.reports.checkMissing', { count: booksCheck.unposted_count }) }}</span>
      </li>
    </ul>
  </div>
</template>
