<script setup lang="ts">
import { CircleCheck, CircleX, Copy, DatabaseBackup, LoaderCircle, ShieldCheck } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { CountCheck } from '@/composables/useOldData'
import { formatDate, formatNumber } from '~/utils/i18n'
import { formatMoney } from '~/utils/money'

const open = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
const { preview, previewError, isLoadingPreview, isImporting, importResult, mismatch, loadPreview, importOldData } = useOldData()

const businessName = ref('')
const ownerId = ref('')
const copiedPassword = ref('')

const dialogOpen = computed({
  get: () => open.value,
  set: (isOpen: boolean) => {
    if (!isOpen && isImporting.value) return
    if (!isOpen && importResult.value) {
      goToSignIn()
      return
    }
    open.value = isOpen
  },
})

const previewCounts = computed(() => {
  const counts = preview.value?.counts
  if (!counts) return []
  return [
    { label: t('setup.importOld.counts.products'), value: counts.products },
    { label: t('setup.importOld.counts.users'), value: counts.users },
    { label: t('setup.importOld.counts.sales'), value: counts.sales },
    { label: t('setup.importOld.counts.saleLines'), value: counts.sale_lines },
    { label: t('setup.importOld.counts.suppliers'), value: counts.suppliers },
    { label: t('setup.importOld.counts.discounts'), value: counts.discounts },
  ]
})

const salesRange = computed(() => {
  const firstSaleAt = preview.value?.first_sale_at
  const lastSaleAt = preview.value?.last_sale_at
  if (!firstSaleAt || !lastSaleAt) return t('setup.importOld.noSales')
  return t('setup.importOld.salesRange', { from: formatDate(firstSaleAt), to: formatDate(lastSaleAt) })
})

const shownSelfCheck = computed(() => importResult.value?.self_check ?? mismatch.value)

const checkRows = computed(() => {
  const selfCheck = shownSelfCheck.value
  if (!selfCheck) return []
  const countRow = (label: string, check: CountCheck) => ({ label, check, old: formatNumber(check.old), new: formatNumber(check.new) })
  const moneyRow = (label: string, check: CountCheck) => ({ label, check, old: formatMoney(check.old), new: formatMoney(check.new) })
  const rows = [
    countRow(t('setup.importOld.check.products'), selfCheck.products),
    countRow(t('setup.importOld.check.users'), selfCheck.users),
    countRow(t('setup.importOld.check.sales'), selfCheck.sales),
    countRow(t('setup.importOld.check.saleLines'), selfCheck.sale_lines),
  ]
  if (selfCheck.suppliers) rows.push(countRow(t('setup.importOld.check.suppliers'), selfCheck.suppliers))
  rows.push(moneyRow(t('setup.importOld.check.salesValue'), selfCheck.sales_value))
  rows.push(moneyRow(t('setup.importOld.check.stockValue'), selfCheck.stock_value))
  return rows
})

const changeLines = computed(() => {
  const result = importResult.value
  if (!result) return []
  return [
    ...result.renamed_skus.map(renamed => t('setup.importOld.renamedSku', { ...renamed })),
    ...result.renamed_barcodes.map(renamed => t('setup.importOld.renamedBarcode', { ...renamed })),
    ...result.changed_emails.map(renamed => t('setup.importOld.changedEmail', { ...renamed })),
  ]
})

const noteLines = computed(() => (importResult.value?.notes ?? []).map(note => t(`setup.importOld.notes.${note.code}`, { count: note.count })))

const startImport = async () => {
  await importOldData({
    business_name: businessName.value.trim(),
    owner_id: ownerId.value ? Number(ownerId.value) : null,
  })
}

const copyPassword = async (password: string) => {
  await navigator.clipboard.writeText(password)
  copiedPassword.value = password
  setTimeout(() => { copiedPassword.value = '' }, 1500)
}

const goToSignIn = () => {
  open.value = false
  navigateTo('/login')
}

watch(open, async (isOpen) => {
  if (!isOpen || preview.value || importResult.value) return
  await loadPreview()
  businessName.value = preview.value?.business_name ?? ''
  ownerId.value = preview.value?.default_owner_id != null ? String(preview.value.default_owner_id) : ''
})
</script>

<template>
  <Dialog v-model:open="dialogOpen">
    <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <DatabaseBackup class="size-5" />
          {{ importResult ? t('setup.importOld.doneTitle') : t('setup.importOld.title') }}
        </DialogTitle>
        <DialogDescription v-if="!importResult">{{ t('setup.importOld.description') }}</DialogDescription>
      </DialogHeader>

      <div v-if="isLoadingPreview" class="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <LoaderCircle class="size-5 animate-spin" /> {{ t('setup.importOld.loading') }}
      </div>

      <div v-else-if="previewError" class="space-y-4">
        <p class="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">{{ previewError }}</p>
        <DialogFooter>
          <Button variant="outline" @click="open = false">{{ t('setup.importOld.setUpEmpty') }}</Button>
        </DialogFooter>
      </div>

      <div v-else-if="isImporting" class="flex flex-col items-center gap-3 py-10 text-center">
        <LoaderCircle class="size-8 animate-spin text-primary" />
        <p class="font-medium">{{ t('setup.importOld.importing') }}</p>
        <p class="text-sm text-muted-foreground">{{ t('setup.importOld.importingHint') }}</p>
      </div>

      <div v-else-if="importResult" class="space-y-5">
        <p class="flex items-start gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm">
          <ShieldCheck class="mt-0.5 size-4 shrink-0 text-emerald-600" />
          {{ t('setup.importOld.signInWith', { email: importResult.owner_email }) }}
        </p>

        <div v-if="importResult.temporary_passwords.length" class="space-y-2">
          <p class="text-sm font-medium">{{ t('setup.importOld.temporaryTitle') }}</p>
          <p class="text-xs text-muted-foreground">{{ t('setup.importOld.temporaryHint') }}</p>
          <ul class="divide-y rounded-md border text-sm">
            <li v-for="temporary in importResult.temporary_passwords" :key="temporary.email" class="flex items-center justify-between gap-3 p-2">
              <div class="min-w-0">
                <p class="truncate">{{ temporary.name }} · {{ temporary.email }}</p>
                <code class="font-mono">{{ temporary.password }}</code>
              </div>
              <Button size="sm" variant="outline" @click="copyPassword(temporary.password)">
                <Copy /> {{ copiedPassword === temporary.password ? t('setup.importOld.copied') : t('setup.importOld.copy') }}
              </Button>
            </li>
          </ul>
        </div>

        <div class="space-y-2">
          <p class="text-sm font-medium">{{ t('setup.importOld.checkTitle') }}</p>
          <ul class="divide-y rounded-md border text-sm">
            <li v-for="row in checkRows" :key="row.label" class="flex items-center justify-between gap-3 p-2">
              <span>{{ row.label }}</span>
              <span class="flex items-center gap-2 tabular-nums">
                {{ row.new }}
                <CircleCheck v-if="row.check.matched" class="size-4 text-emerald-600" :aria-label="t('setup.importOld.matched')" />
                <CircleX v-else class="size-4 text-destructive" :aria-label="t('setup.importOld.notMatched')" />
              </span>
            </li>
          </ul>
        </div>

        <ul v-if="noteLines.length" class="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li v-for="noteLine in noteLines" :key="noteLine">{{ noteLine }}</li>
        </ul>

        <details v-if="changeLines.length" class="rounded-md border p-2 text-sm">
          <summary class="cursor-pointer font-medium">{{ t('setup.importOld.changesTitle', { count: changeLines.length }) }}</summary>
          <ul class="mt-2 max-h-40 space-y-1 overflow-y-auto text-muted-foreground">
            <li v-for="changeLine in changeLines" :key="changeLine">{{ changeLine }}</li>
          </ul>
        </details>

        <DialogFooter>
          <Button class="w-full sm:w-auto" @click="goToSignIn">{{ t('setup.importOld.goToSignIn') }}</Button>
        </DialogFooter>
      </div>

      <div v-else-if="preview" class="space-y-5">
        <div v-if="mismatch" class="space-y-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <p class="font-medium">{{ t('setup.importOld.mismatchTitle') }}</p>
          <p>{{ t('setup.importOld.mismatchBody') }}</p>
          <ul class="space-y-1">
            <li v-for="row in checkRows" :key="row.label" class="flex items-center justify-between gap-3">
              <span>{{ row.label }}</span>
              <span class="flex items-center gap-2 tabular-nums">
                {{ row.old }} → {{ row.new }}
                <CircleCheck v-if="row.check.matched" class="size-4 text-emerald-600" :aria-label="t('setup.importOld.matched')" />
                <CircleX v-else class="size-4 text-destructive" :aria-label="t('setup.importOld.notMatched')" />
              </span>
            </li>
          </ul>
        </div>

        <p class="flex items-start gap-2 text-sm text-muted-foreground">
          <ShieldCheck class="mt-0.5 size-4 shrink-0" /> {{ t('setup.importOld.untouched') }}
        </p>

        <div class="space-y-2">
          <Label for="old-business-name">{{ t('setup.importOld.businessName') }}</Label>
          <Input id="old-business-name" v-model="businessName" maxlength="120" />
        </div>

        <div class="space-y-2">
          <Label>{{ t('setup.importOld.owner') }}</Label>
          <Select v-if="preview.owner_choices.length > 1" v-model="ownerId">
            <SelectTrigger class="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="ownerChoice in preview.owner_choices" :key="ownerChoice.id" :value="String(ownerChoice.id)">
                {{ ownerChoice.name }} · {{ ownerChoice.email }}
              </SelectItem>
            </SelectContent>
          </Select>
          <p v-else-if="preview.owner_choices.length === 1" class="rounded-md border px-3 py-2 text-sm">
            {{ preview.owner_choices[0]?.name }} · {{ preview.owner_choices[0]?.email }}
          </p>
          <p class="text-xs text-muted-foreground">{{ t('setup.importOld.ownerHint') }}</p>
        </div>

        <div class="space-y-2">
          <p class="text-sm font-medium">{{ t('setup.importOld.whatComes') }}</p>
          <dl class="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div v-for="count in previewCounts" :key="count.label" class="rounded-md border p-2">
              <dt class="text-xs text-muted-foreground">{{ count.label }}</dt>
              <dd class="text-lg font-semibold tabular-nums">{{ formatNumber(count.value) }}</dd>
            </div>
          </dl>
          <p class="text-sm text-muted-foreground">{{ salesRange }}</p>
          <p class="text-sm text-muted-foreground">
            {{ preview.passwords_kept ? t('setup.importOld.passwordsKept') : t('setup.importOld.passwordsNotKept') }}
          </p>
        </div>

        <DialogFooter class="gap-2">
          <Button variant="outline" @click="open = false">{{ t('setup.importOld.cancel') }}</Button>
          <Button :disabled="!businessName.trim()" @click="startImport">{{ t('setup.importOld.start') }}</Button>
        </DialogFooter>
      </div>
    </DialogContent>
  </Dialog>
</template>
