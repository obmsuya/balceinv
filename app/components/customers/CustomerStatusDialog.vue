<script setup lang="ts">
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
import type { Customer } from '@/composables/useCustomers'
import { formatMoney } from '~/utils/money'

const props = defineProps<{ customer: Customer | null }>()
const emit = defineEmits<{ changed: [customer: Customer]; close: [] }>()

const { t } = useI18n()
const { deactivateCustomer, restoreCustomer, saving } = useCustomers()

const shownCustomer = ref<Customer | null>(null)
watch(() => props.customer, chosenCustomer => {
  if (chosenCustomer) shownCustomer.value = chosenCustomer
}, { immediate: true })

const confirmChange = async () => {
  const customer = shownCustomer.value
  if (!customer) return
  try {
    const changedCustomer = customer.is_active
      ? await deactivateCustomer(customer.id)
      : await restoreCustomer(customer.id)
    emit('changed', changedCustomer)
    emit('close')
  } catch {
  }
}
</script>

<template>
  <AlertDialog :open="customer !== null" @update:open="isOpen => { if (!isOpen) emit('close') }">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>
          {{ shownCustomer?.is_active ? t('customers.status.deactivateTitle', { name: shownCustomer?.name ?? '' }) : t('customers.status.restoreTitle', { name: shownCustomer?.name ?? '' }) }}
        </AlertDialogTitle>
        <AlertDialogDescription>
          {{ shownCustomer?.is_active ? t('customers.status.deactivateDescription') : t('customers.status.restoreDescription') }}
          <template v-if="shownCustomer?.is_active && shownCustomer.balance > 0"> {{ t('customers.status.stillOwes', { amount: formatMoney(shownCustomer.balance) }) }}</template>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{{ t('common.actions.cancel') }}</AlertDialogCancel>
        <AlertDialogAction
          :class="shownCustomer?.is_active ? 'bg-destructive text-white hover:bg-destructive/90' : ''"
          :disabled="saving"
          @click.prevent="confirmChange"
        >
          {{ shownCustomer?.is_active ? t('customers.status.deactivate') : t('customers.status.restore') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
