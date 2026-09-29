<script setup lang="ts">
import { Plus, Trash2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { accountName, newClientRef } from '@/composables/useMoney'
import { formatMoney, inputTextToMinor } from '~/utils/money'

interface DraftLine {
  accountId: string
  debitText: string
  creditText: string
  shopId: string
}

const props = defineProps<{ today: string }>()
const emit = defineEmits<{ saved: [] }>()
const open = defineModel<boolean>('open', { default: false })

const wholeBusiness = 'business'

const { t } = useI18n()
const { user } = useAuth()
const { accounts, fetchAccounts, postManual, saving } = useMoney()

const clientRef = ref(newClientRef())
const entryDate = ref(props.today)
const reason = ref('')
const lines = ref<DraftLine[]>([])

const emptyLine = (): DraftLine => ({ accountId: '', debitText: '', creditText: '', shopId: wholeBusiness })
const activeAccounts = computed(() => accounts.value.filter(account => account.is_active))
const shops = computed(() => user.value?.shops ?? [])
const minorOf = (inputText: string) => {
  const minorUnits = inputTextToMinor(inputText)
  return minorUnits && Number.isFinite(minorUnits) ? minorUnits : 0
}
const difference = computed(() => lines.value.reduce((total, line) => total + minorOf(line.debitText) - minorOf(line.creditText), 0))

watch(open, isOpen => {
  if (!isOpen) return
  clientRef.value = newClientRef()
  entryDate.value = props.today
  reason.value = ''
  lines.value = [emptyLine(), emptyLine()]
  if (accounts.value.length === 0) fetchAccounts()
})

const submit = async () => {
  if (reason.value.trim().length < 3) {
    toast.error(t('money.manual.errors.reason'))
    return
  }
  const hasBadLine = lines.value.some(line => !line.accountId || (minorOf(line.debitText) > 0) === (minorOf(line.creditText) > 0))
  if (lines.value.length < 2 || hasBadLine) {
    toast.error(t('money.manual.errors.lines'))
    return
  }
  if (difference.value !== 0) {
    toast.error(t('money.manual.errors.unbalanced'))
    return
  }
  const postedEntry = await postManual({
    client_ref: clientRef.value,
    entry_date: entryDate.value,
    reason: reason.value.trim(),
    lines: lines.value.map(line => ({
      account_id: line.accountId,
      debit: minorOf(line.debitText),
      credit: minorOf(line.creditText),
      shop_id: line.shopId === wholeBusiness ? null : line.shopId,
    })),
  })
  if (!postedEntry) return
  emit('saved')
  open.value = false
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
      <DialogHeader>
        <DialogTitle>{{ t('money.manual.title') }}</DialogTitle>
        <DialogDescription>{{ t('money.manual.description') }}</DialogDescription>
      </DialogHeader>

      <div class="flex flex-col gap-4">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div class="flex flex-col gap-1.5">
            <Label for="manual-date">{{ t('common.fields.date') }}</Label>
            <Input id="manual-date" v-model="entryDate" type="date" :max="today" />
          </div>
          <div class="flex flex-col gap-1.5 sm:col-span-2">
            <Label for="manual-reason">{{ t('money.manual.reason') }}</Label>
            <Input id="manual-reason" v-model="reason" :placeholder="t('money.manual.reasonPlaceholder')" maxlength="500" />
          </div>
        </div>

        <div v-for="(line, lineIndex) in lines" :key="lineIndex" class="grid grid-cols-2 gap-2 rounded-lg border p-2 sm:grid-cols-12 sm:items-end">
          <div class="col-span-2 flex flex-col gap-1 sm:col-span-5">
            <Label class="text-xs">{{ t('money.manual.account') }}</Label>
            <Select v-model="line.accountId">
              <SelectTrigger class="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="account in activeAccounts" :key="account.id" :value="account.id">{{ account.code }} · {{ accountName(account) }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="flex flex-col gap-1 sm:col-span-2">
            <Label class="text-xs">{{ t('money.manual.debit') }}</Label>
            <Input v-model="line.debitText" inputmode="decimal" placeholder="0" />
          </div>
          <div class="flex flex-col gap-1 sm:col-span-2">
            <Label class="text-xs">{{ t('money.manual.credit') }}</Label>
            <Input v-model="line.creditText" inputmode="decimal" placeholder="0" />
          </div>
          <div v-if="shops.length > 1" class="flex flex-col gap-1 sm:col-span-2">
            <Label class="text-xs">{{ t('money.manual.shop') }}</Label>
            <Select v-model="line.shopId">
              <SelectTrigger class="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem :value="wholeBusiness">{{ t('money.form.noShop') }}</SelectItem>
                <SelectItem v-for="shop in shops" :key="shop.id" :value="shop.id">{{ shop.name }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="ghost" size="icon" class="sm:col-span-1" :disabled="lines.length <= 2" :aria-label="t('common.actions.remove')" @click="lines.splice(lineIndex, 1)"><Trash2 /></Button>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-2">
          <Button variant="outline" size="sm" @click="lines.push(emptyLine())"><Plus /> {{ t('money.manual.addLine') }}</Button>
          <span class="text-sm font-medium tabular-nums" :class="difference === 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-destructive'">
            {{ difference === 0 ? t('money.manual.balanced') : t('money.manual.difference', { amount: formatMoney(Math.abs(difference)) }) }}
          </span>
        </div>
      </div>

      <DialogFooter class="gap-2">
        <Button variant="outline" @click="open = false">{{ t('common.actions.cancel') }}</Button>
        <Button :disabled="saving" @click="submit">{{ t('common.actions.save') }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
