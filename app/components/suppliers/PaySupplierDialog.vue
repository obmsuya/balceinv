<script setup lang="ts">
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { PaymentMethod, Supplier } from '@/composables/useSuppliers'
import { dateToMoment, localDateText, paymentMethods } from '@/composables/useSuppliers'
import { currencyCode, formatMoney, inputTextToMinor, minorToInputText } from '~/utils/money'

const props = defineProps<{ supplier?: Supplier | null }>()
const emit = defineEmits<{ paid: [] }>()

const open = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
const { activeSupplierOptions, paySupplier, saving } = useSuppliers()

const suppliers = ref<Supplier[]>([])
const supplierId = ref('')
const amountText = ref('')
const method = ref<PaymentMethod>('cash')
const reference = ref('')
const paidOn = ref(localDateText())

const chosenSupplier = computed(() => props.supplier ?? suppliers.value.find(supplier => supplier.id === supplierId.value) ?? null)

watch(open, async isOpen => {
  if (!isOpen) return
  supplierId.value = props.supplier?.id ?? ''
  amountText.value = ''
  method.value = 'cash'
  reference.value = ''
  paidOn.value = localDateText()
  if (!props.supplier) suppliers.value = (await activeSupplierOptions()).filter(supplier => supplier.balance > 0)
})

const submit = async () => {
  if (!chosenSupplier.value) {
    toast.error(t('suppliers.payments.errors.chooseSupplier'))
    return
  }
  const amount = inputTextToMinor(amountText.value)
  if (amount == null || Number.isNaN(amount) || amount <= 0) {
    toast.error(t('suppliers.payments.errors.badAmount'))
    return
  }
  if (amount > chosenSupplier.value.balance) {
    toast.error(t('suppliers.payments.errors.tooMuch', { amount: formatMoney(Math.max(chosenSupplier.value.balance, 0)) }))
    return
  }
  try {
    await paySupplier({
      supplier_id: chosenSupplier.value.id,
      purchase_id: null,
      amount,
      method: method.value,
      reference: reference.value.trim() || null,
      paid_at: dateToMoment(paidOn.value),
    })
    emit('paid')
    open.value = false
  } catch {
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ t('suppliers.payments.payTitle') }}</DialogTitle>
        <DialogDescription>{{ t('suppliers.payments.payDescription') }}</DialogDescription>
      </DialogHeader>

      <div class="flex flex-col gap-4">
        <div v-if="!supplier" class="flex flex-col gap-1.5">
          <Label>{{ t('suppliers.arrived.supplier') }}</Label>
          <Select v-model="supplierId">
            <SelectTrigger class="w-full" :aria-label="t('suppliers.arrived.supplier')">
              <SelectValue :placeholder="t('suppliers.payments.chooseSupplier')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="option in suppliers" :key="option.id" :value="option.id">{{ option.name }}</SelectItem>
            </SelectContent>
          </Select>
          <p v-if="!suppliers.length" class="text-xs text-muted-foreground">{{ t('suppliers.payments.nobodyOwed') }}</p>
        </div>
        <p v-if="chosenSupplier" class="rounded-md bg-muted/40 px-3 py-2 text-sm">
          {{ chosenSupplier.balance > 0 ? t('suppliers.list.owes', { amount: formatMoney(chosenSupplier.balance) }) : t('suppliers.list.settled') }}
        </p>

        <div class="flex flex-col gap-1.5">
          <Label for="pay-amount">{{ t('suppliers.payments.amount', { currency: currencyCode() }) }}</Label>
          <Input id="pay-amount" v-model="amountText" inputmode="decimal" />
          <Button v-if="chosenSupplier && chosenSupplier.balance > 0" variant="outline" size="sm" type="button" class="self-start" @click="amountText = minorToInputText(chosenSupplier.balance)">
            {{ t('suppliers.payments.payAll') }}
          </Button>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <Label>{{ t('suppliers.payments.method') }}</Label>
            <Select v-model="method">
              <SelectTrigger class="w-full" :aria-label="t('suppliers.payments.method')">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="paymentMethod in paymentMethods" :key="paymentMethod" :value="paymentMethod">{{ t(`suppliers.methods.${paymentMethod}`) }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="flex flex-col gap-1.5">
            <Label for="pay-date">{{ t('suppliers.payments.paidOn') }}</Label>
            <Input id="pay-date" v-model="paidOn" type="date" :max="localDateText()" />
          </div>
        </div>
        <div class="flex flex-col gap-1.5">
          <Label for="pay-reference">{{ t('suppliers.payments.reference') }}</Label>
          <Input id="pay-reference" v-model="reference" :placeholder="t('suppliers.payments.referencePlaceholder')" maxlength="100" />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="open = false">{{ t('common.actions.cancel') }}</Button>
        <Button :disabled="saving" @click="submit">{{ t('suppliers.payments.pay') }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
