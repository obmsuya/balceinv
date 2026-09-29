<script setup lang="ts">
import { Banknote, CreditCard, Smartphone } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import NumberPad from '@/components/pos/NumberPad.vue'
import type { NumberPadKey } from '@/components/pos/NumberPad.vue'
import type { PaymentInput, PaymentMethod } from '@/composables/useSales'
import { paymentMethodLabel } from '@/composables/useSales'
import { currencyCode, currencyDecimals, formatMoney, inputTextToMinor, majorToMinor, minorToInputText } from '~/utils/money'

const props = defineProps<{ total: number; saving: boolean; numpadEnabled: boolean }>()
const emit = defineEmits<{ pay: [payments: PaymentInput[]] }>()

const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()

const methodIcons: Record<PaymentMethod, any> = { cash: Banknote, card: CreditCard, mobile: Smartphone }
const methods: PaymentMethod[] = ['cash', 'card', 'mobile']

const amountTexts = ref<Record<PaymentMethod, string>>({ cash: '', card: '', mobile: '' })
const activeMethod = ref<PaymentMethod>('cash')
const replaceOnNextKey = ref(true)

const amounts = computed(() => {
  const readAmounts = {} as Record<PaymentMethod, number>
  for (const method of methods) {
    const minorUnits = inputTextToMinor(amountTexts.value[method])
    readAmounts[method] = minorUnits != null && !Number.isNaN(minorUnits) ? minorUnits : 0
  }
  return readAmounts
})
const hasBadAmount = computed(() => methods.some(method => Number.isNaN(inputTextToMinor(amountTexts.value[method]) ?? 0)))
const paidTotal = computed(() => methods.reduce((sum, method) => sum + amounts.value[method], 0))
const nonCashTotal = computed(() => amounts.value.card + amounts.value.mobile)
const stillOwed = computed(() => Math.max(props.total - paidTotal.value, 0))
const change = computed(() => Math.max(paidTotal.value - props.total, 0))

const problem = computed(() => {
  if (hasBadAmount.value) return t('pos.payment.badAmount')
  if (paidTotal.value < props.total) return t('pos.payment.stillOwed', { amount: formatMoney(stillOwed.value) })
  if (nonCashTotal.value > props.total) return t('pos.payment.nonCashTooMuch')
  return ''
})

const quickCashAmounts = computed(() => {
  const majorSteps = [500, 1000, 5000, 10000, 20000, 50000]
  const suggestions = new Set<number>([props.total])
  for (const majorStep of majorSteps) {
    const stepInMinor = majorToMinor(majorStep)
    suggestions.add(Math.ceil(props.total / stepInMinor) * stepInMinor)
  }
  return [...suggestions].filter(amount => amount >= props.total).sort((first, second) => first - second).slice(0, 4)
})

const focusAmount = async (method: PaymentMethod) => {
  activeMethod.value = method
  replaceOnNextKey.value = true
  await nextTick()
  const amountElement = document.getElementById(`payment-${method}`) as HTMLInputElement | null
  amountElement?.focus()
  amountElement?.select()
}

watch(open, isOpen => {
  if (!isOpen) return
  amountTexts.value = { cash: minorToInputText(props.total), card: '', mobile: '' }
  focusAmount('cash')
})

const payRestWith = (method: PaymentMethod) => {
  const otherMethodsTotal = paidTotal.value - amounts.value[method]
  amountTexts.value[method] = minorToInputText(Math.max(props.total - otherMethodsTotal, 0))
  focusAmount(method)
}

const payCashOnly = (cashAmount: number) => {
  amountTexts.value = { cash: minorToInputText(cashAmount), card: '', mobile: '' }
  focusAmount('cash')
}

const submit = () => {
  if (problem.value || props.saving) return
  const payments = methods
    .filter(method => amounts.value[method] > 0)
    .map(method => ({ method, amount: amounts.value[method] }))
  emit('pay', payments)
}

const pressNumpad = (key: NumberPadKey) => {
  const method = activeMethod.value
  const currentText = replaceOnNextKey.value ? '' : amountTexts.value[method]
  if (key === 'enter') {
    submit()
    return
  }
  replaceOnNextKey.value = false
  if (key === 'back') amountTexts.value[method] = amountTexts.value[method].slice(0, -1)
  else if (key === 'clear') amountTexts.value[method] = ''
  else if (key === '.') amountTexts.value[method] = currentText.includes('.') ? currentText : `${currentText || '0'}.`
  else if (currentText.replace('.', '').length < 12) amountTexts.value[method] = `${currentText}${key}`
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-h-[95dvh] overflow-y-auto" :class="numpadEnabled ? 'sm:max-w-2xl' : 'sm:max-w-md'">
      <DialogHeader>
        <DialogTitle>{{ t('pos.payment.title') }}</DialogTitle>
        <DialogDescription class="sr-only">{{ t('pos.payment.description') }}</DialogDescription>
      </DialogHeader>

      <form class="grid gap-4" :class="numpadEnabled ? 'sm:grid-cols-[1fr_15rem]' : ''" @submit.prevent="submit">
        <div class="flex flex-col gap-3">
          <div class="flex items-baseline justify-between rounded-xl bg-muted/60 px-4 py-3">
            <span class="text-sm text-muted-foreground">{{ t('pos.payment.toPay') }}</span>
            <span class="text-3xl font-bold tabular-nums">{{ formatMoney(total) }}</span>
          </div>

          <div v-for="method in methods" :key="method" class="flex items-center gap-2">
            <button
              type="button"
              class="flex w-36 shrink-0 items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
              :class="activeMethod === method ? 'border-primary' : ''"
              :title="t('pos.payment.payRestWith', { method: paymentMethodLabel(method) })"
              @click="payRestWith(method)"
            >
              <component :is="methodIcons[method]" class="size-4 shrink-0 text-muted-foreground" />
              <span class="truncate">{{ paymentMethodLabel(method) }}</span>
            </button>
            <input
              :id="`payment-${method}`"
              v-model="amountTexts[method]"
              inputmode="decimal"
              :placeholder="`0 ${currencyCode()}`"
              class="h-11 w-full min-w-0 rounded-lg border bg-transparent px-3 text-right text-lg tabular-nums outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
              :aria-label="t('pos.payment.amountFor', { method: paymentMethodLabel(method) })"
              @focus="activeMethod = method"
              @input="replaceOnNextKey = false"
            >
          </div>

          <div class="flex flex-wrap gap-2">
            <Button
              v-for="quickAmount in quickCashAmounts"
              :key="quickAmount"
              type="button"
              variant="secondary"
              class="flex-1 tabular-nums"
              @click="payCashOnly(quickAmount)"
            >
              {{ quickAmount === total ? t('pos.payment.exact') : formatMoney(quickAmount) }}
            </Button>
          </div>

          <div class="flex items-center justify-between rounded-xl px-4 py-3" :class="problem ? 'bg-destructive/10' : 'bg-emerald-500/10'">
            <span class="text-sm font-medium">{{ problem && paidTotal < total ? t('pos.payment.stillToPay') : t('pos.payment.change') }}</span>
            <span class="text-2xl font-bold tabular-nums" :class="problem ? 'text-destructive' : 'text-emerald-700 dark:text-emerald-400'">
              {{ problem && !hasBadAmount && paidTotal < total ? formatMoney(stillOwed) : formatMoney(change) }}
            </span>
          </div>
          <p v-if="problem && paidTotal >= total" class="text-sm text-destructive">{{ problem }}</p>

          <div class="flex gap-2">
            <Button type="button" variant="outline" class="h-12" @click="open = false">{{ t('common.actions.back') }}</Button>
            <Button type="submit" class="h-12 flex-1 text-base" :disabled="Boolean(problem) || saving">{{ saving ? t('common.actions.saving') : t('pos.payment.completeSale') }}</Button>
          </div>
        </div>

        <div v-if="numpadEnabled" class="flex flex-col justify-end gap-2">
          <p class="text-xs text-muted-foreground">{{ t('pos.payment.typingInto') }} <span class="font-medium text-foreground">{{ paymentMethodLabel(activeMethod) }}</span></p>
          <NumberPad :allow-decimal="currencyDecimals() > 0" :enter-label="t('pos.payment.done')" @press="pressNumpad" />
        </div>
      </form>
    </DialogContent>
  </Dialog>
</template>
