<script setup lang="ts">
import { Ban, CircleCheck, FileDown, FilePlus2, HandCoins, Pencil, Phone, Send, Share2, Truck, XCircle } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import MoneyInput from '@/components/MoneyInput.vue'
import PaymentMethodChoice from '@/components/customers/PaymentMethodChoice.vue'
import ReasonDialog from '@/components/suppliers/ReasonDialog.vue'
import type { CustomerPaymentMethod } from '@/composables/useCustomers'
import type { Invoice, InvoicePayment } from '@/composables/useInvoices'
import { invoiceBadgeTone, invoiceBadgeVariant, isBill, isOffer } from '@/composables/useInvoices'
import { currencyCode, formatMoney, inputTextToMinor, minorToInputText } from '~/utils/money'
import { openExternal } from '~/utils/openExternal'

const props = defineProps<{ invoiceId: string | null }>()
const emit = defineEmits<{ changed: []; openInvoice: [invoiceId: string]; edit: [invoice: Invoice] }>()
const open = defineModel<boolean>('open', { default: false })

const { t, formatDate, formatDateTime } = useI18n()
const { canView, canCreate, canEdit, canDelete } = usePermissions()
const {
  fetchInvoice, issueInvoice, acceptInvoice, deliverInvoice, recordPayment, voidPayment, convertInvoice, cancelInvoice,
  downloadInvoicePdf, shareInvoicePdf, saving, downloading,
} = useInvoices()

const invoice = ref<Invoice | null>(null)
const showPayment = ref(false)
const paymentText = ref('')
const paymentMethod = ref<CustomerPaymentMethod | null>('cash')
const paymentReference = ref('')
const showDeliver = ref(false)
const showCancel = ref(false)
const paymentToVoid = ref<InvoicePayment | null>(null)
const showVoid = ref(false)

const badgeTone = computed(() => (invoice.value ? invoiceBadgeTone(invoice.value) : 'draft'))
const isOpenBill = computed(() => invoice.value != null && isBill(invoice.value) && invoice.value.status === 'issued')
const canPay = computed(() => isOpenBill.value && (invoice.value?.balance_due ?? 0) > 0 && canEdit('invoices'))
const canDeliver = computed(() => invoice.value != null && isBill(invoice.value) && invoice.value.status !== 'cancelled' && !invoice.value.delivered_at && canEdit('invoices'))
const canMakeInvoice = computed(() => invoice.value != null && isOffer(invoice.value) && (invoice.value.status === 'issued' || invoice.value.status === 'accepted') && canCreate('invoices'))
const canMakeDeliveryNote = computed(() => invoice.value?.kind === 'invoice' && invoice.value.status === 'issued' && canCreate('invoices'))
const hasProductLines = computed(() => (invoice.value?.lines ?? []).some(line => line.product_id))

const dateLabel = (dateText: string): string => formatDate(`${dateText}T00:00:00`)
const methodLabel = (method: string): string => t(`invoices.paymentMethod.${method}`)

const load = async () => {
  if (!props.invoiceId) return
  invoice.value = null
  invoice.value = await fetchInvoice(props.invoiceId)
}

watch([open, () => props.invoiceId], ([isOpen]) => {
  if (isOpen) load()
})

const applyChange = (changedInvoice: Invoice) => {
  invoice.value = changedInvoice
  emit('changed')
}

const run = async (change: () => Promise<Invoice>) => {
  try {
    applyChange(await change())
  } catch {
  }
}

const issue = () => invoice.value && run(() => issueInvoice(invoice.value!.id))
const accept = () => invoice.value && run(() => acceptInvoice(invoice.value!.id))

const deliver = async () => {
  if (!invoice.value) return
  await run(() => deliverInvoice(invoice.value!.id))
  showDeliver.value = false
}

const openPayment = () => {
  paymentText.value = minorToInputText(invoice.value?.balance_due ?? 0)
  paymentMethod.value = 'cash'
  paymentReference.value = ''
  showPayment.value = true
}

const savePayment = async () => {
  if (!invoice.value) return
  const amount = inputTextToMinor(paymentText.value)
  if (amount == null || Number.isNaN(amount) || amount <= 0) {
    toast.error(t('invoices.payment.errors.badAmount'))
    return
  }
  if (amount > invoice.value.balance_due) {
    toast.error(t('invoices.payment.errors.tooMuch', { amount: formatMoney(invoice.value.balance_due) }))
    return
  }
  try {
    applyChange(await recordPayment(invoice.value.id, {
      method: paymentMethod.value ?? 'cash',
      amount,
      reference: paymentReference.value.trim() || undefined,
    }))
    showPayment.value = false
  } catch {
  }
}

const askVoid = (payment: InvoicePayment) => {
  paymentToVoid.value = payment
  showVoid.value = true
}

const confirmVoid = async (reason: string) => {
  if (!invoice.value || !paymentToVoid.value) return
  try {
    applyChange(await voidPayment(invoice.value.id, paymentToVoid.value.id, reason))
    showVoid.value = false
  } catch {
  }
}

const confirmCancel = async (reason: string) => {
  if (!invoice.value) return
  try {
    applyChange(await cancelInvoice(invoice.value.id, reason))
    showCancel.value = false
  } catch {
  }
}

const convert = async (kind: 'invoice' | 'delivery_note') => {
  if (!invoice.value) return
  try {
    const converted = await convertInvoice(invoice.value.id, kind)
    emit('changed')
    emit('openInvoice', converted.id)
  } catch {
  }
}

const callCustomer = () => {
  if (invoice.value?.party.phone) openExternal(`tel:${invoice.value.party.phone.replace(/\s+/g, '')}`)
}
</script>

<template>
  <Sheet v-model:open="open">
    <SheetContent side="right" class="w-full gap-0 overflow-y-auto p-0 sm:max-w-lg">
      <SheetHeader class="border-b p-4 pr-12">
        <SheetTitle class="flex flex-wrap items-center gap-2">
          <span class="font-mono">{{ invoice?.number ?? t('invoices.detail.title') }}</span>
          <Badge v-if="invoice" :variant="invoiceBadgeVariant[badgeTone]" class="whitespace-nowrap">{{ t(`invoices.badge.${badgeTone}`) }}</Badge>
        </SheetTitle>
        <SheetDescription v-if="invoice">{{ t(`invoices.kind.${invoice.kind}`) }} · {{ invoice.shop_name }}</SheetDescription>
      </SheetHeader>

      <div v-if="!invoice" class="p-4"><Skeleton class="h-56 w-full" /></div>
      <div v-else class="flex flex-col gap-4 p-4">
        <div class="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" :disabled="downloading" @click="downloadInvoicePdf(invoice.id, invoice.number)"><FileDown />{{ t('invoices.detail.downloadPdf') }}</Button>
          <Button variant="outline" size="sm" :disabled="downloading" @click="shareInvoicePdf(invoice.id, invoice.number)"><Share2 />{{ t('invoices.detail.share') }}</Button>
          <Button v-if="invoice.status === 'draft' && canEdit('invoices')" variant="outline" size="sm" @click="emit('edit', invoice)"><Pencil />{{ t('invoices.detail.edit') }}</Button>
        </div>

        <div v-if="isBill(invoice) && invoice.status !== 'cancelled'" class="rounded-xl border p-4">
          <p class="text-sm text-muted-foreground">{{ invoice.balance_due > 0 ? t('invoices.detail.balanceDue') : t('invoices.detail.fullyPaid') }}</p>
          <p class="text-3xl font-bold tabular-nums" :class="invoice.is_overdue ? 'text-destructive' : invoice.balance_due > 0 ? '' : 'text-emerald-700 dark:text-emerald-400'">
            {{ formatMoney(invoice.balance_due > 0 ? invoice.balance_due : invoice.total) }}
          </p>
          <p v-if="invoice.due_date" class="mt-1 text-sm" :class="invoice.is_overdue ? 'font-medium text-destructive' : 'text-muted-foreground'">
            {{ invoice.is_overdue ? t('invoices.detail.overdueSince', { date: dateLabel(invoice.due_date) }) : t('invoices.detail.dueOn', { date: dateLabel(invoice.due_date) }) }}
          </p>
        </div>

        <div class="grid grid-cols-2 gap-3 text-sm">
          <div class="col-span-2 flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
            <div class="min-w-0">
              <p class="text-xs text-muted-foreground">{{ t(invoice.kind === 'delivery_note' ? 'invoices.fields.deliverTo' : isOffer(invoice) ? 'invoices.fields.preparedFor' : 'invoices.fields.billTo') }}</p>
              <NuxtLink v-if="invoice.party.type === 'customer' && canView('customers')" :to="`/customers/${invoice.party.id}`" class="block truncate font-medium hover:underline">{{ invoice.party.name }}</NuxtLink>
              <p v-else class="truncate font-medium">{{ invoice.party.name }}</p>
              <p v-if="invoice.party.email" class="truncate text-xs text-muted-foreground">{{ invoice.party.email }}</p>
            </div>
            <Button v-if="invoice.party.phone" variant="outline" size="sm" @click="callCustomer"><Phone /><span class="tabular-nums">{{ invoice.party.phone }}</span></Button>
          </div>
          <div><p class="text-xs text-muted-foreground">{{ t('invoices.fields.issueDate') }}</p><p>{{ dateLabel(invoice.issue_date) }}</p></div>
          <div v-if="invoice.due_date && !isBill(invoice)"><p class="text-xs text-muted-foreground">{{ t('invoices.fields.validUntil') }}</p><p>{{ dateLabel(invoice.due_date) }}</p></div>
          <div v-if="invoice.reference"><p class="text-xs text-muted-foreground">{{ t('invoices.fields.reference') }}</p><p class="truncate">{{ invoice.reference }}</p></div>
          <div v-if="isBill(invoice)">
            <p class="text-xs text-muted-foreground">{{ t('invoices.detail.goods') }}</p>
            <p v-if="invoice.delivered_at" class="flex items-center gap-1"><Truck class="size-3.5 text-emerald-600" />{{ t('invoices.detail.deliveredOn', { date: formatDate(invoice.delivered_at) }) }}</p>
            <p v-else class="text-muted-foreground">{{ t('invoices.detail.notDelivered') }}</p>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <div v-for="line in invoice.lines" :key="line.id" class="flex items-start justify-between gap-3 text-sm">
            <div class="min-w-0">
              <p class="font-medium">{{ line.description }}</p>
              <p class="text-xs tabular-nums text-muted-foreground">
                {{ line.quantity }} {{ line.unit }}<template v-if="invoice.kind !== 'delivery_note'"> × {{ formatMoney(line.unit_price) }}</template>
                <template v-if="line.discount_amount"> · −{{ formatMoney(line.discount_amount) }}</template>
                <template v-if="line.sku"> · {{ line.sku }}</template>
              </p>
            </div>
            <span v-if="invoice.kind !== 'delivery_note'" class="shrink-0 font-medium tabular-nums">{{ formatMoney(line.line_total) }}</span>
          </div>
        </div>

        <template v-if="invoice.kind !== 'delivery_note'">
          <Separator />
          <dl class="flex flex-col gap-1 text-sm">
            <div v-if="invoice.discount_total" class="flex justify-between text-muted-foreground"><dt>{{ t('invoices.fields.subtotal') }}</dt><dd class="tabular-nums">{{ formatMoney(invoice.subtotal) }}</dd></div>
            <div v-if="invoice.discount_total" class="flex justify-between text-muted-foreground"><dt>{{ t('invoices.fields.discount') }}</dt><dd class="tabular-nums">−{{ formatMoney(invoice.discount_total) }}</dd></div>
            <div v-if="invoice.tax_total" class="flex justify-between text-muted-foreground"><dt>{{ t('invoices.detail.vatIncluded', { rate: invoice.tax_rate_basis_points / 100 }) }}</dt><dd class="tabular-nums">{{ formatMoney(invoice.tax_total) }}</dd></div>
            <div class="flex justify-between text-base font-semibold"><dt>{{ t('common.fields.total') }}</dt><dd class="tabular-nums">{{ formatMoney(invoice.total) }}</dd></div>
            <div v-if="isBill(invoice)" class="flex justify-between"><dt>{{ t('invoices.detail.paid') }}</dt><dd class="tabular-nums">{{ formatMoney(invoice.paid_total) }}</dd></div>
          </dl>
        </template>

        <div v-if="invoice.payments?.length" class="flex flex-col gap-1.5">
          <p class="text-sm font-medium">{{ t('invoices.detail.payments') }}</p>
          <div v-for="payment in invoice.payments" :key="payment.id" class="flex items-start justify-between gap-3 rounded-md bg-muted/40 px-3 py-2 text-sm" :class="payment.is_voided ? 'opacity-60' : ''">
            <div class="min-w-0">
              <p :class="payment.is_voided ? 'line-through' : ''">{{ methodLabel(payment.method) }}<template v-if="payment.reference"> · {{ payment.reference }}</template></p>
              <p class="text-xs text-muted-foreground">{{ formatDateTime(payment.created_at) }} · {{ payment.created_by_name }}<template v-if="payment.is_voided"> · {{ t('invoices.detail.voided') }}</template></p>
            </div>
            <div class="flex shrink-0 items-center gap-1">
              <span class="font-medium tabular-nums" :class="payment.is_voided ? 'line-through' : ''">{{ formatMoney(payment.amount) }}</span>
              <Button v-if="!payment.is_voided && canEdit('invoices') && invoice.status !== 'cancelled'" variant="ghost" size="icon" class="size-7" :aria-label="t('invoices.detail.voidPayment')" @click="askVoid(payment)">
                <Ban class="size-3.5 text-destructive" />
              </Button>
            </div>
          </div>
        </div>

        <p v-if="invoice.notes" class="whitespace-pre-line rounded-md bg-muted/40 px-3 py-2 text-sm">{{ invoice.notes }}</p>

        <div v-if="invoice.source || invoice.derived?.length" class="flex flex-col gap-1.5 text-sm">
          <p class="font-medium">{{ t('invoices.detail.related') }}</p>
          <div class="flex flex-wrap gap-2">
            <Button v-if="invoice.source" variant="outline" size="sm" @click="emit('openInvoice', invoice.source.id)">
              {{ t('invoices.detail.madeFrom', { kind: t(`invoices.kind.${invoice.source.kind}`), number: invoice.source.number }) }}
            </Button>
            <Button v-for="derived in invoice.derived" :key="derived.id" variant="outline" size="sm" @click="emit('openInvoice', derived.id)">
              {{ t(`invoices.kind.${derived.kind}`) }} {{ derived.number }}
            </Button>
          </div>
        </div>

        <div class="flex flex-col gap-1 text-xs text-muted-foreground">
          <p>{{ t('invoices.detail.createdBy', { name: invoice.created_by_name, date: formatDateTime(invoice.created_at) }) }}</p>
          <p v-if="invoice.delivered_at">{{ t('invoices.detail.deliveredBy', { name: invoice.delivered_by_name ?? '', date: formatDateTime(invoice.delivered_at) }) }}</p>
          <div v-if="invoice.status === 'cancelled'" class="mt-1 rounded-lg border border-destructive/30 px-3 py-2 text-sm text-foreground">
            <p>{{ t('invoices.detail.cancelledBy', { name: invoice.cancelled_by_name ?? '', date: formatDateTime(invoice.cancelled_at) }) }}</p>
            <p v-if="invoice.cancel_reason" class="text-muted-foreground">{{ invoice.cancel_reason }}</p>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <Button v-if="invoice.status === 'draft' && canEdit('invoices')" class="h-11" :disabled="saving" @click="issue"><Send />{{ t('invoices.detail.issue') }}</Button>
          <Button v-if="canPay" class="h-11" :disabled="saving" @click="openPayment"><HandCoins />{{ t('invoices.detail.recordPayment') }}</Button>
          <div class="grid grid-cols-2 gap-2">
            <Button v-if="canDeliver" variant="outline" :disabled="saving" @click="showDeliver = true"><Truck />{{ t('invoices.detail.markDelivered') }}</Button>
            <Button v-if="isOffer(invoice) && invoice.status === 'issued' && canEdit('invoices')" variant="outline" :disabled="saving" @click="accept"><CircleCheck />{{ t('invoices.detail.accept') }}</Button>
            <Button v-if="canMakeInvoice" variant="outline" :disabled="saving" @click="convert('invoice')"><FilePlus2 />{{ t('invoices.detail.makeInvoice') }}</Button>
            <Button v-if="canMakeDeliveryNote" variant="outline" :disabled="saving" @click="convert('delivery_note')"><FilePlus2 />{{ t('invoices.detail.makeDeliveryNote') }}</Button>
            <Button v-if="invoice.status !== 'cancelled' && canDelete('invoices')" variant="outline" class="text-destructive hover:text-destructive" :disabled="saving" @click="showCancel = true"><XCircle />{{ t('invoices.detail.cancel') }}</Button>
          </div>
        </div>
      </div>

      <Dialog v-model:open="showPayment">
        <DialogContent class="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{{ t('invoices.payment.title', { number: invoice?.number ?? '' }) }}</DialogTitle>
            <DialogDescription>
              {{ invoice?.delivered_at ? t('invoices.payment.description', { amount: formatMoney(invoice?.balance_due ?? 0) }) : t('invoices.payment.beforeDelivery', { amount: formatMoney(invoice?.balance_due ?? 0) }) }}
            </DialogDescription>
          </DialogHeader>
          <form class="flex flex-col gap-4" @submit.prevent="savePayment">
            <div class="flex flex-col gap-1.5">
              <Label for="invoice-payment-amount">{{ t('invoices.payment.amount', { currency: currencyCode() }) }}</Label>
              <MoneyInput id="invoice-payment-amount" v-model="paymentText" class="h-11 text-lg tabular-nums" />
            </div>
            <PaymentMethodChoice v-model="paymentMethod" />
            <div class="flex flex-col gap-1.5">
              <Label for="invoice-payment-reference">{{ t('invoices.payment.reference') }}</Label>
              <Input id="invoice-payment-reference" v-model="paymentReference" maxlength="80" :placeholder="t('invoices.payment.referencePlaceholder')" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" @click="showPayment = false">{{ t('common.actions.cancel') }}</Button>
              <Button type="submit" :disabled="saving">{{ saving ? t('common.actions.saving') : t('invoices.payment.save') }}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog :open="showDeliver" @update:open="isOpen => showDeliver = isOpen">
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{{ t('invoices.deliver.title', { number: invoice?.number ?? '' }) }}</AlertDialogTitle>
            <AlertDialogDescription>
              {{ hasProductLines ? t('invoices.deliver.description', { shop: invoice?.shop_name ?? '', name: invoice?.party.name ?? '' }) : t('invoices.deliver.descriptionNoStock', { name: invoice?.party.name ?? '' }) }}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{{ t('common.actions.back') }}</AlertDialogCancel>
            <AlertDialogAction :disabled="saving" @click.prevent="deliver">{{ t('invoices.deliver.confirm') }}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ReasonDialog
        v-model:open="showVoid"
        :title="t('invoices.voidPayment.title')"
        :description="t('invoices.voidPayment.description', { amount: formatMoney(paymentToVoid?.amount ?? 0) })"
        :confirm-label="t('invoices.voidPayment.confirm')"
        :busy="saving"
        @confirm="confirmVoid"
      />
      <ReasonDialog
        v-model:open="showCancel"
        :title="t('invoices.cancelDialog.title', { number: invoice?.number ?? '' })"
        :description="invoice?.delivered_at ? t('invoices.cancelDialog.descriptionDelivered') : t('invoices.cancelDialog.description')"
        :confirm-label="t('invoices.cancelDialog.confirm')"
        :busy="saving"
        @confirm="confirmCancel"
      />
    </SheetContent>
  </Sheet>
</template>
