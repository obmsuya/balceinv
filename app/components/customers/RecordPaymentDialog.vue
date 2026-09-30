<script setup lang="ts">
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import MoneyInput from '@/components/MoneyInput.vue'
import { Label } from '@/components/ui/label'
import PaymentMethodChoice from '@/components/customers/PaymentMethodChoice.vue'
import type { Customer, CustomerPaymentMethod } from '@/composables/useCustomers'
import { currencyCode, formatMoney, inputTextToMinor, minorToInputText } from '~/utils/money'

const props = defineProps<{ customer: Customer }>()
const emit = defineEmits<{ recorded: [] }>()

const open = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
const { recordPayment, saving } = useCustomers()

const amountText = ref('')
const method = ref<CustomerPaymentMethod | null>('cash')
const reference = ref('')

watch(open, isOpen => {
  if (!isOpen) return
  amountText.value = minorToInputText(props.customer.balance)
  method.value = 'cash'
  reference.value = ''
})

const submit = async () => {
  const amount = inputTextToMinor(amountText.value)
  if (amount == null || Number.isNaN(amount) || amount <= 0) {
    toast.error(t('customers.payments.errors.badAmount'))
    return
  }
  if (amount > props.customer.balance) {
    toast.error(t('customers.payments.errors.moreThanOwed', { amount: formatMoney(props.customer.balance) }))
    return
  }
  try {
    await recordPayment(props.customer.id, { amount, method: method.value ?? 'cash', reference: reference.value.trim() || null })
    emit('recorded')
    open.value = false
  } catch {
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ t('customers.payments.recordTitle') }}</DialogTitle>
        <DialogDescription>{{ t('customers.payments.recordDescription', { name: customer.name, amount: formatMoney(customer.balance) }) }}</DialogDescription>
      </DialogHeader>
      <form class="flex flex-col gap-4" @submit.prevent="submit">
        <div class="flex flex-col gap-1.5">
          <Label for="payment-amount">{{ t('customers.payments.amount', { currency: currencyCode() }) }}</Label>
          <MoneyInput id="payment-amount" v-model="amountText" class="h-11 text-lg tabular-nums" />
        </div>
        <div class="flex flex-col gap-1.5">
          <Label>{{ t('customers.payments.howPaid') }}</Label>
          <PaymentMethodChoice v-model="method" />
        </div>
        <div class="flex flex-col gap-1.5">
          <Label for="payment-reference">{{ t('customers.payments.reference') }}</Label>
          <Input id="payment-reference" v-model="reference" maxlength="80" :placeholder="t('customers.payments.referencePlaceholder')" autocomplete="off" />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" @click="open = false">{{ t('common.actions.cancel') }}</Button>
          <Button type="submit" :disabled="saving">{{ saving ? t('common.actions.saving') : t('customers.payments.record') }}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
