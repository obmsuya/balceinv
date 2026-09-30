<script setup lang="ts">
import { BookOpen, Eye, FileSpreadsheet, FileText, Landmark, Receipt, Scale, Wallet, TrendingUp } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import DocumentPreviewDialog from '@/components/reports/DocumentPreviewDialog.vue'
import { accountName } from '@/composables/useMoney'
import type { StatementReport } from '@/composables/useStatements'
import { bookDocument } from '@/composables/useStatements'

const props = defineProps<{
  from: string
  to: string
  shop: string
  rangeLabel: string
  scopeLabel: string
}>()

const { t, formatDate } = useI18n()
const { fullAccountingOn, vatOn } = useFeatures()
const { accounts, fetchAccounts } = useMoney()
const { saving, fetchDocument, saveDocument } = useStatements()

interface BookRow {
  report: StatementReport
  key: string
  icon: typeof Wallet
  wholeBusiness: boolean
  asAt: boolean
}

const bookRows = computed<BookRow[]>(() => {
  const rows: BookRow[] = [
    { report: 'overview', key: 'overview', icon: Wallet, wholeBusiness: false, asAt: false },
    { report: 'profit-and-loss', key: 'profitAndLoss', icon: TrendingUp, wholeBusiness: false, asAt: false },
    { report: 'balance-sheet', key: 'balanceSheet', icon: Scale, wholeBusiness: true, asAt: true },
    { report: 'statement', key: 'accountStatement', icon: BookOpen, wholeBusiness: false, asAt: false },
  ]
  if (fullAccountingOn.value) rows.push({ report: 'trial-balance', key: 'trialBalance', icon: Landmark, wholeBusiness: true, asAt: true })
  if (vatOn.value) rows.push({ report: 'vat', key: 'vat', icon: Receipt, wholeBusiness: true, asAt: false })
  return rows
})

const statementAccounts = computed(() => accounts.value.filter(account => account.is_active && (fullAccountingOn.value || account.is_money)))
const chosenAccount = ref('cash')

const periodLabel = (row: BookRow) =>
  row.asAt ? t('reports.books.asAt', { date: formatDate(`${props.to}T12:00:00`, { day: 'numeric', month: 'short', year: 'numeric' }) }) : props.rangeLabel
const scopeLabelFor = (row: BookRow) => (row.wholeBusiness ? t('reports.scope.allShops') : props.scopeLabel)
const titleOf = (row: BookRow) => t(`reports.books.${row.key}.title`)
const descriptionOf = (row: BookRow) => t(`reports.books.${row.key}.description`)

const sourceFor = (row: BookRow) =>
  bookDocument(
    row.report,
    { from: props.from, to: props.to, shop: row.wholeBusiness ? '' : props.shop },
    row.report === 'statement' ? chosenAccount.value : undefined,
  )

const previewRow = ref<BookRow | null>(null)
const previewOpen = ref(false)
const openPreview = (row: BookRow) => {
  previewRow.value = row
  previewOpen.value = true
}
const previewTitle = computed(() => {
  if (!previewRow.value) return ''
  if (previewRow.value.report !== 'statement') return titleOf(previewRow.value)
  const chosen = statementAccounts.value.find(account => account.system_key === chosenAccount.value || account.id === chosenAccount.value)
  return chosen ? `${t('reports.books.accountStatement.short')} · ${accountName(chosen)}` : titleOf(previewRow.value)
})
const previewSubtitle = computed(() => (previewRow.value ? `${periodLabel(previewRow.value)} · ${scopeLabelFor(previewRow.value)}` : ''))
const loadPreview = () => fetchDocument(sourceFor(previewRow.value!), 'pdf')

onMounted(() => {
  if (!accounts.value.length) fetchAccounts()
})
</script>

<template>
  <div class="overflow-hidden rounded-xl border">
    <div class="border-b px-4 py-3 sm:px-5">
      <h2 class="font-semibold">{{ t('reports.books.title') }}</h2>
      <p class="mt-0.5 text-sm text-muted-foreground">{{ t('reports.books.description') }}</p>
    </div>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead class="pl-4 sm:pl-5">{{ t('reports.books.report') }}</TableHead>
          <TableHead class="hidden md:table-cell">{{ t('reports.books.period') }}</TableHead>
          <TableHead class="pr-4 text-right sm:pr-5"><span class="sr-only">{{ t('reports.books.actions') }}</span></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="row in bookRows" :key="row.report" class="cursor-pointer" @click="openPreview(row)">
          <TableCell class="py-3 pl-4 align-top sm:pl-5">
            <div class="flex items-start gap-3">
              <span class="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <component :is="row.icon" class="size-4" />
              </span>
              <span class="min-w-0">
                <span class="block font-medium">{{ titleOf(row) }}</span>
                <span class="block text-sm text-muted-foreground">{{ descriptionOf(row) }}</span>
                <span v-if="row.report === 'statement'" class="mt-2 block max-w-64" @click.stop>
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
              </span>
            </div>
          </TableCell>
          <TableCell class="hidden whitespace-nowrap align-top text-sm text-muted-foreground md:table-cell">
            <span class="block">{{ periodLabel(row) }}</span>
            <span class="block">{{ scopeLabelFor(row) }}</span>
          </TableCell>
          <TableCell class="pr-4 text-right align-top sm:pr-5" @click.stop>
            <div class="flex items-center justify-end gap-1">
              <Button size="sm" @click="openPreview(row)">
                <Eye />
                {{ t('reports.books.preview') }}
              </Button>
              <Button variant="ghost" size="sm" class="hidden sm:inline-flex" :disabled="saving !== null" @click="saveDocument(sourceFor(row), 'xlsx')">
                <FileSpreadsheet />
                {{ t('reports.excel') }}
              </Button>
              <Button variant="ghost" size="sm" class="hidden sm:inline-flex" :disabled="saving !== null" @click="saveDocument(sourceFor(row), 'pdf')">
                <FileText />
                {{ t('reports.pdf') }}
              </Button>
            </div>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>

    <DocumentPreviewDialog
      v-model:open="previewOpen"
      :title="previewTitle"
      :subtitle="previewSubtitle"
      :load-pdf="loadPreview"
      :saving="saving"
      @download="(format) => previewRow && saveDocument(sourceFor(previewRow), format)"
    />
  </div>
</template>
