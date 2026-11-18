<script setup lang="ts">
import { FilePen, PackageCheck, Trash2 } from 'lucide-vue-next'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import PurchaseDetailsDialog from '@/components/suppliers/PurchaseDetailsDialog.vue'
import StockArrivedDialog from '@/components/suppliers/StockArrivedDialog.vue'
import type { ArrivedDraftPayload, PaymentStatus, Purchase, PurchaseDraft } from '@/composables/useSuppliers'
import { supplierPageSize } from '@/composables/useSuppliers'
import { formatMoney } from '~/utils/money'

const props = defineProps<{ supplierId?: string }>()
const emit = defineEmits<{ changed: [] }>()

const { t, formatDate, formatDateTime } = useI18n()
const { canCreate } = usePermissions()
const { listPurchases, listPurchaseDrafts, deletePurchaseDraft, loading, saving } = useSuppliers()

const drafts = ref<Array<PurchaseDraft<ArrivedDraftPayload>>>([])
const openDraft = ref<PurchaseDraft<ArrivedDraftPayload> | null>(null)
const showDraft = ref(false)
const draftToDelete = ref<PurchaseDraft<ArrivedDraftPayload> | null>(null)

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

const reloadDrafts = async () => {
  if (!canCreate('purchases')) return
  drafts.value = await listPurchaseDrafts(props.supplierId) as Array<PurchaseDraft<ArrivedDraftPayload>>
}

const reload = async () => {
  const [purchasePage] = await Promise.all([
    listPurchases({ supplierId: props.supplierId, offset: pageOffset.value }),
    reloadDrafts(),
  ])
  purchases.value = purchasePage.items
  totalPurchases.value = purchasePage.total
}

const continueDraft = (draft: PurchaseDraft<ArrivedDraftPayload>) => {
  openDraft.value = draft
  showDraft.value = true
}

const confirmDeleteDraft = async () => {
  if (!draftToDelete.value) return
  try {
    await deletePurchaseDraft(draftToDelete.value.id)
    draftToDelete.value = null
    await reloadDrafts()
  } catch {
  }
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
    <section v-if="drafts.length" class="flex flex-col gap-2" :aria-label="t('suppliers.purchases.drafts')">
      <h3 class="text-sm font-medium text-muted-foreground">{{ t('suppliers.purchases.drafts') }}</h3>
      <div v-for="draft in drafts" :key="draft.id" class="flex items-center gap-3 rounded-lg border border-dashed px-4 py-3">
        <FilePen class="size-5 shrink-0 text-muted-foreground" />
        <span class="min-w-0 flex-1">
          <span class="block truncate text-sm font-medium">{{ draft.supplier_name ?? t('suppliers.arrived.noSupplier') }}</span>
          <span class="block text-xs text-muted-foreground">{{ t('suppliers.purchases.draftLine', { count: draft.line_count, date: formatDateTime(draft.updated_at) }) }}</span>
        </span>
        <Button size="sm" variant="outline" @click="continueDraft(draft)">{{ t('suppliers.purchases.continueDraft') }}</Button>
        <Button size="icon" variant="ghost" :aria-label="t('suppliers.purchases.deleteDraft')" @click="draftToDelete = draft"><Trash2 class="text-destructive" /></Button>
      </div>
    </section>

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
        <Badge v-if="purchase.replaced_by_id" variant="outline">{{ t('suppliers.purchases.edited') }}</Badge>
        <Badge v-else :variant="statusVariant[purchase.payment_status]">{{ t(`suppliers.status.${purchase.payment_status}`) }}</Badge>
      </span>
    </button>

    <div v-if="totalPurchases > supplierPageSize" class="flex justify-end gap-2">
      <Button variant="outline" size="sm" :disabled="pageOffset === 0 || loading" @click="goToPage(pageOffset - supplierPageSize)">{{ t('common.pagination.previous') }}</Button>
      <Button variant="outline" size="sm" :disabled="pageOffset + supplierPageSize >= totalPurchases || loading" @click="goToPage(pageOffset + supplierPageSize)">{{ t('common.pagination.next') }}</Button>
    </div>

    <PurchaseDetailsDialog v-model:open="showDetails" :purchase-id="openPurchaseId" @changed="onChanged" />
    <StockArrivedDialog v-model:open="showDraft" :draft="openDraft" @saved="onChanged" @draft-saved="reloadDrafts" />
    <AlertDialog :open="draftToDelete != null" @update:open="isOpen => { if (!isOpen) draftToDelete = null }">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{{ t('suppliers.purchases.deleteDraftTitle') }}</AlertDialogTitle>
          <AlertDialogDescription>{{ t('suppliers.purchases.deleteDraftDescription') }}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{{ t('common.actions.back') }}</AlertDialogCancel>
          <AlertDialogAction class="bg-destructive text-white hover:bg-destructive/90" :disabled="saving" @click.prevent="confirmDeleteDraft">{{ t('suppliers.purchases.deleteDraft') }}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
