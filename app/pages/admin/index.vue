<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import { Info, Plus, Search } from 'lucide-vue-next'
import OneTimePasswordDialog from '@/components/admin/OneTimePasswordDialog.vue'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import DataTable from '@/components/admin/DataTable.vue'
import { shopColumns } from '@/components/admin/columns'
import type { AdminOneTimePassword, AdminShopPage } from '@/composables/useAdmin'
import { adminPageSize } from '@/composables/useAdmin'

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

    <DataTable
      :columns="shopColumns"
      :data="shopPage.items"
      :loading="loading"
      :page-size="adminPageSize"
      :empty-text="t('admin.shops.empty')"
      is-row-clickable
      @row-click="shop => navigateTo(`/admin/shops/${shop.company_id}`)"
    />

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
