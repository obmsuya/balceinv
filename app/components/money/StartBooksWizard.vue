<script setup lang="ts">
import { BookOpenCheck, CalendarClock, History, PartyPopper } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import MoneyInput from '@/components/MoneyInput.vue'
import { Label } from '@/components/ui/label'
import type { BooksStatus } from '@/composables/useMoney'
import { currencyCode, formatMoney, inputTextToMinor } from '~/utils/money'

const props = defineProps<{ status: BooksStatus }>()
const emit = defineEmits<{ started: [] }>()

const { t, formatDate } = useI18n()
const { startBooks, saving } = useMoney()

const step = ref<'choose' | 'money' | 'confirm' | 'done'>('choose')
const startMode = ref<'today' | 'history'>(props.status.suggested_start_mode)
const cashText = ref('')
const mobileText = ref('')
const bankText = ref('')

const hasHistory = computed(() => props.status.first_record_date !== null)
const dayText = (isoDate: string | null) => (isoDate ? formatDate(`${isoDate}T12:00:00`, { day: 'numeric', month: 'long', year: 'numeric' }) : '')
const amountOf = (inputText: string) => {
  const minorUnits = inputTextToMinor(inputText)
  return minorUnits && Number.isFinite(minorUnits) && minorUnits > 0 ? minorUnits : 0
}
const moneyTotal = computed(() => amountOf(cashText.value) + amountOf(mobileText.value) + amountOf(bankText.value))
const hasBadMoney = computed(() => [cashText.value, mobileText.value, bankText.value].some(inputText => Number.isNaN(inputTextToMinor(inputText))))

const start = async () => {
  const isStarted = await startBooks({
    mode: startMode.value,
    cash_in_drawer: amountOf(cashText.value),
    mobile_money: amountOf(mobileText.value),
    bank: amountOf(bankText.value),
  })
  if (isStarted) step.value = 'done'
}
</script>

<template>
  <Card class="mx-auto w-full max-w-xl">
    <CardHeader>
      <CardTitle class="flex items-center gap-2 text-xl"><BookOpenCheck class="size-6 text-primary" /> {{ t('money.start.title') }}</CardTitle>
      <CardDescription class="flex flex-col gap-2 text-base">
        <span>{{ t('money.start.what') }}</span>
        <span>{{ t('money.start.why') }}</span>
      </CardDescription>
    </CardHeader>
    <CardContent class="flex flex-col gap-4">
      <template v-if="step === 'choose'">
        <p class="font-medium">{{ t('money.start.chooseTitle') }}</p>
        <button
          v-if="hasHistory"
          type="button"
          class="flex items-start gap-3 rounded-xl border p-4 text-left transition-colors hover:bg-accent"
          :class="startMode === 'history' ? 'border-primary bg-primary/5' : ''"
          :aria-pressed="startMode === 'history'"
          @click="startMode = 'history'"
        >
          <History class="mt-0.5 size-5 shrink-0 text-primary" />
          <span class="flex flex-col gap-1">
            <span class="flex flex-wrap items-center gap-2 font-medium">{{ t('money.start.fromHistory') }} <Badge>{{ t('money.start.recommended') }}</Badge></span>
            <span class="text-sm text-muted-foreground">{{ t('money.start.fromHistoryHelp', { date: dayText(status.first_record_date) }) }}</span>
          </span>
        </button>
        <button
          type="button"
          class="flex items-start gap-3 rounded-xl border p-4 text-left transition-colors hover:bg-accent"
          :class="startMode === 'today' ? 'border-primary bg-primary/5' : ''"
          :aria-pressed="startMode === 'today'"
          @click="startMode = 'today'"
        >
          <CalendarClock class="mt-0.5 size-5 shrink-0 text-primary" />
          <span class="flex flex-col gap-1">
            <span class="font-medium">{{ t('money.start.fromToday') }}</span>
            <span class="text-sm text-muted-foreground">{{ t('money.start.fromTodayHelp') }}</span>
          </span>
        </button>
        <Button size="lg" class="w-full" @click="step = 'money'">{{ t('common.actions.continue') }}</Button>
      </template>

      <template v-else-if="step === 'money'">
        <div>
          <p class="font-medium">{{ t('money.start.moneyTitle') }}</p>
          <p class="text-sm text-muted-foreground">{{ t('money.start.moneyHelp') }}</p>
        </div>
        <div class="flex flex-col gap-1.5">
          <Label for="start-cash">{{ t('money.start.cashInDrawer') }} ({{ currencyCode() }})</Label>
          <MoneyInput id="start-cash" v-model="cashText" placeholder="0" class="h-11 text-lg" />
        </div>
        <div class="flex flex-col gap-1.5">
          <Label for="start-mobile">{{ t('money.start.mobileMoney') }} ({{ currencyCode() }})</Label>
          <MoneyInput id="start-mobile" v-model="mobileText" placeholder="0" class="h-11 text-lg" />
        </div>
        <div class="flex flex-col gap-1.5">
          <Label for="start-bank">{{ t('money.start.bank') }} ({{ currencyCode() }})</Label>
          <MoneyInput id="start-bank" v-model="bankText" placeholder="0" class="h-11 text-lg" />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <Button variant="outline" size="lg" @click="step = 'choose'">{{ t('common.actions.back') }}</Button>
          <Button size="lg" :disabled="hasBadMoney" @click="step = 'confirm'">{{ t('common.actions.continue') }}</Button>
        </div>
      </template>

      <template v-else-if="step === 'confirm'">
        <p class="font-medium">{{ t('money.start.confirmTitle') }}</p>
        <p class="text-sm">
          {{ startMode === 'history' && hasHistory
            ? t('money.start.confirmHistory', { date: dayText(status.first_record_date) })
            : t('money.start.confirmToday', { date: dayText(status.today) }) }}
        </p>
        <p v-if="moneyTotal > 0" class="text-sm">{{ t('money.start.confirmMoney', { amount: formatMoney(moneyTotal) }) }}</p>
        <div class="grid grid-cols-2 gap-2">
          <Button variant="outline" size="lg" @click="step = 'money'">{{ t('common.actions.back') }}</Button>
          <Button size="lg" :disabled="saving" @click="start">{{ saving ? t('common.actions.saving') : t('money.start.startButton') }}</Button>
        </div>
      </template>

      <template v-else>
        <div class="flex flex-col items-center gap-2 py-4 text-center">
          <PartyPopper class="size-10 text-primary" />
          <p class="text-lg font-semibold">{{ t('money.start.startedTitle') }}</p>
          <p class="text-sm text-muted-foreground">{{ t('money.start.startedHelp') }}</p>
        </div>
        <Button size="lg" class="w-full" @click="emit('started')">{{ t('money.start.openBooks') }}</Button>
      </template>
    </CardContent>
  </Card>
</template>
