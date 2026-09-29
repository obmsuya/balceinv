<script setup lang="ts">
import { CircleCheck, HandCoins, PackageCheck, Phone, Printer, ReceiptText, XCircle } from 'lucide-vue-next'
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
import { Textarea } from '@/components/ui/textarea'
import PaymentDialog from '@/components/pos/PaymentDialog.vue'
import PaymentMethodChoice from '@/components/customers/PaymentMethodChoice.vue'
import type { CustomerPaymentMethod } from '@/composables/useCustomers'
import type { Order } from '@/composables/useOrders'
import type { PaymentInput } from '@/composables/useSales'
import { paymentMethodLabel } from '@/composables/useSales'
import { productLabel } from '@/composables/useStock'
import { currencyCode, formatMoney, inputTextToMinor } from '~/utils/money'
import { openExternal } from '~/utils/openExternal'

const props = defineProps<{ orderId: string | null }>()
const emit = defineEmits<{ changed: [] }>()

const open = defineModel<boolean>('open', { default: false })

const { t, formatDate, formatDateTime } = useI18n()
const { canView, canEdit, canDelete } = usePermissions()
const { fetchOrder, addDeposit, markReady, collectOrder, cancelOrder, saving } = useOrders()
const { printSaleReceipt, openBrowserReceipt } = usePrint()

const order = ref<Order | null>(null)
const showDeposit = ref(false)
const depositText = ref('')
const depositMethod = ref<CustomerPaymentMethod | null>('cash')
const showPayment = ref(false)
const showHandOver = ref(false)
const showCancel = ref(false)
const cancelReason = ref('')
const refundMethod = ref<CustomerPaymentMethod | null>(null)
const justCollected = ref(false)

const isOpenOrReady = computed(() => order.value?.status === 'open' || order.value?.status === 'ready')
const statusVariant = computed(() => {
  const status = order.value?.status
  if (status === 'ready') return 'default'
  if (status === 'cancelled') return 'secondary'
  return 'outline'
})
const orderCustomer = computed(() => (order.value ? { id: order.value.customer_id, name: order.value.customer_name } : null))

const dueDateLabel = (dueDate: string): string => formatDate(`${dueDate}T00:00:00`)

watch([open, () => props.orderId], async ([isOpen]) => {
  if (!isOpen || !props.orderId) return
  order.value = null
  justCollected.value = false
  order.value = await fetchOrder(props.orderId)
})

const applyChange = (changedOrder: Order) => {
  order.value = changedOrder
  emit('changed')
}

const openDeposit = () => {
  depositText.value = ''
  depositMethod.value = 'cash'
  showDeposit.value = true
}

const saveDeposit = async () => {
  if (!order.value) return
  const depositAmount = inputTextToMinor(depositText.value)
  if (depositAmount == null || Number.isNaN(depositAmount) || depositAmount <= 0) {
    toast.error(t('orders.deposit.errors.badAmount'))
    return
  }
  if (depositAmount > order.value.balance_due) {
    toast.error(t('orders.deposit.errors.tooMuch', { amount: formatMoney(order.value.balance_due) }))
    return
  }
  try {
    applyChange(await addDeposit(order.value.id, { method: depositMethod.value ?? 'cash', amount: depositAmount }))
    showDeposit.value = false
  } catch {
  }
}

const setReady = async () => {
  if (!order.value) return
  try {
    applyChange(await markReady(order.value.id))
  } catch {
  }
}

const startCollect = () => {
  if (!order.value) return
  if (order.value.balance_due > 0) showPayment.value = true
  else showHandOver.value = true
}

const collect = async (payments: PaymentInput[]) => {
  if (!order.value) return
  try {
    applyChange(await collectOrder(order.value.id, payments))
    showPayment.value = false
    showHandOver.value = false
    justCollected.value = true
  } catch {
  }
}

const openCancel = () => {
  cancelReason.value = ''
  refundMethod.value = null
  showCancel.value = true
}

const confirmCancel = async () => {
  if (!order.value) return
  if (!cancelReason.value.trim()) {
    toast.error(t('orders.cancel.errors.reasonRequired'))
    return
  }
  const needsRefund = order.value.deposit_total > 0
  if (needsRefund && !refundMethod.value) {
    toast.error(t('orders.cancel.errors.chooseRefund'))
    return
  }
  try {
    applyChange(await cancelOrder(order.value.id, cancelReason.value.trim(), needsRefund ? refundMethod.value : null))
    showCancel.value = false
  } catch {
  }
}

const printReceipt = () => {
  if (order.value?.sale_id) printSaleReceipt(order.value.sale_id)
}

const callCustomer = () => {
  if (order.value?.customer_phone) openExternal(`tel:${order.value.customer_phone}`)
}
</script>

<template>
  <Sheet v-model:open="open">
    <SheetContent side="right" class="w-full gap-0 overflow-y-auto p-0 sm:max-w-md">
      <SheetHeader class="border-b p-4 pr-12">
        <SheetTitle class="flex flex-wrap items-center gap-2">
          {{ order?.number ?? t('orders.detail.title') }}
          <Badge v-if="order" :variant="statusVariant">{{ t(`orders.statusOne.${order.status}`) }}</Badge>
        </SheetTitle>
        <SheetDescription v-if="order">{{ formatDateTime(order.created_at) }} · {{ order.created_by_name }} · {{ order.shop_name }}</SheetDescription>
      </SheetHeader>

      <div v-if="!order" class="p-4"><Skeleton class="h-48 w-full" /></div>
      <div v-else class="flex flex-col gap-4 p-4">
        <div class="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
          <div class="min-w-0">
            <NuxtLink v-if="canView('customers')" :to="`/customers/${order.customer_id}`" class="block truncate font-medium hover:underline">{{ order.customer_name }}</NuxtLink>
            <p v-else class="truncate font-medium">{{ order.customer_name }}</p>
            <p v-if="order.due_date" class="text-xs text-muted-foreground">{{ t('orders.detail.due', { date: dueDateLabel(order.due_date) }) }}</p>
          </div>
          <Button v-if="order.customer_phone" variant="outline" size="sm" @click="callCustomer">
            <Phone />
            <span class="tabular-nums">{{ order.customer_phone }}</span>
          </Button>
        </div>

        <p v-if="order.note" class="rounded-md bg-muted/40 px-3 py-2 text-sm">{{ order.note }}</p>

        <div v-if="justCollected && order.sale_id" class="flex flex-col items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-4 text-center">
          <CircleCheck class="size-8 text-emerald-600" />
          <p class="font-medium">{{ t('orders.detail.collectedNow', { receipt: order.sale_receipt_number ?? '' }) }}</p>
          <Button @click="printReceipt"><Printer /> {{ t('pos.complete.printReceipt') }}</Button>
        </div>

        <div class="flex flex-col gap-2">
          <div v-for="(orderLine, lineIndex) in order.lines" :key="lineIndex" class="flex items-start justify-between gap-3 text-sm">
            <div class="min-w-0">
              <p class="font-medium">{{ productLabel(orderLine) }}</p>
              <p class="text-xs text-muted-foreground tabular-nums">
                {{ orderLine.quantity }} {{ orderLine.unit }} × {{ formatMoney(orderLine.unit_price) }}
                <template v-if="orderLine.is_wholesale"> · {{ t('pos.cart.wholesale') }}</template>
                <template v-if="orderLine.discount_name"> · {{ orderLine.discount_name }} −{{ formatMoney(orderLine.discount_amount) }}</template>
              </p>
            </div>
            <span class="shrink-0 font-medium tabular-nums">{{ formatMoney(orderLine.line_total) }}</span>
          </div>
        </div>

        <Separator />
        <dl class="flex flex-col gap-1 text-sm">
          <div v-if="order.discount_total" class="flex justify-between text-muted-foreground"><dt>{{ t('sales.details.discounts') }}</dt><dd class="tabular-nums">−{{ formatMoney(order.discount_total) }}</dd></div>
          <div class="flex justify-between text-base font-semibold"><dt>{{ t('common.fields.total') }}</dt><dd class="tabular-nums">{{ formatMoney(order.total) }}</dd></div>
          <div class="flex justify-between"><dt>{{ t('orders.detail.paidSoFar') }}</dt><dd class="tabular-nums">{{ formatMoney(order.deposit_total) }}</dd></div>
          <div v-if="isOpenOrReady" class="flex justify-between text-base font-bold" :class="order.balance_due ? 'text-destructive' : 'text-emerald-700 dark:text-emerald-400'">
            <dt>{{ t('orders.detail.stillToPay') }}</dt><dd class="tabular-nums">{{ formatMoney(order.balance_due) }}</dd>
          </div>
        </dl>

        <div v-if="order.payments.length" class="flex flex-col gap-1.5">
          <p class="text-sm font-medium">{{ t('orders.detail.payments') }}</p>
          <div v-for="payment in order.payments" :key="payment.id" class="flex items-start justify-between gap-3 rounded-md bg-muted/40 px-3 py-2 text-sm">
            <div class="min-w-0">
              <p>{{ t(`orders.paymentKind.${payment.kind}`) }} · {{ paymentMethodLabel(payment.method) }}</p>
              <p class="text-xs text-muted-foreground">{{ formatDateTime(payment.created_at) }} · {{ payment.created_by_name }}</p>
            </div>
            <span class="shrink-0 font-medium tabular-nums" :class="payment.kind === 'refund' ? 'text-destructive' : ''">{{ payment.kind === 'refund' ? '−' : '' }}{{ formatMoney(payment.amount) }}</span>
          </div>
        </div>

        <div v-if="order.status === 'collected'" class="flex flex-col gap-2 rounded-lg border px-3 py-2 text-sm">
          <p>{{ t('orders.detail.collectedOn', { date: formatDateTime(order.collected_at) }) }}</p>
          <div v-if="order.sale_id" class="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" @click="openBrowserReceipt(order.sale_id, false)"><ReceiptText /> {{ order.sale_receipt_number }}</Button>
            <Button variant="outline" size="sm" @click="printReceipt"><Printer /> {{ t('pos.complete.printReceipt') }}</Button>
          </div>
        </div>
        <div v-if="order.status === 'cancelled'" class="rounded-lg border border-destructive/30 px-3 py-2 text-sm">
          <p>{{ t('orders.detail.cancelledBy', { name: order.cancelled_by_name ?? '', date: formatDateTime(order.cancelled_at) }) }}</p>
          <p v-if="order.cancel_reason" class="text-muted-foreground">{{ order.cancel_reason }}</p>
        </div>

        <div v-if="isOpenOrReady" class="flex flex-col gap-2">
          <Button v-if="canEdit('orders')" class="h-12 text-base" :disabled="saving" @click="startCollect">
            <PackageCheck />
            {{ order.balance_due ? t('orders.detail.collectAndPay', { amount: formatMoney(order.balance_due) }) : t('orders.detail.collect') }}
          </Button>
          <div class="grid grid-cols-2 gap-2">
            <Button v-if="canEdit('orders') && order.status === 'open'" variant="outline" :disabled="saving" @click="setReady">
              <CircleCheck />
              {{ t('orders.detail.markReady') }}
            </Button>
            <Button v-if="canEdit('orders') && order.balance_due > 0" variant="outline" :disabled="saving" @click="openDeposit">
              <HandCoins />
              {{ t('orders.detail.addDeposit') }}
            </Button>
            <Button v-if="canDelete('orders')" variant="outline" class="text-destructive hover:text-destructive" :disabled="saving" @click="openCancel">
              <XCircle />
              {{ t('orders.cancel.button') }}
            </Button>
          </div>
        </div>
      </div>

      <PaymentDialog
        v-if="order"
        v-model:open="showPayment"
        :total="order.balance_due"
        :saving="saving"
        :numpad-enabled="false"
        :customer="orderCustomer"
        :confirm-label="t('orders.detail.collect')"
        @pay="collect"
      />

      <AlertDialog :open="showHandOver" @update:open="isOpen => showHandOver = isOpen">
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{{ t('orders.detail.handOverTitle') }}</AlertDialogTitle>
            <AlertDialogDescription>{{ t('orders.detail.handOverDescription') }}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{{ t('common.actions.back') }}</AlertDialogCancel>
            <AlertDialogAction :disabled="saving" @click.prevent="collect([])">{{ t('orders.detail.collect') }}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog v-model:open="showDeposit">
        <DialogContent class="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{{ t('orders.detail.addDeposit') }}</DialogTitle>
            <DialogDescription>{{ t('orders.deposit.description', { amount: formatMoney(order?.balance_due ?? 0) }) }}</DialogDescription>
          </DialogHeader>
          <form class="flex flex-col gap-4" @submit.prevent="saveDeposit">
            <div class="flex flex-col gap-1.5">
              <Label for="deposit-amount">{{ t('orders.fields.deposit', { currency: currencyCode() }) }}</Label>
              <Input id="deposit-amount" v-model="depositText" inputmode="decimal" class="h-11 text-lg tabular-nums" />
            </div>
            <PaymentMethodChoice v-model="depositMethod" />
            <DialogFooter>
              <Button type="button" variant="outline" @click="showDeposit = false">{{ t('common.actions.cancel') }}</Button>
              <Button type="submit" :disabled="saving">{{ saving ? t('common.actions.saving') : t('orders.deposit.save') }}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog v-model:open="showCancel">
        <DialogContent class="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{{ t('orders.cancel.title', { number: order?.number ?? '' }) }}</DialogTitle>
            <DialogDescription>{{ t('orders.cancel.description') }}</DialogDescription>
          </DialogHeader>
          <form class="flex flex-col gap-4" @submit.prevent="confirmCancel">
            <div class="flex flex-col gap-1.5">
              <Label for="cancel-reason">{{ t('orders.cancel.reason') }}</Label>
              <Textarea id="cancel-reason" v-model="cancelReason" maxlength="200" rows="2" class="resize-none" :placeholder="t('orders.cancel.reasonPlaceholder')" />
            </div>
            <div v-if="order && order.deposit_total > 0" class="flex flex-col gap-2 rounded-lg border border-destructive/30 p-3">
              <p class="text-sm font-medium">{{ t('orders.cancel.handBack', { amount: formatMoney(order.deposit_total), name: order.customer_name }) }}</p>
              <p class="text-xs text-muted-foreground">{{ t('orders.cancel.handBackHow') }}</p>
              <PaymentMethodChoice v-model="refundMethod" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" @click="showCancel = false">{{ t('common.actions.back') }}</Button>
              <Button type="submit" variant="destructive" :disabled="saving">{{ t('orders.cancel.confirm') }}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SheetContent>
  </Sheet>
</template>
