<script setup lang="ts">
import { Ban, FileDown, FileText, Printer, ReceiptText, Share2, Undo2 } from 'lucide-vue-next'
import RefundPanel from '@/components/sales/RefundPanel.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import type { Sale } from '@/composables/useSales'
import { fiscalStatusLabel, paymentMethodLabel } from '@/composables/useSales'
import { formatMoney } from '~/utils/money'

const props = defineProps<{ saleId: string | null }>()
const emit = defineEmits<{ changed: [] }>()

const open = defineModel<boolean>('open', { default: false })
const { t, formatDateTime, formatNumber } = useI18n()

const { fetchSale, sendToEfd, downloadingDocument, downloadSaleDocument, shareSaleReceipt, voidingSale, voidSale } = useSales()
const { hasPermission } = usePermissions()
const sale = ref<Sale | null>(null)
const sendingFiscal = ref(false)
const showVoid = ref(false)
const voidReason = ref('')

const canVoid = computed(() => hasPermission('sales', 'delete') && sale.value !== null && !sale.value.voided_at && !sale.value.order_number && !sale.value.refunds?.length)
const showRefund = ref(false)
const hasItemsLeftToRefund = computed(() => sale.value?.items.some(saleLine => saleLine.quantity > (saleLine.refunded_quantity ?? 0)) ?? false)
const canRefund = computed(() => hasPermission('sales', 'edit') && sale.value !== null && !sale.value.voided_at && hasItemsLeftToRefund.value)

const onRefunded = (refundedSale: Sale) => {
  sale.value = refundedSale
  showRefund.value = false
  emit('changed')
}

const confirmVoid = async () => {
  if (!sale.value || voidReason.value.trim().length < 3) return
  const voidedSale = await voidSale(sale.value.id, voidReason.value.trim())
  if (!voidedSale) return
  sale.value = voidedSale
  showVoid.value = false
  voidReason.value = ''
  emit('changed')
}

const downloadDocument = () => {
  if (sale.value) downloadSaleDocument(sale.value.id, sale.value.receipt_number)
}

const downloadReceipt = () => {
  if (sale.value) downloadSaleDocument(sale.value.id, sale.value.receipt_number, 'receipt')
}

const shareReceipt = () => {
  if (sale.value) shareSaleReceipt(sale.value.id, sale.value.receipt_number)
}

const sendFiscal = async () => {
  if (!sale.value) return
  sendingFiscal.value = true
  const sentFiscal = await sendToEfd(sale.value.id)
  sendingFiscal.value = false
  if (!sentFiscal) return
  sale.value.fiscal = sentFiscal
  emit('changed')
}

watch([open, () => props.saleId], async ([isOpen]) => {
  if (!isOpen || !props.saleId) return
  showRefund.value = false
  showVoid.value = false
  sale.value = null
  sale.value = (await fetchSale(props.saleId)) ?? null
})

const { printSaleReceipt } = usePrint()

const printReceipt = () => {
  if (sale.value) printSaleReceipt(sale.value.id)
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{{ sale?.receipt_number ?? t('sales.details.title') }}</DialogTitle>
        <DialogDescription v-if="sale">
          {{ formatDateTime(sale.created_at) }} · {{ sale.cashier_name }} · {{ sale.shop_name }}
          <template v-if="sale.customer_name"> · {{ t('sales.details.customer', { name: sale.customer_name }) }}</template>
        </DialogDescription>
      </DialogHeader>

      <Skeleton v-if="!sale" class="h-40 w-full" />
      <div v-else class="flex flex-col gap-3">
        <div v-if="sale.voided_at" class="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm">
          <p class="font-medium text-destructive">{{ t('sales.void.voidedBy', { name: sale.voided_by_name ?? '', date: formatDateTime(sale.voided_at) }) }}</p>
          <p class="text-muted-foreground">{{ sale.void_reason }}</p>
          <p v-if="sale.credit_note" class="mt-1 text-xs">{{ t('sales.void.creditNote', { status: fiscalStatusLabel(sale.credit_note.status) }) }}</p>
        </div>
        <div v-for="(saleLine, lineIndex) in sale.items" :key="lineIndex" class="flex items-start justify-between gap-3 text-sm">
          <div class="min-w-0">
            <p class="font-medium">{{ saleLine.product_name }}<template v-if="saleLine.variant_label"> · {{ saleLine.variant_label }}</template></p>
            <p class="text-xs text-muted-foreground tabular-nums">
              {{ saleLine.quantity }} × {{ formatMoney(saleLine.unit_price) }}
              <template v-if="saleLine.addons.length"> + {{ saleLine.addons.map(addon => addon.name).join(', ') }}</template>
            </p>
            <div class="mt-1 flex flex-wrap gap-1">
              <Badge v-if="saleLine.is_wholesale" variant="secondary" class="font-normal">{{ t('sales.details.wholesale') }}</Badge>
              <Badge v-if="saleLine.discount_name" variant="outline" class="font-normal">{{ saleLine.discount_name }} −{{ formatMoney(saleLine.discount_amount - (saleLine.manual_discount_amount ?? 0)) }}</Badge>
              <Badge v-if="saleLine.refunded_quantity" variant="outline" class="border-amber-500/40 font-normal text-amber-700 dark:text-amber-400">{{ t('sales.refund.lineRefunded', { count: saleLine.refunded_quantity }) }}</Badge>
              <Badge v-if="saleLine.manual_discount_amount" variant="outline" class="border-emerald-500/40 font-normal text-emerald-700 dark:text-emerald-400">{{ t('sales.details.cashierDiscount', { amount: formatMoney(saleLine.manual_discount_amount) }) }}</Badge>
            </div>
          </div>
          <span class="shrink-0 font-medium tabular-nums">{{ formatMoney(saleLine.line_total) }}</span>
        </div>

        <Separator />
        <dl class="flex flex-col gap-1 text-sm">
          <div v-if="sale.discount_total" class="flex justify-between text-muted-foreground"><dt>{{ t('sales.details.beforeDiscounts') }}</dt><dd class="tabular-nums">{{ formatMoney(sale.subtotal) }}</dd></div>
          <div v-if="sale.discount_total" class="flex justify-between text-muted-foreground"><dt>{{ t('sales.details.discounts') }}</dt><dd class="tabular-nums">−{{ formatMoney(sale.discount_total) }}</dd></div>
          <div class="flex justify-between text-base font-semibold"><dt>{{ t('common.fields.total') }}</dt><dd class="tabular-nums">{{ formatMoney(sale.total) }}</dd></div>
          <div class="flex justify-between text-xs text-muted-foreground"><dt>{{ t('sales.details.includesTax', { rate: formatNumber(sale.tax_rate_basis_points / 100) }) }}</dt><dd class="tabular-nums">{{ formatMoney(sale.tax_total) }}</dd></div>
          <div v-for="payment in sale.payments" :key="payment.method" class="flex justify-between"><dt>{{ paymentMethodLabel(payment.method) }}</dt><dd class="tabular-nums">{{ formatMoney(payment.amount) }}</dd></div>
          <div v-if="sale.change_given" class="flex justify-between"><dt>{{ t('sales.details.change') }}</dt><dd class="tabular-nums">{{ formatMoney(sale.change_given) }}</dd></div>
        </dl>
        <p v-if="sale.note" class="rounded-md bg-muted/40 px-3 py-2 text-sm">{{ sale.note }}</p>
        <div v-for="refund in sale.refunds" :key="refund.id" class="rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-sm">
          <p class="flex items-center justify-between gap-2 font-medium">
            <span class="flex items-center gap-1.5"><Undo2 class="size-4 text-amber-600" /> {{ t('sales.refund.historyTitle', { amount: formatMoney(refund.amount) }) }}</span>
            <span class="text-xs font-normal text-muted-foreground">{{ formatDateTime(refund.created_at) }}</span>
          </p>
          <p class="text-xs text-muted-foreground">
            {{ refund.lines.map(refundLine => `${refundLine.quantity} × ${refundLine.product_name}`).join(', ') }} ·
            {{ refund.method === 'credit' ? t('sales.refund.toAccount') : paymentMethodLabel(refund.method) }} ·
            {{ refund.restocked ? t('sales.refund.restocked') : t('sales.refund.notRestocked') }} ·
            {{ refund.created_by_name }}
          </p>
          <p class="text-xs">{{ refund.reason }}</p>
          <p v-if="refund.fiscal" class="text-xs text-muted-foreground">{{ t('sales.void.creditNote', { status: fiscalStatusLabel(refund.fiscal.status) }) }}</p>
        </div>
        <div v-if="sale.fiscal" class="flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm">
          <div class="min-w-0">
            <p class="flex items-center gap-2 font-medium">
              <ReceiptText class="size-4 text-muted-foreground" />
              {{ sendingFiscal ? t('sales.efd.sending') : fiscalStatusLabel(sale.fiscal.status) }}
            </p>
            <p v-if="sale.fiscal.verification_code" class="font-mono text-xs">{{ sale.fiscal.verification_code }}</p>
            <p v-if="sale.fiscal.status !== 'sent' && sale.fiscal.last_error" class="text-xs text-destructive">{{ sale.fiscal.last_error }}</p>
            <p v-if="sale.fiscal.attempts" class="text-xs text-muted-foreground">{{ t('sales.details.attempts', { count: sale.fiscal.attempts }) }}</p>
          </div>
          <Button v-if="sale.fiscal.status !== 'sent'" variant="outline" size="sm" :disabled="sendingFiscal" @click="sendFiscal">{{ t('sales.details.sendNow') }}</Button>
        </div>
      </div>

      <DialogFooter class="sm:flex-wrap">
        <Button variant="outline" :disabled="!sale || downloadingDocument" @click="shareReceipt"><Share2 /> {{ t('sales.details.share') }}</Button>
        <Button variant="outline" :disabled="!sale || downloadingDocument" @click="downloadReceipt"><FileDown /> {{ t('sales.details.receiptPdf') }}</Button>
        <Button variant="outline" :disabled="!sale || downloadingDocument" @click="downloadDocument"><FileText /> {{ downloadingDocument ? t('common.actions.saving') : t('sales.details.a4Invoice') }}</Button>
        <Button variant="outline" :disabled="!sale" @click="printReceipt"><Printer /> {{ t('sales.details.printReceipt') }}</Button>
        <Button v-if="canRefund" variant="outline" @click="showRefund = true; showVoid = false"><Undo2 /> {{ t('sales.refund.action') }}</Button>
        <Button v-if="canVoid" variant="outline" class="text-destructive hover:text-destructive" @click="showVoid = true; showRefund = false"><Ban /> {{ t('sales.void.action') }}</Button>
      </DialogFooter>

      <RefundPanel v-if="showRefund && sale" :sale="sale" @refunded="onRefunded" @cancel="showRefund = false" />

      <div v-if="showVoid && sale" class="flex flex-col gap-2 rounded-md border border-destructive/40 p-3">
        <p class="text-sm font-medium">{{ t('sales.void.title', { number: sale.receipt_number }) }}</p>
        <p class="text-xs text-muted-foreground">{{ sale.fiscal?.status === 'sent' ? t('sales.void.explainEfd') : t('sales.void.explain') }}</p>
        <Textarea v-model="voidReason" :placeholder="t('sales.void.reasonPlaceholder')" maxlength="200" rows="2" />
        <div class="flex justify-end gap-2">
          <Button variant="ghost" size="sm" @click="showVoid = false">{{ t('common.actions.cancel') }}</Button>
          <Button variant="destructive" size="sm" :disabled="voidingSale || voidReason.trim().length < 3" @click="confirmVoid">{{ t('sales.void.confirm') }}</Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
