<script setup lang="ts">
import { PackageMinus, PackagePlus, RotateCcw, Scale, X } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import StockProductSearch from '@/components/stock/StockProductSearch.vue'
import type { AdjustmentReason, StockLevel } from '@/composables/useStock'
import { productLabel } from '@/composables/useStock'

const props = defineProps<{ initialLevel: StockLevel | null }>()
const emit = defineEmits<{ saved: [] }>()

const open = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
const { adjustStock, saving } = useStock()

const reasonChoices = computed<Array<{ reason: AdjustmentReason; label: string; hint: string; icon: any }>>(() => [
  { reason: 'purchase', label: t('stock.adjust.received'), hint: t('stock.adjust.receivedHint'), icon: PackagePlus },
  { reason: 'return', label: t('stock.adjust.returned'), hint: t('stock.adjust.returnedHint'), icon: RotateCcw },
  { reason: 'damage', label: t('stock.adjust.damaged'), hint: t('stock.adjust.damagedHint'), icon: PackageMinus },
  { reason: 'adjustment', label: t('stock.adjust.counted'), hint: t('stock.adjust.countedHint'), icon: Scale },
])

const chosenLevel = ref<StockLevel | null>(null)
const reason = ref<AdjustmentReason>('purchase')
const amountText = ref('')
const reference = ref('')

const isCounting = computed(() => reason.value === 'adjustment')
const amount = computed(() => {
  const trimmedAmount = amountText.value.trim()
  const parsedAmount = Number(trimmedAmount)
  return trimmedAmount !== '' && Number.isInteger(parsedAmount) && parsedAmount >= 0 ? parsedAmount : null
})
const change = computed(() => {
  if (amount.value == null || !chosenLevel.value) return null
  if (isCounting.value) return amount.value - chosenLevel.value.quantity
  if (reason.value === 'damage') return -amount.value
  return amount.value
})
const quantityAfter = computed(() => (chosenLevel.value && change.value != null ? chosenLevel.value.quantity + change.value : null))

watch(open, isOpen => {
  if (!isOpen) return
  chosenLevel.value = props.initialLevel
  reason.value = 'purchase'
  amountText.value = ''
  reference.value = ''
})

const submit = async () => {
  if (!chosenLevel.value) {
    toast.error(t('stock.adjust.errors.chooseProduct'))
    return
  }
  if (change.value == null) {
    toast.error(t('stock.adjust.errors.badNumber'))
    return
  }
  if (change.value === 0) {
    toast.error(isCounting.value ? t('stock.adjust.errors.countMatches') : t('stock.adjust.errors.quantityRequired'))
    return
  }
  if (quantityAfter.value != null && quantityAfter.value < 0) {
    toast.error(t('stock.adjust.errors.notEnough', { quantity: chosenLevel.value.quantity, unit: chosenLevel.value.unit }))
    return
  }
  try {
    await adjustStock({
      product_id: chosenLevel.value.product_id,
      reason: reason.value,
      change: change.value,
      reference: reference.value.trim() || null,
    })
    emit('saved')
    open.value = false
  } catch {
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{{ t('stock.page.changeStock') }}</DialogTitle>
        <DialogDescription>{{ t('stock.adjust.description') }}</DialogDescription>
      </DialogHeader>

      <div class="flex flex-col gap-4">
        <div v-if="chosenLevel" class="flex items-center gap-3 rounded-lg border px-3 py-2">
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium">{{ productLabel(chosenLevel) }}</p>
            <p class="text-xs text-muted-foreground tabular-nums">{{ t('stock.adjust.inStock', { quantity: chosenLevel.quantity, unit: chosenLevel.unit }) }}</p>
          </div>
          <Button variant="ghost" size="icon" :aria-label="t('stock.adjust.chooseAnother')" @click="chosenLevel = null"><X /></Button>
        </div>
        <StockProductSearch v-else @pick="chosenLevel = $event" />

        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="choice in reasonChoices"
            :key="choice.reason"
            type="button"
            class="flex items-start gap-2 rounded-lg border p-3 text-left transition-colors hover:bg-accent"
            :class="reason === choice.reason ? 'border-primary bg-primary/5' : ''"
            :aria-pressed="reason === choice.reason"
            @click="reason = choice.reason"
          >
            <component :is="choice.icon" class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>
              <span class="block text-sm font-medium">{{ choice.label }}</span>
              <span class="block text-xs text-muted-foreground">{{ choice.hint }}</span>
            </span>
          </button>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="flex flex-col gap-1.5">
            <Label for="adjust-amount">{{ isCounting ? t('stock.adjust.countedOnShelf') : t('common.fields.quantity') }}</Label>
            <Input id="adjust-amount" v-model="amountText" inputmode="numeric" placeholder="0" />
          </div>
          <div class="flex flex-col gap-1.5">
            <Label>{{ t('stock.adjust.stockAfter') }}</Label>
            <p class="flex h-9 items-center text-sm tabular-nums" :class="quantityAfter != null && quantityAfter < 0 ? 'text-destructive' : ''">
              <template v-if="quantityAfter != null">{{ quantityAfter }} {{ chosenLevel?.unit }}</template>
              <template v-else>—</template>
            </p>
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <Label for="adjust-reference">{{ t('stock.adjust.note') }}</Label>
          <Input id="adjust-reference" v-model="reference" :placeholder="t('stock.adjust.notePlaceholder')" />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="open = false">{{ t('common.actions.cancel') }}</Button>
        <Button :disabled="saving" @click="submit">{{ t('common.actions.save') }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
