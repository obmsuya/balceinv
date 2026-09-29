<script setup lang="ts">
import { ArrowRightLeft, CloudOff, RefreshCw } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { ExchangeRates } from '@/composables/useDashboard'

const props = defineProps<{ rates: ExchangeRates | null; loadError: string; refreshing: boolean }>()
const emit = defineEmits<{ refresh: [] }>()

const { t, formatDateTime, formatNumber } = useI18n()

const rateText = (rateValue: number) => {
  const fractionDigits = rateValue >= 100 ? 2 : rateValue >= 1 ? 3 : 5
  return formatNumber(rateValue, { maximumFractionDigits: fractionDigits })
}

const updatedText = computed(() => formatDateTime(props.rates?.provider_updated_at ?? props.rates?.fetched_at))

const problemText = computed(() => {
  const problem = props.rates?.problem ?? ''
  if (problem.includes('internet connection')) return t('dashboard.exchangeRates.problems.needsInternet')
  if (problem.includes('could not be read')) return t('dashboard.exchangeRates.problems.unreadable')
  if (problem.startsWith('No exchange rates are published')) return t('dashboard.exchangeRates.problems.notPublished', { currency: props.rates?.base_currency ?? '' })
  return problem
})
</script>

<template>
  <Card class="gap-3">
    <CardHeader class="flex flex-row items-start justify-between gap-2">
      <div class="min-w-0">
        <CardTitle class="flex items-center gap-2 text-base">
          <ArrowRightLeft class="size-4 shrink-0 text-muted-foreground" />
          {{ t('dashboard.exchangeRates.title') }}
        </CardTitle>
        <CardDescription v-if="rates?.available">{{ t('dashboard.exchangeRates.perUnit', { currency: rates.base_currency }) }}</CardDescription>
      </div>
      <Button variant="ghost" size="icon" class="size-8 shrink-0" :disabled="refreshing" :aria-label="t('dashboard.exchangeRates.refresh')" @click="emit('refresh')">
        <RefreshCw :class="refreshing ? 'animate-spin' : ''" />
      </Button>
    </CardHeader>
    <CardContent class="flex flex-col gap-3">
      <div v-if="!rates && !loadError" class="grid grid-cols-2 gap-2">
        <Skeleton v-for="placeholder in 6" :key="placeholder" class="h-12" />
      </div>

      <div v-else-if="loadError || !rates?.available" class="flex items-start gap-3 rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
        <CloudOff class="mt-0.5 size-4 shrink-0" />
        <p>{{ loadError || problemText }}</p>
      </div>

      <template v-else-if="rates">
        <div class="grid grid-cols-2 gap-2">
          <div v-for="rate in rates.rates" :key="rate.code" class="rounded-lg border px-3 py-2">
            <p class="text-xs text-muted-foreground">1 {{ rate.code }}</p>
            <p class="font-semibold tabular-nums">{{ rateText(rate.value) }} <span class="text-xs font-normal text-muted-foreground">{{ rates.base_currency }}</span></p>
          </div>
        </div>
        <p v-if="rates.is_stale" class="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
          <CloudOff class="size-3.5" />
          {{ t('dashboard.exchangeRates.stale') }}
        </p>
        <p class="text-xs text-muted-foreground">
          {{ t('dashboard.exchangeRates.updated', { time: updatedText }) }} ·
          <a :href="rates.source_url" target="_blank" rel="noopener noreferrer" class="underline underline-offset-2">{{ t('dashboard.exchangeRates.source', { source: rates.source_name }) }}</a>
          · {{ t('dashboard.exchangeRates.referenceOnly') }}
        </p>
      </template>
    </CardContent>
  </Card>
</template>
