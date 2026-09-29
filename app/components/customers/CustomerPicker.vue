<script setup lang="ts">
import { LoaderCircle, Search, UserPlus } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { useDebounceFn } from '@vueuse/core'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Customer } from '@/composables/useCustomers'
import { formatMoney } from '~/utils/money'

const emit = defineEmits<{ pick: [customer: Customer] }>()

const open = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
const { canCreate } = usePermissions()
const { searchCustomers, saveCustomer, saving } = useCustomers()

const searchText = ref('')
const matches = ref<Customer[]>([])
const searching = ref(false)
const searchFailed = ref(false)
const addingNew = ref(false)
const newName = ref('')
const newPhone = ref('')

const runSearch = async () => {
  const trimmedText = searchText.value.trim()
  searching.value = true
  searchFailed.value = false
  try {
    matches.value = await searchCustomers(trimmedText, trimmedText ? 'name' : 'recent')
  } catch {
    matches.value = []
    searchFailed.value = true
  } finally {
    searching.value = false
  }
}

watch(searchText, useDebounceFn(runSearch, 250))

watch(open, isOpen => {
  if (!isOpen) return
  searchText.value = ''
  addingNew.value = false
  runSearch()
})

const pick = (customer: Customer) => {
  emit('pick', customer)
  open.value = false
}

const startNew = () => {
  const typedText = searchText.value.trim()
  const looksLikePhone = /^[+\d\s]+$/.test(typedText)
  newName.value = looksLikePhone ? '' : typedText
  newPhone.value = looksLikePhone ? typedText : ''
  addingNew.value = true
}

const addNew = async () => {
  if (!newName.value.trim()) {
    toast.error(t('customers.form.errors.nameRequired'))
    return
  }
  try {
    const createdCustomer = await saveCustomer(null, {
      name: newName.value.trim(),
      phone: newPhone.value.trim() || null,
      email: null,
      address: null,
      tin: null,
      credit_limit: null,
      opening_balance: 0,
      notes: null,
    })
    pick(createdCustomer)
  } catch {
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-h-[90dvh] overflow-y-auto sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ addingNew ? t('customers.picker.newTitle') : t('customers.picker.title') }}</DialogTitle>
        <DialogDescription>{{ addingNew ? t('customers.picker.newDescription') : t('customers.picker.description') }}</DialogDescription>
      </DialogHeader>

      <form v-if="addingNew" class="flex flex-col gap-4" @submit.prevent="addNew">
        <div class="flex flex-col gap-1.5">
          <Label for="picker-new-name">{{ t('common.fields.name') }}</Label>
          <Input id="picker-new-name" v-model="newName" maxlength="120" autocomplete="off" />
        </div>
        <div class="flex flex-col gap-1.5">
          <Label for="picker-new-phone">{{ t('common.fields.phone') }}</Label>
          <Input id="picker-new-phone" v-model="newPhone" type="tel" inputmode="tel" placeholder="0712 345 678" autocomplete="off" />
        </div>
        <div class="flex gap-2">
          <Button type="button" variant="outline" @click="addingNew = false">{{ t('common.actions.back') }}</Button>
          <Button type="submit" class="flex-1" :disabled="saving">{{ saving ? t('common.actions.saving') : t('customers.picker.addAndChoose') }}</Button>
        </div>
      </form>

      <div v-else class="flex flex-col gap-3">
        <div class="relative">
          <Search class="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input v-model="searchText" :placeholder="t('customers.picker.searchPlaceholder')" class="pl-8" :aria-label="t('customers.picker.searchPlaceholder')" autocomplete="off" />
        </div>

        <p v-if="!searchText.trim() && matches.length" class="text-xs font-medium text-muted-foreground">{{ t('customers.picker.recent') }}</p>

        <div v-if="searching && !matches.length" class="flex justify-center py-6 text-muted-foreground">
          <LoaderCircle class="size-5 animate-spin" />
        </div>
        <ul v-else-if="matches.length" class="max-h-72 divide-y overflow-y-auto rounded-md border">
          <li v-for="customer in matches" :key="customer.id">
            <button type="button" class="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-accent" @click="pick(customer)">
              <span class="min-w-0 flex-1">
                <span class="block truncate font-medium">{{ customer.name }}</span>
                <span v-if="customer.phone" class="block text-xs text-muted-foreground tabular-nums">{{ customer.phone }}</span>
              </span>
              <span v-if="customer.balance > 0" class="shrink-0 text-xs tabular-nums" :class="customer.overdue_amount > 0 ? 'text-destructive' : 'text-muted-foreground'">
                {{ t('customers.picker.owes', { amount: formatMoney(customer.balance) }) }}
              </span>
            </button>
          </li>
        </ul>
        <p v-else-if="searchFailed" class="px-1 text-sm text-destructive">{{ t('customers.picker.searchFailed') }}</p>
        <p v-else class="px-1 text-sm text-muted-foreground">{{ searchText.trim() ? t('customers.picker.noMatch') : t('customers.picker.noneYet') }}</p>

        <Button v-if="canCreate('customers')" variant="outline" @click="startNew">
          <UserPlus />
          {{ t('customers.picker.newCustomer') }}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>
