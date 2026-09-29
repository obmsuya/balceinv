<script setup lang="ts">
import { ArrowDownLeft, ArrowUpRight } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import TransferDetailsDialog from '@/components/stock/TransferDetailsDialog.vue'
import { transferPageSize } from '@/composables/useTransfers'

const { t, formatDateTime } = useI18n()
const { user } = useAuth()
const { transfers, totalTransfers, loading, fetchTransfers } = useTransfers()

const pageOffset = ref(0)
const openTransferId = ref<string | null>(null)
const showDetails = ref(false)

const reload = () => fetchTransfers(pageOffset.value)
onMounted(reload)

const goToPage = (nextOffset: number) => {
  pageOffset.value = Math.max(nextOffset, 0)
  reload()
}

const openTransfer = (transferId: string) => {
  openTransferId.value = transferId
  showDetails.value = true
}

defineExpose({ reload })
</script>

<template>
  <div class="flex flex-col gap-3">
    <div v-if="loading && !transfers.length" class="flex flex-col gap-2">
      <Skeleton v-for="skeletonRow in 3" :key="skeletonRow" class="h-16 w-full" />
    </div>
    <p v-else-if="!transfers.length" class="py-10 text-center text-sm text-muted-foreground">{{ t('stock.transfers.empty') }}</p>
    <button
      v-for="transfer in transfers"
      :key="transfer.id"
      type="button"
      class="flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors hover:bg-accent"
      @click="openTransfer(transfer.id)"
    >
      <span
        class="flex size-9 shrink-0 items-center justify-center rounded-full"
        :class="transfer.from_shop_id === user?.shop_id ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-600'"
      >
        <ArrowUpRight v-if="transfer.from_shop_id === user?.shop_id" class="size-4" />
        <ArrowDownLeft v-else class="size-4" />
      </span>
      <span class="min-w-0 flex-1">
        <span class="block truncate text-sm font-medium">
          {{ transfer.from_shop_id === user?.shop_id ? t('stock.transfers.sentTo', { shop: transfer.to_shop_name }) : t('stock.transfers.receivedFrom', { shop: transfer.from_shop_name }) }}
        </span>
        <span class="block text-xs text-muted-foreground">{{ formatDateTime(transfer.created_at) }}<template v-if="transfer.user_name"> · {{ transfer.user_name }}</template></span>
      </span>
      <span class="shrink-0 text-right text-sm tabular-nums">
        {{ t('stock.transfers.units', { count: transfer.total_units }) }}
        <span class="block text-xs text-muted-foreground">{{ t('stock.transfers.products', { count: transfer.item_count }) }}</span>
      </span>
    </button>

    <div v-if="totalTransfers > transferPageSize" class="flex justify-end gap-2">
      <Button variant="outline" size="sm" :disabled="pageOffset === 0 || loading" @click="goToPage(pageOffset - transferPageSize)">{{ t('common.pagination.previous') }}</Button>
      <Button variant="outline" size="sm" :disabled="pageOffset + transferPageSize >= totalTransfers || loading" @click="goToPage(pageOffset + transferPageSize)">{{ t('common.pagination.next') }}</Button>
    </div>

    <TransferDetailsDialog v-model:open="showDetails" :transfer-id="openTransferId" />
  </div>
</template>
