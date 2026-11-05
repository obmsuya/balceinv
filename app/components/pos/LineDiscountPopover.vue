<script setup lang="ts">
import { ArrowRight, Percent, Tag } from 'lucide-vue-next'
import MoneyInput from '@/components/MoneyInput.vue'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { ManualDiscount, ManualDiscountKind } from '@/composables/useSales'
import { currencyCode, formatMoney, inputTextToMinor, minorToInputText } from '~/utils/money'

const props = defineProps<{
  productName: string
  manualDiscount: ManualDiscount | null | undefined
  itemPrice: number
  quantity: number
}>()
const emit = defineEmits<{ apply: [manualDiscount: ManualDiscount | null] }>()

const { t, formatNumber } = useI18n()

const quickPercents = [5, 10, 15, 20]

const open = ref(false)
const kind = ref<ManualDiscountKind>('percent')
const valueText = ref('')

watch(open, (isOpen) => {
  if (!isOpen) return
  kind.value = props.manualDiscount?.kind ?? 'percent'
  valueText.value = props.manualDiscount
    ? (props.manualDiscount.kind === 'percent' ? String(props.manualDiscount.value / 100) : minorToInputText(props.manualDiscount.value))
    : ''
})

const typedDiscount = computed<ManualDiscount | null>(() => {
  if (kind.value === 'amount') {
    const minorUnits = inputTextToMinor(valueText.value)
    return minorUnits && minorUnits > 0 ? { kind: 'amount', value: minorUnits } : null
  }
  const basisPoints = Math.round(Number(valueText.value.replace(/,/g, '')) * 100)
  return Number.isFinite(basisPoints) && basisPoints >= 1 && basisPoints <= 10000 ? { kind: 'percent', value: basisPoints } : null
})

const discountEach = (manualDiscount: ManualDiscount): number => manualDiscount.kind === 'percent'
  ? Math.round(props.itemPrice * manualDiscount.value / 10000)
  : Math.min(manualDiscount.value, props.itemPrice)

const preview = computed(() => {
  if (!typedDiscount.value) return null
  const offEach = discountEach(typedDiscount.value)
  return {
    offEach,
    priceEach: props.itemPrice - offEach,
    lineTotal: (props.itemPrice - offEach) * props.quantity,
    saves: offEach * props.quantity,
    isCapped: typedDiscount.value.kind === 'amount' && typedDiscount.value.value > props.itemPrice,
  }
})

const badgeText = computed(() => {
  if (!props.manualDiscount) return t('pos.discount.add')
  const amountText = props.manualDiscount.kind === 'percent' ? `${formatNumber(props.manualDiscount.value / 100)}%` : formatMoney(props.manualDiscount.value)
  return props.quantity > 1 ? t('pos.discount.badgeEach', { amount: amountText }) : `−${amountText}`
})

const chooseKind = (chosenKind: ManualDiscountKind) => {
  kind.value = chosenKind
  valueText.value = ''
}

const apply = () => {
  if (!typedDiscount.value) return
  emit('apply', typedDiscount.value)
  open.value = false
}

const remove = () => {
  emit('apply', null)
  open.value = false
}
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <button
        type="button"
        class="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium transition-colors"
        :class="manualDiscount
          ? 'border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400'
          : 'border-dashed text-muted-foreground hover:bg-muted hover:text-foreground'"
        :aria-label="t('pos.discount.title', { name: productName })"
        @click.stop
      >
        <Percent class="size-3" />
        {{ badgeText }}
      </button>
    </PopoverTrigger>
    <PopoverContent class="w-80 space-y-3" align="end" @click.stop>
      <div>
        <p class="text-sm font-semibold">{{ t('pos.discount.title', { name: productName }) }}</p>
        <p class="mt-0.5 text-xs text-muted-foreground">{{ t('pos.discount.perItem') }}</p>
      </div>
      <div class="grid grid-cols-2 gap-1 rounded-md bg-muted p-1">
        <button
          v-for="choice in [{ kind: 'percent', label: t('pos.discount.percent'), icon: Percent }, { kind: 'amount', label: currencyCode(), icon: Tag }]"
          :key="choice.kind"
          type="button"
          class="flex items-center justify-center gap-1.5 rounded px-2 py-1.5 text-sm transition-colors"
          :class="kind === choice.kind ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground'"
          @click="chooseKind(choice.kind as ManualDiscountKind)"
        >
          <component :is="choice.icon" class="size-3.5" />
          {{ choice.label }}
        </button>
      </div>
      <MoneyInput
        v-model="valueText"
        :decimals="kind === 'percent' ? 2 : undefined"
        :placeholder="kind === 'percent' ? '10' : '500'"
        :aria-label="kind === 'percent' ? t('pos.discount.percentOff') : t('pos.discount.amountOff', { currency: currencyCode() })"
        autofocus
        @keydown.enter.prevent="apply"
      />
      <div v-if="kind === 'percent'" class="flex gap-1.5">
        <button
          v-for="quickPercent in quickPercents"
          :key="quickPercent"
          type="button"
          class="flex-1 rounded-full border px-2 py-1 text-xs tabular-nums transition-colors hover:bg-muted"
          :class="valueText === String(quickPercent) ? 'border-emerald-500/60 bg-emerald-500/10 font-medium text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'"
          @click="valueText = String(quickPercent)"
        >
          {{ quickPercent }}%
        </button>
      </div>

      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="-translate-y-1 opacity-0"
        leave-active-class="transition duration-150 ease-in"
        leave-to-class="-translate-y-1 opacity-0"
      >
        <div v-if="preview" class="space-y-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2.5 text-sm">
          <div class="flex items-center justify-between gap-2">
            <span class="text-muted-foreground">{{ t('pos.discount.eachItem') }}</span>
            <span class="flex items-center gap-1.5 tabular-nums">
              <span class="text-xs text-muted-foreground line-through">{{ formatMoney(itemPrice) }}</span>
              <ArrowRight class="size-3 text-muted-foreground" />
              <span class="font-semibold">{{ formatMoney(preview.priceEach) }}</span>
            </span>
          </div>
          <div class="flex items-center justify-between gap-2">
            <span class="text-muted-foreground">{{ t('pos.discount.lineOf', { count: quantity }) }}</span>
            <span class="font-semibold tabular-nums">{{ formatMoney(preview.lineTotal) }}</span>
          </div>
          <div class="flex items-center justify-between gap-2 border-t border-emerald-500/20 pt-1.5 text-emerald-700 dark:text-emerald-400">
            <span>{{ t('pos.discount.saves') }}</span>
            <span class="font-semibold tabular-nums">{{ quantity > 1 ? `${formatMoney(preview.offEach)} × ${quantity} = ` : '' }}{{ formatMoney(preview.saves) }}</span>
          </div>
          <p v-if="preview.isCapped" class="text-xs text-amber-700 dark:text-amber-400">{{ t('pos.discount.capped', { price: formatMoney(itemPrice) }) }}</p>
        </div>
      </Transition>

      <div class="flex justify-end gap-2">
        <Button v-if="manualDiscount" variant="ghost" size="sm" @click="remove">{{ t('pos.discount.remove') }}</Button>
        <Button size="sm" :disabled="!typedDiscount" @click="apply">{{ t('pos.discount.apply') }}</Button>
      </div>
    </PopoverContent>
  </Popover>
</template>
