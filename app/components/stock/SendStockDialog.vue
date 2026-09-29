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

const { user } = useAuth()
const { sendStock, saving } = useTransfers()

const destinationShopId = ref('')
const note = ref('')
const rows = ref<TransferRow[]>([])

const currentShopName = computed(() => user.value?.shops.find(shop => shop.id === user.value?.shop_id)?.name ?? 'this shop')
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
    toast.error('Choose the shop to send to')
    return
  }
  if (!rows.value.length) {
    toast.error('Add at least one product')
    return
  }
  const badRow = rows.value.find(row => rowQuantity(row) == null)
  if (badRow) {
    toast.error(`Enter a whole number above zero for ${productLabel(badRow.level)}`)
    return
  }
  const shortRow = rows.value.find(row => (rowQuantity(row) ?? 0) > row.level.quantity)
  if (shortRow) {
    toast.error(`Only ${shortRow.level.quantity} ${shortRow.level.unit} of ${productLabel(shortRow.level)} here`)
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
        <DialogTitle>Send stock</DialogTitle>
        <DialogDescription>From {{ currentShopName }}. The stock arrives in the other shop straight away.</DialogDescription>
      </DialogHeader>

      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1.5">
          <Label>Send to</Label>
          <Select v-model="destinationShopId">
            <SelectTrigger aria-label="Destination shop">
              <SelectValue placeholder="Choose a shop" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="shop in destinationShops" :key="shop.id" :value="shop.id">{{ shop.name }}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="flex flex-col gap-1.5">
          <Label>Products</Label>
          <StockProductSearch :exclude-ids="chosenProductIds" placeholder="Add a product by name or SKU" @pick="addRow" />
        </div>

        <div v-for="(row, rowIndex) in rows" :key="row.level.product_id" class="flex items-center gap-2 rounded-lg border px-3 py-2">
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium">{{ productLabel(row.level) }}</p>
            <p class="text-xs text-muted-foreground tabular-nums">{{ row.level.quantity }} {{ row.level.unit }} here</p>
          </div>
          <Input v-model="row.quantityText" inputmode="numeric" class="w-20" :aria-label="`Quantity of ${productLabel(row.level)}`" />
          <Button variant="ghost" size="icon" :aria-label="`Remove ${productLabel(row.level)}`" @click="rows.splice(rowIndex, 1)">
            <Trash2 class="text-destructive" />
          </Button>
        </div>

        <div class="flex flex-col gap-1.5">
          <Label for="transfer-note">Note (optional)</Label>
          <Input id="transfer-note" v-model="note" placeholder="Driver, vehicle or reason" />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="open = false">Cancel</Button>
        <Button :disabled="saving" @click="submit">Send stock</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
