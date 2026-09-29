<script setup lang="ts">
import { ArrowDownRight, ArrowUpRight } from 'lucide-vue-next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const props = defineProps<{
  title: string
  value: string | null
  hint?: string
  change?: number | null
  icon?: any
}>()

const { formatNumber } = useI18n()

const changeText = computed(() => {
  if (props.change == null || !Number.isFinite(props.change)) return ''
  return `${formatNumber(Math.abs(props.change), { maximumFractionDigits: 0 })}%`
})
</script>

<template>
  <Card class="gap-2 py-4">
    <CardHeader class="flex flex-row items-center justify-between px-3 sm:px-4">
      <CardTitle class="text-sm font-medium text-muted-foreground">{{ title }}</CardTitle>
      <component :is="icon" v-if="icon" class="size-4 text-muted-foreground" />
    </CardHeader>
    <CardContent class="px-3 sm:px-4">
      <Skeleton v-if="value === null" class="h-8 w-28" />
      <p v-else class="truncate text-lg font-bold tabular-nums sm:text-2xl">{{ value }}</p>
      <div class="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
        <span
          v-if="changeText"
          class="flex items-center font-medium"
          :class="(change ?? 0) >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-destructive'"
        >
          <ArrowUpRight v-if="(change ?? 0) >= 0" class="size-3.5" />
          <ArrowDownRight v-else class="size-3.5" />
          {{ changeText }}
        </span>
        <span v-if="hint">{{ hint }}</span>
      </div>
    </CardContent>
  </Card>
</template>
