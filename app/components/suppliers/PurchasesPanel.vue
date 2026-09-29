<script setup lang="ts">
import { PackageCheck } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import PurchaseDetailsDialog from '@/components/suppliers/PurchaseDetailsDialog.vue'
import type { PaymentStatus, Purchase } from '@/composables/useSuppliers'
import { supplierPageSize } from '@/composables/useSuppliers'
import { formatMoney } from '~/utils/money'

const props = defineProps<{ supplierId?: string }>()
const emit = defineEmits<{ changed: [] }>()

const { t, formatDate } = useI18n()
const { listPurchases, loading } = useSuppliers()

const purchases = ref<Purchase[]>([])
const totalPurchases = ref(0)
const pageOffset = ref(0)
const openPurchaseId = ref<string | null>(null)
const showDetails = ref(false)

const statusVariant: Record<PaymentStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  paid: 'secondary',
  part_paid: 'outline',
  unpaid: 'default',
  cancelled: 'destructive',
}

const reload = async () => {
  const purchasePage = await listPurchases({ supplierId: props.supplierId, offset: pageOffset.value })
  purchases.value = purchasePage.items
  totalPurchases.value = purchasePage.total
}
onMounted(reload)

const goToPage = (nextOffset: number) => {
  pageOffset.value = Math.max(nextOffset, 0)
  reload()
}

const openPurchase = (purchaseId: string) => {
  openPurchaseId.value = purchaseId
  showDetails.value = true
}

const onChanged = () => {
  reload()
  emit('changed')
}

defineExpose({ reload })
</script>

<template>
  <div class="flex flex-col gap-2">
    <div v-if="loading && !purchases.length" class="flex flex-col gap-2">
      <Skeleton v-for="skeletonRow in 3" :key="skeletonRow" class="h-16 w-full" />
    </div>
    <div v-else-if="!purchases.length" class="flex flex-col items-center gap-2 py-10 text-center">
      <PackageCheck class="size-10 text-muted-foreground/50" />
      <p class="text-sm text-muted-foreground">{{ t('suppliers.purchases.empty') }}</p>
    </div>
    <button
      v-for="purchase in purchases"
      :key="purchase.id"
      type="button"
      class="flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors hover:bg-accent"
      :class="purchase.status === 'cancelled' ? 'opacity-60' : ''"
      @click="openPurchase(purchase.id)"
    >
      <span class="min-w-0 flex-1">
        <span class="block truncate text-sm font-medium">{{ purchase.supplier_name ?? '—' }}</span>
        <span class="block text-xs text-muted-foreground">{{ purchase.purchase_number }} · {{ formatDate(purchase.received_at) }}</span>
      </span>
      <span class="flex shrink-0 flex-col items-end gap-1">
        <span class="text-sm font-medium tabular-nums">{{ formatMoney(purchase.total) }}</span>
        <Badge :variant="statusVariant[purchase.payment_status]">{{ t(`suppliers.status.${purchase.payment_status}`) }}</Badge>
      </span>
    </button>

    <div v-if="totalPurchases > supplierPageSize" class="flex justify-end gap-2">
      <Button variant="outline" size="sm" :disabled="pageOffset === 0 || loading" @click="goToPage(pageOffset - supplierPageSize)">{{ t('common.pagination.previous') }}</Button>
      <Button variant="outline" size="sm" :disabled="pageOffset + supplierPageSize >= totalPurchases || loading" @click="goToPage(pageOffset + supplierPageSize)">{{ t('common.pagination.next') }}</Button>
    </div>

    <PurchaseDetailsDialog v-model:open="showDetails" :purchase-id="openPurchaseId" @changed="onChanged" />
  </div>
</template>
