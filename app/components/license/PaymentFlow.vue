<script setup lang="ts">
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import { ArrowLeft, CheckCircle, Smartphone, Loader2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

type PaymentFlowStep = 'select-package' | 'enter-details' | 'awaiting-confirmation' | 'success' | 'failed'
type MobileProvider = 'Mpesa' | 'Tigo' | 'Airtel' | 'Halopesa' | 'Azampesa'

const props = defineProps<{
  paymentFlowStep: PaymentFlowStep
  selectedPackage: LicensePackage | null
  lastPackage: LicensePackage | null
  licensePackages: LicensePackage[]
  isSubmittingPayment: boolean
  lastErrorMessage: string
  showAllPackages: boolean
}>()

const emit = defineEmits<{
  selectPackage: [licensePackage: LicensePackage]
  goBack: []
  togglePackageList: []
  submit: [values: { phone: string; provider: MobileProvider }]
  retry: []
  goToDetails: []
}>()

const formatCurrency = (value: string | number): string => {
  const numericValue = typeof value === 'number' ? value : Number.parseFloat(value.replace(/[^0-9.]/g, ''))
  if (Number.isNaN(numericValue)) return ''
  const currencyFormatter = new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS',
    minimumFractionDigits: 0,
  })
  return currencyFormatter.format(numericValue)
}

const formSchema = toTypedSchema(z.object({
  phone: z.string().regex(/^(?:\+255|0)[67]\d{8}$/, 'Enter a valid phone number'),
  provider: z.enum(['Mpesa', 'Tigo', 'Airtel', 'Halopesa', 'Azampesa'])
}))

const form = useForm({ validationSchema: formSchema })

const onSubmit = form.handleSubmit((values) => {
  emit('submit', values)
})

const selectPackage = (licensePackage: LicensePackage) => {
  emit('selectPackage', licensePackage)
}
</script>

<template>
  <div v-if="paymentFlowStep === 'select-package'" class="space-y-3">
    <div v-if="lastPackage && !showAllPackages" class="space-y-3">
      <button
        type="button"
        class="w-full text-left rounded-lg border-2 border-primary bg-primary/5 p-4 transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        @click="selectPackage(lastPackage)"
      >
        <p class="font-semibold">{{ lastPackage.name }}</p>
        <p class="mt-1 text-2xl font-bold">{{ formatCurrency(lastPackage.price) }}</p>
        <p class="mt-1 text-sm text-muted-foreground">{{ lastPackage.days_granted }} days · up to {{ lastPackage.max_devices }} device(s)</p>
      </button>

      <button
        type="button"
        class="w-full text-center py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        @click="emit('togglePackageList')"
      >
        Choose a different package
      </button>
    </div>

    <div v-else class="grid gap-3">
      <button
        v-for="licensePackage in licensePackages"
        :key="licensePackage.id"
        type="button"
        class="w-full text-left rounded-lg border p-4 transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        @click="selectPackage(licensePackage)"
      >
        <p class="font-semibold">{{ licensePackage.name }}</p>
        <p class="mt-1 text-2xl font-bold">{{ formatCurrency(licensePackage.price) }}</p>
        <p class="mt-1 text-sm text-muted-foreground">{{ licensePackage.days_granted }} days · up to {{ licensePackage.max_devices }} device(s)</p>
      </button>
    </div>
  </div>

  <div v-else-if="paymentFlowStep === 'enter-details'" class="space-y-4">
    <Button variant="ghost" size="sm" class="-ml-2" @click="emit('goBack')">
      <ArrowLeft class="mr-2 h-4 w-4" />
      Back
    </Button>

    <div class="flex items-center justify-between rounded-lg bg-muted p-3">
      <span class="text-sm">{{ selectedPackage?.name }}</span>
      <span class="font-bold">{{ formatCurrency(selectedPackage?.price ?? '0') }}</span>
    </div>

    <form class="space-y-4" @submit="onSubmit">
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
        <Loader2 v-if="isSubmittingPayment" class="mr-2 h-4 w-4 animate-spin" />
        {{ isSubmittingPayment ? 'Processing' : `Pay ${formatCurrency(selectedPackage?.price ?? '0')}` }}
      </Button>
    </form>
  </div>

  <div v-else-if="paymentFlowStep === 'awaiting-confirmation'" class="space-y-4 py-6">
    <div class="flex flex-col items-center gap-4 text-center">
      <Smartphone class="h-12 w-12 text-muted-foreground animate-pulse" />
      <div class="space-y-2">
        <h3 class="text-lg font-semibold">Check your phone</h3>
        <p class="text-sm text-muted-foreground">
          Enter your MNO PIN to confirm the payment of <span class="font-semibold">{{ formatCurrency(selectedPackage?.price ?? '0') }}</span>.
        </p>
        <p class="text-xs text-muted-foreground">
          Sent to {{ form.values.phone }}
        </p>
      </div>
    </div>
  </div>

  <div v-else-if="paymentFlowStep === 'success'" class="space-y-4 py-6">
    <div class="flex flex-col items-center gap-4 text-center">
      <CheckCircle class="h-12 w-12 text-primary" />
      <div class="space-y-2">
        <h3 class="text-lg font-semibold">Payment received</h3>
        <p class="text-sm text-muted-foreground">Thank you — your subscription is active.</p>
      </div>
    </div>
  </div>

  <div v-else-if="paymentFlowStep === 'failed'" class="space-y-4">
    <div class="space-y-2">
      <h3 class="text-lg font-semibold">Payment was not successful</h3>
      <p class="text-sm text-muted-foreground">{{ lastErrorMessage }}</p>
    </div>

    <div class="flex gap-2">
      <Button variant="outline" class="flex-1" @click="emit('goToDetails')">
        Try Different Number
      </Button>
      <Button class="flex-1" @click="emit('retry')">
        Check Again
      </Button>
    </div>
  </div>
</template>
