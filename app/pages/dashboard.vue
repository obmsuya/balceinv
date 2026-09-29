<script setup lang="ts">
import { Boxes, CloudOff, PiggyBank, Receipt, RefreshCw, TrendingUp, Wallet } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import ExchangeRatesCard from '@/components/reports/ExchangeRatesCard.vue'
import StatCard from '@/components/reports/StatCard.vue'
import TrendChart from '@/components/reports/TrendChart.vue'
import { formatMoney } from '~/utils/money'
import { marginText, percentChange } from '~/utils/reportRanges'

const autoRefreshMilliseconds = 60 * 1000

const { user } = useAuth()
const { dashboard, exchangeRates, loading, loadError, ratesError, fetchDashboard, fetchExchangeRates } = useDashboard()

const allShopsSelected = ref(false)
const refreshingRates = ref(false)
let refreshTimer: ReturnType<typeof setInterval> | null = null

const hasSeveralShops = computed(() => (user.value?.shops.length ?? 0) > 1 || user.value?.is_owner === true)
const shopScope = computed(() => (allShopsSelected.value ? 'all' : ''))
const activeShopName = computed(() => user.value?.shops.find(shop => shop.id === user.value?.shop_id)?.name ?? 'This shop')

const greeting = computed(() => {
  const hour = new Date().getHours()
  const firstName = user.value?.name.split(' ')[0] ?? ''
  if (hour < 12) return `Good morning, ${firstName}`
  if (hour < 17) return `Good afternoon, ${firstName}`
  return `Good evening, ${firstName}`
})

const today = computed(() => dashboard.value?.today ?? null)
const salesChange = computed(() => dashboard.value ? percentChange(dashboard.value.today.total, dashboard.value.yesterday.total) : null)
const profitChange = computed(() => dashboard.value ? percentChange(dashboard.value.today.gross_profit, dashboard.value.yesterday.gross_profit) : null)
const stockAlertCount = computed(() => (dashboard.value ? dashboard.value.stock.low_count + dashboard.value.stock.out_count : 0))

const reload = () => fetchDashboard(shopScope.value)

const refreshRates = async () => {
  refreshingRates.value = true
  await fetchExchangeRates()
  refreshingRates.value = false
}

const timeOf = (isoDate: string) => new Date(isoDate).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })

watch(allShopsSelected, reload)

onMounted(() => {
  reload()
  fetchExchangeRates()
  refreshTimer = setInterval(() => {
    if (!document.hidden) reload()
  }, autoRefreshMilliseconds)
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})
</script>

<template>
  <div class="mx-auto flex max-w-7xl flex-col gap-6 py-2 sm:px-2 sm:py-4">
    <div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">{{ greeting }}</h1>
        <p class="mt-1 text-muted-foreground">
          {{ new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }) }} ·
          {{ allShopsSelected ? 'All shops' : activeShopName }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <div v-if="hasSeveralShops" class="flex rounded-lg bg-muted p-1 text-sm" role="group" aria-label="Which shops">
          <button
            type="button"
            class="rounded-md px-3 py-1 font-medium transition-colors"
            :class="!allShopsSelected ? 'bg-background shadow-sm' : 'text-muted-foreground'"
            :aria-pressed="!allShopsSelected"
            @click="allShopsSelected = false"
          >
            This shop
          </button>
          <button
            type="button"
            class="rounded-md px-3 py-1 font-medium transition-colors"
            :class="allShopsSelected ? 'bg-background shadow-sm' : 'text-muted-foreground'"
            :aria-pressed="allShopsSelected"
            @click="allShopsSelected = true"
          >
            All shops
          </button>
        </div>
        <Button variant="outline" size="icon" :disabled="loading" aria-label="Refresh the dashboard" @click="reload">
          <RefreshCw :class="loading ? 'animate-spin' : ''" />
        </Button>
      </div>
    </div>

    <div v-if="loadError" class="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
      <CloudOff class="size-4 shrink-0" />
      {{ loadError }}
    </div>

    <div class="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      <StatCard
        title="Sales today"
        :value="today ? formatMoney(today.total) : null"
        :change="salesChange"
        :hint="today ? `${today.sale_count} ${today.sale_count === 1 ? 'sale' : 'sales'} · vs yesterday` : ''"
        :icon="Wallet"
      />
      <StatCard
        title="Profit today"
        :value="today ? formatMoney(today.gross_profit) : null"
        :change="profitChange"
        :hint="today ? `${marginText(today.margin_basis_points)} margin, after tax and cost` : ''"
        :icon="PiggyBank"
      />
      <StatCard
        title="This month"
        :value="dashboard ? formatMoney(dashboard.month_to_date.total) : null"
        :hint="dashboard ? `${dashboard.month_to_date.sale_count} sales · ${formatMoney(dashboard.month_to_date.gross_profit)} profit` : ''"
        :icon="TrendingUp"
      />
      <NuxtLink to="/stock?status=low" class="rounded-xl transition-shadow hover:shadow-md">
        <StatCard
          title="Stock alerts"
          :value="dashboard ? String(stockAlertCount) : null"
          :hint="dashboard ? `${dashboard.stock.out_count} out · ${dashboard.stock.low_count} running low` : ''"
          :icon="Boxes"
        />
      </NuxtLink>
    </div>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card class="lg:col-span-2">
        <CardHeader>
          <CardTitle class="text-base">Last 14 days</CardTitle>
          <CardDescription>Sales and gross profit per day</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton v-if="!dashboard" class="h-64 w-full" />
          <TrendChart v-else :days="dashboard.last_two_weeks" />
        </CardContent>
      </Card>
      <ExchangeRatesCard :rates="exchangeRates" :load-error="ratesError" :refreshing="refreshingRates" @refresh="refreshRates" />
    </div>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle class="text-base">Best sellers</CardTitle>
          <CardDescription>By sales over the last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton v-if="!dashboard" class="h-40 w-full" />
          <p v-else-if="!dashboard.top_products.length" class="py-8 text-center text-sm text-muted-foreground">No sales in the last 30 days.</p>
          <ol v-else class="flex flex-col gap-3">
            <li v-for="(product, productIndex) in dashboard.top_products" :key="product.product_id" class="flex items-center gap-3">
              <span class="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">{{ productIndex + 1 }}</span>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium">{{ product.name }}<span v-if="product.variant_label" class="text-muted-foreground"> · {{ product.variant_label }}</span></p>
                <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div class="h-full rounded-full bg-primary" :style="{ width: `${Math.max((product.revenue / (dashboard.top_products[0]!.revenue || 1)) * 100, 2)}%` }" />
                </div>
              </div>
              <div class="shrink-0 text-right">
                <p class="text-sm font-semibold tabular-nums">{{ formatMoney(product.revenue) }}</p>
                <p class="text-xs text-muted-foreground tabular-nums">{{ product.quantity }} sold</p>
              </div>
            </li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-start justify-between">
          <div>
            <CardTitle class="text-base">Latest sales</CardTitle>
            <CardDescription>The most recent receipts</CardDescription>
          </div>
          <Button variant="ghost" size="sm" @click="navigateTo('/sales')">See all</Button>
        </CardHeader>
        <CardContent>
          <Skeleton v-if="!dashboard" class="h-40 w-full" />
          <p v-else-if="!dashboard.recent_sales.length" class="py-8 text-center text-sm text-muted-foreground">No sales yet.</p>
          <ul v-else class="divide-y">
            <li v-for="recentSale in dashboard.recent_sales" :key="recentSale.id" class="flex items-center gap-3 py-2.5">
              <span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                <Receipt class="size-4 text-muted-foreground" />
              </span>
              <div class="min-w-0 flex-1">
                <p class="truncate font-mono text-sm">{{ recentSale.receipt_number }}</p>
                <p class="truncate text-xs text-muted-foreground">{{ timeOf(recentSale.created_at) }} · {{ recentSale.cashier_name }}<template v-if="allShopsSelected"> · {{ recentSale.shop_name }}</template></p>
              </div>
              <span class="shrink-0 font-semibold tabular-nums">{{ formatMoney(recentSale.total) }}</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
