<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { LicensePackage } from '@/composables/useLicense'
import { useLicense } from '@/composables/useLicense'
import PaymentFlow from './PaymentFlow.vue'

const { isHardLocked, showGraceBanner, licenseStatus, licensePackages, lastPackage, fetchLicenseStatus, fetchPackages, fetchLastPackage, payForLicense, pollUntilLicensed, dismissBanner } = useLicense()

const paymentFlowStep = ref<'select-package' | 'enter-details' | 'awaiting-confirmation' | 'success' | 'failed'>('select-package')
const selectedPackage = ref<LicensePackage | null>(null)
const isSubmittingPayment = ref(false)
const showAllPackages = ref(false)
const lastErrorMessage = ref('')
const showPaymentDialog = ref(false)

onMounted(async () => {
  await fetchLicenseStatus()

  if (!licenseStatus.value?.licensed) {
    await fetchPackages()
    await fetchLastPackage()
  }

  const pollInterval = setInterval(async () => {
    await fetchLicenseStatus()
  }, 60000)

  onUnmounted(() => clearInterval(pollInterval))
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

const handleSelectPackage = (pkg: LicensePackage) => {
  selectedPackage.value = pkg
  paymentFlowStep.value = 'enter-details'
}

const goBackToPackages = () => {
  paymentFlowStep.value = 'select-package'
  selectedPackage.value = null
  showAllPackages.value = false
}

const handleSubmit = async (values: { phone: string; provider: 'Mpesa' | 'Tigo' | 'Airtel' | 'Halopesa' | 'Azampesa' }) => {
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
      setTimeout(() => {
        if (licenseStatus.value?.licensed) {
          closePaymentDialog()
        }
      }, 800)
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
    setTimeout(() => {
      if (licenseStatus.value?.licensed) {
        closePaymentDialog()
      }
    }, 800)
  } catch {
    lastErrorMessage.value = 'Still waiting for confirmation. Please try again in a moment.'
  }
}
</script>

<template>
  <div v-if="showGraceBanner" class="fixed top-0 left-0 right-0 z-40 bg-muted border-b">
    <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
      <div class="flex-1 min-w-0">
        <p class="text-sm text-foreground">
          Your subscription has ended. You have <span class="font-semibold">{{ Math.abs(licenseStatus?.days_remaining || 0) }}</span> day{{ Math.abs(licenseStatus?.days_remaining || 0) !== 1 ? 's' : '' }} left to renew before the app locks.
        </p>
      </div>
      <div class="flex gap-2 shrink-0">
        <Button size="sm" @click="openPaymentFlow">
          Renew Now
        </Button>
        <Button size="icon" variant="ghost" @click="dismissBanner">
          <X class="h-4 w-4" />
        </Button>
      </div>
    </div>
  </div>

  <Dialog :open="showPaymentDialog" @update:open="(open) => { if (!open) closePaymentDialog() }">
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
        @toggle-package-list="showAllPackages = !showAllPackages"
        @submit="handleSubmit"
        @retry="retryPayment"
        @go-to-details="paymentFlowStep = 'enter-details'"
      />
    </DialogContent>
  </Dialog>

  <div v-if="isHardLocked" class="fixed inset-0 bg-background z-50 flex items-center justify-center">
    <Card class="w-full max-w-md mx-4">
      <CardHeader>
        <CardTitle>Your subscription has expired</CardTitle>
        <CardDescription>Renew now to continue using BALCE.</CardDescription>
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
          @toggle-package-list="showAllPackages = !showAllPackages"
          @submit="handleSubmit"
          @retry="retryPayment"
          @go-to-details="paymentFlowStep = 'enter-details'"
        />
      </CardContent>
    </Card>
  </div>
</template>
