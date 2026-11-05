<script setup lang="ts">
import { ClipboardList, Handshake, Lock, Plus, Trash2, Truck, UserPlus, UserRound } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import MoneyInput from '@/components/MoneyInput.vue'
import CustomerPicker from '@/components/customers/CustomerPicker.vue'
import StockProductSearch from '@/components/stock/StockProductSearch.vue'
import InvoicePdfPreview from '@/components/invoices/InvoicePdfPreview.vue'
import OrderPickerDialog from '@/components/invoices/OrderPickerDialog.vue'
import LineDiscountPopover from '@/components/pos/LineDiscountPopover.vue'
import LineExtraPopover from '@/components/pos/LineExtraPopover.vue'
import WingaLineDialog from '@/components/pos/WingaLineDialog.vue'
import type { Invoice, InvoiceFields, InvoiceKind, InvoiceLine, InvoiceLineInput } from '@/composables/useInvoices'
import { availableInvoiceKinds } from '@/composables/useInvoices'
import type { Order } from '@/composables/useOrders'
import type { ManualDiscount, WingaLineInput } from '@/composables/useSales'
import type { Supplier } from '@/composables/useSuppliers'
import type { StockLevel } from '@/composables/useStock'
import { productLabel } from '@/composables/useStock'
import { formatMoney, inputTextToMinor, minorToInputText } from '~/utils/money'

interface EditorCustomer {
  id: string
  name: string
  phone: string | null
}

type EditorRowKind = 'product' | 'typed' | 'brk'

interface EditorRow {
  key: number
  kind: EditorRowKind
  productId: string | null
  inStock: number | null
  description: string
  unit: string
  quantityText: string
  listPrice: number | null
  priceText: string
  discount: ManualDiscount | null
  extra: ManualDiscount | null
  shareText: string
}

const props = defineProps<{
  invoice?: Invoice | null
  presetKind?: InvoiceKind
  presetCustomer?: EditorCustomer | null
  presetSupplierId?: string | null
}>()
const emit = defineEmits<{ saved: [invoice: Invoice]; issued: [invoice: Invoice] }>()
const open = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
const { vatOn, customersOn, suppliersOn, customerOrdersOn, wingaOn } = useFeatures()
const { hasPermission } = usePermissions()
const { activeSupplierOptions } = useSuppliers()
const { createInvoice, updateInvoice, issueInvoice, fetchInvoicePdfBytes, saving } = useInvoices()

const kind = ref<InvoiceKind>('invoice')
const customer = ref<EditorCustomer | null>(null)
const supplierId = ref('')
const suppliers = ref<Supplier[]>([])
const issueDate = ref('')
const dueDate = ref('')
const reference = ref('')
const notes = ref('')
const terms = ref('')
const rows = ref<EditorRow[]>([])
const savedInvoice = ref<Invoice | null>(null)
const previewBytes = ref<Uint8Array | null>(null)
const previewLoading = ref(false)
const showCustomerPicker = ref(false)
const showOrderPicker = ref(false)
const showBrkDialog = ref(false)
let nextRowKey = 1

const canDiscount = computed(() => hasPermission('till_discounts', 'create'))
const isEditing = computed(() => savedInvoice.value != null)
const isDeliveryNote = computed(() => kind.value === 'delivery_note')
const isOfferKind = computed(() => kind.value === 'quotation' || kind.value === 'proforma')
const isSupplierBill = computed(() => kind.value === 'supplier_invoice')
const canFillFromOrder = computed(() => customerOrdersOn.value && hasPermission('orders', 'view') && !isSupplierBill.value)
const canAddBrk = computed(() => wingaOn.value && !isSupplierBill.value && !isDeliveryNote.value)
const kindChoices = computed(() => availableInvoiceKinds(customersOn.value, suppliersOn.value))
const partyLabelKey = computed(() => {
  if (isSupplierBill.value) return 'invoices.fields.supplier'
  if (isDeliveryNote.value) return 'invoices.fields.deliverTo'
  return isOfferKind.value ? 'invoices.fields.preparedFor' : 'invoices.fields.billTo'
})
const chosenProductIds = computed(() => rows.value.flatMap(row => (row.productId ? [row.productId] : [])))

const todayText = (): string => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

const rowQuantity = (row: EditorRow): number | null => {
  const parsedQuantity = Number(row.quantityText.trim())
  return Number.isInteger(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : null
}
const rowPrice = (row: EditorRow): number | null => {
  const price = inputTextToMinor(row.priceText)
  return price == null || Number.isNaN(price) ? null : price
}
const rowShare = (row: EditorRow): number => {
  const share = inputTextToMinor(row.shareText)
  return share == null || Number.isNaN(share) ? 0 : share
}
const listPriceOf = (row: EditorRow): number => (row.kind === 'product' ? row.listPrice ?? 0 : rowPrice(row) ?? 0)
const extraEach = (row: EditorRow): number => {
  if (!row.extra) return 0
  return row.extra.kind === 'percent' ? Math.round(listPriceOf(row) * Math.min(row.extra.value, 100000) / 10000) : row.extra.value
}
const priceEach = (row: EditorRow): number => listPriceOf(row) + extraEach(row)
const discountEach = (row: EditorRow): number => {
  if (!row.discount) return 0
  return row.discount.kind === 'percent' ? Math.round(priceEach(row) * Math.min(row.discount.value, 10000) / 10000) : Math.min(row.discount.value, priceEach(row))
}
const rowGross = (row: EditorRow): number => (rowQuantity(row) ?? 0) * priceEach(row)
const rowDiscount = (row: EditorRow): number => (rowQuantity(row) ?? 0) * discountEach(row)
const rowTotal = (row: EditorRow): number => rowGross(row) - rowDiscount(row)

const subtotal = computed(() => rows.value.reduce((sum, row) => sum + rowGross(row), 0))
const discountTotal = computed(() => rows.value.reduce((sum, row) => sum + rowDiscount(row), 0))
const total = computed(() => subtotal.value - discountTotal.value)

const blankRow = (rowKind: EditorRowKind): EditorRow => ({
  key: nextRowKey++,
  kind: rowKind,
  productId: null,
  inStock: null,
  description: '',
  unit: '',
  quantityText: '1',
  listPrice: null,
  priceText: '',
  discount: null,
  extra: null,
  shareText: '',
})

const amountEach = (amount: number, quantity: number): ManualDiscount | null => (amount > 0 ? { kind: 'amount', value: Math.max(Math.round(amount / quantity), 1) } : null)

const rowFromLine = (line: InvoiceLine): EditorRow => {
  const listPrice = line.unit_price - line.extra_unit_amount
  const rowKind: EditorRowKind = line.is_winga ? 'brk' : line.product_id ? 'product' : 'typed'
  return {
    ...blankRow(rowKind),
    productId: line.product_id,
    description: line.description,
    unit: line.unit,
    quantityText: String(line.quantity),
    listPrice: rowKind === 'product' ? listPrice : null,
    priceText: rowKind === 'product' ? '' : minorToInputText(listPrice),
    extra: amountEach(line.extra_unit_amount, 1),
    discount: amountEach(line.discount_amount, line.quantity),
    shareText: line.winga_share ? minorToInputText(line.winga_share) : '',
  }
}

const fillFrom = (invoice: Invoice) => {
  kind.value = invoice.kind
  customer.value = invoice.party.type === 'customer' ? { id: invoice.party.id, name: invoice.party.name, phone: invoice.party.phone } : null
  supplierId.value = invoice.party.type === 'supplier' ? invoice.party.id : ''
  issueDate.value = invoice.issue_date
  dueDate.value = invoice.due_date ?? ''
  reference.value = invoice.reference ?? ''
  notes.value = invoice.notes ?? ''
  terms.value = invoice.terms ?? ''
  rows.value = (invoice.lines ?? []).map(rowFromLine)
}

const fillFromOrder = (order: Order) => {
  if (isSupplierBill.value) kind.value = 'invoice'
  customer.value = { id: order.customer_id, name: order.customer_name, phone: order.customer_phone }
  if (!reference.value.trim()) reference.value = order.number
  if (!notes.value.trim() && order.note) notes.value = order.note
  const orderRows: EditorRow[] = order.lines.map(orderLine => ({
    ...blankRow('product'),
    productId: orderLine.product_id,
    description: [orderLine.product_name, orderLine.variant_label].filter(Boolean).join(' · '),
    unit: orderLine.unit,
    quantityText: String(orderLine.quantity),
    listPrice: orderLine.unit_price - orderLine.extra_unit_amount,
    extra: amountEach(orderLine.extra_unit_amount, 1),
    discount: canDiscount.value ? amountEach(orderLine.discount_amount, orderLine.quantity) : null,
  }))
  const brkRows: EditorRow[] = (order.winga_lines ?? []).map(wingaLine => ({
    ...blankRow('brk'),
    description: wingaLine.name,
    quantityText: String(wingaLine.quantity),
    priceText: minorToInputText(wingaLine.unit_price),
    shareText: wingaLine.winga_share ? minorToInputText(wingaLine.winga_share) : '',
  }))
  rows.value = [...orderRows, ...brkRows]
  toast.success(t('invoices.fromOrder.filled', { number: order.number }))
  if (!canDiscount.value && order.lines.some(orderLine => orderLine.discount_amount > 0)) {
    toast.warning(t('invoices.fromOrder.discountsDropped'))
  }
}

const refreshPreview = async () => {
  if (!savedInvoice.value) return
  previewLoading.value = true
  try {
    previewBytes.value = await fetchInvoicePdfBytes(savedInvoice.value.id)
  } catch {
    previewBytes.value = null
  } finally {
    previewLoading.value = false
  }
}

watch(open, async isOpen => {
  if (!isOpen) return
  if (suppliersOn.value) activeSupplierOptions().then(options => suppliers.value = options)
  savedInvoice.value = props.invoice ?? null
  previewBytes.value = null
  if (props.invoice) {
    fillFrom(props.invoice)
    refreshPreview()
    return
  }
  kind.value = props.presetKind ?? kindChoices.value[0] ?? 'invoice'
  customer.value = props.presetCustomer ?? null
  supplierId.value = props.presetSupplierId ?? ''
  issueDate.value = todayText()
  dueDate.value = ''
  reference.value = ''
  notes.value = ''
  terms.value = ''
  rows.value = []
})

const addProduct = (level: StockLevel) => {
  rows.value.push({
    ...blankRow('product'),
    productId: level.product_id,
    inStock: level.quantity,
    description: productLabel(level),
    unit: level.unit,
    listPrice: level.price,
  })
}

const addTypedLine = () => {
  rows.value.push(blankRow('typed'))
}

const addBrkLine = (wingaLine: WingaLineInput) => {
  rows.value.push({
    ...blankRow('brk'),
    description: wingaLine.name,
    quantityText: String(wingaLine.quantity),
    priceText: minorToInputText(wingaLine.unit_price),
    shareText: wingaLine.winga_share ? minorToInputText(wingaLine.winga_share) : '',
  })
}

const validLines = (): InvoiceLineInput[] | null => {
  if (isSupplierBill.value && !supplierId.value) {
    toast.error(t('invoices.editor.errors.chooseSupplier'))
    return null
  }
  if (!isSupplierBill.value && !customer.value) {
    toast.error(t('invoices.editor.errors.chooseCustomer'))
    return null
  }
  if (!rows.value.length) {
    toast.error(t('invoices.editor.errors.noLines'))
    return null
  }
  const lines: InvoiceLineInput[] = []
  for (const [rowIndex, row] of rows.value.entries()) {
    const lineNumber = rowIndex + 1
    const description = row.description.trim()
    if (!description) {
      toast.error(t('invoices.editor.errors.noDescription', { line: lineNumber }))
      return null
    }
    const quantity = rowQuantity(row)
    if (quantity == null) {
      toast.error(t('invoices.editor.errors.badQuantity', { line: lineNumber }))
      return null
    }
    const typedPrice = isDeliveryNote.value ? (rowPrice(row) ?? 0) : rowPrice(row)
    if (row.kind !== 'product' && typedPrice == null) {
      toast.error(t('invoices.editor.errors.badPrice', { line: lineNumber }))
      return null
    }
    if (row.kind === 'brk' && rowShare(row) > rowTotal(row)) {
      toast.error(t('invoices.editor.errors.badShare', { line: lineNumber }))
      return null
    }
    lines.push({
      product_id: row.productId ?? undefined,
      description,
      unit: row.unit.trim(),
      quantity,
      unit_price: row.kind === 'product' ? undefined : typedPrice!,
      discount: isDeliveryNote.value || row.kind === 'brk' ? undefined : row.discount ?? undefined,
      extra: isDeliveryNote.value || row.kind === 'brk' ? undefined : row.extra ?? undefined,
      is_winga: row.kind === 'brk' || undefined,
      winga_share: row.kind === 'brk' ? rowShare(row) : undefined,
    })
  }
  if (dueDate.value && issueDate.value && dueDate.value < issueDate.value) {
    toast.error(t('invoices.editor.errors.dueBeforeIssue'))
    return null
  }
  return lines
}

const takeServerPrices = (saved: Invoice) => {
  rows.value.forEach((row, rowIndex) => {
    const savedLine = saved.lines?.[rowIndex]
    if (row.kind === 'product' && savedLine) row.listPrice = savedLine.unit_price - savedLine.extra_unit_amount
  })
}

const save = async (thenIssue: boolean) => {
  const lines = validLines()
  if (!lines) return
  const fields: InvoiceFields = {
    kind: kind.value,
    customer_id: isSupplierBill.value ? undefined : customer.value!.id,
    supplier_id: isSupplierBill.value ? supplierId.value : undefined,
    issue_date: issueDate.value || undefined,
    due_date: isDeliveryNote.value ? undefined : dueDate.value || undefined,
    reference: reference.value.trim() || undefined,
    notes: notes.value.trim() || undefined,
    terms: isEditing.value ? terms.value.trim() : terms.value.trim() || undefined,
    lines,
  }
  try {
    const existingInvoice = savedInvoice.value
    const saved = existingInvoice ? await updateInvoice(existingInvoice.id, fields) : await createInvoice(fields)
    savedInvoice.value = saved
    terms.value = saved.terms ?? ''
    dueDate.value = saved.due_date ?? ''
    takeServerPrices(saved)
    emit('saved', saved)
    if (thenIssue) {
      const issued = await issueInvoice(saved.id)
      emit('issued', issued)
      open.value = false
      return
    }
    await refreshPreview()
  } catch {
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-h-[95dvh] overflow-y-auto sm:max-w-6xl">
      <DialogHeader>
        <DialogTitle>
          {{ savedInvoice ? t('invoices.editor.editTitle', { kind: t(`invoices.kind.${kind}`), number: savedInvoice.number }) : t('invoices.editor.newTitle', { kind: t(`invoices.kind.${kind}`) }) }}
        </DialogTitle>
        <DialogDescription>{{ t(`invoices.editor.help.${kind}`) }}</DialogDescription>
      </DialogHeader>

      <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <form class="flex min-w-0 flex-col gap-5" @submit.prevent="save(false)">
          <div v-if="!savedInvoice && kindChoices.length > 1" class="grid grid-cols-2 gap-2" :class="kindChoices.length > 4 ? 'sm:grid-cols-5' : 'sm:grid-cols-4'" role="radiogroup" :aria-label="t('invoices.editor.type')">
            <button
              v-for="choice in kindChoices"
              :key="choice"
              type="button"
              role="radio"
              :aria-checked="kind === choice"
              class="rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
              :class="kind === choice ? 'border-primary bg-primary/5 text-primary' : ''"
              @click="kind = choice"
            >
              {{ t(`invoices.kind.${choice}`) }}
            </button>
          </div>

          <button
            v-if="canFillFromOrder && !savedInvoice"
            type="button"
            class="group flex items-center gap-3 rounded-lg border border-dashed border-primary/40 bg-primary/[0.03] px-3 py-2.5 text-left transition-colors hover:border-primary hover:bg-primary/5"
            @click="showOrderPicker = true"
          >
            <span class="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary transition-transform group-hover:scale-105">
              <ClipboardList class="size-4.5" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block text-sm font-medium">{{ t('invoices.fromOrder.button') }}</span>
              <span class="block text-xs text-muted-foreground">{{ t('invoices.fromOrder.buttonHint') }}</span>
            </span>
          </button>

          <div v-if="isSupplierBill" class="flex flex-col gap-1.5">
            <Label for="invoice-supplier">{{ t(partyLabelKey) }}</Label>
            <Select v-model="supplierId">
              <SelectTrigger id="invoice-supplier" class="w-full">
                <Truck class="size-4 text-muted-foreground" />
                <SelectValue :placeholder="t('invoices.editor.chooseSupplier')" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="supplier in suppliers" :key="supplier.id" :value="supplier.id">{{ supplier.name }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div v-else class="flex flex-col gap-1.5">
            <Label>{{ t(partyLabelKey) }}</Label>
            <button
              type="button"
              class="flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm hover:bg-accent"
              :class="customer ? '' : 'border-dashed text-muted-foreground'"
              @click="showCustomerPicker = true"
            >
              <UserRound v-if="customer" class="size-4 shrink-0" />
              <UserPlus v-else class="size-4 shrink-0" />
              <span class="min-w-0 flex-1 truncate">{{ customer ? customer.name : t('invoices.editor.chooseCustomer') }}</span>
              <span v-if="customer?.phone" class="text-xs tabular-nums text-muted-foreground">{{ customer.phone }}</span>
            </button>
          </div>

          <div class="grid gap-4 sm:grid-cols-3">
            <div class="flex flex-col gap-1.5">
              <Label for="invoice-issue-date">{{ t('invoices.fields.issueDate') }}</Label>
              <Input id="invoice-issue-date" v-model="issueDate" type="date" />
            </div>
            <div v-if="!isDeliveryNote" class="flex flex-col gap-1.5">
              <Label for="invoice-due-date">{{ t(isOfferKind ? 'invoices.fields.validUntil' : 'invoices.fields.dueDate') }}</Label>
              <Input id="invoice-due-date" v-model="dueDate" type="date" :min="issueDate || undefined" />
              <p v-if="!dueDate" class="text-xs text-muted-foreground">{{ t('invoices.editor.dueDefault') }}</p>
            </div>
            <div class="flex flex-col gap-1.5">
              <Label for="invoice-reference">{{ t('invoices.fields.reference') }}</Label>
              <Input id="invoice-reference" v-model="reference" maxlength="60" :placeholder="t('invoices.editor.referencePlaceholder')" />
            </div>
          </div>

          <Separator />

          <div class="flex flex-col gap-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <Label>{{ t('invoices.fields.lines') }}</Label>
              <div class="flex flex-wrap gap-2">
                <Button v-if="canAddBrk" type="button" variant="outline" size="sm" class="border-amber-500/40 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400" @click="showBrkDialog = true">
                  <Handshake />{{ t('pos.winga.addLine') }}
                </Button>
                <Button type="button" variant="outline" size="sm" @click="addTypedLine"><Plus />{{ t('invoices.editor.addTypedLine') }}</Button>
              </div>
            </div>
            <StockProductSearch :exclude-ids="chosenProductIds" :placeholder="t('invoices.editor.searchPlaceholder')" @pick="addProduct" />
            <p v-if="rows.some(row => row.kind === 'product') && !isDeliveryNote" class="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock class="size-3" />{{ t('invoices.editor.pricesLocked') }}
            </p>

            <p v-if="!rows.length" class="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">{{ t('invoices.editor.noLinesYet') }}</p>

            <TransitionGroup
              tag="div"
              class="flex flex-col gap-3"
              enter-active-class="transition duration-200 ease-out"
              enter-from-class="translate-y-1 opacity-0"
              leave-active-class="transition duration-150 ease-in"
              leave-to-class="opacity-0"
            >
              <div
                v-for="(row, rowIndex) in rows"
                :key="row.key"
                class="flex flex-col gap-2 rounded-lg border p-3"
                :class="row.kind === 'brk' ? 'border-amber-500/40 bg-amber-500/[0.04]' : ''"
              >
                <div class="flex items-start gap-2">
                  <span class="mt-2 w-5 shrink-0 text-xs tabular-nums text-muted-foreground">{{ rowIndex + 1 }}</span>
                  <div class="min-w-0 flex-1">
                    <Input v-model="row.description" maxlength="300" :placeholder="t('invoices.editor.descriptionPlaceholder')" :aria-label="t('invoices.fields.description')" />
                    <p class="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Badge v-if="row.kind === 'brk'" variant="outline" class="border-amber-500/40 px-1.5 py-0 font-normal text-amber-700 dark:text-amber-400">{{ t('pos.winga.badge') }}</Badge>
                      <template v-if="row.kind === 'product'">{{ row.inStock == null ? t('invoices.editor.fromProduct') : t('invoices.editor.inShop', { quantity: row.inStock, unit: row.unit }) }}</template>
                      <template v-else-if="row.kind === 'brk'">{{ t('invoices.editor.brkHint') }}</template>
                    </p>
                  </div>
                  <Button type="button" variant="ghost" size="icon" :aria-label="t('invoices.editor.removeLine', { line: rowIndex + 1 })" @click="rows.splice(rowIndex, 1)">
                    <Trash2 class="text-destructive" />
                  </Button>
                </div>
                <div class="grid grid-cols-2 gap-2 pl-7 sm:grid-cols-[5rem_6rem_minmax(0,1fr)_auto]">
                  <div class="flex flex-col gap-1">
                    <Label :for="`line-quantity-${row.key}`" class="text-xs text-muted-foreground">{{ t('invoices.fields.quantity') }}</Label>
                    <Input :id="`line-quantity-${row.key}`" v-model="row.quantityText" inputmode="numeric" />
                  </div>
                  <div class="flex flex-col gap-1">
                    <Label :for="`line-unit-${row.key}`" class="text-xs text-muted-foreground">{{ t('invoices.fields.unit') }}</Label>
                    <Input :id="`line-unit-${row.key}`" v-model="row.unit" maxlength="20" placeholder="pcs" />
                  </div>
                  <div v-if="!isDeliveryNote" class="flex flex-col gap-1">
                    <Label :for="`line-price-${row.key}`" class="text-xs text-muted-foreground">{{ t('invoices.fields.unitPrice') }}</Label>
                    <div
                      v-if="row.kind === 'product'"
                      :id="`line-price-${row.key}`"
                      class="flex h-9 items-center gap-2 rounded-md border border-dashed bg-muted/50 px-3 text-sm tabular-nums"
                      :title="t('invoices.editor.pricesLocked')"
                    >
                      <Lock class="size-3.5 shrink-0 text-muted-foreground" />
                      <span class="min-w-0 flex-1 truncate">{{ formatMoney(row.listPrice ?? 0) }}</span>
                      <span v-if="extraEach(row)" class="shrink-0 text-xs text-sky-700 dark:text-sky-400">+{{ formatMoney(extraEach(row)) }}</span>
                    </div>
                    <MoneyInput v-else :id="`line-price-${row.key}`" v-model="row.priceText" placeholder="0" />
                  </div>
                  <div v-if="!isDeliveryNote" class="col-span-2 flex items-end justify-end sm:col-span-1">
                    <p class="flex flex-col items-end text-sm font-semibold tabular-nums sm:pb-2">
                      <span v-if="rowDiscount(row)" class="text-xs font-normal text-muted-foreground line-through">{{ formatMoney(rowGross(row)) }}</span>
                      {{ formatMoney(rowTotal(row)) }}
                    </p>
                  </div>
                </div>
                <div v-if="!isDeliveryNote" class="flex flex-wrap items-center gap-1.5 pl-7">
                  <template v-if="row.kind !== 'brk'">
                    <LineDiscountPopover
                      v-if="canDiscount"
                      :product-name="row.description || t('invoices.editor.lineNumber', { line: rowIndex + 1 })"
                      :manual-discount="row.discount"
                      :item-price="priceEach(row)"
                      :quantity="rowQuantity(row) ?? 0"
                      @apply="manualDiscount => row.discount = manualDiscount"
                    />
                    <LineExtraPopover
                      :product-name="row.description || t('invoices.editor.lineNumber', { line: rowIndex + 1 })"
                      :extra="row.extra"
                      :list-unit-price="listPriceOf(row)"
                      :quantity="rowQuantity(row) ?? 0"
                      @apply="extra => row.extra = extra"
                    />
                  </template>
                  <div v-else class="flex items-center gap-2">
                    <Label :for="`line-share-${row.key}`" class="shrink-0 text-xs text-muted-foreground">{{ t('pos.winga.share') }}</Label>
                    <MoneyInput :id="`line-share-${row.key}`" v-model="row.shareText" class="h-8 max-w-36" placeholder="0" />
                  </div>
                </div>
              </div>
            </TransitionGroup>
            <WingaLineDialog v-if="canAddBrk" v-model:open="showBrkDialog" @add="addBrkLine" />

            <div v-if="rows.length && !isDeliveryNote" class="ml-auto flex w-full max-w-xs flex-col gap-1 rounded-lg bg-muted/60 px-4 py-3 text-sm">
              <div v-if="discountTotal > 0" class="flex justify-between text-muted-foreground"><span>{{ t('invoices.fields.subtotal') }}</span><span class="tabular-nums">{{ formatMoney(subtotal) }}</span></div>
              <div v-if="discountTotal > 0" class="flex justify-between text-muted-foreground"><span>{{ t('invoices.fields.discount') }}</span><span class="tabular-nums">−{{ formatMoney(discountTotal) }}</span></div>
              <div class="flex items-baseline justify-between"><span class="font-medium">{{ t('common.fields.total') }}</span><span class="text-xl font-bold tabular-nums">{{ formatMoney(total) }}</span></div>
              <p v-if="vatOn" class="text-xs text-muted-foreground">{{ t('invoices.editor.pricesIncludeVat') }}</p>
            </div>
          </div>

          <Separator />

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="flex flex-col gap-1.5">
              <Label for="invoice-notes">{{ t('invoices.fields.notes') }}</Label>
              <Textarea id="invoice-notes" v-model="notes" maxlength="1000" class="min-h-20 resize-y" :placeholder="t('invoices.editor.notesPlaceholder')" />
            </div>
            <div v-if="!isDeliveryNote" class="flex flex-col gap-1.5">
              <Label for="invoice-terms">{{ t('invoices.fields.terms') }}</Label>
              <Textarea id="invoice-terms" v-model="terms" maxlength="1000" class="min-h-20 resize-y" :placeholder="t(savedInvoice ? 'invoices.editor.termsPlaceholder' : 'invoices.editor.termsDefaultPlaceholder')" />
            </div>
          </div>

          <div class="sticky bottom-0 -mx-1 flex flex-wrap justify-end gap-2 bg-background px-1 py-2">
            <Button type="button" variant="outline" @click="open = false">{{ savedInvoice ? t('invoices.editor.close') : t('common.actions.cancel') }}</Button>
            <Button type="submit" variant="secondary" :disabled="saving">{{ saving ? t('common.actions.saving') : t('invoices.editor.saveDraft') }}</Button>
            <Button type="button" :disabled="saving" @click="save(true)">{{ t('invoices.editor.saveAndIssue') }}</Button>
          </div>
        </form>

        <aside class="hidden min-w-0 flex-col gap-2 lg:flex">
          <p class="text-sm font-medium">{{ t('invoices.preview.title') }}</p>
          <div class="max-h-[75dvh] overflow-y-auto rounded-lg bg-muted/40 p-3">
            <InvoicePdfPreview :pdf-bytes="previewBytes" :loading="previewLoading" />
          </div>
        </aside>
      </div>

      <CustomerPicker v-model:open="showCustomerPicker" @pick="picked => customer = { id: picked.id, name: picked.name, phone: picked.phone }" />
      <OrderPickerDialog v-if="canFillFromOrder" v-model:open="showOrderPicker" @pick="fillFromOrder" />
    </DialogContent>
  </Dialog>
</template>
