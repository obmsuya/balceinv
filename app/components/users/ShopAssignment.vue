<script setup lang="ts">
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import type { ShopSummary } from '@/composables/useAuth'

defineProps<{ shops: ShopSummary[] }>()

const selectedShopIds = defineModel<string[]>({ default: () => [] })

const toggleShop = (shopId: string, isChecked: boolean | 'indeterminate') => {
  const withoutShop = selectedShopIds.value.filter(selectedId => selectedId !== shopId)
  selectedShopIds.value = isChecked === true ? [...withoutShop, shopId] : withoutShop
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <Label>Works in</Label>
    <div class="flex flex-col gap-2 rounded-md border p-3">
      <label v-for="shop in shops" :key="shop.id" class="flex items-center gap-2 text-sm">
        <Checkbox :model-value="selectedShopIds.includes(shop.id)" @update:model-value="toggleShop(shop.id, $event)" />
        {{ shop.name }}
      </label>
    </div>
  </div>
</template>
