<script setup lang="ts">
import {
  Banknote, Camera, CircleEllipsis, Home, Landmark, Megaphone, Package, Percent, ScrollText, Smartphone, Tag, Truck, Users, Wifi, Wrench, X, Zap,
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import PhonePhotoDialog from '@/components/products/PhonePhotoDialog.vue'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import type { BooksAccount, MoneyKind, MoneyPlace } from '@/composables/useMoney'
import { accountName, moneyPlaces, newClientRef } from '@/composables/useMoney'
import { currencyCode, formatMoney, inputTextToMinor } from '~/utils/money'

const props = defineProps<{ kind: MoneyKind | null; today: string; vatRateBasisPoints: number }>()
const emit = defineEmits<{ saved: [] }>()
const open = defineModel<boolean>('open', { default: false })

const wholeBusiness = 'business'
const expenseIcons: Record<string, any> = {
  rent: Home, salaries: Users, utilities: Zap, transport: Truck, phone_internet: Wifi, money_charges: Percent,
  repairs: Wrench, licences_levies: ScrollText, supplies: Package, marketing: Megaphone, other_expenses: CircleEllipsis,
}
const placeIcons: Record<string, any> = { cash: Banknote, mobile_money: Smartphone, bank: Landmark }

const { t, formatNumber } = useI18n()
const { user } = useAuth()
const { vatOn } = useFeatures()
const { accounts, fetchAccounts, recordMoney, uploadReceipt, saving } = useMoney()

const clientRef = ref(newClientRef())
const entryDate = ref(props.today)
const amountText = ref('')
const expenseAccountId = ref<string | null>(null)
const moneyAccount = ref<MoneyPlace>('cash')
const toMoneyAccount = ref<MoneyPlace>('bank')
const feeText = ref('')
const shopChoice = ref(wholeBusiness)
const note = ref('')
const photo = ref<File | null>(null)
const showPhonePhoto = ref(false)
const includesVat = ref(false)
const vatText = ref('')
const supplierTin = ref('')
const receiptNumber = ref('')
const photoInput = ref<HTMLInputElement | null>(null)

const isExpense = computed(() => props.kind === 'expense')
const isMove = computed(() => props.kind === 'money_move')
const spendableAccounts = computed<BooksAccount[]>(() => accounts.value.filter(account => account.is_spendable))
const shops = computed(() => user.value?.shops ?? [])
const amount = computed(() => inputTextToMinor(amountText.value))
const workedOutVat = computed(() => {
  const rate = props.vatRateBasisPoints
  if (!amount.value || !Number.isFinite(amount.value) || rate <= 0) return 0
  return Math.round((amount.value * rate) / (10000 + rate))
})
const placeLabel = computed(() => {
  if (props.kind === 'owner_in' || props.kind === 'other_income') return t('money.form.putInto')
  if (props.kind === 'owner_out') return t('money.form.takenFrom')
  if (isMove.value) return t('money.form.moveFrom')
  return t('money.form.paidFrom')
})

watch(open, isOpen => {
  if (!isOpen) return
  clientRef.value = newClientRef()
  entryDate.value = props.today
  amountText.value = ''
  expenseAccountId.value = null
  moneyAccount.value = 'cash'
  toMoneyAccount.value = 'bank'
  feeText.value = ''
  shopChoice.value = user.value?.shop_id ?? wholeBusiness
  note.value = ''
  photo.value = null
  includesVat.value = false
  vatText.value = ''
  supplierTin.value = ''
  receiptNumber.value = ''
  if (isExpense.value && accounts.value.length === 0) fetchAccounts()
})

const onPhotoPicked = (event: Event) => {
  const pickedFile = (event.target as HTMLInputElement).files?.[0]
  if (pickedFile) photo.value = pickedFile
}

const validationError = (): string | null => {
  if (!amount.value || !Number.isFinite(amount.value) || amount.value <= 0) return t('money.form.errors.amount')
  if (isExpense.value && !expenseAccountId.value) return t('money.form.errors.whatFor')
  if (isMove.value && moneyAccount.value === toMoneyAccount.value) return t('money.form.errors.samePlace')
  const typedVat = inputTextToMinor(vatText.value)
  if (includesVat.value && typedVat != null && (Number.isNaN(typedVat) || typedVat >= amount.value)) return t('money.form.errors.vat')
  return null
}

const submit = async () => {
  const problem = validationError()
  if (problem) {
    toast.error(problem)
    return
  }
  let attachmentKey: string | null = null
  if (photo.value) {
    attachmentKey = await uploadReceipt(photo.value)
    if (!attachmentKey) return
  }
  const typedVat = inputTextToMinor(vatText.value)
  const fee = inputTextToMinor(feeText.value)
  const savedEntry = await recordMoney({
    client_ref: clientRef.value,
    kind: props.kind!,
    entry_date: entryDate.value,
    amount: amount.value!,
    money_account: moneyAccount.value,
    to_money_account: isMove.value ? toMoneyAccount.value : null,
    expense_account_id: isExpense.value ? expenseAccountId.value : null,
    fee: isMove.value && fee && Number.isFinite(fee) ? fee : 0,
    shop_id: shopChoice.value === wholeBusiness ? null : shopChoice.value,
    note: note.value.trim() || null,
    attachment_key: attachmentKey,
    includes_vat: isExpense.value && vatOn.value && includesVat.value,
    vat_amount: includesVat.value && typedVat != null && Number.isFinite(typedVat) ? typedVat : null,
    supplier_tin: supplierTin.value.trim() || null,
    receipt_number: receiptNumber.value.trim() || null,
  })
  if (!savedEntry) return
  emit('saved')
  open.value = false
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent v-if="kind" class="max-h-[92vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{{ t(`money.form.titles.${kind}`) }}</DialogTitle>
        <DialogDescription>{{ t(`money.form.descriptions.${kind}`) }}</DialogDescription>
      </DialogHeader>

      <div class="flex flex-col gap-4">
        <div v-if="isExpense" class="flex flex-col gap-1.5">
          <Label>{{ t('money.form.whatFor') }}</Label>
          <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <button
              v-for="account in spendableAccounts"
              :key="account.id"
              type="button"
              class="flex min-h-12 items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-sm transition-colors hover:bg-accent"
              :class="expenseAccountId === account.id ? 'border-primary bg-primary/5 font-medium' : ''"
              :aria-pressed="expenseAccountId === account.id"
              @click="expenseAccountId = account.id"
            >
              <component :is="expenseIcons[account.system_key ?? ''] ?? Tag" class="size-4 shrink-0 text-muted-foreground" />
              <span class="leading-tight">{{ accountName(account) }}</span>
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="flex flex-col gap-1.5">
            <Label for="money-amount">{{ t('money.form.amount', { currency: currencyCode() }) }}</Label>
            <Input id="money-amount" v-model="amountText" inputmode="decimal" placeholder="0" class="h-11 text-lg" />
          </div>
          <div class="flex flex-col gap-1.5">
            <Label for="money-date">{{ t('money.form.date') }}</Label>
            <Input id="money-date" v-model="entryDate" type="date" :max="today" class="h-11" />
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <Label>{{ placeLabel }}</Label>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="place in moneyPlaces"
              :key="place"
              type="button"
              class="flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg border p-2 text-xs transition-colors hover:bg-accent sm:text-sm"
              :class="moneyAccount === place ? 'border-primary bg-primary/5 font-medium' : ''"
              :aria-pressed="moneyAccount === place"
              @click="moneyAccount = place"
            >
              <component :is="placeIcons[place]" class="size-4 text-muted-foreground" />
              {{ t(`money.accounts.${place}`) }}
            </button>
          </div>
        </div>

        <template v-if="isMove">
          <div class="flex flex-col gap-1.5">
            <Label>{{ t('money.form.moveTo') }}</Label>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="place in moneyPlaces"
                :key="place"
                type="button"
                class="flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg border p-2 text-xs transition-colors hover:bg-accent disabled:opacity-40 sm:text-sm"
                :class="toMoneyAccount === place ? 'border-primary bg-primary/5 font-medium' : ''"
                :disabled="place === moneyAccount"
                :aria-pressed="toMoneyAccount === place"
                @click="toMoneyAccount = place"
              >
                <component :is="placeIcons[place]" class="size-4 text-muted-foreground" />
                {{ t(`money.accounts.${place}`) }}
              </button>
            </div>
          </div>
          <div class="flex flex-col gap-1.5">
            <Label for="money-fee">{{ t('money.form.fee', { currency: currencyCode() }) }}</Label>
            <Input id="money-fee" v-model="feeText" inputmode="decimal" placeholder="0" />
            <p class="text-xs text-muted-foreground">{{ t('money.form.feeHelp') }}</p>
          </div>
        </template>

        <div v-if="isExpense && vatOn" class="flex flex-col gap-3 rounded-lg border p-3">
          <div class="flex items-center justify-between gap-3">
            <div>
              <Label for="money-vat">{{ t('money.form.hasVat') }}</Label>
              <p class="text-xs text-muted-foreground">{{ t('money.form.hasVatHelp') }}</p>
            </div>
            <Switch id="money-vat" v-model="includesVat" />
          </div>
          <template v-if="includesVat">
            <p class="text-sm tabular-nums">{{ t('money.form.vatWorkedOut', { rate: `${formatNumber(vatRateBasisPoints / 100)}%`, amount: formatMoney(workedOutVat) }) }}</p>
            <div class="flex flex-col gap-1.5">
              <Label for="money-vat-amount">{{ t('money.form.vatAmount', { currency: currencyCode() }) }}</Label>
              <Input id="money-vat-amount" v-model="vatText" inputmode="decimal" :placeholder="String(workedOutVat)" />
            </div>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div class="flex flex-col gap-1.5">
                <Label for="money-tin">{{ t('money.form.supplierTin') }}</Label>
                <Input id="money-tin" v-model="supplierTin" />
              </div>
              <div class="flex flex-col gap-1.5">
                <Label for="money-efd">{{ t('money.form.efdReceipt') }}</Label>
                <Input id="money-efd" v-model="receiptNumber" />
              </div>
            </div>
          </template>
        </div>

        <div v-if="shops.length > 1" class="flex flex-col gap-1.5">
          <Label>{{ t('money.form.shop') }}</Label>
          <Select v-model="shopChoice">
            <SelectTrigger class="w-full" :aria-label="t('money.form.shop')">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem :value="wholeBusiness">{{ t('money.form.noShop') }}</SelectItem>
              <SelectItem v-for="shop in shops" :key="shop.id" :value="shop.id">{{ shop.name }}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="flex flex-col gap-1.5">
          <Label for="money-note">{{ t('money.form.note') }}</Label>
          <Input id="money-note" v-model="note" :placeholder="t('money.form.notePlaceholder')" maxlength="300" />
        </div>

        <div v-if="isExpense" class="flex flex-col gap-1.5">
          <Label>{{ t('money.form.photo') }} <span class="font-normal text-muted-foreground">· {{ t('money.form.photoOptional') }}</span></Label>
          <div v-if="photo" class="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
            <Camera class="size-4 text-muted-foreground" />
            <span class="min-w-0 flex-1 truncate">{{ t('money.form.photoAdded') }}</span>
            <Button variant="ghost" size="icon" :aria-label="t('money.form.removePhoto')" @click="photo = null"><X /></Button>
          </div>
          <div v-else class="grid grid-cols-2 gap-2">
            <Button variant="outline" @click="photoInput?.click()"><Camera /> {{ t('money.form.choosePhoto') }}</Button>
            <Button variant="outline" @click="showPhonePhoto = true"><Smartphone /> {{ t('money.form.usePhone') }}</Button>
          </div>
          <input ref="photoInput" type="file" accept="image/png,image/jpeg,image/webp" class="hidden" @change="onPhotoPicked">
        </div>
      </div>

      <DialogFooter class="gap-2">
        <Button variant="outline" size="lg" @click="open = false">{{ t('common.actions.cancel') }}</Button>
        <Button size="lg" :disabled="saving" @click="submit">{{ saving ? t('common.actions.saving') : t('money.form.save') }}</Button>
      </DialogFooter>
    </DialogContent>
    <PhonePhotoDialog v-model:open="showPhonePhoto" @photo="photo = $event" />
  </Dialog>
</template>
