<script setup lang="ts">
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const scope = defineModel<string>({ default: '' })

const currentScope = 'current'

const { t } = useI18n()
const { user } = useAuth()

const shopChoices = computed(() => user.value?.shops ?? [])
const otherShops = computed(() => shopChoices.value.filter(shop => shop.id !== user.value?.shop_id))
const activeShopName = computed(() => shopChoices.value.find(shop => shop.id === user.value?.shop_id)?.name ?? t('reports.scope.thisShop'))
const selected = computed({
  get: () => scope.value || currentScope,
  set: (nextScope: string) => {
    scope.value = nextScope === currentScope ? '' : nextScope
  },
})
</script>

<template>
  <Select v-if="shopChoices.length > 1" v-model="selected">
    <SelectTrigger class="w-full sm:w-56" :aria-label="t('reports.scope.label')">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem :value="currentScope">{{ t('reports.scope.current', { shop: activeShopName }) }}</SelectItem>
      <SelectItem value="all">{{ t('reports.scope.allShops') }}</SelectItem>
      <SelectItem v-for="shop in otherShops" :key="shop.id" :value="shop.id">{{ shop.name }}</SelectItem>
    </SelectContent>
  </Select>
</template>
