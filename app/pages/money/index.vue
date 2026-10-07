<script setup lang="ts">
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, BookPlus, ChevronDown, CircleAlert, Ellipsis, FileText, HandCoins, ListChecks, Lock, PiggyBank, Plus, Rows3 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import AccountsPanel from '@/components/money/AccountsPanel.vue'
import BooksCheckDialog from '@/components/money/BooksCheckDialog.vue'
import ClosePeriodDialog from '@/components/money/ClosePeriodDialog.vue'
import EntriesTable from '@/components/money/EntriesTable.vue'
import EntryDetailsDialog from '@/components/money/EntryDetailsDialog.vue'
import ManualEntryDialog from '@/components/money/ManualEntryDialog.vue'
import MoneyActionDialog from '@/components/money/MoneyActionDialog.vue'
import StartBooksWizard from '@/components/money/StartBooksWizard.vue'
import type { BooksCheck, BooksEntry, BooksOverview, MoneyKind } from '@/composables/useMoney'
import { moneyPageSources } from '@/composables/useMoney'
import { formatMoney } from '~/utils/money'
import type { RangePreset } from '~/utils/reportRanges'
import { presetRange, rangePresetLabel, todayIn } from '~/utils/reportRanges'

const allShops = 'all'
const presets: RangePreset[] = ['today', 'yesterday', 'last7', 'last30', 'thisMonth', 'lastMonth', 'custom']

const { t, formatDate } = useI18n()
const { user } = useAuth()
const { fullAccountingOn } = useFeatures()
const { canCreate, canEdit, hasPermission } = usePermissions()
const { status, fetchStatus, fetchOverview, fetchBooksCheck, catchUp, saving } = useMoney()

const today = computed(() => status.value?.today ?? todayIn(user.value?.branding?.timezone))
const rangePreset = ref<RangePreset>('thisMonth')
const fromDate = ref(presetRange('thisMonth', today.value).from)
const toDate = ref(today.value)
const shopScope = ref(allShops)
const showEveryEntry = ref('money')
const overview = ref<BooksOverview | null>(null)
const booksCheck = ref<BooksCheck | null>(null)
const showWizard = ref(false)
const moneyKind = ref<MoneyKind | null>(null)
const showMoneyDialog = ref(false)
const openedEntry = ref<BooksEntry | null>(null)
const showEntryDialog = ref(false)
const showManualDialog = ref(false)
const showCloseDialog = ref(false)
const showAccountsDialog = ref(false)
const showCheckDialog = ref(false)
const reloadKey = ref(0)

const shops = computed(() => user.value?.shops ?? [])
const isFull = computed(() => fullAccountingOn.value)
const canRecord = computed(() => canCreate('accounting'))
const canManage = computed(() => canEdit('accounting'))
const rangeInvalid = computed(() => !fromDate.value || !toDate.value || fromDate.value > toDate.value)
const period = computed(() => ({ from: fromDate.value, to: toDate.value, shop: shopScope.value === allShops ? undefined : shopScope.value }))
const entryFilter = computed(() => ({
  ...period.value,
  source_type: showEveryEntry.value === 'all' ? undefined : moneyPageSources.join(','),
}))
const shortDate = (isoDate: string) => formatDate(`${isoDate}T12:00:00`, { day: 'numeric', month: 'short', year: 'numeric' })
const periodLabel = computed(() => (fromDate.value === toDate.value ? shortDate(fromDate.value) : `${shortDate(fromDate.value)} – ${shortDate(toDate.value)}`))

const otherActions = computed(() => [
  { kind: 'other_income' as MoneyKind, label: t('money.actions.otherIn'), help: t('money.actions.otherInHelp'), icon: ArrowDownLeft },
  { kind: 'money_move' as MoneyKind, label: t('money.actions.moveMoney'), help: t('money.actions.moveMoneyHelp'), icon: ArrowLeftRight },
  { kind: 'owner_in' as MoneyKind, label: t('money.actions.ownerIn'), help: t('money.actions.ownerInHelp'), icon: PiggyBank },
  { kind: 'owner_out' as MoneyKind, label: t('money.actions.ownerOut'), help: t('money.actions.ownerOutHelp'), icon: HandCoins },
])

const balancesText = computed(() => {
  const balances = overview.value?.balances
  if (!balances) return ''
  const parts = [
    `${t('money.accounts.cash')} ${formatMoney(balances.cash)}`,
    `${t('money.accounts.mobile_money')} ${formatMoney(balances.mobile_money)}`,
    `${t('money.accounts.bank')} ${formatMoney(balances.bank)}`,
  ]
  if (balances.card_clearing !== 0) parts.push(`${t('money.accounts.card_clearing')} ${formatMoney(balances.card_clearing)}`)
  return parts.join(' · ')
})
const booksNeedLook = computed(() => booksCheck.value !== null && (!booksCheck.value.is_balanced || booksCheck.value.sales_difference !== 0))

watch(rangePreset, (preset) => {
  if (preset === 'custom') return
  const chosenRange = presetRange(preset, today.value)
  fromDate.value = chosenRange.from
  toDate.value = chosenRange.to
})
const onDateTyped = () => {
  rangePreset.value = 'custom'
}

const loadPeriod = async () => {
  if (!status.value?.started || rangeInvalid.value) return
  const [loadedOverview, loadedCheck] = await Promise.all([
    fetchOverview(period.value),
    isFull.value ? fetchBooksCheck(period.value) : Promise.resolve(null),
  ])
  overview.value = loadedOverview
  booksCheck.value = loadedCheck
}

const refreshAll = async () => {
  reloadKey.value += 1
  await fetchStatus()
  await loadPeriod()
}

const openMoney = (kind: MoneyKind) => {
  moneyKind.value = kind
  showMoneyDialog.value = true
}

const openEntry = (entry: BooksEntry) => {
  openedEntry.value = entry
  showEntryDialog.value = true
}

const finishWizard = async () => {
  showWizard.value = false
  await refreshAll()
}

const runCatchUp = async () => {
  await catchUp()
  await refreshAll()
}

watch(period, loadPeriod, { deep: true })

onMounted(async () => {
  const loadedStatus = await fetchStatus()
  if (!loadedStatus) return
  if (!loadedStatus.started) {
    showWizard.value = true
    return
  }
  fromDate.value = presetRange('thisMonth', loadedStatus.today).from
  toDate.value = loadedStatus.today
  await loadPeriod()
})
</script>

<template>
  <div class="mx-auto flex w-full max-w-6xl flex-col gap-5 py-2 sm:px-2 sm:py-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-64 flex-1">
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">{{ t('money.page.title') }}</h1>
        <p class="mt-1 text-muted-foreground">{{ isFull ? t('money.page.fullSubtitle') : t('money.page.subtitle') }}</p>
        <p v-if="status?.closed_until" class="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Lock class="size-3" /> {{ t('money.page.closedUntil', { date: shortDate(status.closed_until) }) }}</p>
      </div>
      <div v-if="status?.started && !showWizard" class="flex flex-wrap gap-2">
        <template v-if="canRecord">
          <Button :title="t('money.actions.moneyOutHelp')" data-tour="money-out" @click="openMoney('expense')"><ArrowUpRight /> {{ t('money.actions.moneyOut') }}</Button>
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button variant="outline" data-tour="money-other"><Plus /> {{ t('money.actions.recordOther') }} <ChevronDown class="opacity-60" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" class="w-72">
              <DropdownMenuItem v-for="action in otherActions" :key="action.kind" class="items-start gap-3 py-2" @select="openMoney(action.kind)">
                <component :is="action.icon" class="mt-0.5 size-4" />
                <span class="flex flex-col">
                  <span class="font-medium">{{ action.label }}</span>
                  <span class="text-xs text-muted-foreground">{{ action.help }}</span>
                </span>
              </DropdownMenuItem>
              <template v-if="isFull && canManage">
                <DropdownMenuSeparator />
                <DropdownMenuItem class="gap-3" @select="showManualDialog = true"><BookPlus class="size-4" /> {{ t('money.actions.manualEntry') }}</DropdownMenuItem>
              </template>
            </DropdownMenuContent>
          </DropdownMenu>
        </template>
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="outline" size="icon" data-tour="money-more" :aria-label="t('money.actions.more')"><Ellipsis /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem v-if="hasPermission('reports', 'view')" class="gap-3" @select="navigateTo('/reports')"><FileText class="size-4" /> {{ t('money.actions.openReports') }}</DropdownMenuItem>
            <template v-if="isFull">
              <DropdownMenuItem class="gap-3" @select="showCheckDialog = true"><ListChecks class="size-4" /> {{ t('money.check.title') }}</DropdownMenuItem>
              <DropdownMenuItem class="gap-3" @select="showAccountsDialog = true"><Rows3 class="size-4" /> {{ t('money.accountsPanel.title') }}</DropdownMenuItem>
              <DropdownMenuItem v-if="canManage" class="gap-3" @select="showCloseDialog = true"><Lock class="size-4" /> {{ t('money.actions.closeMonth') }}</DropdownMenuItem>
            </template>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>

    <Skeleton v-if="!status" class="h-80 w-full" />

    <template v-else-if="showWizard || !status.started">
      <StartBooksWizard v-if="canManage" :status="status" @started="finishWizard" />
      <Card v-else><CardContent class="py-8 text-center text-muted-foreground">{{ t('money.page.notStartedNoEdit') }}</CardContent></Card>
    </template>

    <template v-else>
      <div v-if="status.unposted_count > 0 && canManage" class="flex flex-col gap-3 rounded-xl border border-amber-500/50 bg-amber-500/10 p-4 sm:flex-row sm:items-center">
        <CircleAlert class="size-5 shrink-0 text-amber-600" />
        <div class="flex-1">
          <p class="font-medium">{{ t('money.catchUp.title') }}</p>
          <p class="text-sm text-muted-foreground">{{ t('money.catchUp.help', { count: status.unposted_count }) }}</p>
        </div>
        <Button :disabled="saving" @click="runCatchUp">{{ t('money.catchUp.button') }}</Button>
      </div>

      <div v-if="booksNeedLook" class="flex flex-col gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 sm:flex-row sm:items-center">
        <CircleAlert class="size-5 shrink-0 text-destructive" />
        <div class="flex-1">
          <p class="font-medium">{{ t('money.check.problem') }}</p>
          <p class="text-sm text-muted-foreground">{{ t('money.check.problemHelp') }}</p>
        </div>
        <Button variant="outline" @click="showCheckDialog = true">{{ t('money.check.open') }}</Button>
      </div>

      <div class="grid grid-cols-1 gap-3 rounded-xl border p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-5">
        <div class="flex flex-col gap-1.5">
          <Label for="money-period">{{ t('reports.list.periodLabel') }}</Label>
          <Select v-model="rangePreset">
            <SelectTrigger id="money-period" class="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem v-for="preset in presets" :key="preset" :value="preset">{{ rangePresetLabel(preset) }}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="flex flex-col gap-1.5">
          <Label for="money-from">{{ t('common.fields.from') }}</Label>
          <Input id="money-from" v-model="fromDate" type="date" :max="toDate || today" @input="onDateTyped" />
        </div>
        <div class="flex flex-col gap-1.5">
          <Label for="money-to">{{ t('common.fields.to') }}</Label>
          <Input id="money-to" v-model="toDate" type="date" :min="fromDate" :max="today" @input="onDateTyped" />
        </div>
        <div v-if="shops.length > 1" class="flex flex-col gap-1.5">
          <Label for="money-shop">{{ t('money.form.shop') }}</Label>
          <Select v-model="shopScope">
            <SelectTrigger id="money-shop" class="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem :value="allShops">{{ t('money.entries.filters.allShops') }}</SelectItem>
              <SelectItem v-for="shop in shops" :key="shop.id" :value="shop.id">{{ shop.name }}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="flex flex-col gap-1.5">
          <Label for="money-show">{{ t('money.entries.show.label') }}</Label>
          <Select v-model="showEveryEntry">
            <SelectTrigger id="money-show" class="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="money">{{ t('money.entries.show.money') }}</SelectItem>
              <SelectItem value="all">{{ t('money.entries.show.all') }}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p v-if="rangeInvalid" class="text-sm text-destructive sm:col-span-2 lg:col-span-full">{{ t('reports.list.dateOrder') }}</p>
      </div>

      <p v-if="balancesText" class="text-sm text-muted-foreground">
        <span class="font-medium text-foreground">{{ t('money.balances.on', { date: shortDate(toDate) }) }}</span>
        {{ balancesText }}
      </p>

      <EntriesTable v-if="!rangeInvalid" data-tour="money-table" :filter="entryFilter" :reload-key="reloadKey" :show-numbers="isFull" @open="openEntry" />
    </template>

    <MoneyActionDialog v-if="status" v-model:open="showMoneyDialog" :kind="moneyKind" :today="today" :vat-rate-basis-points="status.vat_rate_basis_points" @saved="refreshAll" />
    <EntryDetailsDialog v-model:open="showEntryDialog" :entry="openedEntry" :show-lines="isFull" @reversed="refreshAll" />
    <template v-if="isFull && status">
      <ManualEntryDialog v-model:open="showManualDialog" :today="today" @saved="refreshAll" />
      <ClosePeriodDialog v-model:open="showCloseDialog" :status="status" @closed="refreshAll" />
      <BooksCheckDialog v-model:open="showCheckDialog" :check="booksCheck" :period-label="periodLabel" />
      <Dialog v-model:open="showAccountsDialog">
        <DialogContent class="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{{ t('money.accountsPanel.title') }}</DialogTitle>
            <DialogDescription>{{ t('money.accountsPanel.description') }}</DialogDescription>
          </DialogHeader>
          <AccountsPanel />
        </DialogContent>
      </Dialog>
    </template>
  </div>
</template>
