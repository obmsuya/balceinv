<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import type { Product } from '@/composables/useProducts'
import { formatMoney } from '~/utils/money'

const props = defineProps<{ parent: Product | null }>()
const emit = defineEmits<{ pick: [product: Product] }>()

const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()

const { fetchVariants } = useProducts()
const variants = ref<Product[]>([])
const loading = ref(false)

const sellable = computed(() => [props.parent, ...variants.value].filter((product): product is Product => Boolean(product?.is_active)))

watch(open, async isOpen => {
  if (!isOpen || !props.parent) return
  loading.value = true
  variants.value = await fetchVariants(props.parent.id)
  loading.value = false
})

const pick = (product: Product) => {
  open.value = false
  emit('pick', product)
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ parent?.name }}</DialogTitle>
        <DialogDescription>{{ t('pos.variants.which') }}</DialogDescription>
      </DialogHeader>
      <Skeleton v-if="loading" class="h-24 w-full" />
      <div v-else class="grid grid-cols-2 gap-2">
        <button
          v-for="product in sellable"
          :key="product.id"
          type="button"
          class="flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors hover:bg-accent disabled:opacity-50"
          :disabled="(product.quantity ?? 0) <= 0"
          @click="pick(product)"
        >
          <span class="text-sm font-medium">{{ product.variant_label || t('pos.variants.standard') }}</span>
          <span class="text-sm tabular-nums">{{ formatMoney(product.price) }}</span>
          <Badge variant="outline" class="font-normal tabular-nums">{{ product.quantity ?? 0 }} {{ product.unit }}</Badge>
        </button>
      </div>
    </DialogContent>
  </Dialog>
</template>
