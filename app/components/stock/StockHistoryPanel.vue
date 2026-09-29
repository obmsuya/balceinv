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
import { movementReasonLabels, productLabel, stockPageSize } from '@/composables/useStock'

const props = defineProps<{ productFilter: { id: string; label: string } | null }>()
const emit = defineEmits<{ clearProduct: [] }>()

const allReasons = 'all'
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

const formatDate = (isoDate: string): string =>
  new Date(isoDate).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

defineExpose({ reload })
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div class="flex flex-col gap-1.5">
        <Label>Reason</Label>
        <Select v-model="reasonFilter">
          <SelectTrigger aria-label="Filter by reason">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem :value="allReasons">All reasons</SelectItem>
            <SelectItem v-for="(reasonLabel, reasonKey) in movementReasonLabels" :key="reasonKey" :value="reasonKey">{{ reasonLabel }}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div class="flex flex-col gap-1.5">
        <Label for="history-from">From</Label>
        <Input id="history-from" v-model="fromDate" type="date" />
      </div>
      <div class="flex flex-col gap-1.5">
        <Label for="history-to">To</Label>
        <Input id="history-to" v-model="toDate" type="date" />
      </div>
    </div>
    <div v-if="productFilter" class="flex">
      <Badge variant="secondary" class="gap-1.5 py-1 pl-2.5 pr-1">
        {{ productFilter.label }}
        <button type="button" class="rounded-full p-0.5 hover:bg-background" aria-label="Show every product" @click="emit('clearProduct')">
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
            <TableHead>When</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead class="text-right">Change</TableHead>
            <TableHead class="hidden text-right sm:table-cell">After</TableHead>
            <TableHead class="hidden lg:table-cell">By</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="movement in movements" :key="movement.id">
            <TableCell class="whitespace-nowrap text-sm text-muted-foreground">{{ formatDate(movement.created_at) }}</TableCell>
            <TableCell>
              <p class="font-medium leading-tight">{{ productLabel(movement) }}</p>
              <p v-if="movement.reference && !movement.reason.startsWith('transfer')" class="text-xs text-muted-foreground">{{ movement.reference }}</p>
            </TableCell>
            <TableCell><Badge variant="outline" class="whitespace-nowrap font-normal">{{ movementReasonLabels[movement.reason] }}</Badge></TableCell>
            <TableCell class="text-right font-medium tabular-nums" :class="movement.change > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'">
              {{ movement.change > 0 ? '+' : '' }}{{ movement.change }}
            </TableCell>
            <TableCell class="hidden text-right tabular-nums sm:table-cell">{{ movement.quantity_after }} {{ movement.unit }}</TableCell>
            <TableCell class="hidden text-sm text-muted-foreground lg:table-cell">{{ movement.user_name ?? '—' }}</TableCell>
          </TableRow>
          <TableRow v-if="!movements.length">
            <TableCell colspan="6" class="h-24 text-center text-muted-foreground">No stock changes match.</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <div class="flex flex-col items-center justify-between gap-2 sm:flex-row">
      <p class="text-sm tabular-nums text-muted-foreground">
        <template v-if="totalMovements">Showing {{ pageOffset + 1 }}–{{ Math.min(pageOffset + movements.length, totalMovements) }} of {{ totalMovements.toLocaleString() }}</template>
      </p>
      <div class="flex gap-2">
        <Button variant="outline" size="sm" :disabled="pageOffset === 0 || loading" @click="goToPage(pageOffset - stockPageSize)">Previous</Button>
        <Button variant="outline" size="sm" :disabled="pageOffset + stockPageSize >= totalMovements || loading" @click="goToPage(pageOffset + stockPageSize)">Next</Button>
      </div>
    </div>
  </div>
</template>
