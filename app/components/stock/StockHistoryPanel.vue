<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { MovementReason } from '@/composables/useStock'
import { movementReasonLabel, movementReasons, productLabel, stockPageSize } from '@/composables/useStock'

const props = defineProps<{ productFilter: { id: string; label: string } | null }>()
const emit = defineEmits<{ clearProduct: [] }>()

const allReasons = 'all'
const { t, formatDateTime, formatNumber } = useI18n()
const { movements, totalMovements, loading, fetchMovements } = useStock()

const reasonFilter = ref<string>(allReasons)
const fromDate = ref('')
const toDate = ref('')
const pageOffset = ref(0)

const reload = () => fetchMovements({
  productId: props.productFilter?.id,
  reason: reasonFilter.value === allReasons ? '' : reasonFilter.value as MovementReason,
  fromDate: fromDate.value,
  toDate: toDate.value,
  offset: pageOffset.value,
})

const reloadFromFirstPage = () => {
  pageOffset.value = 0
  reload()
}

watch([reasonFilter, fromDate, toDate, () => props.productFilter?.id], reloadFromFirstPage)
onMounted(reload)

const goToPage = (nextOffset: number) => {
  pageOffset.value = Math.max(nextOffset, 0)
  reload()
}

defineExpose({ reload })
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div class="flex flex-col gap-1.5">
        <Label>{{ t('stock.history.reason') }}</Label>
        <Select v-model="reasonFilter">
          <SelectTrigger :aria-label="t('stock.history.filterByReason')">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem :value="allReasons">{{ t('stock.history.allReasons') }}</SelectItem>
            <SelectItem v-for="reasonKey in movementReasons" :key="reasonKey" :value="reasonKey">{{ movementReasonLabel(reasonKey) }}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div class="flex flex-col gap-1.5">
        <Label for="history-from">{{ t('common.fields.from') }}</Label>
        <Input id="history-from" v-model="fromDate" type="date" />
      </div>
      <div class="flex flex-col gap-1.5">
        <Label for="history-to">{{ t('common.fields.to') }}</Label>
        <Input id="history-to" v-model="toDate" type="date" />
      </div>
    </div>
    <div v-if="productFilter" class="flex">
      <Badge variant="secondary" class="gap-1.5 py-1 pl-2.5 pr-1">
        {{ productFilter.label }}
        <button type="button" class="rounded-full p-0.5 hover:bg-background" :aria-label="t('stock.history.showEveryProduct')" @click="emit('clearProduct')">
          <X class="size-3" />
        </button>
      </Badge>
    </div>

    <div v-if="loading && !movements.length" class="flex flex-col gap-2">
      <Skeleton v-for="skeletonRow in 5" :key="skeletonRow" class="h-12 w-full" />
    </div>
    <div v-else class="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{{ t('stock.history.when') }}</TableHead>
            <TableHead>{{ t('products.table.product') }}</TableHead>
            <TableHead>{{ t('stock.history.reason') }}</TableHead>
            <TableHead class="text-right">{{ t('stock.history.change') }}</TableHead>
            <TableHead class="hidden text-right sm:table-cell">{{ t('stock.history.after') }}</TableHead>
            <TableHead class="hidden lg:table-cell">{{ t('stock.history.by') }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="movement in movements" :key="movement.id">
            <TableCell class="whitespace-nowrap text-sm text-muted-foreground">{{ formatDateTime(movement.created_at) }}</TableCell>
            <TableCell>
              <p class="font-medium leading-tight">{{ productLabel(movement) }}</p>
              <p v-if="movement.reference && !movement.reason.startsWith('transfer')" class="text-xs text-muted-foreground">{{ movement.reference }}</p>
            </TableCell>
            <TableCell><Badge variant="outline" class="whitespace-nowrap font-normal">{{ movementReasonLabel(movement.reason) }}</Badge></TableCell>
            <TableCell class="text-right font-medium tabular-nums" :class="movement.change > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'">
              {{ movement.change > 0 ? '+' : '' }}{{ movement.change }}
            </TableCell>
            <TableCell class="hidden text-right tabular-nums sm:table-cell">{{ movement.quantity_after }} {{ movement.unit }}</TableCell>
            <TableCell class="hidden text-sm text-muted-foreground lg:table-cell">{{ movement.user_name ?? '—' }}</TableCell>
          </TableRow>
          <TableRow v-if="!movements.length">
            <TableCell colspan="6" class="h-24 text-center text-muted-foreground">{{ t('stock.history.empty') }}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <div class="flex flex-col items-center justify-between gap-2 sm:flex-row">
      <p class="text-sm tabular-nums text-muted-foreground">
        <template v-if="totalMovements">{{ t('common.pagination.showing', { from: formatNumber(pageOffset + 1), to: formatNumber(Math.min(pageOffset + movements.length, totalMovements)), total: formatNumber(totalMovements) }) }}</template>
      </p>
      <div class="flex gap-2">
        <Button variant="outline" size="sm" :disabled="pageOffset === 0 || loading" @click="goToPage(pageOffset - stockPageSize)">{{ t('common.pagination.previous') }}</Button>
        <Button variant="outline" size="sm" :disabled="pageOffset + stockPageSize >= totalMovements || loading" @click="goToPage(pageOffset + stockPageSize)">{{ t('common.pagination.next') }}</Button>
      </div>
    </div>
  </div>
</template>
