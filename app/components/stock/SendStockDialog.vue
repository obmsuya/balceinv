<script setup lang="ts">
import { Trash2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import StockProductSearch from '@/components/stock/StockProductSearch.vue'
import type { StockLevel } from '@/composables/useStock'
import { productLabel } from '@/composables/useStock'

interface TransferRow {
  level: StockLevel
  quantityText: string
}

const emit = defineEmits<{ sent: [] }>()

const open = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
const { user } = useAuth()
const { sendStock, saving } = useTransfers()

const destinationShopId = ref('')
const note = ref('')
const rows = ref<TransferRow[]>([])

const currentShopName = computed(() => user.value?.shops.find(shop => shop.id === user.value?.shop_id)?.name ?? t('stock.send.thisShop'))
const destinationShops = computed(() => (user.value?.shops ?? []).filter(shop => shop.id !== user.value?.shop_id))
const chosenProductIds = computed(() => rows.value.map(row => row.level.product_id))

watch(open, isOpen => {
  if (!isOpen) return
  destinationShopId.value = destinationShops.value.length === 1 ? destinationShops.value[0]!.id : ''
  note.value = ''
  rows.value = []
})

const addRow = (level: StockLevel) => {
  rows.value.push({ level, quantityText: '1' })
}

const rowQuantity = (row: TransferRow): number | null => {
  const parsedQuantity = Number(row.quantityText.trim())
  return Number.isInteger(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : null
}

const submit = async () => {
  if (!destinationShopId.value) {
    toast.error(t('stock.send.errors.chooseShop'))
    return
  }
  if (!rows.value.length) {
    toast.error(t('stock.send.errors.noProducts'))
    return
  }
  const badRow = rows.value.find(row => rowQuantity(row) == null)
  if (badRow) {
    toast.error(t('stock.send.errors.badQuantity', { product: productLabel(badRow.level) }))
    return
  }
  const shortRow = rows.value.find(row => (rowQuantity(row) ?? 0) > row.level.quantity)
  if (shortRow) {
    toast.error(t('stock.send.errors.notEnough', { quantity: shortRow.level.quantity, unit: shortRow.level.unit, product: productLabel(shortRow.level) }))
    return
  }
  try {
    await sendStock({
      to_shop_id: destinationShopId.value,
      note: note.value.trim() || null,
      items: rows.value.map(row => ({ product_id: row.level.product_id, quantity: rowQuantity(row)! })),
    })
    emit('sent')
    open.value = false
  } catch {
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{{ t('stock.page.sendStock') }}</DialogTitle>
        <DialogDescription>{{ t('stock.send.description', { shop: currentShopName }) }}</DialogDescription>
      </DialogHeader>

      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1.5">
          <Label>{{ t('stock.send.sendTo') }}</Label>
          <Select v-model="destinationShopId">
            <SelectTrigger :aria-label="t('stock.send.destinationShop')">
              <SelectValue :placeholder="t('stock.send.chooseShop')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="shop in destinationShops" :key="shop.id" :value="shop.id">{{ shop.name }}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="flex flex-col gap-1.5">
          <Label>{{ t('stock.send.products') }}</Label>
          <StockProductSearch :exclude-ids="chosenProductIds" :placeholder="t('stock.send.searchPlaceholder')" @pick="addRow" />
        </div>

        <div v-for="(row, rowIndex) in rows" :key="row.level.product_id" class="flex items-center gap-2 rounded-lg border px-3 py-2">
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium">{{ productLabel(row.level) }}</p>
            <p class="text-xs text-muted-foreground tabular-nums">{{ t('stock.send.here', { quantity: row.level.quantity, unit: row.level.unit }) }}</p>
          </div>
          <Input v-model="row.quantityText" inputmode="numeric" class="w-20" :aria-label="t('stock.send.quantityOf', { product: productLabel(row.level) })" />
          <Button variant="ghost" size="icon" :aria-label="t('stock.send.remove', { product: productLabel(row.level) })" @click="rows.splice(rowIndex, 1)">
            <Trash2 class="text-destructive" />
          </Button>
        </div>

        <div class="flex flex-col gap-1.5">
          <Label for="transfer-note">{{ t('stock.adjust.note') }}</Label>
          <Input id="transfer-note" v-model="note" :placeholder="t('stock.send.notePlaceholder')" />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="open = false">{{ t('common.actions.cancel') }}</Button>
        <Button :disabled="saving" @click="submit">{{ t('stock.page.sendStock') }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
