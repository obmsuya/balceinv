<script setup lang="ts">
import { useOnline } from '@vueuse/core'
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  Crown,
  Package,
  Phone,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sprout,
  Trees,
  Wallet,
  WifiOff,
  XCircle,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { LicensePackage, LicenseStatus, PaymentWaitHandle } from '@/composables/useLicense'
import { readLicenseError, useLicense } from '@/composables/useLicense'
import type { MobileMoneyProvider } from '~/utils/mobileMoney'
import {
  describeDuration,
  detectProvider,
  formatPhone,
  formatShillings,
  mobileMoneyOptions,
  normalizePhone,
} from '~/utils/mobileMoney'

type PaymentStep = 'plan' | 'pay' | 'waiting' | 'done' | 'not-confirmed' | 'failed'

const emit = defineEmits<{
  paid: []
  finish: []
}>()

const {
  licenseStatus,
  licensePackages,
  packagesError,
  packagesLoading,
  currentPackage,
  fetchPackages,
  payForLicense,
  waitForPayment,
} = useLicense()

const isOnline = useOnline()
const { t, formatDate } = useI18n()
const showResendAfterSeconds = 30

const step = ref<PaymentStep>('plan')
const selectedPackage = ref<LicensePackage | null>(null)
const phoneInput = ref('')
const phoneError = ref('')
const provider = ref<MobileMoneyProvider | null>(null)
const providerError = ref('')
const providerPickedByHand = ref(false)
const isSubmitting = ref(false)
const failureMessage = ref('')
const waitingSeconds = ref(0)
const phoneField = ref<HTMLInputElement | null>(null)

watch(step, async (currentStep) => {
  if (currentStep !== 'pay') return
  await nextTick()
  phoneField.value?.focus()
})

let statusBeforePayment: LicenseStatus | null = null
let activeWaitHandle: PaymentWaitHandle | null = null
let waitingTimer: ReturnType<typeof setInterval> | null = null

const orderedPackages = computed(() => {
  if (!currentPackage.value) return licensePackages.value
  return [
    currentPackage.value,
    ...licensePackages.value.filter(licensePackage => licensePackage.id !== currentPackage.value?.id),
  ]
})

const providerLabel = computed(() =>
  mobileMoneyOptions.find(option => option.value === provider.value)?.label ?? t('license.payment.mobileMoney'),
)

const stepNumber = computed(() => {
  if (step.value === 'plan') return 1
  if (step.value === 'pay' || step.value === 'failed') return 2
  if (step.value === 'done') return 4
  return 3
})

const waitingClock = computed(() => {
  const minutes = Math.floor(waitingSeconds.value / 60)
  const seconds = String(waitingSeconds.value % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
})

const paidUntil = computed(() => {
  const expiresAt = licenseStatus.value?.expires_at
  if (!expiresAt) return ''
  return formatDate(expiresAt, { day: 'numeric', month: 'long', year: 'numeric' })
})

const monthsIn = (days: number): number => (days % 365 === 0 ? (days / 365) * 12 : days / 30)

const monthlyCost = (licensePackage: LicensePackage): number =>
  Number.parseFloat(String(licensePackage.price).replace(/[^0-9.]/g, '')) / monthsIn(licensePackage.days_granted)

const pricePerMonth = (licensePackage: LicensePackage): string => {
  if (monthsIn(licensePackage.days_granted) < 2) return ''
  return t('license.payment.perMonth', { price: formatShillings(monthlyCost(licensePackage)) })
}

const durationText = (days: number): string => {
  const duration = describeDuration(days)
  return t(`license.duration.${duration.unit}`, { count: duration.count })
}

const stepLabels = computed(() => [t('license.payment.stepPlan'), t('license.payment.stepPay'), t('license.payment.stepConfirm')])

const bestValuePackageId = computed(() => {
  if (licensePackages.value.length < 2) return null
  const cheapestPerMonth = [...licensePackages.value].sort((first, second) => monthlyCost(first) - monthlyCost(second))[0]
  return cheapestPerMonth ? cheapestPerMonth.id : null
})

const planLooks = [
  { upToDays: 45, icon: Sprout, tile: 'bg-gradient-to-br from-emerald-400/25 to-emerald-500/5 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20' },
  { upToDays: 200, icon: Trees, tile: 'bg-gradient-to-br from-primary/30 to-primary/5 text-primary ring-primary/25' },
  { upToDays: Number.POSITIVE_INFINITY, icon: Crown, tile: 'bg-gradient-to-br from-amber-300/40 to-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/30' },
]

const planLook = (licensePackage: LicensePackage) =>
  planLooks.find(look => licensePackage.days_granted <= look.upToDays) ?? planLooks[planLooks.length - 1]!

onMounted(() => {
  if (licensePackages.value.length === 0 && !packagesLoading.value) fetchPackages()
})

const stopWaiting = () => {
  if (activeWaitHandle) activeWaitHandle.cancelled = true
  activeWaitHandle = null
  if (waitingTimer) clearInterval(waitingTimer)
  waitingTimer = null
}

onUnmounted(stopWaiting)

const choosePackage = (licensePackage: LicensePackage) => {
  selectedPackage.value = licensePackage
  failureMessage.value = ''
  step.value = 'pay'
}

const onPhoneInput = (rawValue: string | number) => {
  phoneInput.value = formatPhone(String(rawValue))
  phoneError.value = ''
  if (providerPickedByHand.value) return
  provider.value = detectProvider(phoneInput.value)
  if (provider.value) providerError.value = ''
}

const chooseProvider = (chosenProvider: MobileMoneyProvider) => {
  provider.value = chosenProvider
  providerPickedByHand.value = true
  providerError.value = ''
}

const startWaiting = async () => {
  stopWaiting()
  step.value = 'waiting'
  waitingSeconds.value = 0
  waitingTimer = setInterval(() => { waitingSeconds.value += 1 }, 1000)

  const waitHandle: PaymentWaitHandle = { cancelled: false }
  activeWaitHandle = waitHandle
  const waitResult = await waitForPayment(statusBeforePayment, waitHandle)
  if (waitHandle !== activeWaitHandle) return
  stopWaiting()

  if (waitResult === 'paid') {
    step.value = 'done'
    emit('paid')
  } else if (waitResult === 'timeout') {
    step.value = 'not-confirmed'
  }
}

const submitPayment = async () => {
  const normalizedPhone = normalizePhone(phoneInput.value)
  if (!normalizedPhone) phoneError.value = t('license.payment.phoneInvalid')
  if (!provider.value) providerError.value = t('license.payment.chooseNetwork')
  if (!normalizedPhone || !provider.value || !selectedPackage.value || isSubmitting.value) return

  isSubmitting.value = true
  failureMessage.value = ''
  statusBeforePayment = licenseStatus.value ? { ...licenseStatus.value } : null
  try {
    await payForLicense({ phone: normalizedPhone, provider: provider.value, package_id: selectedPackage.value.id })
    startWaiting()
  } catch (error: any) {
    failureMessage.value = readLicenseError(error, 'license.payment.startFailed')
    step.value = 'failed'
  } finally {
    isSubmitting.value = false
  }
}

const cancelWaiting = () => {
  stopWaiting()
  step.value = 'pay'
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <ol class="flex items-center gap-2 text-xs font-medium" :aria-label="t('license.payment.stepsLabel')">
      <li
        v-for="(stepLabel, stepIndex) in stepLabels"
        :key="stepIndex"
        class="flex flex-1 items-center gap-2"
      >
        <span
          class="flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] transition-colors"
          :class="stepIndex + 1 < stepNumber
            ? 'border-primary bg-primary text-primary-foreground'
            : stepIndex + 1 === stepNumber
              ? 'border-primary text-primary'
              : 'text-muted-foreground'"
        >
          <CheckCircle2 v-if="stepIndex + 1 < stepNumber" class="size-3.5" />
          <template v-else>{{ stepIndex + 1 }}</template>
        </span>
        <span :class="stepIndex + 1 === stepNumber ? 'text-foreground' : 'text-muted-foreground'">{{ stepLabel }}</span>
        <span v-if="stepIndex < 2" class="h-px flex-1 bg-border" />
      </li>
    </ol>

    <section v-if="step === 'plan'" class="flex flex-col gap-3">
      <template v-if="packagesLoading && licensePackages.length === 0">
        <Skeleton v-for="skeletonIndex in 3" :key="skeletonIndex" class="h-[76px] rounded-xl" />
      </template>

      <div
        v-else-if="packagesError && licensePackages.length === 0"
        class="flex flex-col items-center gap-3 rounded-xl border border-dashed py-8 px-4 text-center"
      >
        <WifiOff class="size-8 text-muted-foreground/60" />
        <p class="text-sm text-muted-foreground max-w-xs">{{ packagesError }}</p>
        <Button variant="outline" :disabled="packagesLoading" @click="fetchPackages">
          <RefreshCw class="size-4 mr-2" :class="packagesLoading ? 'animate-spin' : ''" />{{ t('common.actions.retry') }}
        </Button>
      </div>

      <div
        v-else-if="licensePackages.length === 0"
        class="flex flex-col items-center gap-3 rounded-xl border border-dashed py-8 px-4 text-center"
      >
        <Package class="size-8 text-muted-foreground/60" />
        <p class="text-sm text-muted-foreground">{{ t('license.payment.noPlans') }}</p>
        <Button variant="outline" @click="fetchPackages">
          <RefreshCw class="size-4 mr-2" />{{ t('common.actions.retry') }}
        </Button>
      </div>

      <template v-else>
      <button
        v-for="licensePackage in orderedPackages"
        :key="licensePackage.id"
        type="button"
        class="group flex items-center gap-4 rounded-xl border bg-card p-4 text-left transition-all hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.99]"
        :class="licensePackage.id === currentPackage?.id ? 'border-primary/50' : ''"
        @click="choosePackage(licensePackage)"
      >
        <div
          class="flex size-12 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset transition-transform group-hover:scale-105 group-hover:-rotate-3"
          :class="planLook(licensePackage).tile"
        >
          <component :is="planLook(licensePackage).icon" class="size-6" stroke-width="1.75" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <p class="font-semibold truncate">{{ licensePackage.name }}</p>
            <span
              v-if="licensePackage.id === currentPackage?.id"
              class="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
            >{{ t('license.payment.current') }}</span>
            <span
              v-else-if="licensePackage.id === bestValuePackageId"
              class="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300"
            >{{ t('license.payment.bestValue') }}</span>
          </div>
          <p class="text-xs text-muted-foreground mt-0.5">
            {{ durationText(licensePackage.days_granted) }} · {{ t('license.payment.devices', { count: licensePackage.max_devices }) }}
          </p>
        </div>
        <div class="text-right">
          <p class="text-lg font-bold tabular-nums">{{ formatShillings(licensePackage.price) }}</p>
          <p v-if="pricePerMonth(licensePackage)" class="text-[11px] text-muted-foreground tabular-nums">{{ pricePerMonth(licensePackage) }}</p>
        </div>
        <ChevronRight class="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </button>
      </template>
    </section>

    <form v-else-if="step === 'pay'" class="flex flex-col gap-4" novalidate @submit.prevent="submitPayment">
      <div class="flex items-center gap-3 rounded-xl border bg-muted/40 px-4 py-3">
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium truncate">{{ selectedPackage?.name }}</p>
          <p class="text-xs text-muted-foreground">{{ durationText(selectedPackage?.days_granted ?? 0) }}</p>
        </div>
        <p class="font-bold tabular-nums">{{ formatShillings(selectedPackage?.price ?? 0) }}</p>
        <Button type="button" variant="ghost" size="sm" class="h-7 px-2 text-xs" @click="step = 'plan'">{{ t('license.payment.change') }}</Button>
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="payment-phone" class="text-sm font-medium">{{ t('license.payment.phoneLabel') }}</label>
        <div class="relative">
          <Phone class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="payment-phone"
            ref="phoneField"
            :value="phoneInput"
            type="tel"
            inputmode="tel"
            autocomplete="tel"
            placeholder="0712 345 678"
            class="h-12 w-full rounded-lg border border-input bg-transparent pl-10 pr-3 text-lg tracking-wide tabular-nums shadow-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            :class="phoneError ? 'border-destructive' : ''"
            :aria-invalid="phoneError ? 'true' : 'false'"
            @input="onPhoneInput(($event.target as HTMLInputElement).value)"
          >
        </div>
        <p v-if="phoneError" class="text-xs text-destructive">{{ phoneError }}</p>
      </div>

      <div class="flex flex-col gap-1.5">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium">{{ t('license.payment.network') }}</span>
          <span v-if="provider && !providerPickedByHand" class="text-xs text-muted-foreground">{{ t('license.payment.pickedFromNumber') }}</span>
        </div>
        <div class="grid grid-cols-5 gap-2" role="radiogroup" :aria-label="t('license.payment.networkLabel')">
          <button
            v-for="option in mobileMoneyOptions"
            :key="option.value"
            type="button"
            role="radio"
            :aria-checked="provider === option.value"
            class="flex flex-col items-center gap-1.5 rounded-xl border px-1 py-2.5 text-center transition-all hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            :class="provider === option.value ? 'border-primary bg-primary/5 ring-1 ring-primary' : ''"
            @click="chooseProvider(option.value)"
          >
            <span
              class="flex size-9 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm"
              :style="{ backgroundColor: option.color }"
            >{{ option.initials }}</span>
            <span class="text-[11px] leading-tight">{{ option.label }}</span>
          </button>
        </div>
        <p v-if="providerError" class="text-xs text-destructive">{{ providerError }}</p>
      </div>

      <div v-if="!isOnline" class="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
        <WifiOff class="size-4 shrink-0" />{{ t('license.payment.noInternet') }}
      </div>

      <Button type="submit" class="h-12 w-full text-base" :disabled="isSubmitting || !isOnline">
        <RefreshCw v-if="isSubmitting" class="size-4 mr-2 animate-spin" />
        <Wallet v-else class="size-4 mr-2" />
        {{ isSubmitting ? t('license.payment.sendingRequest') : t('license.payment.payAmount', { amount: formatShillings(selectedPackage?.price ?? 0) }) }}
      </Button>
      <p class="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck class="size-3.5" />{{ t('license.payment.popupHint') }}
      </p>
    </form>

    <section v-else-if="step === 'waiting'" class="flex flex-col items-center gap-4 py-2 text-center">
      <div class="relative flex size-20 items-center justify-center">
        <span class="absolute inset-0 animate-ping rounded-full bg-primary/20 motion-reduce:animate-none" />
        <span class="relative flex size-20 items-center justify-center rounded-full bg-primary/10">
          <Smartphone class="size-9 text-primary" />
        </span>
      </div>
      <div class="flex flex-col gap-1">
        <h3 class="text-lg font-semibold">{{ t('license.payment.checkPhone') }}</h3>
        <p class="text-sm text-muted-foreground">
          {{ t('license.payment.enterPinOn', { provider: providerLabel }) }} <span class="font-medium text-foreground tabular-nums">{{ phoneInput }}</span>
          {{ t('license.payment.toPay') }} <span class="font-medium text-foreground">{{ formatShillings(selectedPackage?.price ?? 0) }}</span>.
        </p>
      </div>
      <div class="w-full max-w-xs">
        <div class="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div class="h-full w-1/3 animate-[pulse_1.5s_ease-in-out_infinite] rounded-full bg-primary" />
        </div>
        <p class="mt-2 text-xs text-muted-foreground tabular-nums">{{ t('license.payment.waiting', { clock: waitingClock }) }}</p>
      </div>
      <div class="flex flex-col items-center gap-2">
        <p v-if="waitingSeconds >= showResendAfterSeconds" class="text-xs text-muted-foreground">{{ t('license.payment.noPopup') }}</p>
        <div class="flex gap-2">
          <Button v-if="waitingSeconds >= showResendAfterSeconds" variant="outline" size="sm" @click="cancelWaiting">
            <RefreshCw class="size-3.5 mr-1.5" />{{ t('license.payment.sendAgain') }}
          </Button>
          <Button variant="ghost" size="sm" @click="cancelWaiting">{{ t('common.actions.cancel') }}</Button>
        </div>
      </div>
    </section>

    <section v-else-if="step === 'done'" class="flex flex-col items-center gap-4 py-2 text-center">
      <span class="flex size-20 items-center justify-center rounded-full bg-primary/15">
        <CheckCircle2 class="size-10 text-primary" />
      </span>
      <div class="flex flex-col gap-1">
        <h3 class="text-lg font-semibold">{{ t('license.payment.received') }}</h3>
        <p class="text-sm text-muted-foreground">
          <template v-if="paidUntil">{{ t('license.payment.activeUntil') }} <span class="font-medium text-foreground">{{ paidUntil }}</span>.</template>
          <template v-else>{{ t('license.payment.activeNoDate') }}</template>
        </p>
      </div>
      <Button class="h-11 w-full" @click="emit('finish')">{{ t('common.actions.continue') }}</Button>
    </section>

    <section v-else-if="step === 'not-confirmed'" class="flex flex-col gap-4">
      <div class="flex flex-col items-center gap-3 text-center">
        <span class="flex size-16 items-center justify-center rounded-full bg-amber-500/15">
          <Clock class="size-8 text-amber-600 dark:text-amber-400" />
        </span>
        <h3 class="text-lg font-semibold">{{ t('license.payment.notConfirmedTitle') }}</h3>
        <p class="text-sm text-muted-foreground">
          {{ t('license.payment.notConfirmedBody') }}
          <span class="font-medium text-foreground">{{ t('license.payment.doNotPayTwice') }}</span> {{ t('license.payment.checkInAMinute') }}
        </p>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <Button variant="outline" class="h-11" @click="step = 'pay'">{{ t('license.payment.payAgain') }}</Button>
        <Button class="h-11" @click="startWaiting">
          <RefreshCw class="size-4 mr-2" />{{ t('license.payment.checkAgain') }}
        </Button>
      </div>
    </section>

    <section v-else-if="step === 'failed'" class="flex flex-col gap-4">
      <div class="flex flex-col items-center gap-3 text-center">
        <span class="flex size-16 items-center justify-center rounded-full bg-destructive/10">
          <XCircle class="size-8 text-destructive" />
        </span>
        <h3 class="text-lg font-semibold">{{ t('license.payment.notStartedTitle') }}</h3>
        <p class="text-sm text-muted-foreground">{{ failureMessage }}</p>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <Button variant="outline" class="h-11" @click="step = 'plan'">{{ t('license.payment.changePlan') }}</Button>
        <Button class="h-11" @click="step = 'pay'">{{ t('common.actions.retry') }}</Button>
      </div>
    </section>
  </div>
</template>
