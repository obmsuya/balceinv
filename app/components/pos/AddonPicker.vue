<script setup lang="ts">
import { Check } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { ProductAddon } from '@/composables/useAddons'
import type { CartAddon } from '@/composables/useCart'
import { formatMoney } from '~/utils/money'

const props = defineProps<{ productName: string; addons: ProductAddon[] }>()
const emit = defineEmits<{ confirm: [addons: CartAddon[]] }>()

const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()

const chosenIds = ref<string[]>([])

watch(open, isOpen => {
  if (isOpen) chosenIds.value = []
})

const toggle = (addonId: string) => {
  chosenIds.value = chosenIds.value.includes(addonId) ? chosenIds.value.filter(chosenId => chosenId !== addonId) : [...chosenIds.value, addonId]
}

const confirm = () => {
  const chosenAddons = props.addons
    .filter(addon => chosenIds.value.includes(addon.id))
    .map(addon => ({ id: addon.id, name: addon.name, price: addon.price }))
  open.value = false
  emit('confirm', chosenAddons)
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ productName }}</DialogTitle>
        <DialogDescription>{{ t('pos.addons.description') }}</DialogDescription>
      </DialogHeader>
      <div class="flex flex-col gap-2">
        <button
          v-for="addon in addons"
          :key="addon.id"
          type="button"
          class="flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors hover:bg-accent"
          :class="chosenIds.includes(addon.id) ? 'border-primary bg-primary/5' : ''"
          :aria-pressed="chosenIds.includes(addon.id)"
          @click="toggle(addon.id)"
        >
          <span class="flex size-5 items-center justify-center rounded border" :class="chosenIds.includes(addon.id) ? 'border-primary bg-primary text-primary-foreground' : ''">
            <Check v-if="chosenIds.includes(addon.id)" class="size-3.5" />
          </span>
          <span class="flex-1 text-sm font-medium">{{ addon.name }}</span>
          <span class="text-sm tabular-nums text-muted-foreground">+ {{ formatMoney(addon.price) }}</span>
        </button>
      </div>
      <DialogFooter>
        <Button @click="confirm">{{ chosenIds.length ? t('pos.addons.addWith') : t('pos.addons.addWithout') }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
