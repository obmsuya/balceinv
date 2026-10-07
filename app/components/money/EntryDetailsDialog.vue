<script setup lang="ts">
import { ImageIcon, Undo2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import type { BooksEntry } from '@/composables/useMoney'
import { accountName, entryPlaces, entryTitle } from '@/composables/useMoney'
import { formatMoney } from '~/utils/money'

const props = defineProps<{ entry: BooksEntry | null; showLines: boolean }>()
const emit = defineEmits<{ reversed: [] }>()
const open = defineModel<boolean>('open', { default: false })

const { t, formatDate, formatDateTime } = useI18n()
const { canDelete } = usePermissions()
const { reverseEntry, receiptPhotoUrl, saving } = useMoney()

const isReversing = ref(false)
const reason = ref('')
const photoUrl = ref<string | null>(null)

const automaticSources = ['sale', 'sale_void', 'stock_adjustment', 'stock_transfer', 'purchase', 'supplier_payment', 'supplier_return', 'customer_payment', 'order_deposit', 'order_refund']
const canReverse = computed(() => canDelete('accounting') && props.entry?.is_reversible === true)
const isAutomatic = computed(() => automaticSources.includes(props.entry?.source_type ?? ''))
const sourceLink = computed(() => {
  const entry = props.entry
  if (!entry) return null
  const isSaleRecord = (entry.source_type === 'sale' || entry.source_type === 'sale_void') && entry.source_id
  if (isSaleRecord) return { to: `/receipts/${entry.source_id}`, label: t('money.entries.openSale') }
  if (entry.party_type === 'customer' && entry.party_id) return { to: `/customers/${entry.party_id}`, label: t('money.entries.openCustomer') }
  if (entry.party_type === 'supplier' && entry.party_id) return { to: `/suppliers/${entry.party_id}`, label: t('money.entries.openSupplier') }
  return null
})
const totalDebit = computed(() => props.entry?.lines.reduce((total, line) => total + line.debit, 0) ?? 0)
const totalCredit = computed(() => props.entry?.lines.reduce((total, line) => total + line.credit, 0) ?? 0)

const forgetPhoto = () => {
  if (photoUrl.value) URL.revokeObjectURL(photoUrl.value)
  photoUrl.value = null
}

watch(open, isOpen => {
  isReversing.value = false
  reason.value = ''
  if (!isOpen) forgetPhoto()
})

const showPhoto = async () => {
  if (!props.entry) return
  photoUrl.value = await receiptPhotoUrl(props.entry.id)
}

const confirmReverse = async () => {
  if (!props.entry) return
  if (reason.value.trim().length < 3) {
    toast.error(t('money.reverse.reasonRequired'))
    return
  }
  const reversal = await reverseEntry(props.entry.id, reason.value.trim())
  if (!reversal) return
  emit('reversed')
  open.value = false
}

onBeforeUnmount(forgetPhoto)
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent v-if="entry" class="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{{ entryTitle(entry) }} · {{ formatMoney(entry.amount) }}</DialogTitle>
        <DialogDescription>
          {{ t('money.entries.detailTitle', { number: entry.number }) }} · {{ formatDate(`${entry.entry_date}T12:00:00`) }}
        </DialogDescription>
      </DialogHeader>

      <dl class="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
        <div v-if="entryPlaces(entry)"><dt class="text-muted-foreground">{{ t('money.entries.place') }}</dt><dd>{{ entryPlaces(entry) }}</dd></div>
        <div v-if="entry.shop_name"><dt class="text-muted-foreground">{{ t('money.form.shop') }}</dt><dd>{{ entry.shop_name }}</dd></div>
        <div v-if="entry.party_name"><dt class="text-muted-foreground">{{ entry.party_type === 'customer' ? t('money.entries.customer') : t('money.entries.supplier') }}</dt><dd>{{ entry.party_name }}</dd></div>
        <div v-if="entry.paid_to_name"><dt class="text-muted-foreground">{{ t('money.form.paidTo') }}</dt><dd>{{ entry.paid_to_name }}</dd></div>
        <div v-if="entry.memo" class="sm:col-span-2"><dt class="text-muted-foreground">{{ t('money.entries.memo') }}</dt><dd class="break-words">{{ entry.memo }}</dd></div>
        <div v-if="entry.receipt_number"><dt class="text-muted-foreground">{{ t('money.entries.receiptNumber') }}</dt><dd>{{ entry.receipt_number }}</dd></div>
        <div v-if="entry.supplier_tin"><dt class="text-muted-foreground">{{ t('money.entries.supplierTin') }}</dt><dd>{{ entry.supplier_tin }}</dd></div>
        <div v-if="entry.created_by_name"><dt class="text-muted-foreground">{{ t('money.entries.createdBy') }}</dt><dd>{{ entry.created_by_name }}</dd></div>
        <div><dt class="text-muted-foreground">{{ t('money.entries.createdAt') }}</dt><dd>{{ formatDateTime(entry.created_at) }}</dd></div>
      </dl>

      <p v-if="isAutomatic" class="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{{ t('money.entries.automatic') }}</p>
      <NuxtLink v-if="sourceLink" :to="sourceLink.to" class="text-sm font-medium text-primary underline-offset-4 hover:underline" @click="open = false">{{ sourceLink.label }} →</NuxtLink>
      <p v-if="entry.reversed_by_entry_id" class="rounded-lg bg-muted px-3 py-2 text-sm">{{ t('money.entries.reversedByEntry') }}</p>
      <p v-if="entry.reverses_entry_id" class="rounded-lg bg-muted px-3 py-2 text-sm">{{ t('money.entries.reversesEntry') }}</p>

      <div v-if="showLines" class="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{{ t('money.entries.account') }}</TableHead>
              <TableHead class="text-right">{{ t('money.entries.debit') }}</TableHead>
              <TableHead class="text-right">{{ t('money.entries.credit') }}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="line in entry.lines" :key="line.line_no">
              <TableCell>
                <span class="font-mono text-xs text-muted-foreground">{{ line.account_code }}</span> {{ accountName(line) }}
                <span v-if="line.shop_name" class="block text-xs text-muted-foreground">{{ line.shop_name }}</span>
              </TableCell>
              <TableCell class="text-right tabular-nums">{{ line.debit ? formatMoney(line.debit) : '' }}</TableCell>
              <TableCell class="text-right tabular-nums">{{ line.credit ? formatMoney(line.credit) : '' }}</TableCell>
            </TableRow>
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell>{{ t('money.entries.totals') }}</TableCell>
              <TableCell class="text-right tabular-nums">{{ formatMoney(totalDebit) }}</TableCell>
              <TableCell class="text-right tabular-nums">{{ formatMoney(totalCredit) }}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      <div v-if="entry.has_attachment">
        <img v-if="photoUrl" :src="photoUrl" :alt="t('money.form.photo')" class="max-h-96 w-full rounded-lg border object-contain">
        <Button v-else variant="outline" @click="showPhoto"><ImageIcon /> {{ t('money.actions.viewPhoto') }}</Button>
      </div>

      <div v-if="isReversing" class="flex flex-col gap-2 rounded-lg border border-destructive/40 p-3">
        <p class="font-medium">{{ t('money.reverse.title') }}</p>
        <p class="text-sm text-muted-foreground">{{ t('money.reverse.description') }}</p>
        <Label for="reverse-reason">{{ t('money.reverse.reason') }}</Label>
        <Textarea id="reverse-reason" v-model="reason" :placeholder="t('money.reverse.reasonPlaceholder')" maxlength="300" />
      </div>

      <DialogFooter class="gap-2">
        <Button variant="outline" @click="open = false">{{ t('common.actions.close') }}</Button>
        <template v-if="canReverse">
          <Button v-if="!isReversing" variant="destructive" @click="isReversing = true"><Undo2 /> {{ t('money.actions.reverse') }}</Button>
          <Button v-else variant="destructive" :disabled="saving" @click="confirmReverse">{{ t('money.reverse.confirm') }}</Button>
        </template>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
