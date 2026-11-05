<script setup lang="ts">
import { Eye, EyeOff, ImageIcon, LayoutTemplate, RotateCcw, Save } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import type { InvoicePart } from '@/composables/useSettings'
import { invoiceParts } from '@/composables/useSettings'

defineProps<{ canEdit: boolean }>()

const { t } = useI18n()
const { settings, updateSettings } = useSettings()

const hiddenParts = ref<InvoicePart[]>([])
const hoveredPart = ref<InvoicePart | null>(null)
const saving = ref(false)

const savedParts = computed(() => settings.value?.company.invoice_hidden_parts ?? [])
watch(savedParts, parts => hiddenParts.value = [...parts], { immediate: true })

const brandColor = computed(() => ({ backgroundColor: settings.value?.company.primary_color ?? '#5ea500' }))
const isHidden = (part: InvoicePart) => hiddenParts.value.includes(part)
const shownCount = computed(() => invoiceParts.length - hiddenParts.value.length)
const isUnchanged = computed(() => hiddenParts.value.length === savedParts.value.length && hiddenParts.value.every(part => savedParts.value.includes(part)))

const setShown = (part: InvoicePart, shown: boolean) => {
  hiddenParts.value = shown ? hiddenParts.value.filter(hiddenPart => hiddenPart !== part) : [...hiddenParts.value, part]
}
const toggle = (part: InvoicePart) => setShown(part, isHidden(part))

const partClass = (part: InvoicePart) => [
  'rounded-[3px] outline-none transition-all duration-300 focus-visible:ring-2 focus-visible:ring-primary',
  isHidden(part) ? 'opacity-25 grayscale [background-image:repeating-linear-gradient(135deg,transparent_0_3px,rgb(0_0_0/0.12)_3px_4px)]' : 'hover:ring-2 hover:ring-primary/50',
  hoveredPart.value === part ? 'ring-2 ring-primary ring-offset-1 ring-offset-white' : '',
]
const columnClass = (part: InvoicePart) => [
  'transition-all duration-300',
  isHidden(part) ? 'opacity-25 [background-image:repeating-linear-gradient(135deg,transparent_0_3px,rgb(0_0_0/0.12)_3px_4px)]' : '',
  hoveredPart.value === part ? 'bg-primary/15' : '',
]

const save = async () => {
  saving.value = true
  try {
    await updateSettings({ invoice_hidden_parts: hiddenParts.value })
  } catch {
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Card>
    <CardHeader class="pb-3">
      <CardTitle class="flex items-center gap-2 text-base"><LayoutTemplate class="size-4" />{{ t('settings.invoiceLayout.title') }}</CardTitle>
      <CardDescription>{{ t('settings.invoiceLayout.description') }}</CardDescription>
    </CardHeader>
    <CardContent class="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <div class="mx-auto w-full max-w-[22rem] select-none rounded-md border bg-white p-3.5 text-[6px] leading-tight text-zinc-600 shadow-sm" aria-hidden="true">
        <div class="flex aspect-[1/1.25] flex-col gap-[7px]">
          <div class="flex items-center gap-2">
            <button type="button" tabindex="-1" class="flex size-8 shrink-0 items-center justify-center bg-zinc-200" :class="partClass('logo')" :disabled="!canEdit" @click="toggle('logo')" @mouseenter="hoveredPart = 'logo'" @mouseleave="hoveredPart = null">
              <ImageIcon class="size-3.5 text-zinc-400" />
            </button>
            <div class="flex flex-1 flex-col items-center gap-[3px]">
              <div class="h-[6px] w-2/3 rounded-full" :style="brandColor" />
              <div class="h-[3px] w-1/2 rounded-full bg-zinc-300" />
              <div class="h-[3px] w-1/3 rounded-full bg-zinc-300" />
            </div>
            <div class="size-8 shrink-0" />
          </div>
          <div class="h-[2px] rounded-full" :style="brandColor" />

          <div class="flex items-center">
            <div class="w-1/4" />
            <p class="flex-1 text-center text-[9px] font-bold tracking-wide text-zinc-800">{{ t('settings.invoiceLayout.sampleTitle') }}</p>
            <button type="button" tabindex="-1" class="w-1/4 border border-emerald-600 py-[2px] text-center font-bold text-emerald-700" :class="partClass('status')" :disabled="!canEdit" @click="toggle('status')" @mouseenter="hoveredPart = 'status'" @mouseleave="hoveredPart = null">
              {{ t('settings.invoiceLayout.sampleStamp') }}
            </button>
          </div>

          <div class="flex gap-2">
            <div class="flex flex-[54] flex-col gap-[3px] rounded-[2px] border border-zinc-400 p-1.5">
              <div class="h-[4px] w-1/2 rounded-full bg-zinc-700" />
              <div class="h-[3px] w-1/3 rounded-full bg-zinc-300" />
              <div class="h-[3px] w-2/5 rounded-full bg-zinc-300" />
            </div>
            <div class="flex flex-[42] flex-col">
              <div v-for="factRow in 3" :key="factRow" class="grid grid-cols-[2fr_3fr] border border-b-0 border-zinc-400">
                <div class="h-[7px] bg-zinc-100" />
                <div class="flex items-center justify-end border-l border-zinc-400 px-1"><div class="h-[3px] w-1/2 rounded-full bg-zinc-400" /></div>
              </div>
              <button type="button" tabindex="-1" class="flex flex-col" :class="partClass('tax_ids')" :disabled="!canEdit" @click="toggle('tax_ids')" @mouseenter="hoveredPart = 'tax_ids'" @mouseleave="hoveredPart = null">
                <div v-for="taxRow in ['TIN', 'VRN']" :key="taxRow" class="grid w-full grid-cols-[2fr_3fr] border border-zinc-400 [&:not(:last-child)]:border-b-0">
                  <div class="h-[7px] bg-zinc-100 px-1 text-left text-[5px] leading-[7px] text-zinc-500">{{ taxRow }}</div>
                  <div class="flex items-center justify-end border-l border-zinc-400 px-1"><div class="h-[3px] w-2/5 rounded-full bg-zinc-400" /></div>
                </div>
              </button>
            </div>
          </div>

          <button type="button" tabindex="-1" class="flex gap-2 py-[1px]" :class="partClass('issued_by')" :disabled="!canEdit" @click="toggle('issued_by')" @mouseenter="hoveredPart = 'issued_by'" @mouseleave="hoveredPart = null">
            <div class="h-[3px] w-1/5 rounded-full bg-zinc-300" />
            <div class="h-[3px] w-1/5 rounded-full bg-zinc-300" />
            <div class="h-[3px] w-1/6 rounded-full bg-zinc-300" />
          </button>

          <div class="rounded-[2px] border border-zinc-400">
            <div class="grid grid-cols-[8%_1fr_15%_9%_12%_15%] bg-zinc-100 text-[5px] font-bold uppercase text-zinc-700">
              <div class="px-[2px] py-[2px] text-center">{{ t('invoices.fields.quantity') }}</div>
              <div class="border-l border-zinc-400 px-[2px] py-[2px]">{{ t('invoices.fields.description') }}</div>
              <div class="border-l border-zinc-400 px-[2px] py-[2px] text-right">{{ t('invoices.fields.unitPrice') }}</div>
              <button type="button" tabindex="-1" class="border-l border-zinc-400 px-[2px] py-[2px] uppercase" :class="partClass('unit')" :disabled="!canEdit" @click="toggle('unit')" @mouseenter="hoveredPart = 'unit'" @mouseleave="hoveredPart = null">{{ t('invoices.fields.unit') }}</button>
              <button type="button" tabindex="-1" class="border-l border-zinc-400 px-[2px] py-[2px] text-right uppercase" :class="partClass('discount')" :disabled="!canEdit" @click="toggle('discount')" @mouseenter="hoveredPart = 'discount'" @mouseleave="hoveredPart = null">{{ t('invoices.fields.discount') }}</button>
              <div class="border-l border-zinc-400 px-[2px] py-[2px] text-right">{{ t('settings.invoiceLayout.sampleAmount') }}</div>
            </div>
            <div v-for="tableRow in 3" :key="tableRow" class="grid grid-cols-[8%_1fr_15%_9%_12%_15%] border-t border-zinc-400">
              <div class="flex items-start justify-center py-[3px]"><div class="h-[3px] w-1/3 rounded-full bg-zinc-400" /></div>
              <div class="flex flex-col gap-[2px] border-l border-zinc-400 p-[3px]">
                <div class="h-[3px] rounded-full bg-zinc-500" :class="tableRow === 1 ? 'w-4/5' : 'w-1/2'" />
                <button type="button" tabindex="-1" class="h-[3px] w-1/4 rounded-full bg-zinc-300" :class="partClass('sku')" :disabled="!canEdit" @click="toggle('sku')" @mouseenter="hoveredPart = 'sku'" @mouseleave="hoveredPart = null" />
              </div>
              <div class="flex justify-end border-l border-zinc-400 p-[3px]"><div class="h-[3px] w-2/3 rounded-full bg-zinc-400" /></div>
              <div class="flex justify-center border-l border-zinc-400 p-[3px]" :class="columnClass('unit')"><div class="h-[3px] w-2/3 rounded-full bg-zinc-300" /></div>
              <div class="flex justify-end border-l border-zinc-400 p-[3px]" :class="columnClass('discount')"><div v-if="tableRow === 1" class="h-[3px] w-1/2 rounded-full bg-zinc-300" /></div>
              <div class="flex justify-end border-l border-zinc-400 p-[3px]"><div class="h-[3px] w-3/4 rounded-full bg-zinc-500" /></div>
            </div>
          </div>

          <div class="flex gap-2">
            <div class="flex flex-[52] flex-col gap-[3px]">
              <p class="text-[5px] font-bold text-zinc-500">E. &amp; O.E.</p>
              <button type="button" tabindex="-1" class="flex flex-col gap-[3px] p-[1px]" :class="partClass('amount_in_words')" :disabled="!canEdit" @click="toggle('amount_in_words')" @mouseenter="hoveredPart = 'amount_in_words'" @mouseleave="hoveredPart = null">
                <div class="h-[3px] w-1/3 rounded-full" :style="brandColor" />
                <div class="h-[4px] w-4/5 -skew-x-12 rounded-full bg-zinc-600" />
              </button>
            </div>
            <div class="flex flex-[44] flex-col">
              <div v-for="totalRow in 3" :key="totalRow" class="grid grid-cols-[3fr_2fr] border border-b-0 border-zinc-400">
                <div class="flex items-center px-1"><div class="h-[3px] w-2/3 rounded-full bg-zinc-300" /></div>
                <div class="flex h-[7px] items-center justify-end border-l border-zinc-400 px-1"><div class="h-[3px] w-2/3 rounded-full bg-zinc-400" /></div>
              </div>
              <div class="grid grid-cols-[3fr_2fr] border border-zinc-400 bg-zinc-100">
                <div class="flex items-center px-1"><div class="h-[4px] w-3/4 rounded-full bg-zinc-700" /></div>
                <div class="flex h-[9px] items-center justify-end border-l border-zinc-400 px-1"><div class="h-[4px] w-3/4 rounded-full bg-zinc-800" /></div>
              </div>
            </div>
          </div>

          <div class="flex gap-2">
            <button type="button" tabindex="-1" class="flex flex-[52] flex-col gap-[3px] p-[1px]" :class="partClass('terms')" :disabled="!canEdit" @click="toggle('terms')" @mouseenter="hoveredPart = 'terms'" @mouseleave="hoveredPart = null">
              <div class="h-[3px] w-1/5 rounded-full" :style="brandColor" />
              <div class="h-[3px] w-11/12 rounded-full bg-zinc-300" />
              <div class="h-[3px] w-4/5 rounded-full bg-zinc-300" />
            </button>
            <button type="button" tabindex="-1" class="flex flex-[44] flex-col gap-[3px] p-[1px]" :class="partClass('payment_details')" :disabled="!canEdit" @click="toggle('payment_details')" @mouseenter="hoveredPart = 'payment_details'" @mouseleave="hoveredPart = null">
              <div class="h-[3px] w-1/4 rounded-full" :style="brandColor" />
              <div class="h-[3px] w-2/3 rounded-full bg-zinc-300" />
              <div class="h-[3px] w-1/2 rounded-full bg-zinc-300" />
            </button>
          </div>

          <button type="button" tabindex="-1" class="mt-auto grid grid-cols-3 gap-3 p-[1px] pt-2" :class="partClass('signatures')" :disabled="!canEdit" @click="toggle('signatures')" @mouseenter="hoveredPart = 'signatures'" @mouseleave="hoveredPart = null">
            <div v-for="signature in 3" :key="signature" class="flex flex-col gap-[2px]">
              <div class="h-[1px] bg-zinc-700" />
              <div class="h-[3px] w-2/3 rounded-full bg-zinc-300" />
            </div>
          </button>
        </div>
      </div>

      <div class="flex min-w-0 flex-col gap-3">
        <ul class="grid gap-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <li v-for="part in invoiceParts" :key="part">
            <label
              class="flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted"
              :class="hoveredPart === part ? 'bg-muted' : ''"
              @mouseenter="hoveredPart = part"
              @mouseleave="hoveredPart = null"
            >
              <Switch class="mt-0.5" :model-value="!isHidden(part)" :disabled="!canEdit" @update:model-value="shown => setShown(part, shown)" />
              <span class="min-w-0">
                <span class="flex items-center gap-1.5 text-sm font-medium" :class="isHidden(part) ? 'text-muted-foreground line-through decoration-muted-foreground/60' : ''">
                  {{ t(`settings.invoiceLayout.parts.${part}.label`) }}
                </span>
                <span class="block text-xs text-muted-foreground">{{ t(`settings.invoiceLayout.parts.${part}.hint`) }}</span>
              </span>
            </label>
          </li>
        </ul>
        <div class="mt-auto flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          <p class="flex items-center gap-1.5 text-sm text-muted-foreground">
            <component :is="hiddenParts.length ? EyeOff : Eye" class="size-4" />
            {{ t('settings.invoiceLayout.shownCount', { shown: shownCount, total: invoiceParts.length }) }}
          </p>
          <div v-if="canEdit" class="flex gap-2">
            <Button v-if="hiddenParts.length" variant="ghost" size="sm" @click="hiddenParts = []">
              <RotateCcw class="size-4" />{{ t('settings.invoiceLayout.showAll') }}
            </Button>
            <Button size="sm" :disabled="saving || isUnchanged" @click="save">
              <Save class="size-4" />{{ saving ? t('common.actions.saving') : t('settings.invoiceLayout.save') }}
            </Button>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
