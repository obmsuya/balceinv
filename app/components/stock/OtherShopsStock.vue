<script setup lang="ts">
import { Loader2, Store } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { ShopStockLevel, StockLevel } from '@/composables/useStock'
import { productLabel } from '@/composables/useStock'

const props = defineProps<{ level: StockLevel; canBring: boolean }>()
const emit = defineEmits<{ bring: [fromShopId: string] }>()

const { t } = useI18n()
const { user } = useAuth()
const { fetchShopsHolding } = useStock()

const isOpen = ref(false)
const isLoading = ref(false)
const otherShops = ref<ShopStockLevel[]>([])

watch(isOpen, async (opened) => {
  if (!opened) return
  isLoading.value = true
  const shopLevels = await fetchShopsHolding(props.level.product_id)
  otherShops.value = shopLevels.filter(shopLevel => shopLevel.shop_id !== user.value?.shop_id)
  isLoading.value = false
})

const bringFrom = (fromShopId: string) => {
  isOpen.value = false
  emit('bring', fromShopId)
}
</script>

<template>
  <Popover v-model:open="isOpen">
    <PopoverTrigger as-child>
      <Button variant="ghost" size="icon" :aria-label="t('stock.levels.otherShopsOf', { product: productLabel(level) })">
        <Store />
      </Button>
    </PopoverTrigger>
    <PopoverContent align="end" class="w-72 p-0">
      <p class="border-b px-4 py-3 text-sm font-semibold">{{ t('stock.levels.otherShopsOf', { product: productLabel(level) }) }}</p>
      <div v-if="isLoading" class="flex justify-center p-4">
        <Loader2 class="size-4 animate-spin text-muted-foreground" />
      </div>
      <p v-else-if="!otherShops.some(shopLevel => shopLevel.quantity > 0)" class="p-4 text-sm text-muted-foreground">{{ t('stock.levels.noneElsewhere') }}</p>
      <ul v-else class="divide-y">
        <li v-for="shopLevel in otherShops" :key="shopLevel.shop_id" class="flex items-center gap-3 px-4 py-2.5">
          <span class="min-w-0 flex-1 truncate text-sm">{{ shopLevel.shop_name }}</span>
          <Badge variant="secondary" class="tabular-nums">{{ shopLevel.quantity }} {{ level.unit }}</Badge>
          <Button v-if="canBring && shopLevel.quantity > 0" size="sm" variant="outline" @click="bringFrom(shopLevel.shop_id)">{{ t('stock.levels.bringHere') }}</Button>
        </li>
      </ul>
    </PopoverContent>
  </Popover>
</template>
