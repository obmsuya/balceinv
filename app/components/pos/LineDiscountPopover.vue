<script setup lang="ts">
import { Percent, Tag } from 'lucide-vue-next'
import MoneyInput from '@/components/MoneyInput.vue'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { ManualDiscount, ManualDiscountKind } from '@/composables/useSales'
import { currencyCode, formatMoney, inputTextToMinor, minorToInputText } from '~/utils/money'

const props = defineProps<{
  productName: string
  manualDiscount: ManualDiscount | null | undefined
  grossAmount: number
  limitBasisPoints: number
  isOwner: boolean
}>()
const emit = defineEmits<{ apply: [manualDiscount: ManualDiscount | null] }>()

const { t, formatNumber } = useI18n()

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

const takesOff = (manualDiscount: ManualDiscount): number => manualDiscount.kind === 'percent'
  ? Math.round(props.grossAmount * manualDiscount.value / 10000)
  : Math.min(manualDiscount.value, props.grossAmount)

const hasLimit = computed(() => !props.isOwner && props.limitBasisPoints < 10000)
const limitAmount = computed(() => Math.round(props.grossAmount * props.limitBasisPoints / 10000))
const isOverLimit = computed(() => hasLimit.value && typedDiscount.value !== null && takesOff(typedDiscount.value) > limitAmount.value)

const badgeText = computed(() => {
  if (!props.manualDiscount) return t('pos.discount.add')
  return props.manualDiscount.kind === 'percent'
    ? `−${formatNumber(props.manualDiscount.value / 100)}%`
    : `−${formatMoney(props.manualDiscount.value)}`
})

const apply = () => {
  if (!typedDiscount.value || isOverLimit.value) return
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
    <PopoverContent class="w-72 space-y-3" align="end" @click.stop>
      <p class="text-sm font-semibold">{{ t('pos.discount.title', { name: productName }) }}</p>
      <div class="grid grid-cols-2 gap-1 rounded-md bg-muted p-1">
        <button
          v-for="choice in [{ kind: 'percent', label: t('pos.discount.percent'), icon: Percent }, { kind: 'amount', label: currencyCode(), icon: Tag }]"
          :key="choice.kind"
          type="button"
          class="flex items-center justify-center gap-1.5 rounded px-2 py-1.5 text-sm transition-colors"
          :class="kind === choice.kind ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground'"
          @click="kind = choice.kind as ManualDiscountKind; valueText = ''"
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
      <p v-if="typedDiscount && !isOverLimit" class="text-xs text-muted-foreground">
        {{ t('pos.discount.takesOff', { amount: formatMoney(takesOff(typedDiscount)) }) }}
      </p>
      <p v-if="isOverLimit" class="text-xs font-medium text-destructive">
        {{ t('pos.discount.overLimit', { percent: formatNumber(limitBasisPoints / 100), amount: formatMoney(limitAmount) }) }}
      </p>
      <p v-else-if="hasLimit" class="text-xs text-muted-foreground">
        {{ t('pos.discount.limit', { percent: formatNumber(limitBasisPoints / 100) }) }}
      </p>
      <div class="flex justify-end gap-2">
        <Button v-if="manualDiscount" variant="ghost" size="sm" @click="remove">{{ t('pos.discount.remove') }}</Button>
        <Button size="sm" :disabled="!typedDiscount || isOverLimit" @click="apply">{{ t('pos.discount.apply') }}</Button>
      </div>
    </PopoverContent>
  </Popover>
</template>
