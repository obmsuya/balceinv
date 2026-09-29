<script setup lang="ts">
import { Search } from 'lucide-vue-next'
import { useDebounceFn } from '@vueuse/core'
import { Input } from '@/components/ui/input'
import type { Product } from '@/composables/useProducts'

const emit = defineEmits<{ pick: [product: Product] }>()

const { products, fetchProducts } = useProducts()

const searchText = ref('')
const hasSearched = ref(false)

const runSearch = useDebounceFn(async () => {
  const trimmedText = searchText.value.trim()
  if (!trimmedText) {
    products.value = []
    hasSearched.value = false
    return
  }
  await fetchProducts({ searchText: trimmedText })
  hasSearched.value = true
}, 250)

watch(searchText, runSearch)

const pick = (product: Product) => {
  emit('pick', product)
  searchText.value = ''
  products.value = []
  hasSearched.value = false
}
</script>

<template>
  <div class="flex flex-col gap-1">
    <div class="relative">
      <Search class="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
      <Input v-model="searchText" placeholder="Search by name, SKU or barcode" class="pl-8" aria-label="Search products" />
    </div>
    <ul v-if="searchText && products.length" class="max-h-56 overflow-y-auto rounded-md border">
      <li v-for="product in products.slice(0, 8)" :key="product.id">
        <button type="button" class="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent" @click="pick(product)">
          <span class="min-w-0 flex-1">
            <span class="block truncate font-medium">{{ product.name }}</span>
            <span class="block font-mono text-xs text-muted-foreground">{{ product.sku }}</span>
          </span>
        </button>
      </li>
    </ul>
    <p v-else-if="hasSearched && searchText" class="px-1 text-xs text-muted-foreground">No product matches.</p>
  </div>
</template>
