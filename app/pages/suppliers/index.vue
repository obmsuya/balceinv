<script setup lang="ts">
import { AlarmClock, ClipboardPlus, PackagePlus, Plus, Search, Truck, Wallet } from 'lucide-vue-next'
import { useDebounceFn } from '@vueuse/core'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import OrderFormDialog from '@/components/suppliers/OrderFormDialog.vue'
import OrdersPanel from '@/components/suppliers/OrdersPanel.vue'
import PaySupplierDialog from '@/components/suppliers/PaySupplierDialog.vue'
import PaymentsPanel from '@/components/suppliers/PaymentsPanel.vue'
import PurchasesPanel from '@/components/suppliers/PurchasesPanel.vue'
import StockArrivedDialog from '@/components/suppliers/StockArrivedDialog.vue'
import SupplierFormDialog from '@/components/suppliers/SupplierFormDialog.vue'
import type { AgingReport, Supplier } from '@/composables/useSuppliers'
import { supplierPageSize } from '@/composables/useSuppliers'
import { formatMoney } from '~/utils/money'

const route = useRoute()
const { t } = useI18n()
const { canCreate, canEdit, canView } = usePermissions()
const { purchaseOrdersOn } = useFeatures()
const { listSuppliers, fetchAging, loading } = useSuppliers()

const tabNames = ['suppliers', 'arrived', 'payments', 'orders']
const activeTab = ref(tabNames.includes(String(route.query.tab)) ? String(route.query.tab) : 'suppliers')
const suppliers = ref<Supplier[]>([])
const totalSuppliers = ref(0)
const pageOffset = ref(0)
const searchText = ref('')
const includeInactive = ref(false)
const aging = ref<AgingReport | null>(null)
const showSupplierForm = ref(false)
const showArrived = ref(false)
const showPay = ref(false)
const showOrderForm = ref(false)

const purchasesPanel = ref<InstanceType<typeof PurchasesPanel> | null>(null)
const paymentsPanel = ref<InstanceType<typeof PaymentsPanel> | null>(null)
const ordersPanel = ref<InstanceType<typeof OrdersPanel> | null>(null)

const overdueTotal = computed(() => {
  const totals = aging.value?.totals
  return totals ? totals.days_1_30 + totals.days_31_60 + totals.days_61_90 + totals.days_over_90 : 0
})

const reloadSuppliers = async () => {
  const supplierPage = await listSuppliers({ searchText: searchText.value.trim(), includeInactive: includeInactive.value, offset: pageOffset.value })
  suppliers.value = supplierPage.items
  totalSuppliers.value = supplierPage.total
}

const reloadAll = () => {
  reloadSuppliers()
  fetchAging().then(report => { aging.value = report })
  purchasesPanel.value?.reload()
  paymentsPanel.value?.reload()
  ordersPanel.value?.reload()
}

const searchLater = useDebounceFn(() => {
  pageOffset.value = 0
  reloadSuppliers()
}, 250)

watch(searchText, searchLater)
watch(includeInactive, () => {
  pageOffset.value = 0
  reloadSuppliers()
})

const goToPage = (nextOffset: number) => {
  pageOffset.value = Math.max(nextOffset, 0)
  reloadSuppliers()
}

onMounted(reloadAll)
</script>

<template>
  <div class="container mx-auto flex max-w-5xl flex-col gap-6 py-2 sm:px-4 sm:py-6">
    <div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">{{ t('suppliers.page.title') }}</h1>
        <p class="mt-1 text-muted-foreground">{{ t('suppliers.page.subtitle') }}</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button v-if="canCreate('purchases')" @click="showArrived = true"><PackagePlus /> {{ t('suppliers.page.recordArrived') }}</Button>
        <Button v-if="canEdit('purchases')" variant="outline" @click="showPay = true"><Wallet /> {{ t('suppliers.page.paySupplier') }}</Button>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2">
          <CardTitle class="text-sm font-medium">{{ t('suppliers.page.youOwe') }}</CardTitle>
          <Wallet class="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <Skeleton v-if="!aging" class="h-7 w-24" />
          <p v-else class="text-xl font-bold tabular-nums sm:text-2xl">{{ formatMoney(aging.total_balance) }}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2">
          <CardTitle class="text-sm font-medium">{{ t('suppliers.page.overdue') }}</CardTitle>
          <AlarmClock class="size-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <Skeleton v-if="!aging" class="h-7 w-24" />
          <p v-else class="text-xl font-bold tabular-nums sm:text-2xl" :class="overdueTotal ? 'text-amber-600' : ''">{{ formatMoney(overdueTotal) }}</p>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardContent class="px-3 sm:px-6">
        <Tabs v-model="activeTab">
          <TabsList class="w-full sm:w-auto">
            <TabsTrigger value="suppliers" class="flex-1 sm:flex-none">{{ t('suppliers.page.suppliersTab') }}</TabsTrigger>
            <TabsTrigger v-if="canView('purchases')" value="arrived" class="flex-1 sm:flex-none">{{ t('suppliers.page.arrivedTab') }}</TabsTrigger>
            <TabsTrigger v-if="canView('purchases')" value="payments" class="flex-1 sm:flex-none">{{ t('suppliers.page.paymentsTab') }}</TabsTrigger>
            <TabsTrigger v-if="purchaseOrdersOn && canView('purchases')" value="orders" class="flex-1 sm:flex-none">{{ t('suppliers.page.ordersTab') }}</TabsTrigger>
          </TabsList>

          <TabsContent value="suppliers" class="mt-4 flex flex-col gap-3">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div class="relative flex-1">
                <Search class="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input v-model="searchText" :placeholder="t('suppliers.page.searchPlaceholder')" class="pl-8" :aria-label="t('suppliers.page.searchPlaceholder')" />
              </div>
              <div class="flex items-center gap-2">
                <Switch id="suppliers-inactive" v-model="includeInactive" />
                <Label for="suppliers-inactive" class="text-sm">{{ t('suppliers.page.showInactive') }}</Label>
              </div>
              <Button v-if="canCreate('suppliers')" variant="outline" @click="showSupplierForm = true"><Plus /> {{ t('suppliers.page.addSupplier') }}</Button>
            </div>

            <div v-if="loading && !suppliers.length" class="flex flex-col gap-2">
              <Skeleton v-for="skeletonRow in 3" :key="skeletonRow" class="h-16 w-full" />
            </div>
            <div v-else-if="!suppliers.length" class="flex flex-col items-center gap-2 py-10 text-center">
              <Truck class="size-10 text-muted-foreground/50" />
              <p class="font-medium">{{ t('suppliers.page.emptyTitle') }}</p>
              <p class="text-sm text-muted-foreground">{{ t('suppliers.page.emptyHint') }}</p>
            </div>
            <NuxtLink
              v-for="supplier in suppliers"
              :key="supplier.id"
              :to="`/suppliers/${supplier.id}`"
              class="flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors hover:bg-accent"
              :class="supplier.is_active ? '' : 'opacity-60'"
            >
              <span class="min-w-0 flex-1">
                <span class="flex flex-wrap items-center gap-2 text-sm font-medium">
                  <span class="truncate">{{ supplier.name }}</span>
                  <Badge v-if="!supplier.is_active" variant="secondary">{{ t('suppliers.list.inactive') }}</Badge>
                </span>
                <span class="block truncate text-xs text-muted-foreground">{{ [supplier.contact_person, supplier.phone].filter(Boolean).join(' · ') || '—' }}</span>
              </span>
              <span class="flex shrink-0 flex-col items-end gap-1 text-right">
                <span class="text-sm font-medium tabular-nums" :class="supplier.balance < 0 ? 'text-emerald-600' : ''">
                  {{ supplier.balance > 0 ? formatMoney(supplier.balance) : supplier.balance < 0 ? t('suppliers.list.credit', { amount: formatMoney(-supplier.balance) }) : t('suppliers.list.settled') }}
                </span>
                <Badge v-if="supplier.overdue_amount > 0" variant="destructive">{{ t('suppliers.list.overdueBadge', { amount: formatMoney(supplier.overdue_amount) }) }}</Badge>
              </span>
            </NuxtLink>

            <div v-if="totalSuppliers > supplierPageSize" class="flex justify-end gap-2">
              <Button variant="outline" size="sm" :disabled="pageOffset === 0 || loading" @click="goToPage(pageOffset - supplierPageSize)">{{ t('common.pagination.previous') }}</Button>
              <Button variant="outline" size="sm" :disabled="pageOffset + supplierPageSize >= totalSuppliers || loading" @click="goToPage(pageOffset + supplierPageSize)">{{ t('common.pagination.next') }}</Button>
            </div>
          </TabsContent>

          <TabsContent v-if="canView('purchases')" value="arrived" class="mt-4">
            <PurchasesPanel ref="purchasesPanel" @changed="reloadAll" />
          </TabsContent>
          <TabsContent v-if="canView('purchases')" value="payments" class="mt-4">
            <PaymentsPanel ref="paymentsPanel" @changed="reloadAll" />
          </TabsContent>
          <TabsContent v-if="purchaseOrdersOn && canView('purchases')" value="orders" class="mt-4 flex flex-col gap-3">
            <Button v-if="canEdit('purchases')" variant="outline" class="self-start" @click="showOrderForm = true"><ClipboardPlus /> {{ t('suppliers.page.newOrder') }}</Button>
            <OrdersPanel ref="ordersPanel" @changed="reloadAll" />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>

    <SupplierFormDialog v-model:open="showSupplierForm" :supplier="null" @saved="reloadAll" />
    <StockArrivedDialog v-model:open="showArrived" @saved="reloadAll" />
    <PaySupplierDialog v-model:open="showPay" @paid="reloadAll" />
    <OrderFormDialog v-if="purchaseOrdersOn" v-model:open="showOrderForm" @saved="reloadAll" />
  </div>
</template>
