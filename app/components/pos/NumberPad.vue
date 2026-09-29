<script setup lang="ts">
import { CornerDownLeft, Delete } from 'lucide-vue-next'

export type NumberPadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '00' | '.' | 'back' | 'clear' | 'enter'

const props = withDefaults(defineProps<{ allowDecimal?: boolean; enterLabel?: string }>(), {
  allowDecimal: false,
})
const { t } = useI18n()
const emit = defineEmits<{ press: [key: NumberPadKey] }>()

const digitRows: NumberPadKey[][] = [['7', '8', '9'], ['4', '5', '6'], ['1', '2', '3']]
const bottomRow = computed<NumberPadKey[]>(() => (props.allowDecimal ? ['00', '0', '.'] : ['00', '0']))
</script>

<template>
  <div class="grid grid-cols-4 gap-1.5 select-none" role="group" :aria-label="t('pos.numpad.label')">
    <template v-for="(digitRow, rowIndex) in digitRows" :key="rowIndex">
      <button
        v-for="digit in digitRow"
        :key="digit"
        type="button"
        class="h-11 rounded-lg border bg-background text-lg font-semibold tabular-nums transition-colors hover:bg-muted active:scale-95 active:bg-muted"
        @mousedown.prevent
        @click="emit('press', digit)"
      >
        {{ digit }}
      </button>
      <button
        v-if="rowIndex === 0"
        type="button"
        class="flex h-11 items-center justify-center rounded-lg border bg-background transition-colors hover:bg-muted active:scale-95"
        :aria-label="t('pos.numpad.deleteLast')"
        @mousedown.prevent
        @click="emit('press', 'back')"
      >
        <Delete class="size-5" />
      </button>
      <button
        v-else-if="rowIndex === 1"
        type="button"
        class="h-11 rounded-lg border bg-background text-sm font-medium text-destructive transition-colors hover:bg-muted active:scale-95"
        @mousedown.prevent
        @click="emit('press', 'clear')"
      >
        {{ t('pos.numpad.clear') }}
      </button>
      <button
        v-else
        type="button"
        class="row-span-2 flex flex-col items-center justify-center gap-1 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 active:scale-95"
        @mousedown.prevent
        @click="emit('press', 'enter')"
      >
        <CornerDownLeft class="size-5" />
        {{ enterLabel ?? t('pos.numpad.ok') }}
      </button>
    </template>
    <div class="col-span-3 grid gap-1.5" :class="bottomRow.length === 3 ? 'grid-cols-3' : 'grid-cols-2'">
      <button
        v-for="bottomKey in bottomRow"
        :key="bottomKey"
        type="button"
        class="h-11 rounded-lg border bg-background text-lg font-semibold tabular-nums transition-colors hover:bg-muted active:scale-95"
        @mousedown.prevent
        @click="emit('press', bottomKey)"
      >
        {{ bottomKey }}
      </button>
    </div>
  </div>
</template>
