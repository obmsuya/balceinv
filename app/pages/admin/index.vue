<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import { Info, Plus, Search } from 'lucide-vue-next'
import OneTimePasswordDialog from '@/components/admin/OneTimePasswordDialog.vue'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { AdminOneTimePassword, AdminShopPage } from '@/composables/useAdmin'
import { adminPageSize, adminPlanLabel } from '@/composables/useAdmin'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const { t, formatDate, formatNumber } = useI18n()
const { staff, busy, fetchShops, createShop } = useAdmin()
useHead({ title: computed(() => t('admin.shops.title')) })

const search = ref('')
const offset = ref(0)
const loading = ref(true)
const shopPage = ref<AdminShopPage>({ items: [], total: 0 })
const showCreateDialog = ref(false)
const newShop = ref({ business_name: '', shop_name: '', owner_name: '', owner_email: '' })
const oneTimePassword = ref<AdminOneTimePassword | null>(null)

const load = async () => {
  loading.value = true
  shopPage.value = await fetchShops(search.value.trim(), offset.value)
  loading.value = false
}

const searchLater = useDebounceFn(() => {
  offset.value = 0
  load()
}, 300)

watch(search, searchLater)
onMounted(load)

const pageEnd = computed(() => Math.min(offset.value + shopPage.value.items.length, shopPage.value.total))
const goToPage = (nextOffset: number) => {
  offset.value = Math.max(nextOffset, 0)
  load()
}

const planToneClass = { trial: 'bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300', paid: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-300', ended: 'bg-red-100 text-red-900 dark:bg-red-500/15 dark:text-red-300', none: 'bg-muted text-muted-foreground' }

const canCreate = computed(() => newShop.value.business_name.trim() && newShop.value.owner_name.trim() && newShop.value.owner_email.includes('@') && !busy.value)

const openCreate = () => {
  newShop.value = { business_name: '', shop_name: '', owner_name: '', owner_email: '' }
  showCreateDialog.value = true
}

const submitCreate = async () => {
  if (!canCreate.value) return
  const created = await createShop({ ...newShop.value, owner_email: newShop.value.owner_email.trim() })
  if (!created) return
  showCreateDialog.value = false
  oneTimePassword.value = created
  load()
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">{{ t('admin.shops.title') }}</h1>
        <p class="mt-1 text-sm text-muted-foreground">{{ t('admin.shops.subtitle', { count: formatNumber(shopPage.total) }) }}</p>
      </div>
      <Button v-if="staff?.role === 'admin'" @click="openCreate"><Plus /> {{ t('admin.shops.create') }}</Button>
    </div>

    <div class="relative">
      <Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input v-model="search" :placeholder="t('admin.shops.search')" class="bg-background pl-9" />
    </div>

    <div class="overflow-hidden rounded-lg border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{{ t('admin.shops.business') }}</TableHead>
            <TableHead class="hidden md:table-cell">{{ t('admin.shops.owner') }}</TableHead>
            <TableHead>{{ t('admin.shops.plan') }}</TableHead>
            <TableHead class="hidden text-right sm:table-cell">{{ t('admin.shops.sales30') }}</TableHead>
            <TableHead class="hidden lg:table-cell">{{ t('admin.shops.lastSale') }}</TableHead>
            <TableHead class="hidden lg:table-cell">{{ t('admin.shops.joined') }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-if="loading && !shopPage.items.length">
            <TableRow v-for="row in 4" :key="row"><TableCell colspan="6"><Skeleton class="h-6 w-full" /></TableCell></TableRow>
          </template>
          <TableRow v-else-if="!shopPage.items.length">
            <TableCell colspan="6" class="py-10 text-center text-muted-foreground">{{ t('admin.shops.empty') }}</TableCell>
          </TableRow>
          <TableRow v-for="shop in shopPage.items" v-else :key="shop.company_id" class="cursor-pointer" @click="navigateTo(`/admin/shops/${shop.company_id}`)">
            <TableCell>
              <NuxtLink :to="`/admin/shops/${shop.company_id}`" class="font-medium hover:underline" @click.stop>{{ shop.name }}</NuxtLink>
              <p class="text-xs text-muted-foreground">{{ shop.phone || '—' }}</p>
            </TableCell>
            <TableCell class="hidden md:table-cell">
              <p class="text-sm">{{ shop.owner_name || '—' }}</p>
              <p class="text-xs text-muted-foreground">{{ shop.owner_email }}</p>
            </TableCell>
            <TableCell>
              <span class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium" :class="planToneClass[adminPlanLabel(shop).tone]">{{ adminPlanLabel(shop).text }}</span>
            </TableCell>
            <TableCell class="hidden text-right tabular-nums sm:table-cell">{{ formatNumber(shop.sales_last_30_days) }}</TableCell>
            <TableCell class="hidden text-sm lg:table-cell">{{ shop.last_sale_at ? formatDate(shop.last_sale_at) : t('admin.shops.never') }}</TableCell>
            <TableCell class="hidden text-sm lg:table-cell">{{ formatDate(shop.created_at) }}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <div class="flex flex-col items-center justify-between gap-2 text-sm text-muted-foreground sm:flex-row">
      <p>{{ shopPage.total ? t('admin.shops.showing', { from: offset + 1, to: pageEnd, total: shopPage.total }) : '' }}</p>
      <div class="flex gap-2">
        <Button variant="outline" size="sm" :disabled="offset === 0" @click="goToPage(offset - adminPageSize)">{{ t('admin.shops.previous') }}</Button>
        <Button variant="outline" size="sm" :disabled="offset + adminPageSize >= shopPage.total" @click="goToPage(offset + adminPageSize)">{{ t('admin.shops.next') }}</Button>
      </div>
    </div>
    <p class="flex items-start gap-1.5 text-xs text-muted-foreground"><Info class="mt-0.5 size-3.5 shrink-0" />{{ t('admin.shops.desktopNote') }}</p>

    <Dialog v-model:open="showCreateDialog">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{{ t('admin.create.title') }}</DialogTitle>
          <DialogDescription>{{ t('admin.create.description') }}</DialogDescription>
        </DialogHeader>
        <form class="flex flex-col gap-4" @submit.prevent="submitCreate">
          <div class="flex flex-col gap-1.5">
            <Label for="new-business">{{ t('admin.create.businessName') }}</Label>
            <Input id="new-business" v-model="newShop.business_name" />
          </div>
          <div class="flex flex-col gap-1.5">
            <Label for="new-shop">{{ t('admin.create.shopName') }}</Label>
            <Input id="new-shop" v-model="newShop.shop_name" />
          </div>
          <div class="flex flex-col gap-1.5">
            <Label for="new-owner">{{ t('admin.create.ownerName') }}</Label>
            <Input id="new-owner" v-model="newShop.owner_name" />
          </div>
          <div class="flex flex-col gap-1.5">
            <Label for="new-email">{{ t('admin.create.ownerEmail') }}</Label>
            <Input id="new-email" v-model="newShop.owner_email" type="email" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" @click="showCreateDialog = false">{{ t('common.actions.cancel') }}</Button>
            <Button type="submit" :disabled="!canCreate">{{ t('admin.create.submit') }}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <OneTimePasswordDialog :result="oneTimePassword" @close="oneTimePassword = null" />
  </div>
</template>
