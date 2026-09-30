<script setup lang="ts">
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import MoneyInput from '@/components/MoneyInput.vue'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Customer } from '@/composables/useCustomers'
import { currencyCode, inputTextToMinor, minorToInputText } from '~/utils/money'

const props = defineProps<{ customer: Customer | null }>()
const emit = defineEmits<{ saved: [customer: Customer] }>()

const open = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
const { creditSalesOn } = useFeatures()
const { saveCustomer, saving } = useCustomers()

const name = ref('')
const phone = ref('')
const email = ref('')
const address = ref('')
const tin = ref('')
const creditLimitText = ref('')
const openingBalanceText = ref('')
const notes = ref('')

watch(open, isOpen => {
  if (!isOpen) return
  const existing = props.customer
  name.value = existing?.name ?? ''
  phone.value = existing?.phone ?? ''
  email.value = existing?.email ?? ''
  address.value = existing?.address ?? ''
  tin.value = existing?.tin ?? ''
  creditLimitText.value = existing?.credit_limit == null ? '' : minorToInputText(existing.credit_limit)
  openingBalanceText.value = existing?.opening_balance ? minorToInputText(existing.opening_balance) : ''
  notes.value = existing?.notes ?? ''
})

const optionalText = (text: string): string | null => text.trim() || null

const submit = async () => {
  if (!name.value.trim()) {
    toast.error(t('customers.form.errors.nameRequired'))
    return
  }
  const creditLimit = inputTextToMinor(creditLimitText.value)
  if (Number.isNaN(creditLimit)) {
    toast.error(t('customers.form.errors.badCreditLimit'))
    return
  }
  const openingBalance = inputTextToMinor(openingBalanceText.value)
  if (Number.isNaN(openingBalance)) {
    toast.error(t('customers.form.errors.badOpeningBalance'))
    return
  }
  try {
    const savedCustomer = await saveCustomer(props.customer?.id ?? null, {
      name: name.value.trim(),
      phone: optionalText(phone.value),
      email: optionalText(email.value),
      address: optionalText(address.value),
      tin: optionalText(tin.value),
      credit_limit: creditLimit,
      opening_balance: openingBalance ?? 0,
      notes: optionalText(notes.value),
    })
    emit('saved', savedCustomer)
    open.value = false
  } catch {
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{{ customer ? t('customers.form.editTitle') : t('customers.page.newCustomer') }}</DialogTitle>
        <DialogDescription>{{ t('customers.form.description') }}</DialogDescription>
      </DialogHeader>

      <form class="flex flex-col gap-4" @submit.prevent="submit">
        <div class="flex flex-col gap-1.5">
          <Label for="customer-name">{{ t('common.fields.name') }}</Label>
          <Input id="customer-name" v-model="name" maxlength="120" autocomplete="off" />
        </div>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="flex flex-col gap-1.5">
            <Label for="customer-phone">{{ t('common.fields.phone') }}</Label>
            <Input id="customer-phone" v-model="phone" type="tel" inputmode="tel" placeholder="0712 345 678" autocomplete="off" />
          </div>
          <div class="flex flex-col gap-1.5">
            <Label for="customer-email">{{ t('common.fields.email') }}</Label>
            <Input id="customer-email" v-model="email" type="email" autocomplete="off" />
          </div>
        </div>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="flex flex-col gap-1.5">
            <Label for="customer-address">{{ t('common.fields.address') }}</Label>
            <Input id="customer-address" v-model="address" autocomplete="off" />
          </div>
          <div class="flex flex-col gap-1.5">
            <Label for="customer-tin">{{ t('customers.fields.tin') }}</Label>
            <Input id="customer-tin" v-model="tin" autocomplete="off" />
          </div>
        </div>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div v-if="creditSalesOn" class="flex flex-col gap-1.5">
            <Label for="customer-credit-limit">{{ t('customers.fields.creditLimit', { currency: currencyCode() }) }}</Label>
            <MoneyInput id="customer-credit-limit" v-model="creditLimitText" :placeholder="t('customers.form.noLimit')" />
            <p class="text-xs text-muted-foreground">{{ t('customers.form.creditLimitHint') }}</p>
          </div>
          <div class="flex flex-col gap-1.5">
            <Label for="customer-opening-balance">{{ t('customers.fields.openingBalance', { currency: currencyCode() }) }}</Label>
            <MoneyInput id="customer-opening-balance" v-model="openingBalanceText" placeholder="0" />
            <p class="text-xs text-muted-foreground">{{ t('customers.form.openingBalanceHint') }}</p>
          </div>
        </div>
        <div class="flex flex-col gap-1.5">
          <Label for="customer-notes">{{ t('common.fields.notes') }}</Label>
          <Textarea id="customer-notes" v-model="notes" rows="2" class="resize-none" />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" @click="open = false">{{ t('common.actions.cancel') }}</Button>
          <Button type="submit" :disabled="saving">{{ saving ? t('common.actions.saving') : t('common.actions.save') }}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
