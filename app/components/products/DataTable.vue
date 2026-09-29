<script setup lang="ts">
import { FlexRender, getCoreRowModel, useVueTable } from '@tanstack/vue-table'
import type { ColumnDef } from '@tanstack/vue-table'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Product } from '@/composables/useProducts'

const props = defineProps<{
  columns: ColumnDef<Product, any>[]
  data: Product[]
}>()

const columnClass = (columnDef: ColumnDef<Product, any>): string =>
  (columnDef.meta as { class?: string } | undefined)?.class ?? ''

const table = useVueTable({
  get data() {
    return props.data
  },
  get columns() {
    return props.columns
  },
  getRowId: product => product.id,
  getCoreRowModel: getCoreRowModel(),
})
</script>

<template>
  <div class="overflow-x-auto rounded-md border">
    <Table>
      <TableHeader>
        <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
          <TableHead v-for="header in headerGroup.headers" :key="header.id" :class="columnClass(header.column.columnDef)">
            <FlexRender v-if="!header.isPlaceholder" :render="header.column.columnDef.header" :props="header.getContext()" />
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <template v-if="table.getRowModel().rows.length">
          <TableRow
            v-for="row in table.getRowModel().rows"
            :key="row.id"
            :class="row.original.is_active ? '' : 'opacity-60'"
          >
            <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id" :class="columnClass(cell.column.columnDef)">
              <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
            </TableCell>
          </TableRow>
        </template>
        <TableRow v-else>
          <TableCell :colspan="columns.length" class="h-24 text-center text-muted-foreground">
            <slot name="empty">No products found.</slot>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
