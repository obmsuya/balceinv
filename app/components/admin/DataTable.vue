<script setup lang="ts" generic="RowData">
import { FlexRender, getCoreRowModel, getPaginationRowModel, getSortedRowModel, useVueTable } from '@tanstack/vue-table'
import type { ColumnDef, SortingState } from '@tanstack/vue-table'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const props = withDefaults(defineProps<{
  columns: ColumnDef<RowData, any>[]
  data: RowData[]
  loading?: boolean
  pageSize?: number
  emptyText?: string
  isRowClickable?: boolean
}>(), { loading: false, pageSize: 25, emptyText: '', isRowClickable: false })

const emit = defineEmits<{ rowClick: [row: RowData] }>()
const { t } = useI18n()

const sorting = ref<SortingState>([])

const table = useVueTable({
  get data() {
    return props.data
  },
  get columns() {
    return props.columns
  },
  state: {
    get sorting() {
      return sorting.value
    },
  },
  onSortingChange: updater => {
    sorting.value = typeof updater === 'function' ? updater(sorting.value) : updater
  },
  initialState: { pagination: { pageSize: props.pageSize } },
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
})

const columnClass = (columnDef: ColumnDef<RowData, any>): string =>
  (columnDef.meta as { class?: string } | undefined)?.class ?? ''
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="overflow-x-auto rounded-md border bg-background">
      <Table>
        <TableHeader>
          <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
            <TableHead v-for="header in headerGroup.headers" :key="header.id" :class="columnClass(header.column.columnDef)">
              <FlexRender v-if="!header.isPlaceholder" :render="header.column.columnDef.header" :props="header.getContext()" />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-if="loading && !data.length">
            <TableRow v-for="placeholderRow in 4" :key="placeholderRow">
              <TableCell :colspan="columns.length"><Skeleton class="h-6 w-full" /></TableCell>
            </TableRow>
          </template>
          <template v-else-if="table.getRowModel().rows.length">
            <TableRow
              v-for="row in table.getRowModel().rows"
              :key="row.id"
              :class="isRowClickable ? 'cursor-pointer' : ''"
              @click="isRowClickable && emit('rowClick', row.original)"
            >
              <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id" :class="columnClass(cell.column.columnDef)">
                <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
              </TableCell>
            </TableRow>
          </template>
          <TableRow v-else>
            <TableCell :colspan="columns.length" class="h-24 text-center text-muted-foreground">{{ emptyText || t('common.states.noResults') }}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
    <div v-if="table.getPageCount() > 1" class="flex items-center justify-end gap-2">
      <Button variant="outline" size="sm" :disabled="!table.getCanPreviousPage()" @click="table.previousPage()">{{ t('common.pagination.previous') }}</Button>
      <Button variant="outline" size="sm" :disabled="!table.getCanNextPage()" @click="table.nextPage()">{{ t('common.pagination.next') }}</Button>
    </div>
  </div>
</template>
