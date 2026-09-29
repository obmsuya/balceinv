<script setup lang="ts">
import { ArchiveRestore, ArrowLeft, HandCoins, Mail, MessageCircle, Pencil, Phone, UserX } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import CustomerFormDialog from '@/components/customers/CustomerFormDialog.vue'
import CustomerStatusDialog from '@/components/customers/CustomerStatusDialog.vue'
import RecordPaymentDialog from '@/components/customers/RecordPaymentDialog.vue'
import type { Customer, CustomerPayment, CustomerSale, CustomerStatement, StatementEntry } from '@/composables/useCustomers'
import { agingBuckets, agingLabel, customerSalePageSize, whatsappReminderUrl } from '@/composables/useCustomers'
import { paymentMethodLabel } from '@/composables/useSales'
import { formatMoney } from '~/utils/money'
import { openExternal } from '~/utils/openExternal'

const route = useRoute()
const { t, formatDate, formatDateTime } = useI18n()
const { user } = useAuth()
const { canEdit, canDelete } = usePermissions()
const { creditSalesOn } = useFeatures()
const { fetchCustomer, fetchCustomerSales, fetchPayments, fetchStatement, voidPayment, saving } = useCustomers()
const { openBrowserReceipt } = usePrint()

const customerId = String(route.params.id)

const customer = ref<Customer | null>(null)
const notFound = ref(false)
const activeTab = ref('purchases')
const purchases = ref<CustomerSale[]>([])
const totalPurchases = ref(0)
const purchaseOffset = ref(0)
const loadingPurchases = ref(false)
const payments = ref<CustomerPayment[]>([])
const statement = ref<CustomerStatement | null>(null)
const statementFrom = ref('')
const statementTo = ref('')
const loadingStatement = ref(false)
const showEditDialog = ref(false)
const showPaymentDialog = ref(false)
const statusTarget = ref<Customer | null>(null)
const voidTarget = ref<CustomerPayment | null>(null)
const voidReason = ref('')

const whatsappUrl = computed(() => (customer.value ? whatsappReminderUrl(customer.value, user.value?.company_name ?? '') : null))

const loadCustomer = async () => {
  const loadedCustomer = await fetchCustomer(customerId)
  notFound.value = loadedCustomer === null
  customer.value = loadedCustomer
}

const loadPurchases = async () => {
  loadingPurchases.value = true
  const purchasePage = await fetchCustomerSales(customerId, purchaseOffset.value)
  purchases.value = purchasePage?.items ?? []
  totalPurchases.value = purchasePage?.total ?? 0
  loadingPurchases.value = false
}

const loadPayments = async () => {
  payments.value = await fetchPayments(customerId)
}

const loadStatement = async () => {
  loadingStatement.value = true
  const loadedStatement = await fetchStatement(customerId, statementFrom.value, statementTo.value)
  loadingStatement.value = false
  if (!loadedStatement) return
  statement.value = loadedStatement
  statementFrom.value = loadedStatement.from
  statementTo.value = loadedStatement.to
}

const goToPurchasePage = (nextOffset: number) => {
  purchaseOffset.value = Math.max(nextOffset, 0)
  loadPurchases()
}

const refreshMoney = () => {
  loadCustomer()
  loadPayments()
  if (statement.value) loadStatement()
}

const statementEntryLabel = (entry: StatementEntry): string =>
  entry.kind === 'credit_sale' ? t('customers.statement.creditSale', { receipt: entry.reference }) : t('customers.statement.payment', { reference: entry.reference })

const callCustomer = () => {
  if (customer.value?.phone) openExternal(`tel:${customer.value.phone}`)
}

const emailCustomer = () => {
  if (customer.value?.email) openExternal(`mailto:${customer.value.email}`)
}

const sendReminder = () => {
  if (whatsappUrl.value) openExternal(whatsappUrl.value)
}

const openVoid = (payment: CustomerPayment) => {
  voidReason.value = ''
  voidTarget.value = payment
}

const confirmVoid = async () => {
  if (!voidTarget.value) return
  if (!voidReason.value.trim()) {
    toast.error(t('customers.payments.errors.reasonRequired'))
    return
  }
  try {
    await voidPayment(customerId, voidTarget.value.id, voidReason.value.trim())
    voidTarget.value = null
    refreshMoney()
  } catch {
  }
}

watch(activeTab, tab => {
  if (tab === 'statement' && !statement.value) loadStatement()
})

onMounted(() => {
  loadCustomer()
  loadPurchases()
  loadPayments()
})
</script>

<template>
  <div class="container mx-auto flex max-w-5xl flex-col gap-6 py-2 sm:px-4 sm:py-6">
    <NuxtLink to="/customers" class="flex items-center gap-1.5 self-start text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft class="size-4" />
      {{ t('customers.page.title') }}
    </NuxtLink>

    <p v-if="notFound" class="text-center text-sm text-muted-foreground">{{ t('customers.detail.notFound') }}</p>
    <Skeleton v-else-if="!customer" class="h-40 w-full" />

    <template v-else>
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div class="min-w-0">
          <h1 class="flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
            {{ customer.name }}
            <Badge v-if="!customer.is_active" variant="secondary">{{ t('common.states.inactive') }}</Badge>
          </h1>
          <div class="mt-2 flex flex-wrap gap-2">
            <Button v-if="customer.phone" variant="outline" size="sm" @click="callCustomer">
              <Phone />
              {{ customer.phone }}
            </Button>
            <Button v-if="customer.email" variant="outline" size="sm" @click="emailCustomer">
              <Mail />
              <span class="max-w-48 truncate">{{ customer.email }}</span>
            </Button>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <Button v-if="whatsappUrl && customer.balance > 0" variant="outline" class="border-emerald-600/40 text-emerald-700 hover:text-emerald-800 dark:text-emerald-400" @click="sendReminder">
            <MessageCircle />
            {{ t('customers.detail.whatsappReminder') }}
          </Button>
          <Button v-if="canEdit('customers') && customer.balance > 0" @click="showPaymentDialog = true">
            <HandCoins />
            {{ t('customers.payments.recordTitle') }}
          </Button>
          <Button v-if="canEdit('customers')" variant="outline" @click="showEditDialog = true">
            <Pencil />
            {{ t('common.actions.edit') }}
          </Button>
          <Button
            v-if="customer.is_active ? canDelete('customers') : canEdit('customers')"
            variant="outline"
            :class="customer.is_active ? 'text-destructive hover:text-destructive' : ''"
            @click="statusTarget = customer"
          >
            <UserX v-if="customer.is_active" />
            <ArchiveRestore v-else />
            {{ customer.is_active ? t('customers.status.deactivate') : t('customers.status.restore') }}
          </Button>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader class="pb-2"><CardTitle class="text-sm font-medium">{{ t('customers.detail.owesNow') }}</CardTitle></CardHeader>
          <CardContent><p class="text-xl font-bold tabular-nums sm:text-2xl">{{ formatMoney(customer.balance) }}</p></CardContent>
        </Card>
        <Card>
          <CardHeader class="pb-2"><CardTitle class="text-sm font-medium">{{ t('customers.detail.overdue') }}</CardTitle></CardHeader>
          <CardContent><p class="text-xl font-bold tabular-nums sm:text-2xl" :class="customer.overdue_amount > 0 ? 'text-destructive' : ''">{{ formatMoney(customer.overdue_amount) }}</p></CardContent>
        </Card>
        <Card v-if="creditSalesOn">
          <CardHeader class="pb-2"><CardTitle class="text-sm font-medium">{{ t('customers.detail.canStillTake') }}</CardTitle></CardHeader>
          <CardContent>
            <p class="text-xl font-bold tabular-nums sm:text-2xl">{{ customer.available_credit == null ? t('customers.detail.noLimit') : formatMoney(customer.available_credit) }}</p>
            <p v-if="customer.credit_limit != null" class="text-xs text-muted-foreground">{{ t('customers.detail.limitIs', { amount: formatMoney(customer.credit_limit) }) }}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader class="pb-2"><CardTitle class="text-sm font-medium">{{ t('customers.fields.lastVisit') }}</CardTitle></CardHeader>
          <CardContent><p class="text-xl font-bold sm:text-2xl">{{ customer.last_visit_at ? formatDate(customer.last_visit_at) : t('customers.page.neverBought') }}</p></CardContent>
        </Card>
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <Card v-if="customer.balance > 0">
          <CardHeader class="pb-2"><CardTitle class="text-sm font-medium">{{ t('customers.detail.howOld') }}</CardTitle></CardHeader>
          <CardContent class="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div v-for="bucket in agingBuckets" :key="bucket" class="rounded-lg bg-muted/50 px-3 py-2">
              <p class="text-xs text-muted-foreground">{{ agingLabel(bucket) }}</p>
              <p class="font-semibold tabular-nums" :class="bucket !== 'days_0_30' && customer.aging[bucket] ? 'text-destructive' : ''">{{ formatMoney(customer.aging[bucket]) }}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader class="pb-2"><CardTitle class="text-sm font-medium">{{ t('customers.detail.details') }}</CardTitle></CardHeader>
          <CardContent>
            <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              <template v-if="customer.address"><dt class="text-muted-foreground">{{ t('common.fields.address') }}</dt><dd>{{ customer.address }}</dd></template>
              <template v-if="customer.tin"><dt class="text-muted-foreground">{{ t('customers.fields.tin') }}</dt><dd>{{ customer.tin }}</dd></template>
              <template v-if="customer.opening_balance"><dt class="text-muted-foreground">{{ t('customers.detail.debtFromBefore') }}</dt><dd class="tabular-nums">{{ formatMoney(customer.opening_balance) }}</dd></template>
              <template v-if="customer.oldest_debt_at"><dt class="text-muted-foreground">{{ t('customers.owing.owesSince') }}</dt><dd>{{ formatDate(customer.oldest_debt_at) }}</dd></template>
              <dt class="text-muted-foreground">{{ t('customers.detail.customerSince') }}</dt><dd>{{ formatDate(customer.created_at) }}</dd>
              <template v-if="customer.notes"><dt class="text-muted-foreground">{{ t('common.fields.notes') }}</dt><dd class="whitespace-pre-line">{{ customer.notes }}</dd></template>
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent class="px-3 sm:px-6">
          <Tabs v-model="activeTab">
            <TabsList class="w-full sm:w-auto">
              <TabsTrigger value="purchases" class="flex-1 sm:flex-none">{{ t('customers.detail.purchasesTab') }}</TabsTrigger>
              <TabsTrigger value="payments" class="flex-1 sm:flex-none">{{ t('customers.detail.paymentsTab') }}</TabsTrigger>
              <TabsTrigger value="statement" class="flex-1 sm:flex-none">{{ t('customers.detail.statementTab') }}</TabsTrigger>
            </TabsList>

            <TabsContent value="purchases" class="mt-4 flex flex-col gap-4">
              <div v-if="loadingPurchases && !purchases.length" class="flex flex-col gap-2">
                <Skeleton v-for="skeletonRow in 3" :key="skeletonRow" class="h-12 w-full" />
              </div>
              <div v-else class="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{{ t('sales.table.receipt') }}</TableHead>
                      <TableHead class="hidden sm:table-cell">{{ t('common.fields.shop') }}</TableHead>
                      <TableHead class="text-right">{{ t('common.fields.total') }}</TableHead>
                      <TableHead class="text-right">{{ t('customers.detail.onCredit') }}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow v-for="purchase in purchases" :key="purchase.id" class="cursor-pointer" @click="openBrowserReceipt(purchase.id, false)">
                      <TableCell>
                        <p class="font-mono text-sm font-medium">{{ purchase.receipt_number }}</p>
                        <p class="text-xs text-muted-foreground">{{ formatDateTime(purchase.created_at) }}</p>
                      </TableCell>
                      <TableCell class="hidden text-sm sm:table-cell">{{ purchase.shop_name }}</TableCell>
                      <TableCell class="text-right tabular-nums">{{ formatMoney(purchase.total) }}</TableCell>
                      <TableCell class="text-right tabular-nums" :class="purchase.credit_amount ? 'font-medium' : 'text-muted-foreground'">{{ purchase.credit_amount ? formatMoney(purchase.credit_amount) : '—' }}</TableCell>
                    </TableRow>
                    <TableRow v-if="!purchases.length">
                      <TableCell colspan="4" class="h-24 text-center text-muted-foreground">{{ t('customers.detail.noPurchases') }}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              <div v-if="totalPurchases > customerSalePageSize" class="flex justify-end gap-2">
                <Button variant="outline" size="sm" :disabled="purchaseOffset === 0 || loadingPurchases" @click="goToPurchasePage(purchaseOffset - customerSalePageSize)">{{ t('common.pagination.previous') }}</Button>
                <Button variant="outline" size="sm" :disabled="purchaseOffset + customerSalePageSize >= totalPurchases || loadingPurchases" @click="goToPurchasePage(purchaseOffset + customerSalePageSize)">{{ t('common.pagination.next') }}</Button>
              </div>
            </TabsContent>

            <TabsContent value="payments" class="mt-4">
              <p v-if="!payments.length" class="py-10 text-center text-sm text-muted-foreground">{{ t('customers.payments.none') }}</p>
              <ul v-else class="divide-y rounded-md border">
                <li v-for="payment in payments" :key="payment.id" class="flex items-start gap-3 px-3 py-2.5" :class="payment.voided_at ? 'bg-muted/40' : ''">
                  <div class="min-w-0 flex-1">
                    <p class="font-semibold tabular-nums" :class="payment.voided_at ? 'text-muted-foreground line-through' : ''">
                      {{ formatMoney(payment.amount) }}
                      <span class="font-normal text-muted-foreground"> · {{ paymentMethodLabel(payment.method) }}</span>
                    </p>
                    <p class="text-xs text-muted-foreground">
                      {{ formatDateTime(payment.received_at) }} · {{ payment.created_by_name }}<template v-if="payment.shop_name"> · {{ payment.shop_name }}</template>
                    </p>
                    <p v-if="payment.reference" class="text-xs">{{ payment.reference }}</p>
                    <p v-if="payment.voided_at" class="text-xs text-destructive">
                      {{ t('customers.payments.voidedBy', { name: payment.voided_by_name ?? '', date: formatDateTime(payment.voided_at), reason: payment.void_reason ?? '' }) }}
                    </p>
                  </div>
                  <Button v-if="canEdit('customers') && !payment.voided_at" variant="ghost" size="sm" class="shrink-0 text-destructive hover:text-destructive" @click="openVoid(payment)">
                    {{ t('customers.payments.void') }}
                  </Button>
                </li>
              </ul>
            </TabsContent>

            <TabsContent value="statement" class="mt-4 flex flex-col gap-4">
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <div class="flex items-center gap-2">
                  <Label for="statement-from" class="w-14 shrink-0 text-sm text-muted-foreground">{{ t('common.fields.from') }}</Label>
                  <Input id="statement-from" v-model="statementFrom" type="date" />
                </div>
                <div class="flex items-center gap-2">
                  <Label for="statement-to" class="w-14 shrink-0 text-sm text-muted-foreground">{{ t('common.fields.to') }}</Label>
                  <Input id="statement-to" v-model="statementTo" type="date" />
                </div>
                <Button variant="outline" :disabled="loadingStatement" @click="loadStatement">{{ t('customers.statement.show') }}</Button>
              </div>

              <Skeleton v-if="loadingStatement && !statement" class="h-40 w-full" />
              <div v-else-if="statement" class="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{{ t('common.fields.date') }}</TableHead>
                      <TableHead>{{ t('customers.statement.what') }}</TableHead>
                      <TableHead class="hidden text-right sm:table-cell">{{ t('customers.statement.boughtOnCredit') }}</TableHead>
                      <TableHead class="hidden text-right sm:table-cell">{{ t('customers.statement.paid') }}</TableHead>
                      <TableHead class="text-right">{{ t('customers.statement.balance') }}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow class="bg-muted/30">
                      <TableCell class="text-sm">{{ formatDate(`${statement.from}T00:00:00`) }}</TableCell>
                      <TableCell class="text-sm font-medium">{{ t('customers.statement.opening') }}</TableCell>
                      <TableCell class="hidden sm:table-cell" />
                      <TableCell class="hidden sm:table-cell" />
                      <TableCell class="text-right font-medium tabular-nums">{{ formatMoney(statement.opening_balance) }}</TableCell>
                    </TableRow>
                    <TableRow v-for="(entry, entryIndex) in statement.entries" :key="entryIndex">
                      <TableCell class="whitespace-nowrap text-sm">{{ formatDate(entry.at) }}</TableCell>
                      <TableCell class="text-sm">
                        {{ statementEntryLabel(entry) }}
                        <p class="text-xs tabular-nums sm:hidden" :class="entry.debit ? '' : 'text-emerald-700 dark:text-emerald-400'">
                          {{ entry.debit ? `+${formatMoney(entry.debit)}` : `−${formatMoney(entry.credit)}` }}
                        </p>
                      </TableCell>
                      <TableCell class="hidden text-right tabular-nums sm:table-cell">{{ entry.debit ? formatMoney(entry.debit) : '' }}</TableCell>
                      <TableCell class="hidden text-right tabular-nums text-emerald-700 sm:table-cell dark:text-emerald-400">{{ entry.credit ? formatMoney(entry.credit) : '' }}</TableCell>
                      <TableCell class="text-right tabular-nums">{{ formatMoney(entry.balance) }}</TableCell>
                    </TableRow>
                    <TableRow v-if="!statement.entries.length">
                      <TableCell colspan="5" class="h-16 text-center text-sm text-muted-foreground">{{ t('customers.statement.nothing') }}</TableCell>
                    </TableRow>
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell class="text-sm">{{ formatDate(`${statement.to}T00:00:00`) }}</TableCell>
                      <TableCell class="text-sm font-semibold">{{ t('customers.statement.closing') }}</TableCell>
                      <TableCell class="hidden text-right tabular-nums sm:table-cell">{{ formatMoney(statement.total_debits) }}</TableCell>
                      <TableCell class="hidden text-right tabular-nums sm:table-cell">{{ formatMoney(statement.total_credits) }}</TableCell>
                      <TableCell class="text-right font-bold tabular-nums">{{ formatMoney(statement.closing_balance) }}</TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <CustomerFormDialog v-model:open="showEditDialog" :customer="customer" @saved="refreshMoney" />
      <RecordPaymentDialog v-model:open="showPaymentDialog" :customer="customer" @recorded="refreshMoney" />
      <CustomerStatusDialog :customer="statusTarget" @changed="changedCustomer => { customer = changedCustomer }" @close="statusTarget = null" />

      <Dialog :open="voidTarget !== null" @update:open="isOpen => { if (!isOpen) voidTarget = null }">
        <DialogContent class="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{{ t('customers.payments.voidTitle', { amount: formatMoney(voidTarget?.amount ?? 0) }) }}</DialogTitle>
            <DialogDescription>{{ t('customers.payments.voidDescription') }}</DialogDescription>
          </DialogHeader>
          <form class="flex flex-col gap-4" @submit.prevent="confirmVoid">
            <div class="flex flex-col gap-1.5">
              <Label for="void-reason">{{ t('customers.payments.reason') }}</Label>
              <Textarea id="void-reason" v-model="voidReason" maxlength="200" rows="2" class="resize-none" :placeholder="t('customers.payments.reasonPlaceholder')" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" @click="voidTarget = null">{{ t('common.actions.back') }}</Button>
              <Button type="submit" variant="destructive" :disabled="saving">{{ t('customers.payments.void') }}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </template>
  </div>
</template>
