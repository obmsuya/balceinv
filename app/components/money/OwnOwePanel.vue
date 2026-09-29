<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import MoneyExportButtons from '@/components/money/MoneyExportButtons.vue'
import type { AccountAmount, BalanceSheet } from '@/composables/useMoney'
import { accountName } from '@/composables/useMoney'
import { formatMoney } from '~/utils/money'

const props = defineProps<{ asOf: string; plain: boolean; reloadKey: number }>()

const { t } = useI18n()
const { fetchBalanceSheet } = useMoney()

const report = ref<BalanceSheet | null>(null)
const nonZero = (rows: AccountAmount[]) => rows.filter(row => row.amount !== 0)
const ownerPart = computed(() => (report.value ? report.value.total_assets - report.value.total_liabilities : 0))

watch(() => [props.asOf, props.reloadKey], async () => {
  report.value = null
  report.value = await fetchBalanceSheet(props.asOf)
}, { immediate: true })
</script>

<template>
  <div class="flex flex-col gap-4">
    <div v-if="!plain" class="flex flex-wrap items-center justify-between gap-2">
      <Badge v-if="report" :variant="report.is_balanced ? 'secondary' : 'destructive'">{{ report.is_balanced ? t('money.ownOwe.balanced') : t('money.ownOwe.notBalanced') }}</Badge>
      <MoneyExportButtons report="balance-sheet" :query="{ as_of: asOf }" />
    </div>
    <Skeleton v-if="!report" class="h-64 w-full" />
    <div v-else class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div class="flex flex-col gap-1 rounded-xl border p-4 text-sm">
        <p class="pb-1 font-semibold">{{ plain ? t('money.ownOwe.ownTitle') : t('money.ownOwe.assets') }}</p>
        <div v-for="row in nonZero(report.assets)" :key="row.account_id" class="flex justify-between py-1">
          <span><span v-if="!plain" class="font-mono text-xs text-muted-foreground">{{ row.code }}</span> {{ accountName(row) }}</span>
          <span class="tabular-nums">{{ formatMoney(row.amount) }}</span>
        </div>
        <div class="flex justify-between border-t pt-2 font-bold">
          <span>{{ plain ? t('money.ownOwe.ownTitle') : t('money.ownOwe.totalAssets') }}</span>
          <span class="tabular-nums">{{ formatMoney(report.total_assets) }}</span>
        </div>
      </div>

      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1 rounded-xl border p-4 text-sm">
          <p class="pb-1 font-semibold">{{ plain ? t('money.ownOwe.oweTitle') : t('money.ownOwe.liabilities') }}</p>
          <p v-if="nonZero(report.liabilities).length === 0" class="text-muted-foreground">{{ t('money.ownOwe.nothingOwed') }}</p>
          <div v-for="row in nonZero(report.liabilities)" :key="row.account_id" class="flex justify-between py-1">
            <span><span v-if="!plain" class="font-mono text-xs text-muted-foreground">{{ row.code }}</span> {{ accountName(row) }}</span>
            <span class="tabular-nums">{{ formatMoney(row.amount) }}</span>
          </div>
          <div class="flex justify-between border-t pt-2 font-bold">
            <span>{{ plain ? t('money.ownOwe.oweTitle') : t('money.ownOwe.totalLiabilities') }}</span>
            <span class="tabular-nums">{{ formatMoney(report.total_liabilities) }}</span>
          </div>
        </div>

        <div class="flex flex-col gap-1 rounded-xl border p-4 text-sm">
          <p class="font-semibold">{{ plain ? t('money.ownOwe.ownerTitle') : t('money.ownOwe.equity') }}</p>
          <p v-if="plain" class="pb-1 text-xs text-muted-foreground">{{ t('money.ownOwe.ownerHelp') }}</p>
          <template v-else>
            <div v-for="row in nonZero(report.equity)" :key="row.account_id" class="flex justify-between py-1">
              <span><span class="font-mono text-xs text-muted-foreground">{{ row.code }}</span> {{ accountName(row) }}</span>
              <span class="tabular-nums">{{ formatMoney(row.amount) }}</span>
            </div>
            <div class="flex justify-between py-1">
              <span>{{ t('money.ownOwe.profitSoFar') }}</span>
              <span class="tabular-nums">{{ formatMoney(report.profit_to_date) }}</span>
            </div>
          </template>
          <div class="flex justify-between border-t pt-2 font-bold">
            <span>{{ plain ? t('money.ownOwe.ownerTitle') : t('money.ownOwe.totalEquity') }}</span>
            <span class="tabular-nums">{{ formatMoney(plain ? ownerPart : report.total_equity) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
