<script setup lang="ts">
import { KeyRound, Laptop, LogOut, Search, Trash2 } from 'lucide-vue-next'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { AdminLicenceDevices, AdminLicenceLookup, AdminLicencePackage, AdminLicencePayment, AdminLicencePaymentInput } from '@/composables/useAdmin'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const route = useRoute()
const { t, formatDate, formatDateTime } = useI18n()
const {
  busy, wapangaji, isDeviceRemovalMissing, fetchWapangajiStatus, connectWapangaji, disconnectWapangaji,
  lookupLicence, fetchPackages, fetchLicencePayments, recordLicencePayment, fetchLicenceDevices, removeLicenceDevice,
} = useAdmin()
useHead({ title: computed(() => t('admin.licences.title')) })

const connectPhone = ref('')
const connectPassword = ref('')
const searchHardwareId = ref(String(route.query.hardware_id ?? ''))
const searchPhone = ref('')
const searchedHardwareId = ref('')
const lookup = ref<AdminLicenceLookup | null>(null)
const packages = ref<AdminLicencePackage[]>([])
const payments = ref<AdminLicencePayment[]>([])
const devices = ref<AdminLicenceDevices | null>(null)
const removeTarget = ref('')
const showRemoveDialog = ref(false)
const payment = ref({ packageId: '', amount: '', method: 'cash' as AdminLicencePaymentInput['method'], reference: '', phone: '' })

const licenceHardwareId = computed(() => searchedHardwareId.value || '')
const chosenPackage = computed(() => packages.value.find(plan => String(plan.id) === payment.value.packageId))
const canSearch = computed(() => wapangaji.value.connected && (searchHardwareId.value.trim() || searchPhone.value.trim()))
const canRecord = computed(() => licenceHardwareId.value && chosenPackage.value && Number(payment.value.amount) > 0 && payment.value.phone.trim() && !busy.value)

watch(chosenPackage, plan => {
  if (plan) payment.value.amount = String(Math.round(Number(plan.price)))
})

const submitConnect = async () => {
  const isConnected = await connectWapangaji(connectPhone.value.trim(), connectPassword.value)
  connectPassword.value = ''
  if (isConnected && searchHardwareId.value) await submitSearch()
}

const loadLicenceExtras = async () => {
  payments.value = licenceHardwareId.value ? await fetchLicencePayments(licenceHardwareId.value) : []
  devices.value = null
  isDeviceRemovalMissing.value = false
}

const submitSearch = async () => {
  if (!canSearch.value) return
  const result = await lookupLicence(searchHardwareId.value.trim(), searchPhone.value.trim())
  lookup.value = result
  searchedHardwareId.value = searchHardwareId.value.trim()
  payment.value.phone = result?.licence?.phone ?? payment.value.phone
  await loadLicenceExtras()
}

const submitPayment = async () => {
  if (!canRecord.value || !chosenPackage.value) return
  const updatedLicence = await recordLicencePayment({
    hardware_id: licenceHardwareId.value,
    phone: payment.value.phone.trim(),
    package_id: chosenPackage.value.id,
    amount: Number(payment.value.amount),
    method: payment.value.method,
    reference: payment.value.reference.trim(),
  })
  if (!updatedLicence) return
  payment.value.reference = ''
  await submitSearch()
}

const showDevices = async () => {
  if (licenceHardwareId.value) devices.value = await fetchLicenceDevices(licenceHardwareId.value)
}

const askToRemove = (hardwareId: string) => {
  removeTarget.value = hardwareId
  showRemoveDialog.value = true
}

const confirmRemove = async () => {
  const updatedDevices = await removeLicenceDevice(licenceHardwareId.value, removeTarget.value)
  showRemoveDialog.value = false
  if (!updatedDevices) return
  devices.value = updatedDevices
  if (lookup.value?.licence) lookup.value.licence.device_count = updatedDevices.hardware_ids.length
}

onMounted(async () => {
  await fetchWapangajiStatus()
  packages.value = await fetchPackages()
  if (searchHardwareId.value && wapangaji.value.connected) await submitSearch()
})
</script>

<template>
  <div class="flex flex-col gap-5">
    <div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">{{ t('admin.licences.title') }}</h1>
        <p class="mt-1 text-sm text-muted-foreground">{{ t('admin.licences.subtitle') }}</p>
      </div>
      <div v-if="wapangaji.connected" class="flex items-center gap-2">
        <Badge variant="secondary">{{ t('admin.licences.connectedAs', { name: wapangaji.name }) }}</Badge>
        <Button variant="ghost" size="sm" @click="disconnectWapangaji"><LogOut />{{ t('admin.licences.disconnect') }}</Button>
      </div>
    </div>

    <Card v-if="!wapangaji.connected" class="max-w-md">
      <CardHeader class="pb-2">
        <CardTitle class="flex items-center gap-2 text-base"><KeyRound class="size-4" />{{ t('admin.licences.connectTitle') }}</CardTitle>
        <CardDescription>{{ t('admin.licences.connectHelp') }}</CardDescription>
      </CardHeader>
      <CardContent>
        <form class="flex flex-col gap-3" @submit.prevent="submitConnect">
          <div class="flex flex-col gap-1.5">
            <Label for="wapangaji-phone">{{ t('admin.licences.phone') }}</Label>
            <Input id="wapangaji-phone" v-model="connectPhone" inputmode="tel" autocomplete="username" placeholder="07XX XXX XXX" />
          </div>
          <div class="flex flex-col gap-1.5">
            <Label for="wapangaji-password">{{ t('admin.licences.password') }}</Label>
            <Input id="wapangaji-password" v-model="connectPassword" type="password" autocomplete="current-password" />
          </div>
          <Button type="submit" :disabled="!connectPhone.trim() || !connectPassword || busy">{{ t('admin.licences.connect') }}</Button>
        </form>
      </CardContent>
    </Card>

    <template v-else>
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-base">{{ t('admin.licences.searchTitle') }}</CardTitle>
          <CardDescription>{{ t('admin.licences.searchHelp') }}</CardDescription>
        </CardHeader>
        <CardContent>
          <form class="grid gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end" @submit.prevent="submitSearch">
            <div class="flex flex-col gap-1.5">
              <Label for="licence-hardware">{{ t('admin.licences.deviceId') }}</Label>
              <Input id="licence-hardware" v-model="searchHardwareId" class="font-mono text-xs" />
            </div>
            <div class="flex flex-col gap-1.5">
              <Label for="licence-phone">{{ t('admin.licences.orPhone') }}</Label>
              <Input id="licence-phone" v-model="searchPhone" inputmode="tel" />
            </div>
            <Button type="submit" :disabled="!canSearch"><Search />{{ t('admin.licences.search') }}</Button>
          </form>
        </CardContent>
      </Card>

      <template v-if="lookup">
        <div class="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader class="pb-2">
              <CardTitle class="text-base">{{ t('admin.licences.licenceTitle') }}</CardTitle>
              <CardDescription v-if="lookup.company_name">
                <NuxtLink :to="`/admin/shops/${lookup.company_id}`" class="hover:underline">{{ t('admin.licences.webShop', { name: lookup.company_name }) }}</NuxtLink>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p v-if="!lookup.found || !lookup.licence" class="text-sm text-muted-foreground">{{ t('admin.licences.notFound') }}</p>
              <dl v-else class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div><dt class="text-xs text-muted-foreground">{{ t('admin.licences.plan') }}</dt><dd class="font-medium">{{ lookup.licence.package || '—' }}</dd></div>
                <div><dt class="text-xs text-muted-foreground">{{ t('admin.licences.expires') }}</dt><dd class="font-medium">{{ lookup.licence.expires_at ? formatDate(lookup.licence.expires_at) : '—' }}</dd></div>
                <div><dt class="text-xs text-muted-foreground">{{ t('admin.licences.devices') }}</dt><dd class="font-medium">{{ t('admin.licences.devicesCount', { count: lookup.licence.device_count, max: lookup.licence.max_devices }) }}</dd></div>
                <div><dt class="text-xs text-muted-foreground">{{ t('admin.licences.phone') }}</dt><dd class="font-medium">{{ lookup.licence.phone }}</dd></div>
                <div class="col-span-2"><dt class="text-xs text-muted-foreground">{{ t('admin.licences.key') }}</dt><dd class="break-all font-mono text-xs">{{ lookup.licence.license_key }}</dd></div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader class="pb-2">
              <CardTitle class="text-base">{{ t('admin.licences.activateTitle') }}</CardTitle>
              <CardDescription>{{ t('admin.licences.activateHelp') }}</CardDescription>
            </CardHeader>
            <CardContent>
              <form v-if="licenceHardwareId" class="grid gap-3 sm:grid-cols-2" @submit.prevent="submitPayment">
                <div class="flex flex-col gap-1.5 sm:col-span-2">
                  <Label for="licence-plan">{{ t('admin.licences.plan') }}</Label>
                  <Select v-model="payment.packageId">
                    <SelectTrigger id="licence-plan" class="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem v-for="plan in packages" :key="plan.id" :value="String(plan.id)">{{ plan.name }} · {{ Math.round(Number(plan.price)).toLocaleString() }} · {{ plan.days_granted }}d · {{ plan.max_devices }}×</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div class="flex flex-col gap-1.5">
                  <Label for="licence-amount">{{ t('admin.licences.amount') }}</Label>
                  <Input id="licence-amount" v-model="payment.amount" inputmode="numeric" />
                </div>
                <div class="flex flex-col gap-1.5">
                  <Label for="licence-method">{{ t('admin.licences.method') }}</Label>
                  <Select v-model="payment.method">
                    <SelectTrigger id="licence-method" class="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem v-for="method in ['cash', 'mobile_money', 'bank_transfer']" :key="method" :value="method">{{ t(`admin.licences.methods.${method}`) }}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div class="flex flex-col gap-1.5">
                  <Label for="licence-customer-phone">{{ t('admin.licences.customerPhone') }}</Label>
                  <Input id="licence-customer-phone" v-model="payment.phone" inputmode="tel" />
                </div>
                <div class="flex flex-col gap-1.5">
                  <Label for="licence-reference">{{ t('admin.licences.reference') }}</Label>
                  <Input id="licence-reference" v-model="payment.reference" />
                </div>
                <Button type="submit" class="sm:col-span-2" :disabled="!canRecord">{{ t('admin.licences.activate') }}</Button>
              </form>
              <p v-else class="text-sm text-muted-foreground">{{ t('admin.licences.searchHelp') }}</p>
            </CardContent>
          </Card>
        </div>

        <Card v-if="lookup.found">
          <CardHeader class="flex flex-row items-start justify-between gap-2 pb-2">
            <div>
              <CardTitle class="text-base">{{ t('admin.licences.devicesTitle') }}</CardTitle>
              <CardDescription>{{ t('admin.licences.devicesHelp') }}</CardDescription>
            </div>
            <Button v-if="!devices && !isDeviceRemovalMissing" variant="outline" size="sm" @click="showDevices"><Laptop />{{ t('admin.licences.showDevices') }}</Button>
          </CardHeader>
          <CardContent>
            <p v-if="isDeviceRemovalMissing" class="text-sm text-muted-foreground">{{ t('admin.licences.updateNeeded') }}</p>
            <ul v-else-if="devices" class="flex flex-col divide-y">
              <li v-for="hardwareId in devices.hardware_ids" :key="hardwareId" class="flex items-center justify-between gap-2 py-2">
                <span class="min-w-0 break-all font-mono text-xs">
                  {{ hardwareId }}
                  <Badge v-if="hardwareId === licenceHardwareId" variant="outline" class="ml-1">{{ t('admin.licences.searched') }}</Badge>
                </span>
                <Button variant="ghost" size="sm" class="text-destructive hover:text-destructive" :disabled="busy || devices.hardware_ids.length <= 1" @click="askToRemove(hardwareId)"><Trash2 />{{ t('admin.licences.remove') }}</Button>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card v-if="lookup.found">
          <CardHeader class="pb-2"><CardTitle class="text-base">{{ t('admin.licences.paymentsTitle') }}</CardTitle></CardHeader>
          <CardContent>
            <p v-if="!payments.length" class="text-sm text-muted-foreground">{{ t('admin.licences.noPayments') }}</p>
            <ul v-else class="flex flex-col divide-y text-sm">
              <li v-for="(record, index) in payments" :key="index" class="flex flex-wrap items-center justify-between gap-2 py-2">
                <span><span class="font-medium">{{ record.package || '—' }}</span> · {{ Math.round(Number(record.amount)).toLocaleString() }} · {{ t(`admin.licences.methods.${record.method}`) }}<template v-if="record.reference"> · {{ record.reference }}</template></span>
                <span class="text-xs text-muted-foreground">{{ formatDateTime(record.created_at) }}<template v-if="record.processed_by"> · {{ t('admin.licences.by', { name: record.processed_by }) }}</template></span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </template>
    </template>

    <AlertDialog v-model:open="showRemoveDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{{ t('admin.licences.removeTitle') }}</AlertDialogTitle>
          <AlertDialogDescription><span class="block break-all font-mono text-xs">{{ removeTarget }}</span>{{ t('admin.licences.removeBody') }}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{{ t('common.actions.cancel') }}</AlertDialogCancel>
          <AlertDialogAction class="bg-destructive text-white hover:bg-destructive/90" :disabled="busy" @click.prevent="confirmRemove">{{ t('admin.licences.remove') }}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
