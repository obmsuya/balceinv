<script setup lang="ts">
import { Percent, Plus, Trash2, Truck, UserPlus, UserRound } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
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
import type { Invoice, InvoiceFields, InvoiceKind, InvoiceLineInput } from '@/composables/useInvoices'
import { availableInvoiceKinds } from '@/composables/useInvoices'
import type { Supplier } from '@/composables/useSuppliers'
import type { StockLevel } from '@/composables/useStock'
import { productLabel } from '@/composables/useStock'
import { formatMoney, inputTextToMinor, minorToInputText } from '~/utils/money'

interface EditorCustomer {
  id: string
  name: string
  phone: string | null
}

interface EditorRow {
  key: number
  productId: string | null
  inStock: number | null
  description: string
  unit: string
  quantityText: string
  priceText: string
  discountText: string
  showDiscount: boolean
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
const { vatOn, customersOn, suppliersOn } = useFeatures()
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
let nextRowKey = 1

const isEditing = computed(() => savedInvoice.value != null)
const isDeliveryNote = computed(() => kind.value === 'delivery_note')
const isOfferKind = computed(() => kind.value === 'quotation' || kind.value === 'proforma')
const isSupplierBill = computed(() => kind.value === 'supplier_invoice')
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
const rowDiscount = (row: EditorRow): number => {
  const discount = inputTextToMinor(row.discountText)
  return discount == null || Number.isNaN(discount) ? 0 : discount
}
const rowGross = (row: EditorRow): number => (rowQuantity(row) ?? 0) * (rowPrice(row) ?? 0)
const rowTotal = (row: EditorRow): number => Math.max(rowGross(row) - rowDiscount(row), 0)

const subtotal = computed(() => rows.value.reduce((sum, row) => sum + rowGross(row), 0))
const discountTotal = computed(() => rows.value.reduce((sum, row) => sum + Math.min(rowDiscount(row), rowGross(row)), 0))
const total = computed(() => subtotal.value - discountTotal.value)

const blankRow = (): EditorRow => ({
  key: nextRowKey++,
  productId: null,
  inStock: null,
  description: '',
  unit: '',
  quantityText: '1',
  priceText: '',
  discountText: '',
  showDiscount: false,
})

const fillFrom = (invoice: Invoice) => {
  kind.value = invoice.kind
  customer.value = invoice.party.type === 'customer' ? { id: invoice.party.id, name: invoice.party.name, phone: invoice.party.phone } : null
  supplierId.value = invoice.party.type === 'supplier' ? invoice.party.id : ''
  issueDate.value = invoice.issue_date
  dueDate.value = invoice.due_date ?? ''
  reference.value = invoice.reference ?? ''
  notes.value = invoice.notes ?? ''
  terms.value = invoice.terms ?? ''
  rows.value = (invoice.lines ?? []).map(line => ({
    key: nextRowKey++,
    productId: line.product_id,
    inStock: null,
    description: line.description,
    unit: line.unit,
    quantityText: String(line.quantity),
    priceText: minorToInputText(line.unit_price),
    discountText: line.discount_amount ? minorToInputText(line.discount_amount) : '',
    showDiscount: line.discount_amount > 0,
  }))
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
    ...blankRow(),
    productId: level.product_id,
    inStock: level.quantity,
    description: productLabel(level),
    unit: level.unit,
    priceText: minorToInputText(level.price),
  })
}

const addTypedLine = () => {
  rows.value.push(blankRow())
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
    const price = isDeliveryNote.value ? (rowPrice(row) ?? 0) : rowPrice(row)
    if (price == null) {
      toast.error(t('invoices.editor.errors.badPrice', { line: lineNumber }))
      return null
    }
    const discount = inputTextToMinor(row.discountText)
    if (Number.isNaN(discount) || (discount ?? 0) > quantity * price) {
      toast.error(t('invoices.editor.errors.badDiscount', { line: lineNumber }))
      return null
    }
    lines.push({
      product_id: row.productId ?? undefined,
      description,
      unit: row.unit.trim(),
      quantity,
      unit_price: price,
      discount_amount: discount ?? 0,
    })
  }
  if (dueDate.value && issueDate.value && dueDate.value < issueDate.value) {
    toast.error(t('invoices.editor.errors.dueBeforeIssue'))
    return null
  }
  return lines
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
              <Button type="button" variant="outline" size="sm" @click="addTypedLine"><Plus />{{ t('invoices.editor.addTypedLine') }}</Button>
            </div>
            <StockProductSearch :exclude-ids="chosenProductIds" :placeholder="t('invoices.editor.searchPlaceholder')" @pick="addProduct" />

            <p v-if="!rows.length" class="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">{{ t('invoices.editor.noLinesYet') }}</p>

            <div v-for="(row, rowIndex) in rows" :key="row.key" class="flex flex-col gap-2 rounded-lg border p-3">
              <div class="flex items-start gap-2">
                <span class="mt-2 w-5 shrink-0 text-xs tabular-nums text-muted-foreground">{{ rowIndex + 1 }}</span>
                <div class="min-w-0 flex-1">
                  <Input v-model="row.description" maxlength="300" :placeholder="t('invoices.editor.descriptionPlaceholder')" :aria-label="t('invoices.fields.description')" />
                  <p v-if="row.productId" class="mt-1 text-xs text-muted-foreground">
                    {{ row.inStock == null ? t('invoices.editor.fromProduct') : t('invoices.editor.inShop', { quantity: row.inStock, unit: row.unit }) }}
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
                  <MoneyInput :id="`line-price-${row.key}`" v-model="row.priceText" placeholder="0" />
                </div>
                <div v-if="!isDeliveryNote" class="col-span-2 flex items-end justify-between gap-2 sm:col-span-1 sm:flex-col sm:items-end">
                  <Button v-if="!row.showDiscount" type="button" variant="ghost" size="sm" class="h-8 px-2 text-xs" @click="row.showDiscount = true">
                    <Percent class="size-3.5" />{{ t('invoices.editor.addDiscount') }}
                  </Button>
                  <p class="text-sm font-semibold tabular-nums sm:pb-2">{{ formatMoney(rowTotal(row)) }}</p>
                </div>
              </div>
              <div v-if="row.showDiscount && !isDeliveryNote" class="flex items-center gap-2 pl-7">
                <Label :for="`line-discount-${row.key}`" class="shrink-0 text-xs text-muted-foreground">{{ t('invoices.fields.discount') }}</Label>
                <MoneyInput :id="`line-discount-${row.key}`" v-model="row.discountText" class="max-w-40" placeholder="0" />
              </div>
            </div>

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
    </DialogContent>
  </Dialog>
</template>
