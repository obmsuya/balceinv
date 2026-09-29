<script setup lang="ts">
import { ImageUp, Smartphone, Trash2, X } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import PhonePhotoDialog from '@/components/products/PhonePhotoDialog.vue'
import StockProductSearch from '@/components/stock/StockProductSearch.vue'
import type { StockLevel } from '@/composables/useStock'
import { productLabel } from '@/composables/useStock'
import { productImageLimitBytes } from '@/composables/useProducts'
import { randomReference } from '@/composables/useCart'
import type { InvoiceVat, PaymentMethod, Purchase, PurchaseOrder, Supplier } from '@/composables/useSuppliers'
import { dateToMoment, localDateText, paymentMethods } from '@/composables/useSuppliers'
import { currencyCode, formatMoney, inputTextToMinor, minorToInputText } from '~/utils/money'

interface ArrivedRow {
  productId: string
  label: string
  sku: string
  unit: string
  currentCost: number
  lastPaid: number | null
  quantityText: string
  costText: string
}

const noSupplier = 'none'
const basisPoints = 10000

const props = defineProps<{ supplierId?: string | null; order?: PurchaseOrder | null }>()
const emit = defineEmits<{ saved: [purchase: Purchase] }>()

const open = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
const { user } = useAuth()
const { suppliersOn, vatOn } = useFeatures()
const { activeSupplierOptions, lastCost, vatRate, recordPurchase, saving } = useSuppliers()

const suppliers = ref<Supplier[]>([])
const clientRef = ref('')
const supplierChoice = ref(noSupplier)
const shopId = ref('')
const invoiceNumber = ref('')
const invoiceDate = ref('')
const arrivedOn = ref(localDateText())
const rows = ref<ArrivedRow[]>([])
const vatChoice = ref<InvoiceVat>('none')
const taxRate = ref(0)
const paidText = ref('')
const paymentMethod = ref<PaymentMethod>('cash')
const paymentReference = ref('')
const note = ref('')
const photoFile = ref<File | null>(null)
const photoPreview = ref<string | null>(null)
const photoInput = ref<HTMLInputElement | null>(null)
const showPhonePhoto = ref(false)

const hasSupplier = computed(() => supplierChoice.value !== noSupplier)
const shops = computed(() => user.value?.shops ?? [])
const chosenProductIds = computed(() => rows.value.map(row => row.productId))
const isOrderLocked = computed(() => props.order != null)
const vatChoices = computed<Array<{ value: InvoiceVat; label: string }>>(() => [
  { value: 'none', label: t('suppliers.arrived.vatNone') },
  { value: 'included', label: t('suppliers.arrived.vatIncluded') },
  { value: 'added', label: t('suppliers.arrived.vatAdded') },
])

const clearPhoto = () => {
  if (photoPreview.value) URL.revokeObjectURL(photoPreview.value)
  photoPreview.value = null
  photoFile.value = null
  if (photoInput.value) photoInput.value.value = ''
}

const usePhoto = (pickedFile: File) => {
  if (pickedFile.size > productImageLimitBytes) {
    toast.error(t('suppliers.arrived.photoTooBig'))
    return
  }
  clearPhoto()
  photoFile.value = pickedFile
  photoPreview.value = URL.createObjectURL(pickedFile)
}

const onPhotoPicked = (event: Event) => {
  const pickedFile = (event.target as HTMLInputElement).files?.[0]
  if (pickedFile) usePhoto(pickedFile)
}

watch(open, async isOpen => {
  if (!isOpen) {
    clearPhoto()
    return
  }
  clientRef.value = randomReference()
  supplierChoice.value = props.order?.supplier_id ?? props.supplierId ?? noSupplier
  shopId.value = props.order?.shop_id ?? user.value?.shop_id ?? ''
  invoiceNumber.value = ''
  invoiceDate.value = ''
  arrivedOn.value = localDateText()
  vatChoice.value = vatOn.value ? 'included' : 'none'
  paidText.value = ''
  paymentMethod.value = 'cash'
  paymentReference.value = ''
  note.value = ''
  rows.value = (props.order?.lines ?? [])
    .filter(orderLine => orderLine.quantity_remaining > 0)
    .map(orderLine => ({
      productId: orderLine.product_id,
      label: productLabel(orderLine),
      sku: orderLine.sku,
      unit: orderLine.unit,
      currentCost: orderLine.cost_price,
      lastPaid: null,
      quantityText: String(orderLine.quantity_remaining),
      costText: minorToInputText(orderLine.expected_unit_cost || orderLine.cost_price),
    }))
  suppliers.value = suppliersOn.value ? await activeSupplierOptions() : []
  taxRate.value = vatOn.value ? await vatRate() : 0
})

const addRow = async (level: StockLevel) => {
  const newRow: ArrivedRow = {
    productId: level.product_id,
    label: productLabel(level),
    sku: level.sku,
    unit: level.unit,
    currentCost: level.cost_price,
    lastPaid: null,
    quantityText: '1',
    costText: level.cost_price ? minorToInputText(level.cost_price) : '',
  }
  rows.value.push(newRow)
  const rememberedCost = await lastCost(level.product_id, hasSupplier.value ? supplierChoice.value : null)
  const addedRow = rows.value.find(row => row.productId === level.product_id)
  if (!addedRow || rememberedCost == null) return
  addedRow.lastPaid = rememberedCost
  addedRow.costText = minorToInputText(rememberedCost)
}

const rowQuantity = (row: ArrivedRow): number | null => {
  const parsedQuantity = Number(row.quantityText.trim())
  return Number.isInteger(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : null
}

const rowCost = (row: ArrivedRow): number | null => {
  const unitCost = inputTextToMinor(row.costText)
  return unitCost == null || Number.isNaN(unitCost) ? null : unitCost
}

const lineAmounts = (row: ArrivedRow) => {
  const gross = (rowQuantity(row) ?? 0) * (rowCost(row) ?? 0)
  if (vatChoice.value === 'none' || taxRate.value <= 0) return { vat: 0, total: gross }
  if (vatChoice.value === 'included') return { vat: Math.round((gross * taxRate.value) / (basisPoints + taxRate.value)), total: gross }
  const addedVat = Math.round((gross * taxRate.value) / basisPoints)
  return { vat: addedVat, total: gross + addedVat }
}

const totals = computed(() => {
  const summed = rows.value.map(lineAmounts).reduce((running, amounts) => ({ vat: running.vat + amounts.vat, total: running.total + amounts.total }), { vat: 0, total: 0 })
  return { subtotal: summed.total - summed.vat, vat: summed.vat, total: summed.total }
})

const paidNow = computed(() => (hasSupplier.value ? inputTextToMinor(paidText.value) ?? 0 : totals.value.total))

const submit = async () => {
  if (!rows.value.length) {
    toast.error(t('suppliers.arrived.errors.noProducts'))
    return
  }
  const badRow = rows.value.find(row => rowQuantity(row) == null || rowCost(row) == null)
  if (badRow) {
    toast.error(t('suppliers.arrived.errors.badLine', { product: badRow.label }))
    return
  }
  if (Number.isNaN(paidNow.value) || paidNow.value > totals.value.total) {
    toast.error(t('suppliers.arrived.errors.badPaid'))
    return
  }
  try {
    const savedPurchase = await recordPurchase({
      client_ref: clientRef.value,
      supplier_id: hasSupplier.value ? supplierChoice.value : null,
      shop_id: shopId.value || null,
      purchase_order_id: props.order?.id ?? null,
      supplier_invoice_number: invoiceNumber.value.trim() || null,
      invoice_date: invoiceDate.value || null,
      received_at: dateToMoment(arrivedOn.value),
      invoice_has_vat: vatChoice.value !== 'none',
      prices_include_vat: vatChoice.value === 'included',
      amount_paid: paidNow.value,
      payment_method: paymentMethod.value,
      payment_reference: paymentReference.value.trim() || null,
      note: note.value.trim() || null,
      lines: rows.value.map(row => ({ product_id: row.productId, quantity: rowQuantity(row)!, unit_cost: rowCost(row)! })),
    }, photoFile.value)
    emit('saved', savedPurchase)
    open.value = false
  } catch {
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{{ order ? t('suppliers.arrived.receiveTitle', { number: order.order_number }) : t('suppliers.arrived.title') }}</DialogTitle>
        <DialogDescription>{{ t('suppliers.arrived.description') }}</DialogDescription>
      </DialogHeader>

      <div class="flex flex-col gap-4">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div v-if="suppliersOn" class="flex flex-col gap-1.5">
            <Label>{{ t('suppliers.arrived.supplier') }}</Label>
            <Select v-model="supplierChoice" :disabled="isOrderLocked">
              <SelectTrigger class="w-full" :aria-label="t('suppliers.arrived.supplier')">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="noSupplier">{{ t('suppliers.arrived.noSupplier') }}</SelectItem>
                <SelectItem v-for="supplier in suppliers" :key="supplier.id" :value="supplier.id">{{ supplier.name }}</SelectItem>
                <SelectItem v-if="order && !suppliers.some(supplier => supplier.id === order.supplier_id)" :value="order.supplier_id">{{ order.supplier_name }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div v-if="shops.length > 1" class="flex flex-col gap-1.5">
            <Label>{{ t('common.fields.shop') }}</Label>
            <Select v-model="shopId" :disabled="isOrderLocked">
              <SelectTrigger class="w-full" :aria-label="t('common.fields.shop')">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="shop in shops" :key="shop.id" :value="shop.id">{{ shop.name }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="flex flex-col gap-1.5">
            <Label for="arrived-invoice">{{ t('suppliers.arrived.invoiceNumber') }}</Label>
            <Input id="arrived-invoice" v-model="invoiceNumber" maxlength="60" />
          </div>
          <div class="flex flex-col gap-1.5">
            <Label for="arrived-invoice-date">{{ t('suppliers.arrived.invoiceDate') }}</Label>
            <Input id="arrived-invoice-date" v-model="invoiceDate" type="date" :max="localDateText()" />
          </div>
          <div class="flex flex-col gap-1.5">
            <Label for="arrived-on">{{ t('suppliers.arrived.arrivedOn') }}</Label>
            <Input id="arrived-on" v-model="arrivedOn" type="date" :max="localDateText()" />
          </div>
        </div>

        <Separator />

        <div class="flex flex-col gap-1.5">
          <Label>{{ t('suppliers.arrived.products') }}</Label>
          <StockProductSearch :exclude-ids="chosenProductIds" :placeholder="t('suppliers.arrived.searchPlaceholder')" @pick="addRow" />
        </div>

        <div v-for="(row, rowIndex) in rows" :key="row.productId" class="flex flex-col gap-2 rounded-lg border px-3 py-2">
          <div class="flex items-start gap-2">
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium">{{ row.label }}</p>
              <p class="text-xs text-muted-foreground tabular-nums">
                {{ t('suppliers.arrived.costNow', { amount: formatMoney(row.currentCost) }) }}
                <template v-if="row.lastPaid != null"> · {{ t('suppliers.arrived.lastPaid', { amount: formatMoney(row.lastPaid) }) }}</template>
              </p>
            </div>
            <Button variant="ghost" size="icon" :aria-label="t('suppliers.arrived.remove', { product: row.label })" @click="rows.splice(rowIndex, 1)">
              <Trash2 class="text-destructive" />
            </Button>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div class="flex flex-col gap-1">
              <Label :for="`arrived-quantity-${rowIndex}`" class="text-xs text-muted-foreground">{{ t('suppliers.arrived.quantity', { unit: row.unit }) }}</Label>
              <Input :id="`arrived-quantity-${rowIndex}`" v-model="row.quantityText" inputmode="numeric" />
            </div>
            <div class="flex flex-col gap-1">
              <Label :for="`arrived-cost-${rowIndex}`" class="text-xs text-muted-foreground">{{ t('suppliers.arrived.costPerUnit', { currency: currencyCode() }) }}</Label>
              <Input :id="`arrived-cost-${rowIndex}`" v-model="row.costText" inputmode="decimal" />
            </div>
          </div>
        </div>

        <div v-if="vatOn" class="flex flex-col gap-1.5">
          <Label>{{ t('suppliers.arrived.vatQuestion') }}</Label>
          <Select v-model="vatChoice">
            <SelectTrigger class="w-full" :aria-label="t('suppliers.arrived.vatQuestion')">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="choice in vatChoices" :key="choice.value" :value="choice.value">{{ choice.label }}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <dl class="flex flex-col gap-1 rounded-lg bg-muted/40 px-3 py-2 text-sm">
          <div v-if="totals.vat" class="flex justify-between text-muted-foreground"><dt>{{ t('suppliers.arrived.subtotal') }}</dt><dd class="tabular-nums">{{ formatMoney(totals.subtotal) }}</dd></div>
          <div v-if="totals.vat" class="flex justify-between text-muted-foreground"><dt>{{ t('suppliers.arrived.vat') }}</dt><dd class="tabular-nums">{{ formatMoney(totals.vat) }}</dd></div>
          <div class="flex justify-between font-semibold"><dt>{{ t('common.fields.total') }}</dt><dd class="tabular-nums">{{ formatMoney(totals.total) }}</dd></div>
        </dl>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="flex flex-col gap-1.5">
            <Label for="arrived-paid">{{ t('suppliers.arrived.paidNow', { currency: currencyCode() }) }}</Label>
            <Input v-if="hasSupplier" id="arrived-paid" v-model="paidText" inputmode="decimal" placeholder="0" />
            <p v-else class="flex h-9 items-center text-sm font-medium tabular-nums">{{ formatMoney(totals.total) }}</p>
            <p class="text-xs text-muted-foreground">{{ hasSupplier ? t('suppliers.arrived.paidNowHint') : t('suppliers.arrived.mustPayInFull') }}</p>
            <div v-if="hasSupplier" class="flex gap-2">
              <Button variant="outline" size="sm" type="button" @click="paidText = ''">{{ t('suppliers.arrived.payNothing') }}</Button>
              <Button variant="outline" size="sm" type="button" @click="paidText = minorToInputText(totals.total)">{{ t('suppliers.arrived.payAll') }}</Button>
            </div>
          </div>
          <div v-if="paidNow > 0" class="flex flex-col gap-1.5">
            <Label>{{ t('suppliers.payments.method') }}</Label>
            <Select v-model="paymentMethod">
              <SelectTrigger class="w-full" :aria-label="t('suppliers.payments.method')">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="method in paymentMethods" :key="method" :value="method">{{ t(`suppliers.methods.${method}`) }}</SelectItem>
              </SelectContent>
            </Select>
            <Input v-model="paymentReference" :placeholder="t('suppliers.payments.referencePlaceholder')" :aria-label="t('suppliers.payments.reference')" maxlength="100" />
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <Label>{{ t('suppliers.arrived.photo') }}</Label>
          <div class="flex flex-wrap items-center gap-2">
            <img v-if="photoPreview" :src="photoPreview" :alt="t('suppliers.arrived.photo')" class="size-16 rounded-md border object-cover">
            <input ref="photoInput" type="file" accept="image/png,image/jpeg,image/webp" class="hidden" @change="onPhotoPicked">
            <Button variant="outline" size="sm" type="button" @click="photoInput?.click()"><ImageUp /> {{ t('suppliers.arrived.addPhoto') }}</Button>
            <Button variant="outline" size="sm" type="button" @click="showPhonePhoto = true"><Smartphone /> {{ t('products.form.usePhone') }}</Button>
            <Button v-if="photoFile" variant="ghost" size="sm" type="button" @click="clearPhoto"><X /> {{ t('suppliers.arrived.removePhoto') }}</Button>
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <Label for="arrived-note">{{ t('stock.adjust.note') }}</Label>
          <Input id="arrived-note" v-model="note" maxlength="500" />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="open = false">{{ t('common.actions.cancel') }}</Button>
        <Button :disabled="saving" @click="submit">{{ t('suppliers.arrived.save') }}</Button>
      </DialogFooter>
    </DialogContent>
    <PhonePhotoDialog v-model:open="showPhonePhoto" @photo="usePhoto" />
  </Dialog>
</template>
