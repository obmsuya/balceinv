<script setup lang="ts">
import { CalendarX2, Check, CheckCircle2, Clock, Copy, LogOut, RefreshCw, UserRound } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useLicense } from '@/composables/useLicense'
import { useAuth } from '@/composables/useAuth'
import PaymentFlow from './PaymentFlow.vue'

const {
  licenseStatus,
  paymentDialogOpen,
  hardwareId,
  isHardLocked,
  isTrial,
  lockReason,
  loading,
  fetchLicenseStatus,
  fetchHardwareId,
} = useLicense()

const { user, logout } = useAuth()

const licenseStatusPollIntervalMilliseconds = 60000
const firstStatusRetryMilliseconds = 3000
const reloadAfterPaymentMilliseconds = 1500

const currentUserCanManageBilling = computed(() => user.value?.role === 'Admin')
const isUnlocking = ref(false)
const lockScreenVisible = computed(() => isHardLocked.value || isUnlocking.value)
const paymentDialogTitle = ref('Renew subscription')

watch(paymentDialogOpen, (isOpen) => {
  if (isOpen) paymentDialogTitle.value = isTrial.value ? 'Subscribe' : 'Renew subscription'
})

let licenseStatusPollInterval: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  await fetchLicenseStatus()
  if (!licenseStatus.value) setTimeout(fetchLicenseStatus, firstStatusRetryMilliseconds)
  licenseStatusPollInterval = setInterval(fetchLicenseStatus, licenseStatusPollIntervalMilliseconds)
})

onUnmounted(() => {
  if (licenseStatusPollInterval) clearInterval(licenseStatusPollInterval)
})

watch(isHardLocked, (locked, wasLocked) => {
  if (locked) {
    paymentDialogOpen.value = false
    if (!hardwareId.value) fetchHardwareId()
    return
  }
  if (!wasLocked) return
  isUnlocking.value = true
  setTimeout(() => window.location.reload(), reloadAfterPaymentMilliseconds)
}, { immediate: true })

const finishDialogPayment = () => {
  paymentDialogOpen.value = false
  toast.success('Subscription active', {
    description: licenseStatus.value?.expires_at
      ? `Paid until ${new Date(licenseStatus.value.expires_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}`
      : undefined,
  })
}

const reloadNow = () => window.location.reload()

const deviceIdCopied = ref(false)

const copyDeviceId = async () => {
  if (!hardwareId.value) return
  await navigator.clipboard.writeText(hardwareId.value)
  deviceIdCopied.value = true
  setTimeout(() => { deviceIdCopied.value = false }, 2000)
}
</script>

<template>
  <Dialog :open="paymentDialogOpen && !isHardLocked" @update:open="paymentDialogOpen = $event">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{{ paymentDialogTitle }}</DialogTitle>
        <DialogDescription>Pay with mobile money. It takes about a minute.</DialogDescription>
      </DialogHeader>
      <PaymentFlow @finish="finishDialogPayment" />
    </DialogContent>
  </Dialog>

  <div
    v-if="lockScreenVisible"
    class="fixed inset-0 z-[60] overflow-y-auto bg-background"
    role="alertdialog"
    aria-modal="true"
    aria-labelledby="lock-screen-title"
  >
    <div class="mx-auto flex min-h-full w-full max-w-lg flex-col justify-center gap-6 px-4 py-10">
      <div class="flex flex-col items-center gap-3 text-center">
        <span
          class="flex size-14 items-center justify-center rounded-2xl"
          :class="lockReason === 'clock' && !isUnlocking ? 'bg-amber-500/15' : 'bg-primary/10'"
        >
          <CheckCircle2 v-if="isUnlocking" class="size-7 text-primary" />
          <Clock v-else-if="lockReason === 'clock'" class="size-7 text-amber-600 dark:text-amber-400" />
          <CalendarX2 v-else class="size-7 text-primary" />
        </span>

        <template v-if="isUnlocking">
          <h1 id="lock-screen-title" class="text-2xl font-semibold tracking-tight">All set</h1>
          <p class="text-sm text-muted-foreground">Opening the POS…</p>
        </template>
        <template v-else-if="lockReason === 'clock'">
          <h1 id="lock-screen-title" class="text-2xl font-semibold tracking-tight">The computer's date is wrong</h1>
          <p class="text-sm text-muted-foreground max-w-sm">
            Set the correct date and time on this computer, then press Check again. Your data is safe.
          </p>
        </template>
        <template v-else>
          <h1 id="lock-screen-title" class="text-2xl font-semibold tracking-tight">
            {{ lockReason === 'missing' ? 'Activate the POS' : 'Subscription ended' }}
          </h1>
          <p class="text-sm text-muted-foreground max-w-sm">
            <template v-if="currentUserCanManageBilling">Choose a plan and pay with mobile money to keep selling. Your data is safe.</template>
            <template v-else>Ask the owner or an admin to renew. Your data is safe.</template>
          </p>
        </template>
      </div>

      <div v-if="lockReason !== 'clock' && currentUserCanManageBilling" class="rounded-2xl border bg-card p-5 shadow-sm">
        <PaymentFlow @finish="reloadNow" />
      </div>

      <div
        v-else-if="lockReason !== 'clock'"
        class="flex flex-col items-center gap-3 rounded-2xl border bg-card p-6 text-center shadow-sm"
      >
        <span class="flex size-12 items-center justify-center rounded-full bg-muted">
          <UserRound class="size-6 text-muted-foreground" />
        </span>
        <p class="text-sm text-muted-foreground">An admin can sign in here and renew in about a minute.</p>
        <Button class="h-11 w-full" @click="logout">
          <LogOut class="size-4 mr-2" />Sign in as admin
        </Button>
      </div>

      <Button
        v-if="lockReason === 'clock' && !isUnlocking"
        class="h-11 self-center px-8"
        :disabled="loading"
        @click="fetchLicenseStatus"
      >
        <RefreshCw class="size-4 mr-2" :class="loading ? 'animate-spin' : ''" />Check again
      </Button>

      <div class="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <button
          v-if="hardwareId"
          type="button"
          class="inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono hover:bg-muted hover:text-foreground"
          title="Copy the device ID for support"
          @click="copyDeviceId"
        >
          <Check v-if="deviceIdCopied" class="size-3 text-primary" />
          <Copy v-else class="size-3" />
          {{ deviceIdCopied ? 'Device ID copied' : `Device ${hardwareId.slice(0, 12)}…` }}
        </button>
        <button
          v-if="currentUserCanManageBilling || lockReason === 'clock'"
          type="button"
          class="inline-flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-muted hover:text-foreground"
          @click="logout"
        >
          <LogOut class="size-3" />Sign out
        </button>
      </div>
    </div>
  </div>
</template>
