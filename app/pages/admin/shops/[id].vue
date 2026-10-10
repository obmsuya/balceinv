<script setup lang="ts">
import { ArrowLeft, Check, Copy, KeyRound } from 'lucide-vue-next'
import OneTimePasswordDialog from '@/components/admin/OneTimePasswordDialog.vue'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import type { AdminOneTimePassword, AdminShopDetail, AdminShopUser } from '@/composables/useAdmin'
import { adminPlanLabel } from '@/composables/useAdmin'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const route = useRoute()
const { t, formatDate, formatDateTime, formatNumber } = useI18n()
const { busy, fetchShop, extendTrial, resetPassword } = useAdmin()

const companyId = computed(() => String(route.params.id))
const shop = ref<AdminShopDetail | null>(null)
const loading = ref(true)
const extraDays = ref('14')
const oneTimePassword = ref<AdminOneTimePassword | null>(null)
const isIdCopied = ref(false)
const resetTarget = ref<AdminShopUser | null>(null)
const showResetDialog = ref(false)

const askToReset = (shopUser: AdminShopUser) => {
  resetTarget.value = shopUser
  showResetDialog.value = true
}

useHead({ title: computed(() => shop.value?.name ?? t('admin.shops.title')) })

const load = async () => {
  loading.value = true
  shop.value = await fetchShop(companyId.value)
  loading.value = false
}
onMounted(load)

const plan = computed(() => (shop.value ? adminPlanLabel(shop.value) : null))
const canExtend = computed(() => {
  const days = Number(extraDays.value)
  return Number.isInteger(days) && days >= 1 && days <= 90 && !busy.value && shop.value?.is_trial !== false
})

const submitExtend = async () => {
  if (!canExtend.value) return
  const trialEndsAt = await extendTrial(companyId.value, Number(extraDays.value))
  if (trialEndsAt) load()
}

const submitReset = async () => {
  if (!resetTarget.value) return
  const reset = await resetPassword(companyId.value, resetTarget.value.id)
  showResetDialog.value = false
  if (!reset) return
  oneTimePassword.value = reset
  load()
}

const copySubscriptionId = async () => {
  if (!shop.value) return
  try {
    await navigator.clipboard.writeText(shop.value.subscription_id)
    isIdCopied.value = true
  } catch {
  }
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <NuxtLink to="/admin" class="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft class="size-4" />{{ t('admin.shop.back') }}</NuxtLink>

    <Skeleton v-if="loading && !shop" class="h-40 w-full" />
    <p v-else-if="!shop" class="rounded-lg border bg-background p-6 text-muted-foreground">{{ t('admin.shop.notFound') }}</p>

    <template v-else>
      <div class="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
        <div>
          <h1 class="text-2xl font-bold tracking-tight">{{ shop.name }}</h1>
          <p class="mt-1 text-sm text-muted-foreground">{{ shop.owner_name }} · {{ shop.owner_email }}<template v-if="shop.phone"> · {{ shop.phone }}</template></p>
        </div>
        <Badge v-if="plan" variant="secondary" class="w-fit">{{ plan.text }}</Badge>
      </div>

      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card class="gap-1 py-4"><CardContent class="px-4"><p class="text-xs text-muted-foreground">{{ t('admin.shop.sales30') }}</p><p class="text-xl font-semibold tabular-nums">{{ formatNumber(shop.sales_last_30_days) }}</p></CardContent></Card>
        <Card class="gap-1 py-4"><CardContent class="px-4"><p class="text-xs text-muted-foreground">{{ t('admin.shop.lastSale') }}</p><p class="text-xl font-semibold">{{ shop.last_sale_at ? formatDate(shop.last_sale_at) : t('admin.shops.never') }}</p></CardContent></Card>
        <Card class="gap-1 py-4"><CardContent class="px-4"><p class="text-xs text-muted-foreground">{{ t('admin.shop.shops') }}</p><p class="text-xl font-semibold">{{ shop.shop_names.join(', ') }}</p></CardContent></Card>
        <Card class="gap-1 py-4"><CardContent class="px-4"><p class="text-xs text-muted-foreground">{{ t('admin.shop.joined') }}</p><p class="text-xl font-semibold">{{ formatDate(shop.created_at) }}</p></CardContent></Card>
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader class="pb-2">
            <CardTitle class="text-base">{{ t('admin.shop.subscriptionId') }}</CardTitle>
            <CardDescription>{{ t('admin.shop.currency') }}: {{ shop.currency_code }}</CardDescription>
          </CardHeader>
          <CardContent class="flex items-center gap-2">
            <code class="flex-1 select-all break-all rounded-md bg-muted px-2 py-1.5 font-mono text-xs">{{ shop.subscription_id }}</code>
            <Button variant="outline" size="sm" @click="copySubscriptionId"><component :is="isIdCopied ? Check : Copy" />{{ t('admin.shop.copyId') }}</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader class="pb-2">
            <CardTitle class="text-base">{{ t('admin.shop.extendTitle') }}</CardTitle>
            <CardDescription>{{ t('admin.shop.extendHelp') }}</CardDescription>
          </CardHeader>
          <CardContent>
            <form class="flex items-end gap-2" @submit.prevent="submitExtend">
              <div class="flex w-28 flex-col gap-1.5">
                <Label for="extra-days">{{ t('admin.shop.days') }}</Label>
                <Input id="extra-days" v-model="extraDays" inputmode="numeric" :disabled="shop.is_trial === false" />
              </div>
              <Button type="submit" :disabled="!canExtend">{{ t('admin.shop.extend') }}</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader class="pb-2"><CardTitle class="text-base">{{ t('admin.shop.usersTitle') }}</CardTitle></CardHeader>
        <CardContent class="flex flex-col divide-y">
          <div v-for="shopUser in shop.users" :key="shopUser.id" class="flex flex-wrap items-center justify-between gap-2 py-3">
            <div class="min-w-0">
              <p class="flex flex-wrap items-center gap-2 font-medium">
                {{ shopUser.name }}
                <Badge v-if="shopUser.is_owner" variant="secondary">{{ t('admin.shop.owner') }}</Badge>
                <Badge v-else variant="outline">{{ shopUser.role_name }}</Badge>
                <Badge v-if="!shopUser.is_active" variant="outline">{{ t('admin.shop.inactive') }}</Badge>
                <Badge v-if="shopUser.must_change_password" variant="outline">{{ t('admin.shop.mustChange') }}</Badge>
              </p>
              <p class="text-sm text-muted-foreground">{{ shopUser.email }}</p>
            </div>
            <Button variant="outline" size="sm" :disabled="busy" @click="askToReset(shopUser)"><KeyRound />{{ t('admin.shop.reset') }}</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="pb-2"><CardTitle class="text-base">{{ t('admin.shop.recent') }}</CardTitle></CardHeader>
        <CardContent>
          <p v-if="!shop.recent_audit.length" class="text-sm text-muted-foreground">{{ t('admin.shop.noRecent') }}</p>
          <ul v-else class="flex flex-col gap-2 text-sm">
            <li v-for="entry in shop.recent_audit" :key="entry.id" class="flex flex-wrap gap-x-2">
              <span class="text-muted-foreground">{{ formatDateTime(entry.created_at) }}</span>
              <span class="font-medium">{{ entry.staff_name }}</span>
              <span>{{ t(`admin.audit.actions.${entry.action}`) }}</span>
              <span v-if="entry.details" class="text-muted-foreground">· {{ entry.details }}</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </template>

    <AlertDialog v-model:open="showResetDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{{ t('admin.shop.resetTitle', { name: resetTarget?.name ?? '' }) }}</AlertDialogTitle>
          <AlertDialogDescription>{{ t('admin.shop.resetBody') }}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{{ t('common.actions.cancel') }}</AlertDialogCancel>
          <AlertDialogAction :disabled="busy" @click.prevent="submitReset">{{ t('admin.shop.reset') }}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <OneTimePasswordDialog :result="oneTimePassword" @close="oneTimePassword = null" />
  </div>
</template>
