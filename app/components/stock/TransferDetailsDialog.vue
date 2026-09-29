<script setup lang="ts">
import { ArrowRight } from 'lucide-vue-next'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import type { StockTransfer } from '@/composables/useTransfers'
import { productLabel } from '@/composables/useStock'

const props = defineProps<{ transferId: string | null }>()

const open = defineModel<boolean>('open', { default: false })

const { t, formatDateTime } = useI18n()
const { fetchTransfer } = useTransfers()

const transfer = ref<StockTransfer | null>(null)

watch([open, () => props.transferId], async ([isOpen]) => {
  if (!isOpen || !props.transferId) return
  transfer.value = null
  transfer.value = (await fetchTransfer(props.transferId)) ?? null
})
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{{ t('stock.transfers.title') }}</DialogTitle>
        <DialogDescription v-if="transfer" class="flex flex-wrap items-center gap-1.5">
          {{ transfer.from_shop_name }} <ArrowRight class="size-3.5" /> {{ transfer.to_shop_name }}
        </DialogDescription>
      </DialogHeader>
      <Skeleton v-if="!transfer" class="h-24 w-full" />
      <div v-else class="flex flex-col gap-3">
        <p class="text-sm text-muted-foreground">
          {{ formatDateTime(transfer.created_at) }}<template v-if="transfer.user_name"> · {{ transfer.user_name }}</template>
        </p>
        <p v-if="transfer.note" class="rounded-md bg-muted/40 px-3 py-2 text-sm">{{ transfer.note }}</p>
        <div v-for="transferItem in transfer.items" :key="transferItem.product_id" class="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
          <span class="min-w-0">
            <span class="block truncate font-medium">{{ productLabel(transferItem) }}</span>
            <span class="block font-mono text-xs text-muted-foreground">{{ transferItem.sku }}</span>
          </span>
          <span class="shrink-0 tabular-nums">{{ transferItem.quantity }} {{ transferItem.unit }}</span>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
