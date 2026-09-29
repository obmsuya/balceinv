<script setup lang="ts">
import { Store } from 'lucide-vue-next'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const { user, switchShop } = useAuth()
const { t } = useI18n()

const hasSeveralShops = computed(() => (user.value?.shops.length ?? 0) > 1)

const changeShop = async (shopId: unknown) => {
  if (typeof shopId !== 'string' || shopId === user.value?.shop_id) return
  try {
    await switchShop(shopId)
    window.location.reload()
  } catch {
  }
}
</script>

<template>
  <Select v-if="hasSeveralShops" :model-value="user?.shop_id ?? undefined" @update:model-value="changeShop">
    <SelectTrigger class="h-9 w-auto max-w-32 gap-1.5 border-dashed sm:max-w-44" :aria-label="t('nav.shopSwitcher.label')">
      <Store class="size-4 shrink-0 text-muted-foreground" />
      <SelectValue :placeholder="t('nav.shopSwitcher.placeholder')" class="truncate" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem v-for="shop in user?.shops" :key="shop.id" :value="shop.id">{{ shop.name }}</SelectItem>
    </SelectContent>
  </Select>
</template>
