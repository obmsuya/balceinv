<script setup lang="ts">
import { ArchiveRestore, Contact, Pencil, Plus, Search, UserX } from 'lucide-vue-next'
import { useDebounceFn } from '@vueuse/core'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import CustomerFormDialog from '@/components/customers/CustomerFormDialog.vue'
import CustomerStatusDialog from '@/components/customers/CustomerStatusDialog.vue'
import type { Customer, DebtorsReport } from '@/composables/useCustomers'
import { agingBuckets, agingLabel, customerPageSize } from '@/composables/useCustomers'
import { formatMoney } from '~/utils/money'

const route = useRoute()
const { t, formatDate } = useI18n()
const { canCreate, canEdit, canDelete } = usePermissions()
const { customers, totalCustomers, loading, fetchCustomers, fetchDebtors } = useCustomers()

const activeTab = ref(route.query.tab === 'owing' ? 'owing' : 'customers')
const searchText = ref('')
const includeInactive = ref(false)
const pageOffset = ref(0)
const showFormDialog = ref(false)
const editingCustomer = ref<Customer | null>(null)
const statusTarget = ref<Customer | null>(null)
const debtors = ref<DebtorsReport | null>(null)
const loadingDebtors = ref(false)

const reload = () => fetchCustomers({ searchText: searchText.value.trim(), includeInactive: includeInactive.value, offset: pageOffset.value })

const reloadFromFirstPage = () => {
  pageOffset.value = 0
  reload()
}

const loadDebtors = async () => {
  loadingDebtors.value = true
  debtors.value = await fetchDebtors()
  loadingDebtors.value = false
}

watch(searchText, useDebounceFn(reloadFromFirstPage, 300))
watch(includeInactive, reloadFromFirstPage)
watch(activeTab, tab => {
  if (tab === 'owing') loadDebtors()
})

const goToPage = (nextOffset: number) => {
  pageOffset.value = Math.max(nextOffset, 0)
  reload()
}

const openForm = (customer: Customer | null) => {
  editingCustomer.value = customer
  showFormDialog.value = true
}

const openCustomer = (customerId: string) => navigateTo(`/customers/${customerId}`)

const refreshAll = () => {
  reload()
  if (activeTab.value === 'owing') loadDebtors()
}

onMounted(() => {
  reload()
  if (activeTab.value === 'owing') loadDebtors()
})
</script>

<template>
  <div class="container mx-auto flex max-w-5xl flex-col gap-6 py-2 sm:px-4 sm:py-6">
    <div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">{{ t('customers.page.title') }}</h1>
        <p class="mt-1 text-muted-foreground">{{ t('customers.page.subtitle') }}</p>
      </div>
      <Button v-if="canCreate('customers')" @click="openForm(null)">
        <Plus />
        {{ t('customers.page.newCustomer') }}
      </Button>
    </div>

    <Card>
      <CardContent class="px-3 sm:px-6">
        <Tabs v-model="activeTab">
          <TabsList class="w-full sm:w-auto">
            <TabsTrigger value="customers" class="flex-1 sm:flex-none">{{ t('customers.page.customersTab') }}</TabsTrigger>
            <TabsTrigger value="owing" class="flex-1 sm:flex-none">{{ t('customers.page.owingTab') }}</TabsTrigger>
          </TabsList>

          <TabsContent value="customers" class="mt-4 flex flex-col gap-4">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div class="relative flex-1">
                <Label for="customer-search" class="sr-only">{{ t('customers.page.searchPlaceholder') }}</Label>
                <Search class="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input id="customer-search" v-model="searchText" :placeholder="t('customers.page.searchPlaceholder')" class="pl-8" autocomplete="off" />
              </div>
              <Button :variant="includeInactive ? 'default' : 'outline'" size="sm" :aria-pressed="includeInactive" @click="includeInactive = !includeInactive">
                {{ t('customers.page.showInactive') }}
              </Button>
            </div>

            <div v-if="loading && !customers.length" class="flex flex-col gap-2">
              <Skeleton v-for="skeletonRow in 5" :key="skeletonRow" class="h-12 w-full" />
            </div>
            <div v-else-if="!customers.length && !searchText.trim()" class="flex flex-col items-center gap-2 py-12 text-center">
              <Contact class="size-10 text-muted-foreground/50" />
              <p class="font-medium">{{ t('customers.page.emptyTitle') }}</p>
              <p class="text-sm text-muted-foreground">{{ t('customers.page.emptyHint') }}</p>
            </div>
            <div v-else class="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{{ t('common.fields.name') }}</TableHead>
                    <TableHead class="hidden sm:table-cell">{{ t('common.fields.phone') }}</TableHead>
                    <TableHead class="text-right">{{ t('customers.fields.owes') }}</TableHead>
                    <TableHead class="hidden md:table-cell">{{ t('customers.fields.lastVisit') }}</TableHead>
                    <TableHead v-if="canEdit('customers') || canDelete('customers')" class="w-0"><span class="sr-only">{{ t('common.fields.actions') }}</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="customer in customers" :key="customer.id" class="cursor-pointer" :class="customer.is_active ? '' : 'opacity-60'" @click="openCustomer(customer.id)">
                    <TableCell>
                      <NuxtLink :to="`/customers/${customer.id}`" class="font-medium hover:underline" @click.stop>{{ customer.name }}</NuxtLink>
                      <Badge v-if="!customer.is_active" variant="secondary" class="ml-2 font-normal">{{ t('common.states.inactive') }}</Badge>
                      <p v-if="customer.phone" class="text-xs text-muted-foreground tabular-nums sm:hidden">{{ customer.phone }}</p>
                    </TableCell>
                    <TableCell class="hidden text-sm tabular-nums sm:table-cell">{{ customer.phone ?? '' }}</TableCell>
                    <TableCell class="text-right tabular-nums" :class="customer.overdue_amount > 0 ? 'font-semibold text-destructive' : ''">
                      {{ customer.balance > 0 ? formatMoney(customer.balance) : '—' }}
                    </TableCell>
                    <TableCell class="hidden text-sm text-muted-foreground md:table-cell">{{ customer.last_visit_at ? formatDate(customer.last_visit_at) : t('customers.page.neverBought') }}</TableCell>
                    <TableCell v-if="canEdit('customers') || canDelete('customers')" class="whitespace-nowrap text-right" @click.stop>
                      <Button v-if="canEdit('customers')" variant="ghost" size="icon" class="size-8" :aria-label="t('customers.page.editCustomer', { name: customer.name })" @click="openForm(customer)">
                        <Pencil />
                      </Button>
                      <Button
                        v-if="customer.is_active ? canDelete('customers') : canEdit('customers')"
                        variant="ghost"
                        size="icon"
                        class="size-8"
                        :class="customer.is_active ? 'text-destructive hover:text-destructive' : ''"
                        :aria-label="customer.is_active ? t('customers.status.deactivateTitle', { name: customer.name }) : t('customers.status.restoreTitle', { name: customer.name })"
                        @click="statusTarget = customer"
                      >
                        <UserX v-if="customer.is_active" />
                        <ArchiveRestore v-else />
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow v-if="!customers.length">
                    <TableCell colspan="5" class="h-24 text-center text-muted-foreground">{{ t('customers.picker.noMatch') }}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <div v-if="totalCustomers > customerPageSize" class="flex justify-end gap-2">
              <Button variant="outline" size="sm" :disabled="pageOffset === 0 || loading" @click="goToPage(pageOffset - customerPageSize)">{{ t('common.pagination.previous') }}</Button>
              <Button variant="outline" size="sm" :disabled="pageOffset + customerPageSize >= totalCustomers || loading" @click="goToPage(pageOffset + customerPageSize)">{{ t('common.pagination.next') }}</Button>
            </div>
          </TabsContent>

          <TabsContent value="owing" class="mt-4 flex flex-col gap-4">
            <div v-if="loadingDebtors && !debtors" class="flex flex-col gap-2">
              <Skeleton v-for="skeletonRow in 4" :key="skeletonRow" class="h-14 w-full" />
            </div>
            <div v-else-if="!debtors?.customers.length" class="flex flex-col items-center gap-2 py-12 text-center">
              <Contact class="size-10 text-muted-foreground/50" />
              <p class="font-medium">{{ t('customers.owing.emptyTitle') }}</p>
              <p class="text-sm text-muted-foreground">{{ t('customers.owing.emptyHint') }}</p>
            </div>
            <template v-else>
              <p class="text-sm text-muted-foreground">{{ t('customers.owing.hint') }}</p>

              <ul class="flex flex-col gap-2 md:hidden">
                <li v-for="debtor in debtors.customers" :key="debtor.id">
                  <NuxtLink :to="`/customers/${debtor.id}`" class="flex flex-col gap-2 rounded-lg border p-3 hover:bg-muted/50">
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <p class="truncate font-medium">{{ debtor.name }}</p>
                        <p v-if="debtor.oldest_debt_at" class="text-xs text-muted-foreground">{{ t('customers.owing.since', { date: formatDate(debtor.oldest_debt_at) }) }}</p>
                      </div>
                      <span class="shrink-0 font-semibold tabular-nums" :class="debtor.overdue_amount > 0 ? 'text-destructive' : ''">{{ formatMoney(debtor.balance) }}</span>
                    </div>
                    <div class="flex flex-wrap gap-1">
                      <template v-for="bucket in agingBuckets" :key="bucket">
                        <Badge v-if="debtor.aging[bucket]" :variant="bucket === 'days_0_30' ? 'secondary' : 'outline'" class="font-normal tabular-nums" :class="bucket === 'days_0_30' ? '' : 'border-destructive/40 text-destructive'">
                          {{ agingLabel(bucket) }}: {{ formatMoney(debtor.aging[bucket]) }}
                        </Badge>
                      </template>
                    </div>
                  </NuxtLink>
                </li>
                <li class="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2 font-semibold">
                  <span>{{ t('customers.owing.totalOwed') }}</span>
                  <span class="tabular-nums">{{ formatMoney(debtors.totals.balance) }}</span>
                </li>
              </ul>

              <div class="hidden overflow-x-auto rounded-md border md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{{ t('common.fields.name') }}</TableHead>
                      <TableHead>{{ t('customers.owing.owesSince') }}</TableHead>
                      <TableHead v-for="bucket in agingBuckets" :key="bucket" class="text-right">{{ agingLabel(bucket) }}</TableHead>
                      <TableHead class="text-right">{{ t('customers.fields.owes') }}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow v-for="debtor in debtors.customers" :key="debtor.id" class="cursor-pointer" @click="openCustomer(debtor.id)">
                      <TableCell>
                        <NuxtLink :to="`/customers/${debtor.id}`" class="font-medium hover:underline" @click.stop>{{ debtor.name }}</NuxtLink>
                        <p v-if="debtor.phone" class="text-xs text-muted-foreground tabular-nums">{{ debtor.phone }}</p>
                      </TableCell>
                      <TableCell class="text-sm text-muted-foreground">{{ debtor.oldest_debt_at ? formatDate(debtor.oldest_debt_at) : '' }}</TableCell>
                      <TableCell
                        v-for="bucket in agingBuckets"
                        :key="bucket"
                        class="text-right tabular-nums"
                        :class="bucket !== 'days_0_30' && debtor.aging[bucket] ? 'text-destructive' : 'text-muted-foreground'"
                      >
                        {{ debtor.aging[bucket] ? formatMoney(debtor.aging[bucket]) : '—' }}
                      </TableCell>
                      <TableCell class="text-right font-semibold tabular-nums">{{ formatMoney(debtor.balance) }}</TableCell>
                    </TableRow>
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colspan="2" class="font-semibold">{{ t('customers.owing.totalOwed') }}</TableCell>
                      <TableCell v-for="bucket in agingBuckets" :key="bucket" class="text-right tabular-nums">{{ formatMoney(debtors.totals.aging[bucket]) }}</TableCell>
                      <TableCell class="text-right font-bold tabular-nums">{{ formatMoney(debtors.totals.balance) }}</TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </template>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>

    <CustomerFormDialog v-model:open="showFormDialog" :customer="editingCustomer" @saved="refreshAll" />
    <CustomerStatusDialog :customer="statusTarget" @changed="refreshAll" @close="statusTarget = null" />
  </div>
</template>
