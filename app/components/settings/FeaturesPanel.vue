<script setup lang="ts">
import { BookOpen, Calculator, CircleOff, Save, Truck, Users } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { AccountingMode, CompanyFeatures } from '~/composables/useFeatures'

const { t } = useI18n()
const { features, savingFeatures, saveFeatures } = useFeatures()
const { canEdit } = usePermissions()

const canChange = computed(() => canEdit('settings'))
const draft = reactive<CompanyFeatures>({ ...features.value })

watch(features, freshFeatures => Object.assign(draft, freshFeatures))

const accountingModes = computed(() => [
  { value: 'off' as AccountingMode, icon: CircleOff, title: t('settings.features.accounting.off'), description: t('settings.features.accounting.offHelp') },
  { value: 'simple' as AccountingMode, icon: Calculator, title: t('settings.features.accounting.simple'), description: t('settings.features.accounting.simpleHelp') },
  { value: 'full' as AccountingMode, icon: BookOpen, title: t('settings.features.accounting.full'), description: t('settings.features.accounting.fullHelp') },
])

const setSuppliers = (isOn: boolean) => {
  draft.suppliers_enabled = isOn
  if (!isOn) draft.purchase_orders_enabled = false
}

const setCustomers = (isOn: boolean) => {
  draft.customers_enabled = isOn
  if (!isOn) {
    draft.credit_sales_enabled = false
    draft.customer_orders_enabled = false
  }
}

const needsVatNumber = computed(() => draft.vat_registered && !(draft.vat_number ?? '').trim())
const hasChanges = computed(() => JSON.stringify(draft) !== JSON.stringify(features.value))

const save = () => saveFeatures({ ...draft })
</script>

<template>
  <div class="flex flex-col gap-4">
    <Card>
      <CardHeader class="pb-3">
        <CardTitle class="flex items-center gap-2 text-base"><Truck class="size-4" />{{ t('settings.features.buying.title') }}</CardTitle>
        <CardDescription>{{ t('settings.features.buying.description') }}</CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col gap-4">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <Label for="feature-suppliers">{{ t('settings.features.buying.suppliers') }}</Label>
            <p class="text-sm text-muted-foreground">{{ t('settings.features.buying.suppliersHelp') }}</p>
          </div>
          <Switch id="feature-suppliers" :model-value="draft.suppliers_enabled" :disabled="!canChange" @update:model-value="setSuppliers" />
        </div>
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <Label for="feature-purchase-orders">{{ t('settings.features.buying.purchaseOrders') }}</Label>
            <p class="text-sm text-muted-foreground">{{ t('settings.features.buying.purchaseOrdersHelp') }}</p>
          </div>
          <Switch id="feature-purchase-orders" v-model="draft.purchase_orders_enabled" :disabled="!canChange || !draft.suppliers_enabled" />
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="pb-3">
        <CardTitle class="flex items-center gap-2 text-base"><Users class="size-4" />{{ t('settings.features.selling.title') }}</CardTitle>
        <CardDescription>{{ t('settings.features.selling.description') }}</CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col gap-4">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <Label for="feature-customers">{{ t('settings.features.selling.customers') }}</Label>
            <p class="text-sm text-muted-foreground">{{ t('settings.features.selling.customersHelp') }}</p>
          </div>
          <Switch id="feature-customers" :model-value="draft.customers_enabled" :disabled="!canChange" @update:model-value="setCustomers" />
        </div>
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <Label for="feature-credit">{{ t('settings.features.selling.credit') }}</Label>
            <p class="text-sm text-muted-foreground">{{ t('settings.features.selling.creditHelp') }}</p>
          </div>
          <Switch id="feature-credit" v-model="draft.credit_sales_enabled" :disabled="!canChange || !draft.customers_enabled" />
        </div>
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <Label for="feature-orders">{{ t('settings.features.selling.orders') }}</Label>
            <p class="text-sm text-muted-foreground">{{ t('settings.features.selling.ordersHelp') }}</p>
          </div>
          <Switch id="feature-orders" v-model="draft.customer_orders_enabled" :disabled="!canChange || !draft.customers_enabled" />
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="pb-3">
        <CardTitle class="flex items-center gap-2 text-base"><Calculator class="size-4" />{{ t('settings.features.accounting.title') }}</CardTitle>
        <CardDescription>{{ t('settings.features.accounting.description') }}</CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col gap-4">
        <div class="grid gap-3 sm:grid-cols-3" role="radiogroup" :aria-label="t('settings.features.accounting.title')">
          <button
            v-for="accountingMode in accountingModes"
            :key="accountingMode.value"
            type="button"
            role="radio"
            :aria-checked="draft.accounting_mode === accountingMode.value"
            :disabled="!canChange"
            class="flex min-w-0 flex-col gap-1 rounded-lg border p-3 text-left transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
            :class="draft.accounting_mode === accountingMode.value ? 'border-primary ring-1 ring-primary' : ''"
            @click="draft.accounting_mode = accountingMode.value"
          >
            <span class="flex items-center gap-2 font-medium"><component :is="accountingMode.icon" class="size-4 shrink-0" />{{ accountingMode.title }}</span>
            <span class="text-sm text-muted-foreground">{{ accountingMode.description }}</span>
          </button>
        </div>

        <div class="flex items-start justify-between gap-4 border-t pt-4">
          <div class="min-w-0">
            <Label for="feature-vat">{{ t('settings.features.vat.registered') }}</Label>
            <p class="text-sm text-muted-foreground">{{ t('settings.features.vat.help') }}</p>
          </div>
          <Switch id="feature-vat" v-model="draft.vat_registered" :disabled="!canChange" />
        </div>
        <div v-if="draft.vat_registered" class="flex flex-col gap-1.5 sm:max-w-xs">
          <Label for="feature-vrn">{{ t('settings.features.vat.number') }}</Label>
          <Input id="feature-vrn" v-model="draft.vat_number" :disabled="!canChange" placeholder="40-012345-A" />
          <p v-if="needsVatNumber" class="text-sm text-destructive">{{ t('settings.features.vat.numberRequired') }}</p>
        </div>
      </CardContent>
    </Card>

    <div v-if="canChange" class="flex justify-end">
      <Button :disabled="!hasChanges || needsVatNumber || savingFeatures" @click="save">
        <Save class="size-4" />{{ savingFeatures ? t('common.actions.saving') : t('common.actions.saveChanges') }}
      </Button>
    </div>
  </div>
</template>
