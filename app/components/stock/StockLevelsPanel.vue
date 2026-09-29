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
const { levels, totalLevels, loading, fetchLevels } = useStock()

const searchText = ref('')
const statusFilter = ref<string>(props.initialStatus || allLevels)
const pageOffset = ref(0)

const statusBadge: Record<string, { label: string; variant: 'secondary' | 'outline' | 'destructive' }> = {
  ok: { label: 'In stock', variant: 'secondary' },
  low: { label: 'Low', variant: 'outline' },
  out: { label: 'Out', variant: 'destructive' },
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
        <Input v-model="searchText" placeholder="Search by name or SKU" class="pl-8" aria-label="Search stock" />
      </div>
      <Select v-model="statusFilter">
        <SelectTrigger class="w-full sm:w-48" aria-label="Filter by stock status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem :value="allLevels">All products</SelectItem>
          <SelectItem value="low">Low or out</SelectItem>
          <SelectItem value="out">Out of stock</SelectItem>
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
            <TableHead>Product</TableHead>
            <TableHead class="text-right">In stock</TableHead>
            <TableHead class="hidden text-right sm:table-cell">Warn at</TableHead>
            <TableHead class="hidden md:table-cell">Status</TableHead>
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
              <Badge :variant="statusBadge[level.status]!.variant" class="whitespace-nowrap tabular-nums md:hidden">{{ level.quantity }} {{ level.unit }}</Badge>
              <span class="hidden tabular-nums md:inline">{{ level.quantity }} {{ level.unit }}</span>
            </TableCell>
            <TableCell class="hidden text-right tabular-nums text-muted-foreground sm:table-cell">{{ level.min_stock }}</TableCell>
            <TableCell class="hidden md:table-cell">
              <Badge :variant="statusBadge[level.status]!.variant">{{ statusBadge[level.status]!.label }}</Badge>
            </TableCell>
            <TableCell>
              <div class="flex justify-end gap-1">
                <Button variant="ghost" size="icon" :aria-label="`History of ${productLabel(level)}`" @click="emit('history', level)">
                  <History />
                </Button>
                <Button v-if="canAdjust" variant="ghost" size="icon" :aria-label="`Change stock of ${productLabel(level)}`" @click="emit('adjust', level)">
                  <SlidersHorizontal />
                </Button>
              </div>
            </TableCell>
          </TableRow>
          <TableRow v-if="!levels.length">
            <TableCell colspan="5" class="h-24 text-center text-muted-foreground">No products match.</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <div class="flex flex-col items-center justify-between gap-2 sm:flex-row">
      <p class="text-sm tabular-nums text-muted-foreground">
        <template v-if="totalLevels">Showing {{ pageOffset + 1 }}–{{ Math.min(pageOffset + levels.length, totalLevels) }} of {{ totalLevels.toLocaleString() }}</template>
      </p>
      <div class="flex gap-2">
        <Button variant="outline" size="sm" :disabled="pageOffset === 0 || loading" @click="goToPage(pageOffset - stockPageSize)">Previous</Button>
        <Button variant="outline" size="sm" :disabled="pageOffset + stockPageSize >= totalLevels || loading" @click="goToPage(pageOffset + stockPageSize)">Next</Button>
      </div>
    </div>
  </div>
</template>
