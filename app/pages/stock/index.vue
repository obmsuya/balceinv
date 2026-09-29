<script setup lang="ts">
import { PackagePlus, PackageX, Send, SlidersHorizontal, TriangleAlert, Wallet } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import AdjustStockDialog from '@/components/stock/AdjustStockDialog.vue'
import SendStockDialog from '@/components/stock/SendStockDialog.vue'
import StockHistoryPanel from '@/components/stock/StockHistoryPanel.vue'
import StockLevelsPanel from '@/components/stock/StockLevelsPanel.vue'
import StockArrivedDialog from '@/components/suppliers/StockArrivedDialog.vue'
import TransfersPanel from '@/components/stock/TransfersPanel.vue'
import type { StockLevel } from '@/composables/useStock'
import { productLabel } from '@/composables/useStock'
import { formatMoney } from '~/utils/money'

const route = useRoute()
const { t, formatNumber } = useI18n()
const { user } = useAuth()
const { canCreate } = usePermissions()
const { suppliersOn, accountingOn } = useFeatures()
const { summary, fetchSummary } = useStock()

const initialStatus = ['low', 'out'].includes(String(route.query.status)) ? String(route.query.status) as 'low' | 'out' : ''
const activeTab = ref(['history', 'transfers'].includes(String(route.query.tab)) ? String(route.query.tab) : 'levels')
const historyProduct = ref<{ id: string; label: string } | null>(null)
const showAdjustDialog = ref(false)
const adjustLevel = ref<StockLevel | null>(null)
const showSendDialog = ref(false)
const showArrivedDialog = ref(false)

const levelsPanel = ref<InstanceType<typeof StockLevelsPanel> | null>(null)
const historyPanel = ref<InstanceType<typeof StockHistoryPanel> | null>(null)
const transfersPanel = ref<InstanceType<typeof TransfersPanel> | null>(null)

const canChangeStock = computed(() => canCreate('stock_movements'))
const canRecordArrival = computed(() => (suppliersOn.value || accountingOn.value) && canCreate('purchases'))
const hasOtherShops = computed(() => (user.value?.shops.length ?? 0) > 1)
const activeShopName = computed(() => user.value?.shops.find(shop => shop.id === user.value?.shop_id)?.name)

const openAdjust = (level: StockLevel | null) => {
  adjustLevel.value = level
  showAdjustDialog.value = true
}

const openHistory = (level: StockLevel) => {
  historyProduct.value = { id: level.product_id, label: productLabel(level) }
  activeTab.value = 'history'
}

const refreshAfterChange = () => {
  fetchSummary()
  levelsPanel.value?.reload()
  historyPanel.value?.reload()
  transfersPanel.value?.reload()
}

onMounted(fetchSummary)
</script>

<template>
  <div class="container mx-auto flex flex-col gap-6 py-2 sm:px-4 sm:py-6">
    <div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">{{ t('stock.page.title') }}</h1>
        <p class="mt-1 text-muted-foreground">
          {{ activeShopName && hasOtherShops ? t('stock.page.subtitleAtShop', { shop: activeShopName }) : t('stock.page.subtitle') }}
        </p>
      </div>
      <div v-if="canChangeStock || canRecordArrival" class="flex flex-wrap gap-2">
        <Button v-if="canRecordArrival" variant="outline" @click="showArrivedDialog = true">
          <PackagePlus />
          {{ t('suppliers.page.recordArrived') }}
        </Button>
        <Button v-if="canChangeStock && hasOtherShops" variant="outline" @click="showSendDialog = true">
          <Send />
          {{ t('stock.page.sendStock') }}
        </Button>
        <Button v-if="canChangeStock" @click="openAdjust(null)">
          <SlidersHorizontal />
          {{ t('stock.page.changeStock') }}
        </Button>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2">
          <CardTitle class="text-sm font-medium">{{ t('stock.page.valueAtCost') }}</CardTitle>
          <Wallet class="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <Skeleton v-if="!summary" class="h-7 w-24" />
          <p v-else class="text-xl font-bold tabular-nums sm:text-2xl">{{ formatMoney(summary.value_at_cost) }}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2">
          <CardTitle class="text-sm font-medium">{{ t('stock.page.valueAtPrice') }}</CardTitle>
          <Wallet class="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <Skeleton v-if="!summary" class="h-7 w-24" />
          <p v-else class="text-xl font-bold tabular-nums sm:text-2xl">{{ formatMoney(summary.value_at_price) }}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2">
          <CardTitle class="text-sm font-medium">{{ t('stock.page.runningLow') }}</CardTitle>
          <TriangleAlert class="size-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <Skeleton v-if="!summary" class="h-7 w-12" />
          <p v-else class="text-xl font-bold tabular-nums sm:text-2xl">{{ formatNumber(summary.low_count) }}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2">
          <CardTitle class="text-sm font-medium">{{ t('stock.page.outOfStock') }}</CardTitle>
          <PackageX class="size-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <Skeleton v-if="!summary" class="h-7 w-12" />
          <p v-else class="text-xl font-bold tabular-nums sm:text-2xl" :class="summary.out_count ? 'text-destructive' : ''">{{ formatNumber(summary.out_count) }}</p>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardContent class="px-3 sm:px-6">
        <Tabs v-model="activeTab">
          <TabsList class="w-full sm:w-auto">
            <TabsTrigger value="levels" class="flex-1 sm:flex-none">{{ t('stock.page.levelsTab') }}</TabsTrigger>
            <TabsTrigger value="history" class="flex-1 sm:flex-none">{{ t('stock.page.historyTab') }}</TabsTrigger>
            <TabsTrigger v-if="hasOtherShops" value="transfers" class="flex-1 sm:flex-none">{{ t('stock.page.transfersTab') }}</TabsTrigger>
          </TabsList>
          <TabsContent value="levels" class="mt-4">
            <StockLevelsPanel ref="levelsPanel" :can-adjust="canChangeStock" :initial-status="initialStatus" @adjust="openAdjust" @history="openHistory" />
          </TabsContent>
          <TabsContent value="history" class="mt-4">
            <StockHistoryPanel ref="historyPanel" :product-filter="historyProduct" @clear-product="historyProduct = null" />
          </TabsContent>
          <TabsContent v-if="hasOtherShops" value="transfers" class="mt-4">
            <TransfersPanel ref="transfersPanel" />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>

    <AdjustStockDialog v-model:open="showAdjustDialog" :initial-level="adjustLevel" @saved="refreshAfterChange" />
    <SendStockDialog v-if="hasOtherShops" v-model:open="showSendDialog" @sent="refreshAfterChange" />
    <StockArrivedDialog v-if="canRecordArrival" v-model:open="showArrivedDialog" @saved="refreshAfterChange" />
  </div>
</template>
