<script setup lang="ts">
import { ArrowRightLeft, CloudOff, RefreshCw } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { ExchangeRates } from '@/composables/useDashboard'

const props = defineProps<{ rates: ExchangeRates | null; loadError: string; refreshing: boolean }>()
const emit = defineEmits<{ refresh: [] }>()

const rateText = (rateValue: number) => {
  const fractionDigits = rateValue >= 100 ? 2 : rateValue >= 1 ? 3 : 5
  return rateValue.toLocaleString(undefined, { maximumFractionDigits: fractionDigits })
}

const updatedText = computed(() => {
  const updatedAt = props.rates?.provider_updated_at ?? props.rates?.fetched_at
  if (!updatedAt) return ''
  return new Date(updatedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
})
</script>

<template>
  <Card class="gap-3">
    <CardHeader class="flex flex-row items-start justify-between gap-2">
      <div>
        <CardTitle class="flex items-center gap-2 text-base">
          <ArrowRightLeft class="size-4 text-muted-foreground" />
          Exchange rates
        </CardTitle>
        <CardDescription v-if="rates?.available">1 unit in {{ rates.base_currency }}</CardDescription>
      </div>
      <Button variant="ghost" size="icon" class="size-8" :disabled="refreshing" aria-label="Check the exchange rates again" @click="emit('refresh')">
        <RefreshCw :class="refreshing ? 'animate-spin' : ''" />
      </Button>
    </CardHeader>
    <CardContent class="flex flex-col gap-3">
      <div v-if="!rates && !loadError" class="grid grid-cols-2 gap-2">
        <Skeleton v-for="placeholder in 6" :key="placeholder" class="h-12" />
      </div>

      <div v-else-if="loadError || !rates?.available" class="flex items-start gap-3 rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
        <CloudOff class="mt-0.5 size-4 shrink-0" />
        <p>{{ loadError || rates?.problem }}</p>
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
          Offline: showing the last rates saved. They refresh once online.
        </p>
        <p class="text-xs text-muted-foreground">
          Updated {{ updatedText }} ·
          <a :href="rates.source_url" target="_blank" rel="noopener noreferrer" class="underline underline-offset-2">Rates by {{ rates.source_name }}</a>
          · For reference, not for pricing
        </p>
      </template>
    </CardContent>
  </Card>
</template>
