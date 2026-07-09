<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { LicensePackage } from '@/composables/useLicense'
import { useLicense } from '@/composables/useLicense'
import { useAuth } from '@/composables/useAuth'
import PaymentFlow from './PaymentFlow.vue'

const {
  licenseStatus,
  licensePackages,
  lastPackage,
  isLicensed,
  isHardLocked,
  showGraceBanner,
  showTrialBanner,
  fetchLicenseStatus,
  fetchPackages,
  fetchLastPackage,
  payForLicense,
  pollUntilLicensed,
  dismissBanner,
} = useLicense()

const { user } = useAuth()

const ownerRoleName = 'Admin'
const currentUserCanManageBilling = computed(() => user.value?.role === ownerRoleName)

type PaymentFlowStep = 'select-package' | 'enter-details' | 'awaiting-confirmation' | 'success' | 'failed'
type MobileProvider = 'Mpesa' | 'Tigo' | 'Airtel' | 'Halopesa' | 'Azampesa'

const paymentFlowStep = ref<PaymentFlowStep>('select-package')
const selectedPackage = ref<LicensePackage | null>(null)
const isSubmittingPayment = ref(false)
const showAllPackages = ref(false)
const lastErrorMessage = ref('')
const showPaymentDialog = ref(false)

const licenseStatusPollIntervalMilliseconds = 60000
const dialogAutoCloseDelayMilliseconds = 800

let licenseStatusPollInterval: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  await fetchLicenseStatus()

  if (!isLicensed.value) {
    await fetchPackages()
    await fetchLastPackage()
  }

  licenseStatusPollInterval = setInterval(fetchLicenseStatus, licenseStatusPollIntervalMilliseconds)
})

onUnmounted(() => {
  if (licenseStatusPollInterval) clearInterval(licenseStatusPollInterval)
})

const openPaymentFlow = () => {
  showPaymentDialog.value = true
  paymentFlowStep.value = 'select-package'
}

const closePaymentDialog = () => {
  showPaymentDialog.value = false
  paymentFlowStep.value = 'select-package'
  selectedPackage.value = null
  showAllPackages.value = false
  lastErrorMessage.value = ''
}

const handleDialogOpenChange = (open: boolean) => {
  if (!open) closePaymentDialog()
}

const handleSelectPackage = (selectedLicensePackage: LicensePackage) => {
  selectedPackage.value = selectedLicensePackage
  paymentFlowStep.value = 'enter-details'
}

const goBackToPackages = () => {
  paymentFlowStep.value = 'select-package'
  selectedPackage.value = null
  showAllPackages.value = false
}

const toggleShowAllPackages = () => {
  showAllPackages.value = !showAllPackages.value
}

const closeDialogIfNowLicensed = () => {
  if (isLicensed.value) closePaymentDialog()
}

const handleSubmit = async (values: { phone: string; provider: MobileProvider }) => {
  if (!selectedPackage.value) return

  isSubmittingPayment.value = true
  try {
    await payForLicense({
      phone: values.phone,
      provider: values.provider,
      package_id: selectedPackage.value.id
    })

    paymentFlowStep.value = 'awaiting-confirmation'

    try {
      await pollUntilLicensed()
      paymentFlowStep.value = 'success'
      setTimeout(closeDialogIfNowLicensed, dialogAutoCloseDelayMilliseconds)
    } catch {
      paymentFlowStep.value = 'failed'
      lastErrorMessage.value = 'We have not received confirmation yet. If you completed the payment on your phone, please wait a moment and check again.'
    }
  } catch (error: any) {
    paymentFlowStep.value = 'failed'
    lastErrorMessage.value = error?.data?.message || 'Payment failed. Please try again.'
  } finally {
    isSubmittingPayment.value = false
  }
}

const retryPayment = async () => {
  try {
    await pollUntilLicensed()
    paymentFlowStep.value = 'success'
    setTimeout(closeDialogIfNowLicensed, dialogAutoCloseDelayMilliseconds)
  } catch {
    lastErrorMessage.value = 'Still waiting for confirmation. Please try again in a moment.'
  }
}
</script>

<template>
  <div v-if="showTrialBanner" class="fixed top-0 left-0 right-0 z-40 bg-primary/10 border-b border-primary/20">
    <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
      <p class="text-sm text-foreground">
        Trial period — <span class="font-semibold">{{ licenseStatus?.days_remaining }}</span> day{{ licenseStatus?.days_remaining === 1 ? '' : 's' }} remaining.
      </p>
      <div class="flex gap-2 shrink-0">
        <Button v-if="currentUserCanManageBilling" size="sm" variant="outline" @click="openPaymentFlow">
          Subscribe Now
        </Button>
        <Button size="icon" variant="ghost" @click="dismissBanner">
          <X class="h-4 w-4" />
        </Button>
      </div>
    </div>
  </div>

  <div v-if="showGraceBanner" class="fixed top-0 left-0 right-0 z-40 bg-muted border-b">
    <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
      <p class="text-sm text-foreground">
        Your subscription has ended. You have <span class="font-semibold">{{ Math.abs(licenseStatus?.days_remaining ?? 0) }}</span> day{{ Math.abs(licenseStatus?.days_remaining ?? 0) === 1 ? '' : 's' }} left to renew before the app locks.
      </p>
      <div class="flex gap-2 shrink-0">
        <Button v-if="currentUserCanManageBilling" size="sm" @click="openPaymentFlow">
          Renew Now
        </Button>
        <Button size="icon" variant="ghost" @click="dismissBanner">
          <X class="h-4 w-4" />
        </Button>
      </div>
    </div>
  </div>

  <Dialog :open="showPaymentDialog" @update:open="handleDialogOpenChange">
    <DialogContent class="sm:max-w-md">
      <DialogHeader v-if="paymentFlowStep !== 'success'">
        <DialogTitle>
          <span v-if="paymentFlowStep === 'select-package'">Choose a package</span>
          <span v-else-if="paymentFlowStep === 'enter-details'">Enter your details</span>
          <span v-else-if="paymentFlowStep === 'awaiting-confirmation'">Confirming payment</span>
          <span v-else-if="paymentFlowStep === 'failed'">Payment unsuccessful</span>
        </DialogTitle>
      </DialogHeader>

      <PaymentFlow
        :payment-flow-step="paymentFlowStep"
        :selected-package="selectedPackage"
        :last-package="lastPackage"
        :license-packages="licensePackages"
        :is-submitting-payment="isSubmittingPayment"
        :last-error-message="lastErrorMessage"
        :show-all-packages="showAllPackages"
        @select-package="handleSelectPackage"
        @go-back="goBackToPackages"
        @toggle-package-list="toggleShowAllPackages"
        @submit="handleSubmit"
        @retry="retryPayment"
        @go-to-details="paymentFlowStep = 'enter-details'"
      />
    </DialogContent>
  </Dialog>

  <div v-if="isHardLocked" class="fixed inset-0 bg-background z-50 flex items-center justify-center p-4">
    <Card v-if="currentUserCanManageBilling" class="w-full max-w-md">
      <CardHeader>
        <CardTitle>Your subscription has expired</CardTitle>
        <CardDescription>Choose a plan to keep using BALCE.</CardDescription>
      </CardHeader>
      <CardContent>
        <PaymentFlow
          :payment-flow-step="paymentFlowStep"
          :selected-package="selectedPackage"
          :last-package="lastPackage"
          :license-packages="licensePackages"
          :is-submitting-payment="isSubmittingPayment"
          :last-error-message="lastErrorMessage"
          :show-all-packages="showAllPackages"
          @select-package="handleSelectPackage"
          @go-back="goBackToPackages"
          @toggle-package-list="toggleShowAllPackages"
          @submit="handleSubmit"
          @retry="retryPayment"
          @go-to-details="paymentFlowStep = 'enter-details'"
        />
      </CardContent>
    </Card>

    <Card v-else class="w-full max-w-md">
      <CardHeader>
        <CardTitle>Subscription expired</CardTitle>
        <CardDescription>Ask your business owner or admin to renew the subscription to keep using BALCE.</CardDescription>
      </CardHeader>
    </Card>
  </div>
</template>
