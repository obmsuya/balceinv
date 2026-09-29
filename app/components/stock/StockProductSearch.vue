<script setup lang="ts">
import { Search } from 'lucide-vue-next'
import { useDebounceFn } from '@vueuse/core'
import { Input } from '@/components/ui/input'
import type { StockLevel } from '@/composables/useStock'
import { productLabel } from '@/composables/useStock'

const props = defineProps<{ excludeIds?: string[]; placeholder?: string }>()
const emit = defineEmits<{ pick: [level: StockLevel] }>()

const { searchLevels } = useStock()

const searchText = ref('')
const matches = ref<StockLevel[]>([])
const isSearching = ref(false)
const hasSearched = ref(false)

const visibleMatches = computed(() => matches.value.filter(level => !(props.excludeIds ?? []).includes(level.product_id)))

const runSearch = useDebounceFn(async () => {
  const trimmedText = searchText.value.trim()
  if (!trimmedText) {
    matches.value = []
    hasSearched.value = false
    return
  }
  isSearching.value = true
  try {
    matches.value = await searchLevels(trimmedText)
  } catch {
    matches.value = []
  } finally {
    isSearching.value = false
    hasSearched.value = true
  }
}, 250)

watch(searchText, runSearch)

const pick = (level: StockLevel) => {
  emit('pick', level)
  searchText.value = ''
  matches.value = []
  hasSearched.value = false
}
</script>

<template>
  <div class="flex flex-col gap-1">
    <div class="relative">
      <Search class="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
      <Input v-model="searchText" :placeholder="placeholder ?? 'Search by name or SKU'" class="pl-8" aria-label="Search products" />
    </div>
    <ul v-if="visibleMatches.length" class="max-h-56 overflow-y-auto rounded-md border">
      <li v-for="level in visibleMatches" :key="level.product_id">
        <button type="button" class="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent" @click="pick(level)">
          <span class="min-w-0 flex-1">
            <span class="block truncate font-medium">{{ productLabel(level) }}</span>
            <span class="block font-mono text-xs text-muted-foreground">{{ level.sku }}</span>
          </span>
          <span class="shrink-0 text-xs tabular-nums text-muted-foreground">{{ level.quantity }} {{ level.unit }}</span>
        </button>
      </li>
    </ul>
    <p v-else-if="hasSearched && !isSearching" class="px-1 text-xs text-muted-foreground">No product matches.</p>
  </div>
</template>
