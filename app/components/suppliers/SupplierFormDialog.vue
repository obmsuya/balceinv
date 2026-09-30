<script setup lang="ts">
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import MoneyInput from '@/components/MoneyInput.vue'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Supplier } from '@/composables/useSuppliers'
import { currencyCode, inputTextToMinor, minorToInputText } from '~/utils/money'

const props = defineProps<{ supplier: Supplier | null }>()
const emit = defineEmits<{ saved: [supplier: Supplier] }>()

const open = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
const { saveSupplier, saving } = useSuppliers()

const blankForm = () => ({
  name: '',
  contactPerson: '',
  phone: '',
  email: '',
  tin: '',
  vrn: '',
  address: '',
  paymentTermsDays: '0',
  openingBalance: '',
  notes: '',
})

const form = ref(blankForm())

watch(open, isOpen => {
  if (!isOpen) return
  const editing = props.supplier
  form.value = editing
    ? {
        name: editing.name,
        contactPerson: editing.contact_person ?? '',
        phone: editing.phone ?? '',
        email: editing.email ?? '',
        tin: editing.tin ?? '',
        vrn: editing.vrn ?? '',
        address: editing.address ?? '',
        paymentTermsDays: String(editing.payment_terms_days),
        openingBalance: editing.opening_balance ? minorToInputText(editing.opening_balance) : '',
        notes: editing.notes ?? '',
      }
    : blankForm()
})

const optional = (value: string): string | null => value.trim() || null

const submit = async () => {
  if (!form.value.name.trim()) {
    toast.error(t('suppliers.form.errors.nameRequired'))
    return
  }
  const paymentTermsDays = Number(form.value.paymentTermsDays.trim() || '0')
  if (!Number.isInteger(paymentTermsDays) || paymentTermsDays < 0 || paymentTermsDays > 365) {
    toast.error(t('suppliers.form.errors.badTerms'))
    return
  }
  const openingBalance = inputTextToMinor(form.value.openingBalance) ?? 0
  if (Number.isNaN(openingBalance)) {
    toast.error(t('suppliers.form.errors.badAmount'))
    return
  }
  try {
    const savedSupplier = await saveSupplier(props.supplier?.id ?? null, {
      name: form.value.name.trim(),
      contact_person: optional(form.value.contactPerson),
      phone: optional(form.value.phone),
      email: optional(form.value.email),
      tin: optional(form.value.tin),
      vrn: optional(form.value.vrn),
      address: optional(form.value.address),
      payment_terms_days: paymentTermsDays,
      opening_balance: openingBalance,
      notes: optional(form.value.notes),
    })
    emit('saved', savedSupplier)
    open.value = false
  } catch {
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{{ supplier ? t('suppliers.form.editTitle') : t('suppliers.form.addTitle') }}</DialogTitle>
        <DialogDescription>{{ t('suppliers.form.description') }}</DialogDescription>
      </DialogHeader>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="flex flex-col gap-1.5 sm:col-span-2">
          <Label for="supplier-name">{{ t('suppliers.form.name') }}</Label>
          <Input id="supplier-name" v-model="form.name" :placeholder="t('suppliers.form.namePlaceholder')" />
        </div>
        <div class="flex flex-col gap-1.5">
          <Label for="supplier-contact">{{ t('suppliers.form.contactPerson') }}</Label>
          <Input id="supplier-contact" v-model="form.contactPerson" />
        </div>
        <div class="flex flex-col gap-1.5">
          <Label for="supplier-phone">{{ t('common.fields.phone') }}</Label>
          <Input id="supplier-phone" v-model="form.phone" type="tel" inputmode="tel" placeholder="0712 345 678" />
        </div>
        <div class="flex flex-col gap-1.5 sm:col-span-2">
          <Label for="supplier-email">{{ t('common.fields.email') }}</Label>
          <Input id="supplier-email" v-model="form.email" type="email" inputmode="email" />
        </div>
        <div class="flex flex-col gap-1.5">
          <Label for="supplier-tin">TIN</Label>
          <Input id="supplier-tin" v-model="form.tin" />
        </div>
        <div class="flex flex-col gap-1.5">
          <Label for="supplier-vrn">VRN</Label>
          <Input id="supplier-vrn" v-model="form.vrn" />
        </div>
        <div class="flex flex-col gap-1.5 sm:col-span-2">
          <Label for="supplier-address">{{ t('common.fields.address') }}</Label>
          <Input id="supplier-address" v-model="form.address" />
        </div>
        <div class="flex flex-col gap-1.5">
          <Label for="supplier-terms">{{ t('suppliers.form.paymentTerms') }}</Label>
          <Input id="supplier-terms" v-model="form.paymentTermsDays" inputmode="numeric" />
          <p class="text-xs text-muted-foreground">{{ t('suppliers.form.paymentTermsHint') }}</p>
        </div>
        <div class="flex flex-col gap-1.5">
          <Label for="supplier-opening">{{ t('suppliers.form.openingBalance', { currency: currencyCode() }) }}</Label>
          <MoneyInput id="supplier-opening" v-model="form.openingBalance" placeholder="0" />
          <p class="text-xs text-muted-foreground">{{ t('suppliers.form.openingBalanceHint') }}</p>
        </div>
        <div class="flex flex-col gap-1.5 sm:col-span-2">
          <Label for="supplier-notes">{{ t('common.fields.notes') }}</Label>
          <Textarea id="supplier-notes" v-model="form.notes" maxlength="1000" />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="open = false">{{ t('common.actions.cancel') }}</Button>
        <Button :disabled="saving" @click="submit">{{ t('common.actions.save') }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
