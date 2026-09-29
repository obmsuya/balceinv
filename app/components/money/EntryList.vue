<script setup lang="ts">
import { ChevronRight, Paperclip, Undo2 } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { BooksEntry, EntryFilter } from '@/composables/useMoney'
import { entryPageSize, entryPlaces, entryTitle } from '@/composables/useMoney'
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

const dayText = (isoDate: string) => formatDate(`${isoDate}T12:00:00`, { day: 'numeric', month: 'short' })

watch(() => [props.filter, props.reloadKey], () => load(), { deep: true, immediate: true })
</script>

<template>
  <div class="flex flex-col gap-2">
    <div v-if="loading && entries.length === 0" class="flex flex-col gap-2">
      <Skeleton v-for="placeholder in 3" :key="placeholder" class="h-14 w-full" />
    </div>
    <p v-else-if="entries.length === 0" class="py-6 text-center text-sm text-muted-foreground">{{ t('money.entries.empty') }}</p>
    <ul v-else class="divide-y rounded-lg border">
      <li v-for="entry in entries" :key="entry.id">
        <button type="button" class="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-accent" @click="emit('open', entry)">
          <div class="w-12 shrink-0 text-xs text-muted-foreground tabular-nums">
            {{ dayText(entry.entry_date) }}
            <span v-if="showNumbers" class="block text-[10px]">{{ entry.number }}</span>
          </div>
          <div class="min-w-0 flex-1">
            <p class="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-medium">
              <Undo2 v-if="entry.source_type === 'reversal'" class="size-3.5 text-muted-foreground" />
              <span class="truncate">{{ entryTitle(entry) }}</span>
              <Badge v-if="entry.reversed_by_entry_id" variant="outline">{{ t('money.entries.reversed') }}</Badge>
              <Paperclip v-if="entry.has_attachment" class="size-3.5 text-muted-foreground" />
            </p>
            <p class="truncate text-xs text-muted-foreground">
              {{ [entryPlaces(entry), entry.memo, entry.created_by_name].filter(Boolean).join(' · ') }}
            </p>
          </div>
          <span class="shrink-0 text-sm font-semibold tabular-nums" :class="entry.reversed_by_entry_id ? 'line-through text-muted-foreground' : ''">{{ formatMoney(entry.amount) }}</span>
          <ChevronRight class="size-4 shrink-0 text-muted-foreground" />
        </button>
      </li>
    </ul>
    <Button v-if="entries.length < totalEntries" variant="outline" :disabled="loading" @click="load(true)">{{ t('money.entries.showMore') }}</Button>
  </div>
</template>
