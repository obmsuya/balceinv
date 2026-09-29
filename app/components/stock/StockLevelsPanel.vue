<script setup lang="ts">
import { History, Search, SlidersHorizontal } from 'lucide-vue-next'
import { useDebounceFn } from '@vueuse/core'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { StockLevel } from '@/composables/useStock'
import { productLabel, stockPageSize } from '@/composables/useStock'

const props = defineProps<{ canAdjust: boolean; initialStatus: '' | 'low' | 'out' }>()
const emit = defineEmits<{ adjust: [level: StockLevel]; history: [level: StockLevel] }>()

const allLevels = 'all'
const { t, formatNumber } = useI18n()
const { levels, totalLevels, loading, fetchLevels } = useStock()

const searchText = ref('')
const statusFilter = ref<string>(props.initialStatus || allLevels)
const pageOffset = ref(0)

const statusVariant: Record<string, 'secondary' | 'outline' | 'destructive'> = {
  ok: 'secondary',
  low: 'outline',
  out: 'destructive',
}

const reload = () => fetchLevels({
  searchText: searchText.value.trim(),
  status: statusFilter.value === allLevels ? '' : statusFilter.value as 'low' | 'out',
  offset: pageOffset.value,
})

const reloadFromFirstPage = () => {
  pageOffset.value = 0
  reload()
}

watch(searchText, useDebounceFn(reloadFromFirstPage, 300))
watch(statusFilter, reloadFromFirstPage)
onMounted(reload)

const goToPage = (nextOffset: number) => {
  pageOffset.value = Math.max(nextOffset, 0)
  reload()
}

defineExpose({ reload })
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-col gap-3 sm:flex-row">
      <div class="relative flex-1">
        <Search class="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input v-model="searchText" :placeholder="t('stock.levels.searchPlaceholder')" class="pl-8" :aria-label="t('stock.levels.searchLabel')" />
      </div>
      <Select v-model="statusFilter">
        <SelectTrigger class="w-full sm:w-48" :aria-label="t('stock.levels.filterByStatus')">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem :value="allLevels">{{ t('stock.levels.allProducts') }}</SelectItem>
          <SelectItem value="low">{{ t('stock.levels.lowOrOut') }}</SelectItem>
          <SelectItem value="out">{{ t('stock.page.outOfStock') }}</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div v-if="loading && !levels.length" class="flex flex-col gap-2">
      <Skeleton v-for="skeletonRow in 5" :key="skeletonRow" class="h-12 w-full" />
    </div>
    <div v-else class="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{{ t('products.table.product') }}</TableHead>
            <TableHead class="text-right">{{ t('stock.levels.inStock') }}</TableHead>
            <TableHead class="hidden text-right sm:table-cell">{{ t('stock.levels.warnAt') }}</TableHead>
            <TableHead class="hidden md:table-cell">{{ t('common.fields.status') }}</TableHead>
            <TableHead class="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="level in levels" :key="level.product_id">
            <TableCell>
              <p class="font-medium leading-tight">{{ productLabel(level) }}</p>
              <p class="font-mono text-xs text-muted-foreground">{{ level.sku }}</p>
            </TableCell>
            <TableCell class="text-right">
              <Badge :variant="statusVariant[level.status]" class="whitespace-nowrap tabular-nums md:hidden">{{ level.quantity }} {{ level.unit }}</Badge>
              <span class="hidden tabular-nums md:inline">{{ level.quantity }} {{ level.unit }}</span>
            </TableCell>
            <TableCell class="hidden text-right tabular-nums text-muted-foreground sm:table-cell">{{ level.min_stock }}</TableCell>
            <TableCell class="hidden md:table-cell">
              <Badge :variant="statusVariant[level.status]">{{ t(`stock.status.${level.status}`) }}</Badge>
            </TableCell>
            <TableCell>
              <div class="flex justify-end gap-1">
                <Button variant="ghost" size="icon" :aria-label="t('stock.levels.historyOf', { product: productLabel(level) })" @click="emit('history', level)">
                  <History />
                </Button>
                <Button v-if="canAdjust" variant="ghost" size="icon" :aria-label="t('stock.levels.changeStockOf', { product: productLabel(level) })" @click="emit('adjust', level)">
                  <SlidersHorizontal />
                </Button>
              </div>
            </TableCell>
          </TableRow>
          <TableRow v-if="!levels.length">
            <TableCell colspan="5" class="h-24 text-center text-muted-foreground">{{ t('stock.levels.empty') }}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <div class="flex flex-col items-center justify-between gap-2 sm:flex-row">
      <p class="text-sm tabular-nums text-muted-foreground">
        <template v-if="totalLevels">{{ t('common.pagination.showing', { from: formatNumber(pageOffset + 1), to: formatNumber(Math.min(pageOffset + levels.length, totalLevels)), total: formatNumber(totalLevels) }) }}</template>
      </p>
      <div class="flex gap-2">
        <Button variant="outline" size="sm" :disabled="pageOffset === 0 || loading" @click="goToPage(pageOffset - stockPageSize)">{{ t('common.pagination.previous') }}</Button>
        <Button variant="outline" size="sm" :disabled="pageOffset + stockPageSize >= totalLevels || loading" @click="goToPage(pageOffset + stockPageSize)">{{ t('common.pagination.next') }}</Button>
      </div>
    </div>
  </div>
</template>
