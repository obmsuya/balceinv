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

const confirmChange = async () => {
  if (!props.customer) return
  try {
    const changedCustomer = props.customer.is_active
      ? await deactivateCustomer(props.customer.id)
      : await restoreCustomer(props.customer.id)
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
          {{ customer?.is_active ? t('customers.status.deactivateTitle', { name: customer?.name ?? '' }) : t('customers.status.restoreTitle', { name: customer?.name ?? '' }) }}
        </AlertDialogTitle>
        <AlertDialogDescription>
          {{ customer?.is_active ? t('customers.status.deactivateDescription') : t('customers.status.restoreDescription') }}
          <template v-if="customer?.is_active && customer.balance > 0"> {{ t('customers.status.stillOwes', { amount: formatMoney(customer.balance) }) }}</template>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{{ t('common.actions.cancel') }}</AlertDialogCancel>
        <AlertDialogAction
          :class="customer?.is_active ? 'bg-destructive text-white hover:bg-destructive/90' : ''"
          :disabled="saving"
          @click.prevent="confirmChange"
        >
          {{ customer?.is_active ? t('customers.status.deactivate') : t('customers.status.restore') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
