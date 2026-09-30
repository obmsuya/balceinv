<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'
import { caretAfterAmountCharacters, cleanAmountText, countAmountCharacters, groupAmountText } from '~/utils/amountText'
import { currencyDecimals } from '~/utils/money'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  modelValue?: string | number | null
  decimals?: number
  class?: HTMLAttributes['class']
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const allowedDecimals = computed(() => props.decimals ?? currencyDecimals())
const shownText = computed(() => groupAmountText(cleanAmountText(String(props.modelValue ?? ''), allowedDecimals.value)))

const onInput = (event: Event) => {
  const inputElement = event.target as HTMLInputElement
  const typedText = inputElement.value
  const amountCharactersBeforeCaret = countAmountCharacters(typedText.slice(0, inputElement.selectionStart ?? typedText.length))
  const cleanText = cleanAmountText(typedText, allowedDecimals.value)
  const groupedText = groupAmountText(cleanText)
  inputElement.value = groupedText
  const caretPosition = caretAfterAmountCharacters(groupedText, amountCharactersBeforeCaret)
  inputElement.setSelectionRange(caretPosition, caretPosition)
  emit('update:modelValue', cleanText)
}
</script>

<template>
  <input
    v-bind="$attrs"
    :value="shownText"
    type="text"
    :inputmode="allowedDecimals > 0 ? 'decimal' : 'numeric'"
    autocomplete="off"
    :class="cn('flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm tabular-nums shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50', props.class)"
    @input="onInput"
  >
</template>
