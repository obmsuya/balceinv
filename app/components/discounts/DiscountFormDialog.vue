<script setup lang="ts">
import { Percent, Tag, X } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import ProductSearch from '@/components/products/ProductSearch.vue'
import type { Discount, DiscountKind } from '@/composables/useDiscounts'
import { currencyCode, inputTextToMinor, minorToInputText } from '~/utils/money'

const props = defineProps<{ discount: Discount | null }>()
const emit = defineEmits<{ saved: [] }>()

const open = defineModel<boolean>('open', { default: false })

const { saveDiscount, saving } = useDiscounts()

const name = ref('')
const kind = ref<DiscountKind>('percent')
const valueText = ref('')
const target = ref<{ id: string; label: string } | null>(null)
const startsAt = ref('')
const endsAt = ref('')

const toLocalInput = (date: Date): string => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return localDate.toISOString().slice(0, 16)
}

watch(open, isOpen => {
  if (!isOpen) return
  const existing = props.discount
  name.value = existing?.name ?? ''
  kind.value = existing?.kind ?? 'percent'
  valueText.value = existing ? (existing.kind === 'percent' ? String(existing.value / 100) : minorToInputText(existing.value)) : ''
  target.value = existing?.product_id
    ? { id: existing.product_id, label: existing.variant_label ? `${existing.product_name} · ${existing.variant_label}` : existing.product_name ?? '' }
    : null
  const now = new Date()
  startsAt.value = toLocalInput(existing ? new Date(existing.starts_at) : now)
  endsAt.value = toLocalInput(existing ? new Date(existing.ends_at) : new Date(now.getTime() + 7 * 24 * 3600 * 1000))
})

const readValue = (): number | null => {
  if (kind.value === 'fixed') {
    const minorUnits = inputTextToMinor(valueText.value)
    return minorUnits != null && !Number.isNaN(minorUnits) && minorUnits > 0 ? minorUnits : null
  }
  const percent = Number(valueText.value.replace(',', '.').trim())
  const basisPoints = Math.round(percent * 100)
  return Number.isFinite(percent) && basisPoints >= 1 && basisPoints <= 10000 ? basisPoints : null
}

const submit = async () => {
  if (!name.value.trim()) {
    toast.error('Give the discount a name')
    return
  }
  const discountValue = readValue()
  if (discountValue == null) {
    toast.error(kind.value === 'percent' ? 'Enter a percentage between 0.01 and 100' : 'Enter an amount above zero')
    return
  }
  const startDate = new Date(startsAt.value)
  const endDate = new Date(endsAt.value)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
    toast.error('The discount must end after it starts')
    return
  }
  try {
    await saveDiscount(props.discount?.id ?? null, {
      name: name.value.trim(),
      product_id: target.value?.id ?? null,
      kind: kind.value,
      value: discountValue,
      starts_at: startDate.toISOString(),
      ends_at: endDate.toISOString(),
      is_active: props.discount ? true : undefined,
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
        <DialogTitle>{{ discount ? 'Edit discount' : 'New discount' }}</DialogTitle>
        <DialogDescription>The till applies the best running discount to each item. Wholesale prices are never discounted.</DialogDescription>
      </DialogHeader>

      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1.5">
          <Label for="discount-name">Name</Label>
          <Input id="discount-name" v-model="name" placeholder="Weekend offer" />
        </div>

        <div class="flex flex-col gap-1.5">
          <Label>Applies to</Label>
          <div v-if="target" class="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
            <span class="flex-1 truncate">{{ target.label }}</span>
            <Button variant="ghost" size="icon" class="size-7" aria-label="Apply to every product" @click="target = null"><X /></Button>
          </div>
          <template v-else>
            <p class="text-sm text-muted-foreground">Every product. Pick one below to limit it.</p>
            <ProductSearch @pick="product => target = { id: product.id, label: product.name }" />
          </template>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="choice in [{ kind: 'percent', label: 'Percentage', icon: Percent }, { kind: 'fixed', label: 'Amount off each', icon: Tag }]"
            :key="choice.kind"
            type="button"
            class="flex items-center gap-2 rounded-lg border p-3 text-left text-sm transition-colors hover:bg-accent"
            :class="kind === choice.kind ? 'border-primary bg-primary/5' : ''"
            :aria-pressed="kind === choice.kind"
            @click="kind = choice.kind as DiscountKind"
          >
            <component :is="choice.icon" class="size-4 text-muted-foreground" />
            {{ choice.label }}
          </button>
        </div>

        <div class="flex flex-col gap-1.5">
          <Label for="discount-value">{{ kind === 'percent' ? 'Percent off' : `Amount off each (${currencyCode()})` }}</Label>
          <Input id="discount-value" v-model="valueText" inputmode="decimal" :placeholder="kind === 'percent' ? '10' : '500'" />
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="flex flex-col gap-1.5">
            <Label for="discount-starts">Starts</Label>
            <Input id="discount-starts" v-model="startsAt" type="datetime-local" />
          </div>
          <div class="flex flex-col gap-1.5">
            <Label for="discount-ends">Ends</Label>
            <Input id="discount-ends" v-model="endsAt" type="datetime-local" />
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="open = false">Cancel</Button>
        <Button :disabled="saving" @click="submit">{{ discount ? 'Save' : 'Create discount' }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
