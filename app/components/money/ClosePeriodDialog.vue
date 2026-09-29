<script setup lang="ts">
import { Lock } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { BooksStatus } from '@/composables/useMoney'
import { shiftDate } from '~/utils/reportRanges'

const props = defineProps<{ status: BooksStatus }>()
const emit = defineEmits<{ closed: [] }>()
const open = defineModel<boolean>('open', { default: false })

const { t, formatDate } = useI18n()
const { closePeriod, saving } = useMoney()

const endOfLastMonth = computed(() => shiftDate(`${props.status.today.slice(0, 7)}-01`, -1))
const closedUntil = ref('')
const dayText = (isoDate: string) => formatDate(`${isoDate}T12:00:00`, { day: 'numeric', month: 'long', year: 'numeric' })

watch(open, isOpen => {
  if (isOpen) closedUntil.value = endOfLastMonth.value
})

const submit = async () => {
  const isClosed = await closePeriod(closedUntil.value)
  if (!isClosed) return
  emit('closed')
  open.value = false
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2"><Lock class="size-5" /> {{ t('money.close.title') }}</DialogTitle>
        <DialogDescription>{{ t('money.close.description') }}</DialogDescription>
      </DialogHeader>
      <p class="text-sm text-muted-foreground">
        {{ status.closed_until ? t('money.close.current', { date: dayText(status.closed_until) }) : t('money.close.notYet') }}
      </p>
      <div class="flex flex-col gap-1.5">
        <Label for="close-until">{{ t('money.close.closeUntil') }}</Label>
        <Input id="close-until" v-model="closedUntil" type="date" :min="status.closed_until ?? status.started_on ?? undefined" :max="shiftDate(status.today, -1)" />
      </div>
      <DialogFooter class="gap-2">
        <Button variant="outline" @click="open = false">{{ t('common.actions.cancel') }}</Button>
        <Button :disabled="saving || !closedUntil" @click="submit">{{ t('money.close.confirm') }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
