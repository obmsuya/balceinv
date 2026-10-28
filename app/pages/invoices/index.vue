<script setup lang="ts">
import { AlarmClock, ChevronDown, FileSpreadsheet, HandCoins, Plus, Search, Wallet } from 'lucide-vue-next'
import { useDebounceFn } from '@vueuse/core'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import InvoiceDetailsSheet from '@/components/invoices/InvoiceDetailsSheet.vue'
import InvoiceEditorDialog from '@/components/invoices/InvoiceEditorDialog.vue'
import type { Invoice, InvoiceKind, InvoiceStateFilter } from '@/composables/useInvoices'
import { availableInvoiceKinds, invoiceBadgeClasses, invoiceBadgeTone, invoicePageSize, isBill } from '@/composables/useInvoices'
import { formatMoney } from '~/utils/money'

type KindTab = 'all' | InvoiceKind
type StateChoice = 'all' | Exclude<InvoiceStateFilter, ''>

const { t, formatDate } = useI18n()
const { canCreate, canEdit } = usePermissions()
const { customersOn, suppliersOn } = useFeatures()
const { invoices, totalInvoices, summary, loading, fetchInvoices, fetchSummary } = useInvoices()

const creatableKinds = computed(() => availableInvoiceKinds(customersOn.value, suppliersOn.value))
const kindTabs = computed<KindTab[]>(() => ['all', ...creatableKinds.value])
const stateChoices: StateChoice[] = ['all', 'unpaid', 'part_paid', 'overdue', 'paid', 'draft', 'cancelled']

const activeKind = ref<KindTab>('all')
const activeState = ref<StateChoice>('all')
const searchText = ref('')
const pageOffset = ref(0)
const showEditor = ref(false)
const editorKind = ref<InvoiceKind>('invoice')
const editingInvoice = ref<Invoice | null>(null)
const showDetails = ref(false)
const openInvoiceId = ref<string | null>(null)

const reload = () => {
  fetchInvoices({
    kind: activeKind.value === 'all' ? '' : activeKind.value,
    state: activeState.value === 'all' ? '' : activeState.value,
    searchText: searchText.value.trim(),
    offset: pageOffset.value,
  })
  fetchSummary()
}

const reloadFromFirstPage = () => {
  pageOffset.value = 0
  reload()
}

watch(searchText, useDebounceFn(reloadFromFirstPage, 300))
watch([activeKind, activeState], reloadFromFirstPage)

const goToPage = (nextOffset: number) => {
  pageOffset.value = Math.max(nextOffset, 0)
  reload()
}

const startNew = (kind: InvoiceKind) => {
  editingInvoice.value = null
  editorKind.value = kind
  showEditor.value = true
}

const openInvoice = (invoiceId: string) => {
  openInvoiceId.value = invoiceId
  showDetails.value = true
}

const editInvoice = (invoice: Invoice) => {
  editingInvoice.value = invoice
  showDetails.value = false
  showEditor.value = true
}

const showIssued = (invoice: Invoice) => {
  reload()
  openInvoice(invoice.id)
}

const dateLabel = (dateText: string): string => formatDate(`${dateText}T00:00:00`)
const isFiltered = computed(() => searchText.value.trim() !== '' || activeState.value !== 'all' || activeKind.value !== 'all')

onMounted(reload)
</script>

<template>
  <div class="container mx-auto flex max-w-6xl flex-col gap-6 py-2 sm:px-4 sm:py-6">
    <div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">{{ t('invoices.page.title') }}</h1>
        <p class="mt-1 text-muted-foreground">{{ t('invoices.page.subtitle') }}</p>
      </div>
      <DropdownMenu v-if="canCreate('invoices') && creatableKinds.length">
        <DropdownMenuTrigger as-child>
          <Button><Plus />{{ t('invoices.page.new') }}<ChevronDown class="opacity-70" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-56">
          <DropdownMenuItem v-for="kind in creatableKinds" :key="kind" class="flex flex-col items-start gap-0.5" @select="startNew(kind)">
            <span class="font-medium">{{ t(`invoices.kind.${kind}`) }}</span>
            <span class="text-xs text-muted-foreground">{{ t(`invoices.kindHelp.${kind}`) }}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>

    <div class="grid gap-3 sm:grid-cols-3">
      <Card class="py-4">
        <CardContent class="flex items-start justify-between gap-3 px-4">
          <div class="min-w-0">
            <p class="text-sm text-muted-foreground">{{ t('invoices.summary.owed') }}</p>
            <p class="text-2xl font-bold tabular-nums">{{ formatMoney(summary?.owed_to_you ?? 0) }}</p>
            <p class="text-xs text-muted-foreground">{{ t('invoices.summary.owedCount', { count: summary?.owed_count ?? 0 }) }}</p>
          </div>
          <Wallet class="size-5 shrink-0 text-muted-foreground" />
        </CardContent>
      </Card>
      <Card class="py-4" :class="(summary?.overdue ?? 0) > 0 ? 'border-destructive/40' : ''">
        <CardContent class="flex items-start justify-between gap-3 px-4">
          <div class="min-w-0">
            <p class="text-sm text-muted-foreground">{{ t('invoices.summary.overdue') }}</p>
            <p class="text-2xl font-bold tabular-nums" :class="(summary?.overdue ?? 0) > 0 ? 'text-destructive' : ''">{{ formatMoney(summary?.overdue ?? 0) }}</p>
            <button v-if="(summary?.overdue_count ?? 0) > 0" type="button" class="text-xs text-destructive underline-offset-2 hover:underline" @click="activeState = 'overdue'">
              {{ t('invoices.summary.overdueCount', { count: summary?.overdue_count ?? 0 }) }}
            </button>
            <p v-else class="text-xs text-muted-foreground">{{ t('invoices.summary.nothingOverdue') }}</p>
          </div>
          <AlarmClock class="size-5 shrink-0" :class="(summary?.overdue ?? 0) > 0 ? 'text-destructive' : 'text-muted-foreground'" />
        </CardContent>
      </Card>
      <Card class="py-4">
        <CardContent class="flex items-start justify-between gap-3 px-4">
          <div class="min-w-0">
            <p class="text-sm text-muted-foreground">{{ t('invoices.summary.paidThisMonth') }}</p>
            <p class="text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">{{ formatMoney(summary?.paid_this_month ?? 0) }}</p>
            <p class="text-xs text-muted-foreground">{{ t('invoices.summary.awaitingDelivery', { count: summary?.awaiting_delivery_count ?? 0 }) }}</p>
          </div>
          <HandCoins class="size-5 shrink-0 text-muted-foreground" />
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardContent class="flex flex-col gap-4 px-3 sm:px-6">
        <Tabs v-model="activeKind">
          <TabsList class="w-full justify-start overflow-x-auto sm:w-auto">
            <TabsTrigger v-for="kindTab in kindTabs" :key="kindTab" :value="kindTab" class="flex-none">{{ t(`invoices.tabs.${kindTab}`) }}</TabsTrigger>
          </TabsList>
        </Tabs>

        <div class="flex flex-col gap-2 sm:flex-row">
          <div class="relative flex-1">
            <Label for="invoice-search" class="sr-only">{{ t('invoices.page.searchPlaceholder') }}</Label>
            <Search class="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input id="invoice-search" v-model="searchText" :placeholder="t('invoices.page.searchPlaceholder')" class="pl-8" autocomplete="off" />
          </div>
          <Select v-model="activeState">
            <SelectTrigger class="w-full sm:w-48" :aria-label="t('invoices.page.stateFilter')"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem v-for="stateChoice in stateChoices" :key="stateChoice" :value="stateChoice">{{ t(`invoices.stateFilter.${stateChoice}`) }}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div v-if="loading && !invoices.length" class="flex flex-col gap-2">
          <Skeleton v-for="skeletonRow in 5" :key="skeletonRow" class="h-12 w-full" />
        </div>
        <div v-else-if="!invoices.length" class="flex flex-col items-center gap-2 py-12 text-center">
          <FileSpreadsheet class="size-10 text-muted-foreground/50" />
          <p class="font-medium">{{ isFiltered ? t('invoices.page.noMatch') : t('invoices.page.emptyTitle') }}</p>
          <p v-if="!isFiltered" class="max-w-sm text-sm text-muted-foreground">{{ t('invoices.page.emptyBody') }}</p>
          <Button v-if="!isFiltered && canCreate('invoices') && customersOn" class="mt-2" @click="startNew('invoice')"><Plus />{{ t('invoices.page.firstInvoice') }}</Button>
        </div>
        <div v-else class="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{{ t('invoices.fields.number') }}</TableHead>
                <TableHead>{{ t(suppliersOn ? 'invoices.fields.party' : 'invoices.fields.customer') }}</TableHead>
                <TableHead class="hidden md:table-cell">{{ t('invoices.fields.dueDate') }}</TableHead>
                <TableHead class="hidden text-right sm:table-cell">{{ t('common.fields.total') }}</TableHead>
                <TableHead class="text-right">{{ t('invoices.fields.balanceDue') }}</TableHead>
                <TableHead class="hidden sm:table-cell">{{ t('invoices.fields.status') }}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="invoice in invoices" :key="invoice.id" class="cursor-pointer" @click="openInvoice(invoice.id)">
                <TableCell>
                  <p class="font-mono text-sm font-medium">{{ invoice.number }}</p>
                  <p class="text-xs text-muted-foreground">{{ t(`invoices.kind.${invoice.kind}`) }} · {{ dateLabel(invoice.issue_date) }}</p>
                </TableCell>
                <TableCell>
                  <p class="max-w-48 truncate text-sm font-medium">{{ invoice.party.name }}</p>
                  <Badge :class="[invoiceBadgeClasses[invoiceBadgeTone(invoice)], 'mt-1 sm:hidden']">{{ t(`invoices.badge.${invoiceBadgeTone(invoice)}`) }}</Badge>
                </TableCell>
                <TableCell class="hidden text-sm md:table-cell" :class="invoice.is_overdue ? 'font-medium text-destructive' : ''">
                  {{ invoice.due_date ? dateLabel(invoice.due_date) : '—' }}
                </TableCell>
                <TableCell class="hidden text-right tabular-nums sm:table-cell">{{ invoice.kind === 'delivery_note' ? '—' : formatMoney(invoice.total) }}</TableCell>
                <TableCell class="text-right font-semibold tabular-nums" :class="invoice.is_overdue ? 'text-destructive' : ''">
                  {{ isBill(invoice) && invoice.status !== 'cancelled' ? formatMoney(invoice.balance_due) : '—' }}
                </TableCell>
                <TableCell class="hidden sm:table-cell">
                  <Badge :class="invoiceBadgeClasses[invoiceBadgeTone(invoice)]">{{ t(`invoices.badge.${invoiceBadgeTone(invoice)}`) }}</Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <div v-if="totalInvoices > invoicePageSize" class="flex justify-end gap-2">
          <Button variant="outline" size="sm" :disabled="pageOffset === 0 || loading" @click="goToPage(pageOffset - invoicePageSize)">{{ t('common.pagination.previous') }}</Button>
          <Button variant="outline" size="sm" :disabled="pageOffset + invoicePageSize >= totalInvoices || loading" @click="goToPage(pageOffset + invoicePageSize)">{{ t('common.pagination.next') }}</Button>
        </div>
      </CardContent>
    </Card>

    <InvoiceEditorDialog
      v-if="canCreate('invoices') || canEdit('invoices')"
      v-model:open="showEditor"
      :invoice="editingInvoice"
      :preset-kind="editorKind"
      @saved="reload"
      @issued="showIssued"
    />
    <InvoiceDetailsSheet v-model:open="showDetails" :invoice-id="openInvoiceId" @changed="reload" @open-invoice="openInvoice" @edit="editInvoice" />
  </div>
</template>
