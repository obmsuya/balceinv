<script setup lang="ts">
import { ArrowLeft, ClipboardPlus, Mail, MessageCircle, PackageMinus, PackagePlus, Pencil, Phone, Power, Wallet } from 'lucide-vue-next'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import OrderFormDialog from '@/components/suppliers/OrderFormDialog.vue'
import OrdersPanel from '@/components/suppliers/OrdersPanel.vue'
import PaySupplierDialog from '@/components/suppliers/PaySupplierDialog.vue'
import PaymentsPanel from '@/components/suppliers/PaymentsPanel.vue'
import PurchasesPanel from '@/components/suppliers/PurchasesPanel.vue'
import ReturnStockDialog from '@/components/suppliers/ReturnStockDialog.vue'
import StockArrivedDialog from '@/components/suppliers/StockArrivedDialog.vue'
import SupplierFormDialog from '@/components/suppliers/SupplierFormDialog.vue'
import type { AgingBuckets, Statement, Supplier } from '@/composables/useSuppliers'
import { localDateText, openExternal, phoneLinks } from '@/composables/useSuppliers'
import { formatMoney } from '~/utils/money'

const route = useRoute()
const supplierId = String(route.params.id)

const { t, formatDate } = useI18n()
const { canCreate, canEdit, canDelete, canView } = usePermissions()
const { purchaseOrdersOn } = useFeatures()
const { fetchSupplier, fetchStatement, saveSupplier, deactivateSupplier, saving, loading } = useSuppliers()

const supplier = ref<Supplier | null>(null)
const statement = ref<Statement | null>(null)
const activeTab = ref('statement')
const toDate = ref(localDateText())
const fromDate = ref(localDateText(new Date(Date.now() - 89 * 86400000)))
const showEdit = ref(false)
const showPay = ref(false)
const showArrived = ref(false)
const showReturn = ref(false)
const showOrderForm = ref(false)
const showDeactivate = ref(false)

const purchasesPanel = ref<InstanceType<typeof PurchasesPanel> | null>(null)
const paymentsPanel = ref<InstanceType<typeof PaymentsPanel> | null>(null)
const ordersPanel = ref<InstanceType<typeof OrdersPanel> | null>(null)

const links = computed(() => phoneLinks(supplier.value?.phone ?? null))
const agingRows = computed(() => {
  const buckets: AgingBuckets | undefined = supplier.value?.aging
  if (!buckets) return []
  return (['current', 'days_1_30', 'days_31_60', 'days_61_90', 'days_over_90'] as const).map(bucket => ({
    bucket,
    label: t(`suppliers.aging.${bucket}`),
    amount: buckets[bucket],
  }))
})

const loadSupplier = async () => {
  supplier.value = await fetchSupplier(supplierId)
}

const loadStatement = async () => {
  statement.value = await fetchStatement(supplierId, fromDate.value, toDate.value)
}

const reloadAll = () => {
  loadSupplier()
  loadStatement()
  purchasesPanel.value?.reload()
  paymentsPanel.value?.reload()
  ordersPanel.value?.reload()
}

const reactivate = async () => {
  if (!supplier.value) return
  try {
    const current = supplier.value
    supplier.value = await saveSupplier(current.id, {
      name: current.name,
      contact_person: current.contact_person,
      phone: current.phone,
      email: current.email,
      tin: current.tin,
      vrn: current.vrn,
      address: current.address,
      payment_terms_days: current.payment_terms_days,
      opening_balance: current.opening_balance,
      notes: current.notes,
      is_active: true,
    })
  } catch {
  }
}

const confirmDeactivate = async () => {
  try {
    await deactivateSupplier(supplierId)
    showDeactivate.value = false
    loadSupplier()
  } catch {
  }
}

onMounted(reloadAll)
</script>

<template>
  <div class="container mx-auto flex max-w-5xl flex-col gap-6 py-2 sm:px-4 sm:py-6">
    <NuxtLink to="/suppliers" class="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft class="size-4" /> {{ t('suppliers.detail.back') }}
    </NuxtLink>

    <Skeleton v-if="!supplier" class="h-40 w-full" />
    <template v-else>
      <div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div class="min-w-0">
          <h1 class="flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
            {{ supplier.name }}
            <Badge v-if="!supplier.is_active" variant="secondary">{{ t('suppliers.list.inactive') }}</Badge>
          </h1>
          <p class="mt-1 text-muted-foreground">
            {{ supplier.payment_terms_days ? t('suppliers.detail.termsDays', { days: supplier.payment_terms_days }) : t('suppliers.detail.termsCash') }}
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <Button v-if="canEdit('suppliers')" variant="outline" size="sm" @click="showEdit = true"><Pencil /> {{ t('common.actions.edit') }}</Button>
          <Button v-if="supplier.is_active && canDelete('suppliers')" variant="outline" size="sm" class="text-destructive hover:text-destructive" @click="showDeactivate = true">
            <Power /> {{ t('suppliers.detail.deactivate') }}
          </Button>
          <Button v-if="!supplier.is_active && canEdit('suppliers')" variant="outline" size="sm" :disabled="saving" @click="reactivate">
            <Power /> {{ t('suppliers.detail.reactivate') }}
          </Button>
        </div>
      </div>

      <div class="flex flex-wrap gap-2">
        <Button v-if="canEdit('purchases')" :disabled="supplier.balance <= 0" @click="showPay = true"><Wallet /> {{ t('suppliers.detail.pay') }}</Button>
        <Button v-if="supplier.is_active && canCreate('purchases')" variant="outline" @click="showArrived = true"><PackagePlus /> {{ t('suppliers.page.recordArrived') }}</Button>
        <Button v-if="canEdit('purchases')" variant="outline" @click="showReturn = true"><PackageMinus /> {{ t('suppliers.detail.returnStock') }}</Button>
        <Button v-if="supplier.is_active && purchaseOrdersOn && canEdit('purchases')" variant="outline" @click="showOrderForm = true"><ClipboardPlus /> {{ t('suppliers.page.newOrder') }}</Button>
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader class="pb-2"><CardTitle class="text-sm font-medium">{{ t('suppliers.detail.balance') }}</CardTitle></CardHeader>
          <CardContent>
            <p class="text-2xl font-bold tabular-nums" :class="supplier.balance < 0 ? 'text-emerald-600' : ''">
              {{ formatMoney(Math.abs(supplier.balance)) }}
            </p>
            <p class="text-xs text-muted-foreground">
              {{ supplier.balance > 0 ? t('suppliers.detail.youOweThem') : supplier.balance < 0 ? t('suppliers.detail.theyOweYou') : t('suppliers.list.settled') }}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader class="pb-2"><CardTitle class="text-sm font-medium">{{ t('suppliers.page.overdue') }}</CardTitle></CardHeader>
          <CardContent class="flex flex-col gap-1">
            <p class="text-2xl font-bold tabular-nums" :class="supplier.overdue_amount ? 'text-amber-600' : ''">{{ formatMoney(supplier.overdue_amount) }}</p>
            <p v-for="agingRow in agingRows.filter(row => row.amount)" :key="agingRow.bucket" class="flex justify-between text-xs text-muted-foreground">
              <span>{{ agingRow.label }}</span><span class="tabular-nums">{{ formatMoney(agingRow.amount) }}</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader class="pb-2"><CardTitle class="text-sm font-medium">{{ t('suppliers.detail.contact') }}</CardTitle></CardHeader>
          <CardContent class="flex flex-col gap-2 text-sm">
            <p v-if="supplier.contact_person">{{ supplier.contact_person }}</p>
            <div v-if="links" class="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" @click="openExternal(links.call)"><Phone /> {{ supplier.phone }}</Button>
              <Button variant="outline" size="sm" @click="openExternal(links.whatsapp)"><MessageCircle /> WhatsApp</Button>
            </div>
            <Button v-if="supplier.email" variant="outline" size="sm" class="self-start" @click="openExternal(`mailto:${supplier.email}`)"><Mail /> {{ supplier.email }}</Button>
            <p v-if="supplier.address" class="text-muted-foreground">{{ supplier.address }}</p>
            <p v-if="supplier.tin || supplier.vrn" class="text-xs text-muted-foreground">
              <template v-if="supplier.tin">TIN {{ supplier.tin }}</template><template v-if="supplier.tin && supplier.vrn"> · </template><template v-if="supplier.vrn">VRN {{ supplier.vrn }}</template>
            </p>
            <p v-if="supplier.notes" class="whitespace-pre-line text-muted-foreground">{{ supplier.notes }}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent class="px-3 sm:px-6">
          <Tabs v-model="activeTab">
            <TabsList class="w-full sm:w-auto">
              <TabsTrigger value="statement" class="flex-1 sm:flex-none">{{ t('suppliers.detail.statementTab') }}</TabsTrigger>
              <TabsTrigger v-if="canView('purchases')" value="arrived" class="flex-1 sm:flex-none">{{ t('suppliers.page.arrivedTab') }}</TabsTrigger>
              <TabsTrigger v-if="canView('purchases')" value="payments" class="flex-1 sm:flex-none">{{ t('suppliers.page.paymentsTab') }}</TabsTrigger>
              <TabsTrigger v-if="purchaseOrdersOn && canView('purchases')" value="orders" class="flex-1 sm:flex-none">{{ t('suppliers.page.ordersTab') }}</TabsTrigger>
            </TabsList>

            <TabsContent value="statement" class="mt-4 flex flex-col gap-3">
              <div class="flex flex-wrap items-end gap-3">
                <div class="flex flex-col gap-1">
                  <Label for="statement-from" class="text-xs">{{ t('common.fields.from') }}</Label>
                  <Input id="statement-from" v-model="fromDate" type="date" class="w-40" />
                </div>
                <div class="flex flex-col gap-1">
                  <Label for="statement-to" class="text-xs">{{ t('common.fields.to') }}</Label>
                  <Input id="statement-to" v-model="toDate" type="date" class="w-40" />
                </div>
                <Button variant="outline" :disabled="loading" @click="loadStatement">{{ t('common.actions.apply') }}</Button>
              </div>

              <Skeleton v-if="!statement" class="h-24 w-full" />
              <template v-else>
                <p class="flex justify-between rounded-md bg-muted/40 px-3 py-2 text-sm">
                  <span>{{ t('suppliers.statement.openingBalance') }}</span>
                  <span class="tabular-nums">{{ formatMoney(statement.opening_balance) }}</span>
                </p>
                <p v-if="!statement.lines.length" class="py-6 text-center text-sm text-muted-foreground">{{ t('suppliers.statement.empty') }}</p>
                <div v-for="(statementLine, lineIndex) in statement.lines" :key="lineIndex" class="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
                  <span class="min-w-0 flex-1">
                    <span class="block font-medium">{{ t(`suppliers.statement.kinds.${statementLine.kind}`) }}<template v-if="statementLine.reference"> · {{ statementLine.reference }}</template></span>
                    <span class="block text-xs text-muted-foreground">{{ formatDate(statementLine.date) }}</span>
                  </span>
                  <span class="shrink-0 text-right tabular-nums">
                    <span class="block" :class="statementLine.credit ? 'text-emerald-600' : ''">
                      {{ statementLine.debit ? `+ ${formatMoney(statementLine.debit)}` : `− ${formatMoney(statementLine.credit)}` }}
                    </span>
                    <span class="block text-xs text-muted-foreground">{{ formatMoney(statementLine.balance) }}</span>
                  </span>
                </div>
                <p class="flex justify-between rounded-md bg-muted/40 px-3 py-2 text-sm font-semibold">
                  <span>{{ t('suppliers.statement.closingBalance') }}</span>
                  <span class="tabular-nums">{{ formatMoney(statement.closing_balance) }}</span>
                </p>
              </template>
            </TabsContent>
            <TabsContent v-if="canView('purchases')" value="arrived" class="mt-4">
              <PurchasesPanel ref="purchasesPanel" :supplier-id="supplierId" @changed="reloadAll" />
            </TabsContent>
            <TabsContent v-if="canView('purchases')" value="payments" class="mt-4">
              <PaymentsPanel ref="paymentsPanel" :supplier-id="supplierId" @changed="reloadAll" />
            </TabsContent>
            <TabsContent v-if="purchaseOrdersOn && canView('purchases')" value="orders" class="mt-4">
              <OrdersPanel ref="ordersPanel" :supplier-id="supplierId" @changed="reloadAll" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <SupplierFormDialog v-model:open="showEdit" :supplier="supplier" @saved="reloadAll" />
      <PaySupplierDialog v-model:open="showPay" :supplier="supplier" @paid="reloadAll" />
      <StockArrivedDialog v-model:open="showArrived" :supplier-id="supplier.id" @saved="reloadAll" />
      <ReturnStockDialog v-model:open="showReturn" :supplier="supplier" @returned="reloadAll" />
      <OrderFormDialog v-if="purchaseOrdersOn" v-model:open="showOrderForm" :supplier="supplier" @saved="reloadAll" />

      <AlertDialog v-model:open="showDeactivate">
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{{ t('suppliers.detail.deactivateTitle', { name: supplier.name }) }}</AlertDialogTitle>
            <AlertDialogDescription>{{ t('suppliers.detail.deactivateDescription') }}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{{ t('common.actions.cancel') }}</AlertDialogCancel>
            <AlertDialogAction class="bg-destructive text-white hover:bg-destructive/90" :disabled="saving" @click="confirmDeactivate">{{ t('suppliers.detail.deactivate') }}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </template>
  </div>
</template>
