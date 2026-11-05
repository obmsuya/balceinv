<script setup lang="ts">
import MoneyInput from '@/components/MoneyInput.vue'
import { Button } from '@/components/ui/button'
import HelpTip from '@/components/HelpTip.vue'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { WingaLineInput } from '@/composables/useSales'
import { formatMoney, inputTextToMinor } from '~/utils/money'

const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ add: [wingaLine: WingaLineInput] }>()

const { t } = useI18n()

const name = ref('')
const quantityText = ref('1')
const priceText = ref('')
const shareText = ref('')

watch(open, (isOpen) => {
  if (!isOpen) return
  name.value = ''
  quantityText.value = '1'
  priceText.value = ''
  shareText.value = ''
})

const quantity = computed(() => {
  const parsedQuantity = Number(quantityText.value)
  return Number.isInteger(parsedQuantity) && parsedQuantity >= 1 && parsedQuantity <= 100000 ? parsedQuantity : null
})
const unitPrice = computed(() => inputTextToMinor(priceText.value))
const wingaShare = computed(() => (shareText.value.trim() ? inputTextToMinor(shareText.value) : 0))
const lineTotal = computed(() => (quantity.value && unitPrice.value ? quantity.value * unitPrice.value : 0))
const shareTooHigh = computed(() => (wingaShare.value ?? 0) > lineTotal.value)
const canAdd = computed(() => name.value.trim() !== '' && quantity.value !== null && (unitPrice.value ?? 0) > 0 && wingaShare.value !== null && !shareTooHigh.value)

const add = () => {
  if (!canAdd.value) return
  emit('add', { name: name.value.trim(), quantity: quantity.value!, unit_price: unitPrice.value!, winga_share: wingaShare.value ?? 0 })
  open.value = false
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ t('pos.winga.title') }}</DialogTitle>
        <DialogDescription>{{ t('pos.winga.description') }}</DialogDescription>
      </DialogHeader>
      <form class="grid gap-4" @submit.prevent="add">
        <div class="grid gap-1.5">
          <Label for="winga-name">{{ t('pos.winga.name') }}</Label>
          <Input id="winga-name" v-model="name" maxlength="120" :placeholder="t('pos.winga.namePlaceholder')" />
        </div>
        <div class="grid grid-cols-[6rem_1fr] gap-3">
          <div class="grid gap-1.5">
            <Label for="winga-quantity">{{ t('pos.winga.quantity') }}</Label>
            <Input id="winga-quantity" v-model="quantityText" inputmode="numeric" class="tabular-nums" />
          </div>
          <div class="grid gap-1.5">
            <Label for="winga-price">{{ t('pos.winga.price') }}</Label>
            <MoneyInput id="winga-price" v-model="priceText" placeholder="25,000" />
          </div>
        </div>
        <div class="grid gap-1.5">
          <div class="flex items-center gap-1">
            <Label for="winga-share">{{ t('pos.winga.share') }}</Label>
            <HelpTip :title="t('common.help.brkShareTitle')" :text="t('common.help.brkShareText')" />
          </div>
          <MoneyInput id="winga-share" v-model="shareText" :placeholder="t('pos.winga.sharePlaceholder')" />
          <p class="text-xs" :class="shareTooHigh ? 'text-destructive' : 'text-muted-foreground'">
            {{ shareTooHigh ? t('pos.winga.shareTooHigh') : t('pos.winga.shareHelp') }}
          </p>
        </div>
        <DialogFooter class="items-center gap-2 sm:justify-between">
          <span class="text-sm text-muted-foreground tabular-nums">{{ t('pos.winga.lineTotal', { amount: formatMoney(lineTotal) }) }}</span>
          <Button type="submit" :disabled="!canAdd">{{ t('pos.winga.add') }}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
