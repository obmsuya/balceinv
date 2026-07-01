<script setup lang="ts">
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import { ArrowLeft, CheckCircle, Smartphone } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
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

const props = defineProps<{
  paymentFlowStep: 'select-package' | 'enter-details' | 'awaiting-confirmation' | 'success' | 'failed'
  selectedPackage: LicensePackage | null
  lastPackage: LicensePackage | null
  licensePackages: LicensePackage[]
  isSubmittingPayment: boolean
  lastErrorMessage: string
  showAllPackages: boolean
}>()

const emit = defineEmits<{
  selectPackage: [pkg: LicensePackage]
  goBack: []
  togglePackageList: []
  submit: [values: { phone: string; provider: 'Mpesa' | 'Tigo' | 'Airtel' | 'Halopesa' | 'Azampesa' }]
  retry: []
  goToDetails: []
}>()

const formatCurrency = (value: string | number): string => {
  const number = typeof value === 'number' ? value : Number.parseFloat(value.replace(/[^0-9.]/g, ''))
  if (Number.isNaN(number)) return ''
  return new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS',
    minimumFractionDigits: 0,
  }).format(number)
}

const formSchema = toTypedSchema(z.object({
  phone: z.string().regex(/^(?:\+255|0)[67]\d{8}$/, 'Enter a valid phone number'),
  provider: z.enum(['Mpesa', 'Tigo', 'Airtel', 'Halopesa', 'Azampesa'])
}))

const form = useForm({ validationSchema: formSchema })

const onSubmit = form.handleSubmit((values) => {
  emit('submit', values)
})
</script>

<template>
  <div v-if="paymentFlowStep === 'select-package'" class="space-y-4">
    <div v-if="lastPackage && !showAllPackages" class="space-y-4">
      <Card class="border-primary cursor-pointer hover:border-primary" @click="emit('selectPackage', lastPackage)">
        <CardHeader>
          <CardTitle class="text-base">{{ lastPackage.name }}</CardTitle>
        </CardHeader>
        <CardContent class="space-y-2">
          <p class="text-2xl font-bold">{{ formatCurrency(lastPackage.price) }}</p>
          <p class="text-sm text-muted-foreground">{{ lastPackage.days_granted }} days · up to {{ lastPackage.max_devices }} device(s)</p>
        </CardContent>
      </Card>

      <Button variant="default" class="w-full" @click="emit('selectPackage', lastPackage)">
        Renew {{ lastPackage.name }}
      </Button>

      <button class="text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-center py-2" @click="emit('togglePackageList')">
        Choose a different package
      </button>
    </div>

    <div v-else class="grid gap-3">
      <Card
        v-for="pkg in licensePackages"
        :key="pkg.id"
        class="cursor-pointer border hover:border-primary transition-colors"
        @click="emit('selectPackage', pkg)"
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
    <Button variant="ghost" size="sm" class="mb-2" @click="emit('goBack')">
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
      <Button variant="outline" class="flex-1" @click="emit('goToDetails')">
        Try Different Number
      </Button>
      <Button class="flex-1" @click="emit('retry')">
        Check Again
      </Button>
    </div>
  </div>
</template>
