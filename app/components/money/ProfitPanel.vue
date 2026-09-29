<script setup lang="ts">
import { Skeleton } from '@/components/ui/skeleton'
import MoneyExportButtons from '@/components/money/MoneyExportButtons.vue'
import type { ProfitAndLoss, ReportPeriod } from '@/composables/useMoney'
import { accountName } from '@/composables/useMoney'
import { formatMoney } from '~/utils/money'

const props = defineProps<{ period: ReportPeriod; plain: boolean; reloadKey: number }>()

const { t } = useI18n()
const { fetchProfitAndLoss } = useMoney()

const report = ref<ProfitAndLoss | null>(null)
const salesAmount = computed(() => report.value?.income.find(row => row.system_key === 'sales')?.amount ?? 0)
const otherIncome = computed(() => (report.value?.total_income ?? 0) - salesAmount.value)

watch(() => [props.period, props.reloadKey], async () => {
  report.value = null
  report.value = await fetchProfitAndLoss(props.period)
}, { deep: true, immediate: true })
</script>

<template>
  <div class="flex flex-col gap-4">
    <div v-if="!plain" class="flex justify-end">
      <MoneyExportButtons report="profit-and-loss" :query="{ ...period }" />
    </div>
    <Skeleton v-if="!report" class="h-64 w-full" />
    <div v-else class="flex flex-col gap-1 rounded-xl border p-4 text-sm">
      <template v-if="plain">
        <div class="flex justify-between py-1"><span>{{ t('money.profit.sales') }}</span><span class="tabular-nums">{{ formatMoney(salesAmount) }}</span></div>
        <div v-if="otherIncome" class="flex justify-between py-1"><span>{{ t('money.profit.otherIncome') }}</span><span class="tabular-nums">{{ formatMoney(otherIncome) }}</span></div>
      </template>
      <template v-else>
        <p class="pt-1 font-semibold">{{ t('money.profit.income') }}</p>
        <div v-for="row in report.income" :key="row.account_id" class="flex justify-between py-1 pl-3">
          <span><span class="font-mono text-xs text-muted-foreground">{{ row.code }}</span> {{ accountName(row) }}</span>
          <span class="tabular-nums">{{ formatMoney(row.amount) }}</span>
        </div>
      </template>
      <div class="flex justify-between py-1 text-muted-foreground">
        <span>− {{ plain ? t('money.profit.goodsCost') : t('money.profit.costOfGoods') }}</span>
        <span class="tabular-nums">{{ formatMoney(report.cost_of_goods) }}</span>
      </div>
      <div class="flex justify-between border-t py-2 font-semibold">
        <span>{{ t('money.profit.grossProfit') }}</span>
        <span class="tabular-nums">{{ formatMoney(report.gross_profit) }}</span>
      </div>
      <p class="pt-1 font-semibold">{{ t('money.profit.expenses') }}</p>
      <p v-if="report.expenses.length === 0" class="pl-3 text-muted-foreground">{{ t('money.profit.noExpenses') }}</p>
      <div v-for="row in report.expenses" :key="row.account_id" class="flex justify-between py-1 pl-3">
        <span><span v-if="!plain" class="font-mono text-xs text-muted-foreground">{{ row.code }}</span> {{ accountName(row) }}</span>
        <span class="tabular-nums">{{ formatMoney(row.amount) }}</span>
      </div>
      <div class="flex justify-between border-t py-1 text-muted-foreground">
        <span>{{ t('money.profit.totalExpenses') }}</span>
        <span class="tabular-nums">{{ formatMoney(report.total_expenses) }}</span>
      </div>
      <div class="flex justify-between border-t-2 pt-3 text-base font-bold" :class="report.net_profit < 0 ? 'text-destructive' : 'text-emerald-700 dark:text-emerald-400'">
        <span>{{ report.net_profit < 0 ? t('money.profit.netLoss') : t('money.profit.netProfit') }}</span>
        <span class="tabular-nums">{{ formatMoney(Math.abs(report.net_profit)) }}</span>
      </div>
    </div>
  </div>
</template>
