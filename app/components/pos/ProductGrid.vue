<script setup lang="ts">
import { Layers, PackageSearch } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { Product } from '@/composables/useProducts'
import { assetUrl } from '~/composables/useSettings'
import { formatMoney } from '~/utils/money'

const props = defineProps<{
  products: Product[]
  totalProducts: number
  loading: boolean
  searchText: string
}>()
const emit = defineEmits<{ choose: [product: Product]; more: [] }>()

const pulsingId = ref<string | null>(null)
let pulseTimer: ReturnType<typeof setTimeout> | null = null

const isOut = (product: Product) => product.variant_count === 0 && (product.quantity ?? 0) <= 0
const isLow = (product: Product) => !isOut(product) && product.variant_count === 0 && (product.quantity ?? 0) <= (product.min_stock ?? 0)
const initialsOf = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(namePart => namePart[0]).join('').toUpperCase()

const choose = (product: Product) => {
  pulsingId.value = product.id
  if (pulseTimer) clearTimeout(pulseTimer)
  pulseTimer = setTimeout(() => { pulsingId.value = null }, 350)
  emit('choose', product)
}

const hasMore = computed(() => props.products.length < props.totalProducts)
</script>

<template>
  <div>
    <div v-if="loading && !products.length" class="grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-2">
      <Skeleton v-for="skeletonTile in 12" :key="skeletonTile" class="h-40" />
    </div>

    <div v-else-if="!products.length" class="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
      <PackageSearch class="size-10 opacity-40" />
      <p class="text-sm">{{ searchText ? `Nothing matches “${searchText}”` : 'No products yet' }}</p>
    </div>

    <template v-else>
      <div class="grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-2">
        <button
          v-for="product in products"
          :key="product.id"
          type="button"
          class="group relative flex h-40 flex-col overflow-hidden rounded-xl border bg-card text-left transition-all duration-150 hover:border-primary/60 hover:shadow-sm active:scale-[0.97] disabled:cursor-not-allowed disabled:active:scale-100"
          :class="pulsingId === product.id ? 'scale-[0.97] border-primary ring-2 ring-primary/40' : ''"
          :disabled="isOut(product)"
          :aria-label="`${product.name}, ${formatMoney(product.price)}${isOut(product) ? ', out of stock' : ''}`"
          @click="choose(product)"
        >
          <div class="relative flex h-20 shrink-0 items-center justify-center overflow-hidden bg-muted" :class="isOut(product) ? 'opacity-40' : ''">
            <img v-if="product.image_url" :src="assetUrl(product.image_url)!" alt="" class="size-full object-cover" loading="lazy">
            <span v-else class="text-2xl font-semibold tracking-wide text-muted-foreground/60">{{ initialsOf(product.name) }}</span>
            <span
              v-if="product.variant_count"
              class="absolute right-1.5 top-1.5 flex items-center gap-1 rounded-full bg-background/90 px-1.5 py-0.5 text-[11px] font-medium shadow-sm"
            >
              <Layers class="size-3" />
              {{ product.variant_count + 1 }}
            </span>
          </div>
          <div class="flex min-h-0 flex-1 flex-col justify-between gap-1 p-2">
            <span class="line-clamp-2 text-sm font-medium leading-snug" :class="isOut(product) ? 'text-muted-foreground' : ''">{{ product.name }}</span>
            <span class="flex items-end justify-between gap-1">
              <span class="text-sm font-bold tabular-nums">{{ formatMoney(product.price) }}</span>
              <span v-if="isOut(product)" class="rounded bg-destructive/10 px-1.5 py-0.5 text-[11px] font-medium text-destructive">Out</span>
              <span v-else-if="product.variant_count === 0" class="text-[11px] tabular-nums" :class="isLow(product) ? 'font-medium text-amber-600 dark:text-amber-400' : 'text-muted-foreground'">
                {{ product.quantity ?? 0 }} left
              </span>
            </span>
          </div>
        </button>
      </div>

      <div v-if="hasMore" class="flex flex-col items-center gap-1 py-4">
        <Button variant="outline" size="sm" :disabled="loading" @click="emit('more')">Show more</Button>
        <span class="text-xs text-muted-foreground">{{ products.length }} of {{ totalProducts }} shown · search to find one faster</span>
      </div>
    </template>
  </div>
</template>
