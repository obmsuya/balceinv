<script setup lang="ts">
import { Banknote, CreditCard, Smartphone } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { PaymentInput, PaymentMethod } from '@/composables/useSales'
import { paymentMethodLabels } from '@/composables/useSales'
import { currencyCode, formatMoney, inputTextToMinor, majorToMinor, minorToInputText } from '~/utils/money'

const props = defineProps<{ total: number; saving: boolean }>()
const emit = defineEmits<{ pay: [payments: PaymentInput[]] }>()

const open = defineModel<boolean>('open', { default: false })

const methodIcons: Record<PaymentMethod, any> = { cash: Banknote, card: CreditCard, mobile: Smartphone }
const methods: PaymentMethod[] = ['cash', 'card', 'mobile']

const amountTexts = ref<Record<PaymentMethod, string>>({ cash: '', card: '', mobile: '' })

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
  if (hasBadAmount.value) return 'Amounts must be numbers'
  if (paidTotal.value < props.total) return `${formatMoney(stillOwed.value)} still owed`
  if (nonCashTotal.value > props.total) return 'Card and mobile money cannot be more than the total'
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

watch(open, async isOpen => {
  if (!isOpen) return
  amountTexts.value = { cash: minorToInputText(props.total), card: '', mobile: '' }
  await nextTick()
  const cashElement = document.getElementById('payment-cash') as HTMLInputElement | null
  cashElement?.focus()
  cashElement?.select()
})

const payRestWith = (method: PaymentMethod) => {
  const otherMethodsTotal = paidTotal.value - amounts.value[method]
  amountTexts.value[method] = minorToInputText(Math.max(props.total - otherMethodsTotal, 0))
}

const submit = () => {
  if (problem.value || props.saving) return
  const payments = methods
    .filter(method => amounts.value[method] > 0)
    .map(method => ({ method, amount: amounts.value[method] }))
  emit('pay', payments)
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Take payment</DialogTitle>
        <DialogDescription class="text-2xl font-bold text-foreground tabular-nums">{{ formatMoney(total) }}</DialogDescription>
      </DialogHeader>

      <form class="flex flex-col gap-3" @submit.prevent="submit">
        <div v-for="method in methods" :key="method" class="flex items-center gap-2">
          <button
            type="button"
            class="flex w-36 shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent"
            :title="`Pay the rest with ${paymentMethodLabels[method]}`"
            @click="payRestWith(method)"
          >
            <component :is="methodIcons[method]" class="size-4 text-muted-foreground" />
            {{ paymentMethodLabels[method] }}
          </button>
          <Input
            :id="`payment-${method}`"
            v-model="amountTexts[method]"
            inputmode="decimal"
            :placeholder="`0 ${currencyCode()}`"
            class="text-right tabular-nums"
            :aria-label="`${paymentMethodLabels[method]} amount`"
          />
        </div>

        <div class="flex flex-wrap gap-2">
          <Button
            v-for="quickAmount in quickCashAmounts"
            :key="quickAmount"
            type="button"
            variant="secondary"
            size="sm"
            class="tabular-nums"
            @click="amountTexts = { cash: minorToInputText(quickAmount), card: '', mobile: '' }"
          >
            {{ quickAmount === total ? 'Exact' : formatMoney(quickAmount) }}
          </Button>
        </div>

        <div class="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
          <span class="text-sm text-muted-foreground">{{ problem ? 'Still to pay' : 'Change' }}</span>
          <span class="text-xl font-bold tabular-nums" :class="problem ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'">
            {{ problem && !hasBadAmount && paidTotal < total ? formatMoney(stillOwed) : formatMoney(change) }}
          </span>
        </div>
        <p v-if="problem" class="text-sm text-destructive">{{ problem }}</p>

        <DialogFooter>
          <Button type="button" variant="outline" @click="open = false">Back</Button>
          <Button type="submit" :disabled="Boolean(problem) || saving">{{ saving ? 'Saving…' : 'Complete sale' }}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
