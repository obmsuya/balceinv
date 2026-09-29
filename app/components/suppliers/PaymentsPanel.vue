<script setup lang="ts">
import { Wallet } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import ReasonDialog from '@/components/suppliers/ReasonDialog.vue'
import type { SupplierPayment } from '@/composables/useSuppliers'
import { supplierPageSize } from '@/composables/useSuppliers'
import { formatMoney } from '~/utils/money'

const props = defineProps<{ supplierId?: string }>()
const emit = defineEmits<{ changed: [] }>()

const { t, formatDate } = useI18n()
const { canDelete } = usePermissions()
const { listPayments, voidPayment, loading, saving } = useSuppliers()

const payments = ref<SupplierPayment[]>([])
const totalPayments = ref(0)
const pageOffset = ref(0)
const voidTarget = ref<SupplierPayment | null>(null)
const showVoid = ref(false)

const reload = async () => {
  const paymentPage = await listPayments({ supplierId: props.supplierId, offset: pageOffset.value })
  payments.value = paymentPage.items
  totalPayments.value = paymentPage.total
}
onMounted(reload)

const goToPage = (nextOffset: number) => {
  pageOffset.value = Math.max(nextOffset, 0)
  reload()
}

const askVoid = (payment: SupplierPayment) => {
  voidTarget.value = payment
  showVoid.value = true
}

const confirmVoid = async (reason: string) => {
  if (!voidTarget.value) return
  try {
    await voidPayment(voidTarget.value.id, reason)
    showVoid.value = false
    reload()
    emit('changed')
  } catch {
  }
}

defineExpose({ reload })
</script>

<template>
  <div class="flex flex-col gap-2">
    <div v-if="loading && !payments.length" class="flex flex-col gap-2">
      <Skeleton v-for="skeletonRow in 3" :key="skeletonRow" class="h-16 w-full" />
    </div>
    <div v-else-if="!payments.length" class="flex flex-col items-center gap-2 py-10 text-center">
      <Wallet class="size-10 text-muted-foreground/50" />
      <p class="text-sm text-muted-foreground">{{ t('suppliers.payments.empty') }}</p>
    </div>
    <div
      v-for="payment in payments"
      :key="payment.id"
      class="flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3"
      :class="payment.is_voided ? 'opacity-60' : ''"
    >
      <span class="min-w-0 flex-1">
        <span class="block truncate text-sm font-medium">{{ payment.supplier_name }}</span>
        <span class="block text-xs text-muted-foreground">
          {{ payment.payment_number }} · {{ formatDate(payment.paid_at) }} · {{ t(`suppliers.methods.${payment.method}`) }}<template v-if="payment.reference"> · {{ payment.reference }}</template>
        </span>
        <span v-if="payment.is_voided" class="block text-xs text-destructive">{{ t('suppliers.payments.voidedBecause', { reason: payment.void_reason ?? '' }) }}</span>
      </span>
      <span class="flex shrink-0 items-center gap-2">
        <span class="text-sm font-medium tabular-nums" :class="payment.is_voided ? 'line-through' : ''">{{ formatMoney(payment.amount) }}</span>
        <Badge v-if="payment.is_voided" variant="destructive">{{ t('suppliers.payments.voided') }}</Badge>
        <Button v-else-if="canDelete('purchases')" variant="ghost" size="sm" class="text-destructive hover:text-destructive" @click="askVoid(payment)">
          {{ t('suppliers.payments.void') }}
        </Button>
      </span>
    </div>

    <div v-if="totalPayments > supplierPageSize" class="flex justify-end gap-2">
      <Button variant="outline" size="sm" :disabled="pageOffset === 0 || loading" @click="goToPage(pageOffset - supplierPageSize)">{{ t('common.pagination.previous') }}</Button>
      <Button variant="outline" size="sm" :disabled="pageOffset + supplierPageSize >= totalPayments || loading" @click="goToPage(pageOffset + supplierPageSize)">{{ t('common.pagination.next') }}</Button>
    </div>

    <ReasonDialog
      v-model:open="showVoid"
      :title="t('suppliers.payments.voidTitle', { number: voidTarget?.payment_number ?? '', amount: formatMoney(voidTarget?.amount ?? 0) })"
      :description="t('suppliers.payments.voidDescription')"
      :confirm-label="t('suppliers.payments.void')"
      :busy="saving"
      @confirm="confirmVoid"
    />
  </div>
</template>
