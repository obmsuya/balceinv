<script setup lang="ts">
import {
  ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Banknote, BookPlus, CircleAlert, CreditCard, HandCoins, Landmark, Lock, PiggyBank, ReceiptText, Smartphone, TrendingUp, Wallet,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import StatCard from '@/components/reports/StatCard.vue'
import AccountsPanel from '@/components/money/AccountsPanel.vue'
import BooksReportsPanel from '@/components/money/BooksReportsPanel.vue'
import ClosePeriodDialog from '@/components/money/ClosePeriodDialog.vue'
import EntryDetailsDialog from '@/components/money/EntryDetailsDialog.vue'
import EntryList from '@/components/money/EntryList.vue'
import ManualEntryDialog from '@/components/money/ManualEntryDialog.vue'
import MoneyActionDialog from '@/components/money/MoneyActionDialog.vue'
import OwnOwePanel from '@/components/money/OwnOwePanel.vue'
import ProfitPanel from '@/components/money/ProfitPanel.vue'
import StartBooksWizard from '@/components/money/StartBooksWizard.vue'
import type { BooksEntry, BooksOverview, MoneyKind } from '@/composables/useMoney'
import { moneyPageSources } from '@/composables/useMoney'
import { formatMoney } from '~/utils/money'
import type { RangePreset } from '~/utils/reportRanges'
import { presetRange, rangePresetLabel, todayIn } from '~/utils/reportRanges'

const allShops = 'all'
const presets: RangePreset[] = ['thisMonth', 'lastMonth', 'today', 'last7', 'last30']

const { t, formatDate } = useI18n()
const { user } = useAuth()
const { fullAccountingOn } = useFeatures()
const { canCreate, canEdit } = usePermissions()
const { status, fetchStatus, fetchOverview, catchUp, saving } = useMoney()

const today = computed(() => status.value?.today ?? todayIn(user.value?.branding?.timezone))
const rangePreset = ref<RangePreset>('thisMonth')
const fromDate = ref(presetRange('thisMonth', today.value).from)
const toDate = ref(today.value)
const shopScope = ref(allShops)
const activeTab = ref('home')
const overview = ref<BooksOverview | null>(null)
const showWizard = ref(false)
const moneyKind = ref<MoneyKind | null>(null)
const showMoneyDialog = ref(false)
const openedEntry = ref<BooksEntry | null>(null)
const showEntryDialog = ref(false)
const showManualDialog = ref(false)
const showCloseDialog = ref(false)
const reloadKey = ref(0)

const shops = computed(() => user.value?.shops ?? [])
const period = computed(() => ({ from: fromDate.value, to: toDate.value, shop: shopScope.value === allShops ? undefined : shopScope.value }))
const isFull = computed(() => fullAccountingOn.value)
const canRecord = computed(() => canCreate('accounting'))
const canManage = computed(() => canEdit('accounting'))
const moneyEntryFilter = computed(() => ({ from: fromDate.value, to: toDate.value, source_type: moneyPageSources.join(','), shop: period.value.shop }))
const allEntryFilter = computed(() => ({ from: fromDate.value, to: toDate.value, shop: period.value.shop }))
const dayText = (isoDate: string) => formatDate(`${isoDate}T12:00:00`, { day: 'numeric', month: 'short' })

const moneyActions = computed(() => [
  { kind: 'expense' as MoneyKind, label: t('money.actions.moneyOut'), help: t('money.actions.moneyOutHelp'), icon: ArrowUpRight, primary: true },
  { kind: 'owner_in' as MoneyKind, label: t('money.actions.ownerIn'), help: t('money.actions.ownerInHelp'), icon: PiggyBank, primary: false },
  { kind: 'owner_out' as MoneyKind, label: t('money.actions.ownerOut'), help: t('money.actions.ownerOutHelp'), icon: HandCoins, primary: false },
  { kind: 'money_move' as MoneyKind, label: t('money.actions.moveMoney'), help: t('money.actions.moveMoneyHelp'), icon: ArrowLeftRight, primary: false },
  { kind: 'other_income' as MoneyKind, label: t('money.actions.otherIn'), help: t('money.actions.otherInHelp'), icon: ArrowDownLeft, primary: false },
])

const balanceRows = computed(() => {
  const balances = overview.value?.balances
  if (!balances) return []
  const rows = [
    { key: 'cash', label: t('money.accounts.cash'), icon: Banknote, amount: balances.cash },
    { key: 'mobile_money', label: t('money.accounts.mobile_money'), icon: Smartphone, amount: balances.mobile_money },
    { key: 'bank', label: t('money.accounts.bank'), icon: Landmark, amount: balances.bank },
  ]
  if (balances.card_clearing !== 0) rows.push({ key: 'card_clearing', label: t('money.balances.cardWaiting'), icon: CreditCard, amount: balances.card_clearing })
  return rows
})

const choosePreset = (preset: RangePreset) => {
  rangePreset.value = preset
  const chosenRange = presetRange(preset, today.value)
  fromDate.value = chosenRange.from
  toDate.value = chosenRange.to
}

const loadOverview = async () => {
  if (!status.value?.started || !fromDate.value || !toDate.value || fromDate.value > toDate.value) return
  overview.value = await fetchOverview(period.value)
}

const refreshAll = async () => {
  reloadKey.value += 1
  await fetchStatus()
  await loadOverview()
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

watch(period, loadOverview, { deep: true })

onMounted(async () => {
  const loadedStatus = await fetchStatus()
  if (!loadedStatus) return
  if (!loadedStatus.started) {
    showWizard.value = true
    return
  }
  fromDate.value = presetRange('thisMonth', loadedStatus.today).from
  toDate.value = loadedStatus.today
  await loadOverview()
})
</script>

<template>
  <div class="mx-auto flex w-full max-w-6xl flex-col gap-5 py-2 sm:px-2 sm:py-4">
    <div class="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
      <div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">{{ t('money.page.title') }}</h1>
        <p class="mt-1 text-muted-foreground">{{ isFull ? t('money.page.fullSubtitle') : t('money.page.subtitle') }}</p>
        <p v-if="status?.closed_until" class="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Lock class="size-3" /> {{ t('money.page.closedUntil', { date: dayText(status.closed_until) }) }}</p>
      </div>
      <div v-if="isFull && status?.started && !showWizard && canManage" class="flex flex-wrap gap-2">
        <Button variant="outline" @click="showManualDialog = true"><BookPlus /> {{ t('money.actions.manualEntry') }}</Button>
        <Button variant="outline" @click="showCloseDialog = true"><Lock /> {{ t('money.actions.closeMonth') }}</Button>
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

      <div class="flex flex-col gap-3 rounded-xl border p-3">
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
            <Label for="money-from" class="min-w-10 shrink-0 text-sm text-muted-foreground">{{ t('common.fields.from') }}</Label>
            <Input id="money-from" v-model="fromDate" type="date" :max="toDate" @input="rangePreset = 'custom'" />
          </div>
          <div class="flex items-center gap-2">
            <Label for="money-to" class="min-w-10 shrink-0 text-sm text-muted-foreground">{{ t('common.fields.to') }}</Label>
            <Input id="money-to" v-model="toDate" type="date" :min="fromDate" :max="today" @input="rangePreset = 'custom'" />
          </div>
          <Select v-if="shops.length > 1" v-model="shopScope">
            <SelectTrigger class="w-full" :aria-label="t('money.form.shop')"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem :value="allShops">{{ t('money.entries.filters.allShops') }}</SelectItem>
              <SelectItem v-for="shop in shops" :key="shop.id" :value="shop.id">{{ shop.name }}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs v-model="activeTab">
        <TabsList class="flex h-auto w-full flex-wrap justify-start sm:w-auto">
          <TabsTrigger value="home">{{ t('money.tabs.home') }}</TabsTrigger>
          <TabsTrigger value="profit">{{ t('money.tabs.profit') }}</TabsTrigger>
          <TabsTrigger value="ownOwe">{{ t('money.tabs.ownOwe') }}</TabsTrigger>
          <template v-if="isFull">
            <TabsTrigger value="entries">{{ t('money.tabs.entries') }}</TabsTrigger>
            <TabsTrigger value="accounts">{{ t('money.tabs.accounts') }}</TabsTrigger>
            <TabsTrigger value="reports">{{ t('money.tabs.reports') }}</TabsTrigger>
          </template>
        </TabsList>

        <TabsContent value="home" class="mt-4 flex flex-col gap-5">
          <div class="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <StatCard :title="t('money.cards.moneyIn')" :value="overview ? formatMoney(overview.money_in) : null" :hint="t('money.cards.moneyInHint')" :icon="ArrowDownLeft" />
            <StatCard :title="t('money.cards.moneyOut')" :value="overview ? formatMoney(overview.money_out) : null" :hint="t('money.cards.moneyOutHint')" :icon="ArrowUpRight" />
            <StatCard
              class="col-span-2 lg:col-span-1"
              :title="overview && overview.profit < 0 ? t('money.cards.loss') : t('money.cards.profit')"
              :value="overview ? formatMoney(Math.abs(overview.profit)) : null"
              :hint="t('money.cards.profitHint')"
              :icon="TrendingUp"
            />
          </div>

          <Card v-if="overview?.vat" class="border-primary/40">
            <CardHeader class="pb-2">
              <CardTitle class="flex items-center gap-2 text-base"><ReceiptText class="size-4" /> {{ t('money.vat.cardTitle', { date: dayText(overview.vat.due_date) }) }}</CardTitle>
            </CardHeader>
            <CardContent>
              <p v-if="overview.vat.to_pay >= 0" class="text-2xl font-bold tabular-nums">{{ formatMoney(overview.vat.to_pay) }}</p>
              <p v-else class="text-lg font-semibold">{{ t('money.vat.owedBack', { amount: formatMoney(-overview.vat.to_pay) }) }}</p>
              <p class="mt-1 text-xs text-muted-foreground">{{ t('money.vat.charged', { amount: formatMoney(overview.vat.charged) }) }} · {{ t('money.vat.reclaimable', { amount: formatMoney(overview.vat.reclaimable) }) }}</p>
            </CardContent>
          </Card>

          <div class="flex flex-col gap-2">
            <p class="flex items-center gap-2 font-semibold"><Wallet class="size-4" /> {{ t('money.balances.title') }}</p>
            <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div v-if="!overview" class="contents"><Skeleton v-for="placeholder in 3" :key="placeholder" class="h-16" /></div>
              <div v-for="row in balanceRows" :key="row.key" class="flex items-center gap-3 rounded-xl border p-3">
                <component :is="row.icon" class="size-5 text-muted-foreground" />
                <span class="flex-1 text-sm">{{ row.label }}</span>
                <span class="font-semibold tabular-nums" :class="row.amount < 0 ? 'text-destructive' : ''">{{ formatMoney(row.amount) }}</span>
              </div>
            </div>
          </div>

          <div v-if="canRecord" class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <Button
              v-for="action in moneyActions"
              :key="action.kind"
              :variant="action.primary ? 'default' : 'outline'"
              class="h-auto min-h-16 flex-col items-start gap-0.5 whitespace-normal px-3 py-3 text-left"
              :class="action.primary ? 'col-span-2 sm:col-span-1' : ''"
              @click="openMoney(action.kind)"
            >
              <span class="flex items-center gap-2 text-base font-semibold"><component :is="action.icon" class="size-5" /> {{ action.label }}</span>
              <span class="text-xs font-normal opacity-80">{{ action.help }}</span>
            </Button>
          </div>

          <div class="flex flex-col gap-2">
            <p class="font-semibold">{{ t('money.entries.recentTitle') }}</p>
            <EntryList :filter="moneyEntryFilter" :reload-key="reloadKey" @open="openEntry" />
          </div>
        </TabsContent>

        <TabsContent value="profit" class="mt-4">
          <ProfitPanel :period="period" :plain="!isFull" :reload-key="reloadKey" />
        </TabsContent>

        <TabsContent value="ownOwe" class="mt-4">
          <OwnOwePanel :as-of="toDate" :plain="!isFull" :reload-key="reloadKey" />
        </TabsContent>

        <template v-if="isFull">
          <TabsContent value="entries" class="mt-4">
            <EntryList :filter="allEntryFilter" :reload-key="reloadKey" show-numbers @open="openEntry" />
          </TabsContent>
          <TabsContent value="accounts" class="mt-4">
            <AccountsPanel />
          </TabsContent>
          <TabsContent value="reports" class="mt-4">
            <BooksReportsPanel :period="period" :reload-key="reloadKey" />
          </TabsContent>
        </template>
      </Tabs>
    </template>

    <MoneyActionDialog v-if="status" v-model:open="showMoneyDialog" :kind="moneyKind" :today="today" :vat-rate-basis-points="status.vat_rate_basis_points" @saved="refreshAll" />
    <EntryDetailsDialog v-model:open="showEntryDialog" :entry="openedEntry" :show-lines="isFull" @reversed="refreshAll" />
    <template v-if="isFull && status">
      <ManualEntryDialog v-model:open="showManualDialog" :today="today" @saved="refreshAll" />
      <ClosePeriodDialog v-model:open="showCloseDialog" :status="status" @closed="refreshAll" />
    </template>
  </div>
</template>
