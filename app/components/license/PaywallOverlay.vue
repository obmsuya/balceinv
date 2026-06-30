<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { z } from 'zod'
import { ArrowLeft, X, CheckCircle, Smartphone } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import type { LicensePackage } from '@/composables/useLicense'
import { useLicense } from '@/composables/useLicense'

const { isHardLocked, showGraceBanner, licenseStatus, licensePackages, lastPackage, fetchLicenseStatus, fetchPackages, fetchLastPackage, payForLicense, pollUntilLicensed, dismissBanner } = useLicense()

const paymentFlowStep = ref<'select-package' | 'enter-details' | 'awaiting-confirmation' | 'success' | 'failed'>('select-package')
const selectedPackage = ref<LicensePackage | null>(null)
const isSubmittingPayment = ref(false)
const showAllPackages = ref(false)
const lastErrorMessage = ref('')

const formSchema = toTypedSchema(z.object({
  phone: z.string().regex(/^(?:\+255|0)[67]\d{8}$/, 'Enter a valid phone number'),
  provider: z.enum(['Mpesa', 'Tigo', 'Airtel', 'Halopesa', 'Azampesa'])
}))

const form = useForm({ validationSchema: formSchema })

const formatCurrency = (value: string | number): string => {
  const number = typeof value === 'number' ? value : Number.parseFloat(value.replace(/[^0-9.]/g, ''))
  if (Number.isNaN(number)) return ''
  return new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS',
    minimumFractionDigits: 0,
  }).format(number)
}

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

const selectPackageAndContinue = (pkg: LicensePackage) => {
  selectedPackage.value = pkg
  paymentFlowStep.value = 'enter-details'
}

const goBackToPackages = () => {
  paymentFlowStep.value = 'select-package'
  selectedPackage.value = null
  form.resetForm()
}

const onSubmit = form.handleSubmit(async (values) => {
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
          paymentFlowStep.value = 'select-package'
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
})

const retryPayment = async () => {
  try {
    await pollUntilLicensed()
    paymentFlowStep.value = 'success'
    setTimeout(() => {
      if (licenseStatus.value?.licensed) {
        paymentFlowStep.value = 'select-package'
      }
    }, 800)
  } catch {
    lastErrorMessage.value = 'Still waiting for confirmation. Please try again in a moment.'
  }
}

const goBackToDetails = () => {
  paymentFlowStep.value = 'enter-details'
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
        <Button size="sm" @click="paymentFlowStep = 'select-package'">
          Renew Now
        </Button>
        <Button size="icon" variant="ghost" @click="dismissBanner">
          <X class="h-4 w-4" />
        </Button>
      </div>
    </div>
  </div>

  <Dialog v-if="showGraceBanner" :open="paymentFlowStep === 'select-package' || paymentFlowStep === 'enter-details' || paymentFlowStep === 'awaiting-confirmation' || paymentFlowStep === 'success' || paymentFlowStep === 'failed'">
    <DialogContent class="sm:max-w-md">
      <DialogHeader v-if="paymentFlowStep !== 'success'">
        <DialogTitle>
          <span v-if="paymentFlowStep === 'select-package'">Choose a package</span>
          <span v-else-if="paymentFlowStep === 'enter-details'">Enter your details</span>
          <span v-else-if="paymentFlowStep === 'awaiting-confirmation'">Confirming payment</span>
          <span v-else-if="paymentFlowStep === 'failed'">Payment unsuccessful</span>
        </DialogTitle>
      </DialogHeader>

      <div v-if="paymentFlowStep === 'select-package'" class="space-y-4">
        <div v-if="lastPackage && !showAllPackages" class="space-y-4">
          <Card class="border-primary cursor-pointer hover:border-primary" @click="selectPackageAndContinue(lastPackage)">
            <CardHeader>
              <CardTitle class="text-base">{{ lastPackage.name }}</CardTitle>
            </CardHeader>
            <CardContent class="space-y-2">
              <p class="text-2xl font-bold">{{ formatCurrency(lastPackage.price) }}</p>
              <p class="text-sm text-muted-foreground">{{ lastPackage.days_granted }} days · up to {{ lastPackage.max_devices }} device(s)</p>
            </CardContent>
          </Card>

          <Button variant="default" class="w-full" @click="selectPackageAndContinue(lastPackage)">
            Renew {{ lastPackage.name }}
          </Button>

          <button class="text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-center py-2" @click="showAllPackages = true">
            Choose a different package
          </button>
        </div>

        <div v-else class="grid gap-3">
          <Card
            v-for="pkg in licensePackages"
            :key="pkg.id"
            class="cursor-pointer border hover:border-primary transition-colors"
            @click="selectPackageAndContinue(pkg)"
          >
            <CardHeader>
              <CardTitle class="text-base">{{ pkg.name }}</CardTitle>
            </CardHeader>
            <CardContent class="space-y-2">
              <p class="text-2xl font-bold">{{ formatCurrency(pkg.price) }}</p>
              <p class="text-sm text-muted-foreground">{{ pkg.days_granted }} days · up to {{ pkg.max_devices }} device(s)</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div v-else-if="paymentFlowStep === 'enter-details'" class="space-y-4">
        <Button variant="ghost" size="sm" class="mb-2" @click="goBackToPackages">
          <ArrowLeft class="h-4 w-4 mr-2" />
          Back
        </Button>

        <div class="bg-muted rounded-lg p-3 flex justify-between items-center">
          <span class="text-sm">{{ selectedPackage?.name }}</span>
          <span class="font-bold">{{ formatCurrency(selectedPackage?.price || '0') }}</span>
        </div>

        <form @submit="onSubmit" class="space-y-4">
          <FormField v-slot="{ componentField }" name="phone">
            <FormItem>
              <FormLabel>Phone number</FormLabel>
              <FormControl>
                <Input type="tel" placeholder="07XX XXX XXX" v-bind="componentField" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <FormField v-slot="{ componentField }" name="provider">
            <FormItem>
              <FormLabel>Mobile provider</FormLabel>
              <Select :model-value="componentField.modelValue" @update:model-value="componentField.onChange">
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="Mpesa">Mpesa</SelectItem>
                    <SelectItem value="Tigo">Tigo</SelectItem>
                    <SelectItem value="Airtel">Airtel</SelectItem>
                    <SelectItem value="Halopesa">Halopesa</SelectItem>
                    <SelectItem value="Azampesa">Azampesa</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          </FormField>

          <Button type="submit" class="w-full" :disabled="isSubmittingPayment">
            {{ isSubmittingPayment ? 'Processing...' : `Pay ${formatCurrency(selectedPackage?.price || '0')}` }}
          </Button>
        </form>
      </div>

      <div v-else-if="paymentFlowStep === 'awaiting-confirmation'" class="space-y-4 py-6">
        <div class="flex flex-col items-center gap-4">
          <Smartphone class="h-12 w-12 text-muted-foreground animate-pulse" />
          <div class="text-center space-y-2">
            <h3 class="font-semibold text-lg">Check your phone</h3>
            <p class="text-sm text-muted-foreground">
              Enter your MNO PIN to confirm the payment of <span class="font-semibold">{{ formatCurrency(selectedPackage?.price || '0') }}</span>.
            </p>
            <p class="text-xs text-muted-foreground">
              Sent to {{ form.values.phone }}
            </p>
          </div>
        </div>
      </div>

      <div v-else-if="paymentFlowStep === 'success'" class="space-y-4 py-6">
        <div class="flex flex-col items-center gap-4">
          <CheckCircle class="h-12 w-12 text-primary" />
          <div class="text-center space-y-2">
            <h3 class="font-semibold text-lg">Payment received</h3>
            <p class="text-sm text-muted-foreground">
              Thank you — your subscription is active.
            </p>
          </div>
        </div>
      </div>

      <div v-else-if="paymentFlowStep === 'failed'" class="space-y-4">
        <div class="space-y-2">
          <h3 class="font-semibold text-lg">Payment was not successful</h3>
          <p class="text-sm text-muted-foreground">{{ lastErrorMessage }}</p>
        </div>

        <div class="flex gap-2">
          <Button variant="outline" class="flex-1" @click="goBackToDetails">
            Try Different Number
          </Button>
          <Button class="flex-1" @click="retryPayment">
            Check Again
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>

  <div v-if="isHardLocked" class="fixed inset-0 bg-background z-50 flex items-center justify-center">
    <Card class="w-full max-w-md mx-4">
      <CardHeader>
        <CardTitle>Your subscription has expired</CardTitle>
        <CardDescription>Renew now to continue using BALCE.</CardDescription>
      </CardHeader>
      <CardContent>
        <div v-if="paymentFlowStep === 'select-package'" class="space-y-4">
          <div v-if="lastPackage && !showAllPackages" class="space-y-4">
            <Card class="border-primary cursor-pointer hover:border-primary" @click="selectPackageAndContinue(lastPackage)">
              <CardHeader>
                <CardTitle class="text-base">{{ lastPackage.name }}</CardTitle>
              </CardHeader>
              <CardContent class="space-y-2">
                <p class="text-2xl font-bold">{{ formatCurrency(lastPackage.price) }}</p>
                <p class="text-sm text-muted-foreground">{{ lastPackage.days_granted }} days · up to {{ lastPackage.max_devices }} device(s)</p>
              </CardContent>
            </Card>

            <Button variant="default" class="w-full" @click="selectPackageAndContinue(lastPackage)">
              Renew {{ lastPackage.name }}
            </Button>

            <button class="text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-center py-2" @click="showAllPackages = true">
              Choose a different package
            </button>
          </div>

          <div v-else class="grid gap-3">
            <Card
              v-for="pkg in licensePackages"
              :key="pkg.id"
              class="cursor-pointer border hover:border-primary transition-colors"
              @click="selectPackageAndContinue(pkg)"
            >
              <CardHeader>
                <CardTitle class="text-base">{{ pkg.name }}</CardTitle>
              </CardHeader>
              <CardContent class="space-y-2">
                <p class="text-2xl font-bold">{{ formatCurrency(pkg.price) }}</p>
                <p class="text-sm text-muted-foreground">{{ pkg.days_granted }} days · up to {{ pkg.max_devices }} device(s)</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div v-else-if="paymentFlowStep === 'enter-details'" class="space-y-4">
          <Button variant="ghost" size="sm" class="mb-2" @click="goBackToPackages">
            <ArrowLeft class="h-4 w-4 mr-2" />
            Back
          </Button>

          <div class="bg-muted rounded-lg p-3 flex justify-between items-center">
            <span class="text-sm">{{ selectedPackage?.name }}</span>
            <span class="font-bold">{{ formatCurrency(selectedPackage?.price || '0') }}</span>
          </div>

          <form @submit="onSubmit" class="space-y-4">
            <FormField v-slot="{ componentField }" name="phone">
              <FormItem>
                <FormLabel>Phone number</FormLabel>
                <FormControl>
                  <Input type="tel" placeholder="07XX XXX XXX" v-bind="componentField" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField v-slot="{ componentField }" name="provider">
              <FormItem>
                <FormLabel>Mobile provider</FormLabel>
                <Select :model-value="componentField.modelValue" @update:model-value="componentField.onChange">
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="Mpesa">Mpesa</SelectItem>
                      <SelectItem value="Tigo">Tigo</SelectItem>
                      <SelectItem value="Airtel">Airtel</SelectItem>
                      <SelectItem value="Halopesa">Halopesa</SelectItem>
                      <SelectItem value="Azampesa">Azampesa</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            </FormField>

            <Button type="submit" class="w-full" :disabled="isSubmittingPayment">
              {{ isSubmittingPayment ? 'Processing...' : `Pay ${formatCurrency(selectedPackage?.price || '0')}` }}
            </Button>
          </form>
        </div>

        <div v-else-if="paymentFlowStep === 'awaiting-confirmation'" class="space-y-4 py-6">
          <div class="flex flex-col items-center gap-4">
            <Smartphone class="h-12 w-12 text-muted-foreground animate-pulse" />
            <div class="text-center space-y-2">
              <h3 class="font-semibold text-lg">Check your phone</h3>
              <p class="text-sm text-muted-foreground">
                Enter your MNO PIN to confirm the payment of <span class="font-semibold">{{ formatCurrency(selectedPackage?.price || '0') }}</span>.
              </p>
              <p class="text-xs text-muted-foreground">
                Sent to {{ form.values.phone }}
              </p>
            </div>
          </div>
        </div>

        <div v-else-if="paymentFlowStep === 'success'" class="space-y-4 py-6">
          <div class="flex flex-col items-center gap-4">
            <CheckCircle class="h-12 w-12 text-primary" />
            <div class="text-center space-y-2">
              <h3 class="font-semibold text-lg">Payment received</h3>
              <p class="text-sm text-muted-foreground">
                Thank you — your subscription is active.
              </p>
            </div>
          </div>
        </div>

        <div v-else-if="paymentFlowStep === 'failed'" class="space-y-4">
          <div class="space-y-2">
            <h3 class="font-semibold text-lg">Payment was not successful</h3>
            <p class="text-sm text-muted-foreground">{{ lastErrorMessage }}</p>
          </div>

          <div class="flex gap-2">
            <Button variant="outline" class="flex-1" @click="goBackToDetails">
              Try Different Number
            </Button>
            <Button class="flex-1" @click="retryPayment">
              Check Again
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
