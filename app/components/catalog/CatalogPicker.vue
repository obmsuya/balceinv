<script setup lang="ts">
import { BookOpen, ChevronDown, CornerDownLeft, RefreshCw, Search } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useCatalog } from '@/composables/useCatalog'
import type { CatalogProduct } from '@/composables/useCatalog'
import { formatMoney, majorToMinor } from '~/utils/money'

const emit = defineEmits<{ pick: [catalogProduct: CatalogProduct] }>()

const { t, formatNumber } = useI18n()
const { catalog, catalogLoaded, loading, loadError, fetchCatalog, searchCatalog } = useCatalog()

const shownLimit = 50

const expanded = ref(false)
const searchText = ref('')
const searchField = ref<InstanceType<typeof Input> | null>(null)

const matchingProducts = computed(() => searchCatalog(searchText.value))
const shownProducts = computed(() => matchingProducts.value.slice(0, shownLimit))
const pickerVisible = computed(() => !catalogLoaded.value || catalog.value.length > 0)

const expand = async () => {
  expanded.value = !expanded.value
  if (!expanded.value) return
  await nextTick()
  searchField.value?.$el?.focus?.()
}

const pick = (catalogProduct: CatalogProduct) => {
  emit('pick', catalogProduct)
  expanded.value = false
  searchText.value = ''
}

const pickFirstMatch = () => {
  const firstMatch = shownProducts.value[0]
  if (firstMatch) pick(firstMatch)
}

onMounted(() => fetchCatalog())
</script>

<template>
  <div v-if="pickerVisible || loadError" class="rounded-xl border bg-muted/20">
    <button
      type="button"
      class="flex w-full items-center gap-3 px-3 py-2.5 text-left"
      :aria-expanded="expanded"
      @click="expand"
    >
      <span class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <BookOpen class="size-4 text-primary" />
      </span>
      <span class="min-w-0 flex-1">
        <span class="block text-sm font-medium">{{ t('catalog.picker.title') }}</span>
        <span class="block text-xs text-muted-foreground">
          <template v-if="loading && !catalogLoaded">{{ t('catalog.picker.loading') }}</template>
          <template v-else-if="loadError">{{ t('catalog.picker.loadFailed') }}</template>
          <template v-else>{{ t('catalog.picker.hint') }}</template>
        </span>
      </span>
      <Badge v-if="catalog.length" variant="secondary" class="tabular-nums">{{ formatNumber(catalog.length) }}</Badge>
      <ChevronDown class="size-4 shrink-0 text-muted-foreground transition-transform" :class="expanded ? 'rotate-180' : ''" />
    </button>

    <div v-if="expanded" class="flex flex-col gap-2 border-t p-3">
      <div v-if="loadError" class="flex flex-col items-center gap-2 py-4 text-center text-sm">
        <p class="text-destructive">{{ loadError }}</p>
        <Button variant="outline" size="sm" type="button" :disabled="loading" @click="fetchCatalog({ force: true })">
          <RefreshCw class="size-3.5 mr-1.5" :class="loading ? 'animate-spin' : ''" />{{ t('common.actions.retry') }}
        </Button>
      </div>

      <template v-else>
        <div class="relative">
          <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref="searchField"
            v-model="searchText"
            :placeholder="t('catalog.picker.searchPlaceholder')"
            class="h-10 pl-9 pr-9"
            @keydown.enter.prevent="pickFirstMatch"
            @keydown.esc.stop="expanded = false"
          />
          <CornerDownLeft
            v-if="searchText && shownProducts.length"
            class="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
          />
        </div>

        <div class="max-h-56 overflow-y-auto">
          <div v-if="loading && !catalogLoaded" class="flex flex-col gap-1">
            <Skeleton v-for="i in 3" :key="i" class="h-12 w-full" />
          </div>
          <p v-else-if="!shownProducts.length" class="py-6 text-center text-sm text-muted-foreground">
            {{ t('catalog.picker.notFound') }}
          </p>
          <ul v-else class="flex flex-col gap-0.5">
            <li v-for="(catalogProduct, index) in shownProducts" :key="catalogProduct.id">
              <button
                type="button"
                class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                :class="index === 0 && searchText ? 'bg-accent/60' : ''"
                @click="pick(catalogProduct)"
              >
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-medium">{{ catalogProduct.name }}</span>
                  <span class="block truncate text-xs text-muted-foreground">
                    {{ [catalogProduct.category, catalogProduct.sub_category].filter(Boolean).join(' · ') || t('catalog.picker.noCategory') }}
                  </span>
                </span>
                <Badge variant="outline" class="shrink-0 font-normal">{{ catalogProduct.unit }}</Badge>
                <span v-if="catalogProduct.default_price" class="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {{ formatMoney(majorToMinor(catalogProduct.default_price)) }}
                </span>
              </button>
            </li>
          </ul>
          <p v-if="matchingProducts.length > shownLimit" class="pt-2 text-center text-xs text-muted-foreground">
            {{ t('catalog.picker.showingSome', { shown: shownLimit, total: formatNumber(matchingProducts.length) }) }}
          </p>
        </div>
      </template>
    </div>
  </div>
</template>
