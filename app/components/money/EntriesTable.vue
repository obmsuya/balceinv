<script setup lang="ts">
import { Paperclip, Undo2 } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { BooksEntry, EntryFilter } from '@/composables/useMoney'
import { entryMoneyFlow, entryPageSize, entryPlaces, entryTitle } from '@/composables/useMoney'
import { formatMoney } from '~/utils/money'

const props = defineProps<{ filter: EntryFilter; reloadKey: number; showNumbers?: boolean }>()
const emit = defineEmits<{ open: [entry: BooksEntry] }>()

const { t, formatDate } = useI18n()
const { fetchEntries } = useMoney()

const entries = ref<BooksEntry[]>([])
const totalEntries = ref(0)
const loading = ref(false)

const load = async (append = false) => {
  loading.value = true
  const entryPage = await fetchEntries(props.filter, append ? entries.value.length : 0, entryPageSize)
  loading.value = false
  if (!entryPage) return
  entries.value = append ? [...entries.value, ...entryPage.items] : entryPage.items
  totalEntries.value = entryPage.total
}

const rows = computed(() => entries.value.map(entry => ({ entry, flow: entryMoneyFlow(entry) })))
const dayText = (isoDate: string) => formatDate(`${isoDate}T12:00:00`, { day: 'numeric', month: 'short', year: 'numeric' })
const detailLine = (entry: BooksEntry, movesMoney: boolean) => {
  const parts = [entry.party_name, entry.paid_to_name ? t('money.entries.paidToName', { name: entry.paid_to_name }) : null, entryPlaces(entry), entry.memo, entry.shop_name]
  if (!movesMoney) parts.unshift(t('money.entries.noMoneyMoved'))
  return parts.filter(Boolean).join(' · ')
}
const amountText = (amount: number) => (amount ? formatMoney(amount) : '')

watch(() => [props.filter, props.reloadKey], () => load(), { deep: true, immediate: true })
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="overflow-x-auto rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead class="hidden w-28 pl-4 sm:table-cell">{{ t('money.entries.columns.date') }}</TableHead>
            <TableHead v-if="showNumbers" class="hidden w-24 md:table-cell">{{ t('money.entries.columns.number') }}</TableHead>
            <TableHead class="pl-4 sm:pl-2">{{ t('money.entries.columns.details') }}</TableHead>
            <TableHead class="hidden lg:table-cell">{{ t('money.entries.createdBy') }}</TableHead>
            <TableHead class="text-right">{{ t('money.entries.columns.moneyIn') }}</TableHead>
            <TableHead class="pr-4 text-right">{{ t('money.entries.columns.moneyOut') }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-if="loading && entries.length === 0">
            <TableRow v-for="placeholder in 4" :key="placeholder">
              <TableCell :colspan="showNumbers ? 6 : 5" class="px-4"><Skeleton class="h-8 w-full" /></TableCell>
            </TableRow>
          </template>
          <TableRow v-else-if="entries.length === 0">
            <TableCell :colspan="showNumbers ? 6 : 5" class="h-24 text-center text-muted-foreground">{{ t('money.entries.empty') }}</TableCell>
          </TableRow>
          <TableRow
            v-for="row in rows"
            :key="row.entry.id"
            class="cursor-pointer"
            :class="row.entry.reversed_by_entry_id ? 'text-muted-foreground' : ''"
            @click="emit('open', row.entry)"
          >
            <TableCell class="hidden whitespace-nowrap pl-4 align-top tabular-nums sm:table-cell">{{ dayText(row.entry.entry_date) }}</TableCell>
            <TableCell v-if="showNumbers" class="hidden whitespace-nowrap align-top font-mono text-xs md:table-cell">{{ row.entry.number }}</TableCell>
            <TableCell class="pl-4 align-top sm:min-w-48 sm:pl-2">
              <p class="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-medium">
                <Undo2 v-if="row.entry.source_type === 'reversal'" class="size-3.5 text-muted-foreground" />
                <span>{{ entryTitle(row.entry) }}</span>
                <Badge v-if="row.entry.reversed_by_entry_id" variant="outline">{{ t('money.entries.reversed') }}</Badge>
                <Paperclip v-if="row.entry.has_attachment" class="size-3.5 text-muted-foreground" />
              </p>
              <p class="text-xs text-muted-foreground sm:hidden">{{ dayText(row.entry.entry_date) }}</p>
              <p class="text-xs text-muted-foreground">{{ detailLine(row.entry, row.flow.moneyIn > 0 || row.flow.moneyOut > 0) }}</p>
            </TableCell>
            <TableCell class="hidden align-top text-sm text-muted-foreground lg:table-cell">{{ row.entry.created_by_name }}</TableCell>
            <TableCell class="whitespace-nowrap text-right align-top tabular-nums" :class="row.entry.reversed_by_entry_id ? 'line-through' : ''">{{ amountText(row.flow.moneyIn) }}</TableCell>
            <TableCell class="whitespace-nowrap pr-4 text-right align-top tabular-nums" :class="row.entry.reversed_by_entry_id ? 'line-through' : ''">{{ amountText(row.flow.moneyOut) }}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
    <div v-if="entries.length" class="flex items-center justify-between gap-3 text-sm text-muted-foreground">
      <span>{{ t('money.entries.showing', { shown: entries.length, total: totalEntries }) }}</span>
      <Button v-if="entries.length < totalEntries" variant="outline" size="sm" :disabled="loading" @click="load(true)">{{ t('money.entries.showMore') }}</Button>
    </div>
  </div>
</template>
