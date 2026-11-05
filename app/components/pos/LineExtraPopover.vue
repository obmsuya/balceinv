<script setup lang="ts">
import { Percent, Tag, TrendingUp } from 'lucide-vue-next'
import MoneyInput from '@/components/MoneyInput.vue'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { ManualDiscount, ManualDiscountKind } from '@/composables/useSales'
import { currencyCode, formatMoney, inputTextToMinor, minorToInputText } from '~/utils/money'

const props = defineProps<{
  productName: string
  extra: ManualDiscount | null | undefined
  listUnitPrice: number
  quantity: number
}>()
const emit = defineEmits<{ apply: [extra: ManualDiscount | null] }>()

const { t, formatNumber } = useI18n()

const open = ref(false)
const kind = ref<ManualDiscountKind>('amount')
const valueText = ref('')

watch(open, (isOpen) => {
  if (!isOpen) return
  kind.value = props.extra?.kind ?? 'amount'
  valueText.value = props.extra
    ? (props.extra.kind === 'percent' ? String(props.extra.value / 100) : minorToInputText(props.extra.value))
    : ''
})

const typedExtra = computed<ManualDiscount | null>(() => {
  if (kind.value === 'amount') {
    const minorUnits = inputTextToMinor(valueText.value)
    return minorUnits && minorUnits > 0 ? { kind: 'amount', value: minorUnits } : null
  }
  const basisPoints = Math.round(Number(valueText.value.replace(/,/g, '')) * 100)
  return Number.isFinite(basisPoints) && basisPoints >= 1 && basisPoints <= 100000 ? { kind: 'percent', value: basisPoints } : null
})

const addsOn = (extra: ManualDiscount): number => {
  const perItem = extra.kind === 'percent' ? Math.round(props.listUnitPrice * extra.value / 10000) : extra.value
  return perItem * props.quantity
}

const badgeText = computed(() => {
  if (!props.extra) return t('pos.extra.add')
  return props.extra.kind === 'percent'
    ? `+${formatNumber(props.extra.value / 100)}%`
    : `+${formatMoney(props.extra.value)}`
})

const apply = () => {
  if (!typedExtra.value) return
  emit('apply', typedExtra.value)
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
        :class="extra
          ? 'border-sky-500/40 text-sky-700 hover:bg-sky-500/10 dark:text-sky-400'
          : 'border-dashed text-muted-foreground hover:bg-muted hover:text-foreground'"
        :aria-label="t('pos.extra.title', { name: productName })"
        :title="t('common.help.extraText')"
        @click.stop
      >
        <TrendingUp class="size-3" />
        {{ badgeText }}
      </button>
    </PopoverTrigger>
    <PopoverContent class="w-72 space-y-3" align="end" @click.stop>
      <div>
        <p class="text-sm font-semibold">{{ t('pos.extra.title', { name: productName }) }}</p>
        <p class="mt-0.5 text-xs text-muted-foreground">{{ t('common.help.extraText') }}</p>
      </div>
      <div class="grid grid-cols-2 gap-1 rounded-md bg-muted p-1">
        <button
          v-for="choice in [{ kind: 'amount', label: currencyCode(), icon: Tag }, { kind: 'percent', label: t('pos.discount.percent'), icon: Percent }]"
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
        :aria-label="kind === 'percent' ? t('pos.extra.percentOn') : t('pos.extra.amountOn', { currency: currencyCode() })"
        autofocus
        @keydown.enter.prevent="apply"
      />
      <p class="text-xs text-muted-foreground">
        {{ typedExtra ? t('pos.extra.addsOn', { amount: formatMoney(addsOn(typedExtra)) }) : t('pos.extra.perItem') }}
      </p>
      <div class="flex justify-end gap-2">
        <Button v-if="extra" variant="ghost" size="sm" @click="remove">{{ t('pos.extra.remove') }}</Button>
        <Button size="sm" :disabled="!typedExtra" @click="apply">{{ t('pos.extra.apply') }}</Button>
      </div>
    </PopoverContent>
  </Popover>
</template>
