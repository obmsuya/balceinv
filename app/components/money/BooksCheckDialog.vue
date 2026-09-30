<script setup lang="ts">
import { CircleAlert, CircleCheck } from 'lucide-vue-next'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { BooksCheck } from '@/composables/useMoney'
import { formatMoney } from '~/utils/money'

defineProps<{ check: BooksCheck | null; periodLabel: string }>()
const open = defineModel<boolean>('open', { required: true })

const { t } = useI18n()
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{{ t('money.check.title') }}</DialogTitle>
        <DialogDescription>{{ periodLabel }}</DialogDescription>
      </DialogHeader>
      <ul v-if="check" class="flex flex-col gap-3 text-sm">
        <li class="flex gap-3 rounded-lg border p-3">
          <component :is="check.is_balanced ? CircleCheck : CircleAlert" class="size-5 shrink-0" :class="check.is_balanced ? 'text-emerald-600' : 'text-destructive'" />
          <span>{{ check.is_balanced ? t('money.check.trial') : t('money.check.trialBad') }}</span>
        </li>
        <li class="flex gap-3 rounded-lg border p-3">
          <component :is="check.sales_difference === 0 ? CircleCheck : CircleAlert" class="size-5 shrink-0" :class="check.sales_difference === 0 ? 'text-emerald-600' : 'text-amber-600'" />
          <span>
            {{ check.sales_difference === 0 ? t('money.check.sales') : t('money.check.salesBad', { amount: formatMoney(check.sales_difference) }) }}
            <span class="block text-xs text-muted-foreground">{{ t('money.check.salesHelp', { ledger: formatMoney(check.ledger_sales), report: formatMoney(check.expected_ledger_sales) }) }}</span>
          </span>
        </li>
        <li class="flex gap-3 rounded-lg border p-3">
          <component :is="check.inventory_difference === 0 ? CircleCheck : CircleAlert" class="size-5 shrink-0" :class="check.inventory_difference === 0 ? 'text-emerald-600' : 'text-amber-600'" />
          <span>
            {{ check.inventory_difference === 0 ? t('money.check.stock') : t('money.check.stockBad', { amount: formatMoney(check.inventory_difference) }) }}
            <span class="block text-xs text-muted-foreground">{{ t('money.check.stockHelp', { ledger: formatMoney(check.inventory_account), live: formatMoney(check.live_stock_value) }) }}</span>
          </span>
        </li>
        <li v-if="check.unposted_count > 0" class="flex gap-3 rounded-lg border p-3">
          <CircleAlert class="size-5 shrink-0 text-amber-600" />
          <span>{{ t('money.check.missing', { count: check.unposted_count }) }}</span>
        </li>
      </ul>
    </DialogContent>
  </Dialog>
</template>
