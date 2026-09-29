<script setup lang="ts">
import {
  Building2,
  Settings2,
  Wifi,
  Bell,
  Printer,
  Save,
  Upload,
  Phone,
  MapPin,
  Hash,
  Mail,
  Volume2,
  TestTube,
  RefreshCw,
  DatabaseBackup,
  Network,
  DownloadCloud,
  CheckCircle2,
  RotateCw,
  Palette,
} from 'lucide-vue-next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import BackupPanel from '@/components/backup/BackupPanel.vue'
import NetworkPanel from '@/components/settings/NetworkPanel.vue'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSettings } from '~/composables/useSettings'
import { usePrint } from '~/composables/usePrint'
import BrandingPanel from '@/components/settings/BrandingPanel.vue'
import { isTauri } from '~/composables/usePlatform'
import TeamCatalogDialog from '@/components/catalog/TeamCatalogDialog.vue'

definePageMeta({ layout: 'default' })

const { settings, loading, fetchSettings, updateSettings } = useSettings()
const runningInTauri = isTauri()

// ─── Business form ─────────────────────────────────────────────────────────
// Source: settings.company.* (companies table)
const businessForm = ref({
  business_name: '',
  business_phone: '',
  business_address: '',
  business_tin: '',
  receipt_header: '',
  receipt_footer: '',
})

// ─── System form ────────────────────────────────────────────────────────────
// Source: settings.* (settings table)
const systemForm = ref({
  tax_rate: 18,
  currency_code: 'TZS',
  currency_decimals: 0,
  date_format: 'DD/MM/YYYY',
  receipt_number_format: 'SALE-{DATE}-{COUNTER}',
})

// ─── Hardware form ──────────────────────────────────────────────────────────
const hardwareForm = ref({
  printerEnabled: false,
  printerPort: '',
  printerModel: '',
  print_receipt_automatically: false,
  show_tax_on_receipt: true,
  show_barcodes_on_receipt: false,
  till_numpad_enabled: false,
  customer_display_enabled: false,
})

// ─── Printer detection ───────────────────────────────────────────────────────
const { devices: detectedPrinters, scanning, testingPort, fetchDevices, testPrint } = usePrint()

// ─── EFD form ───────────────────────────────────────────────────────────────
// Source: settings.* (settings table)
const efdForm = ref({
  efd_enabled: false,
  efd_endpoint: '',
  efd_api_key: '',
})

// ─── Notification form ───────────────────────────────────────────────────────
// Source: settings.* (settings table)
const notificationForm = ref({
  low_stock_threshold: 5,
  email_notifications_enabled: false,
  notification_email: '',
  alert_sound_enabled: true,
  alert_on_low_stock: true,
  alert_on_out_of_stock: true,
  alert_on_dead_stock: false,
  dead_stock_days: 30,
})

// ─── Per-section saving state ─────────────────────────────────────────────────
const savingBusiness = ref(false)
const savingSystem = ref(false)
const savingHardware = ref(false)
const savingEfd = ref(false)
const savingNotifications = ref(false)

// ─── Fill every form from the API response ────────────────────────────────────
// settings.company.* → businessForm
// settings.*         → everything else
const loadForms = () => {
  if (!settings.value) return
  const s = settings.value
  const c = s.company // nested company object from the backend

  businessForm.value = {
    business_name: c.name ?? '',
    business_phone: c.phone ?? '',
    business_address: c.address ?? '',
    business_tin: c.tin ?? '',
    receipt_header: c.receipt_header ?? '',
    receipt_footer: c.receipt_footer ?? '',
  }

  systemForm.value = {
    tax_rate: s.tax_rate ?? 18,
    currency_code: c.currency_code ?? 'TZS',
    currency_decimals: c.currency_decimals ?? 0,
    date_format: s.date_format ?? 'DD/MM/YYYY',
    receipt_number_format: s.receipt_number_format ?? 'SALE-{DATE}-{COUNTER}',
  }

  efdForm.value = {
    efd_enabled: s.efd_enabled ?? false,
    efd_endpoint: s.efd_endpoint ?? '',
    efd_api_key: '',
  }

  notificationForm.value = {
    low_stock_threshold: s.low_stock_threshold ?? 5,
    email_notifications_enabled: s.email_notifications_enabled ?? false,
    notification_email: s.notification_email ?? '',
    alert_sound_enabled: s.alert_sound_enabled ?? true,
    alert_on_low_stock: s.alert_on_low_stock ?? true,
    alert_on_out_of_stock: s.alert_on_out_of_stock ?? true,
    alert_on_dead_stock: s.alert_on_dead_stock ?? false,
    dead_stock_days: s.dead_stock_days ?? 30,
  }

  hardwareForm.value.print_receipt_automatically = s.print_receipt_automatically ?? false
  hardwareForm.value.show_tax_on_receipt = s.show_tax_on_receipt ?? true
  hardwareForm.value.show_barcodes_on_receipt = s.show_barcodes_on_receipt ?? false
  hardwareForm.value.printerEnabled = s.printer_enabled ?? false
  hardwareForm.value.printerPort = s.printer_port ?? ''
  hardwareForm.value.printerModel = s.printer_model ?? ''
  hardwareForm.value.till_numpad_enabled = s.till_numpad_enabled ?? false
  hardwareForm.value.customer_display_enabled = s.customer_display_enabled ?? false

}
const { user } = useAuth()
const { isDesktopInstall, fetchPlatform } = usePlatform()
const showDesktopTabs = computed(() => runningInTauri && isDesktopInstall.value)
const showNetworkTab = computed(() => showDesktopTabs.value && user.value?.is_owner === true)

// ─── Updates ─────────────────────────────────────────────────────────────────
const {
  status: updateStatus,
  currentVersion,
  latestVersion,
  errorMessage: updateError,
  downloadProgress,
  fetchCurrentVersion,
  checkForUpdate,
  downloadAndInstall,
  relaunchApp,
} = useUpdater()

const teamToolsTapsNeeded = 7
const teamToolsTapWindowMilliseconds = 2500
const showTeamTools = ref(false)
let versionTapCount = 0
let lastVersionTapAt = 0

const onVersionTap = () => {
  const now = Date.now()
  versionTapCount = now - lastVersionTapAt > teamToolsTapWindowMilliseconds ? 1 : versionTapCount + 1
  lastVersionTapAt = now
  if (versionTapCount < teamToolsTapsNeeded) return
  versionTapCount = 0
  showTeamTools.value = true
}

const route = useRoute()
const activeSettingsTab = ref(String(route.query.tab ?? 'business'))
watch(() => route.query.tab, (requestedTab) => {
  if (requestedTab) activeSettingsTab.value = String(requestedTab)
})

onMounted(async () => {
  fetchPlatform()
  await fetchSettings()
  loadForms()
  if (runningInTauri) {
    await fetchCurrentVersion()
    await fetchDevices()
  }
})

// Re-populate whenever settings refreshes (e.g. after a save returns the updated record)
watch(() => settings.value, () => loadForms())

// ─── Save: Business ──────────────────────────────────────────────────────────
// Sends: business_name, business_phone, business_address, business_tin,
//        receipt_header, receipt_footer  →  companies table via service layer
const saveBusiness = async () => {
  savingBusiness.value = true
  try {
    await updateSettings({ ...businessForm.value })
  } catch {} finally {
    savingBusiness.value = false
  }
}

// ─── Save: System ────────────────────────────────────────────────────────────
const saveSystem = async () => {
  savingSystem.value = true
  try {
    await updateSettings({ ...systemForm.value })
  } catch {} finally {
    savingSystem.value = false
  }
}

// ─── Save: Hardware ──────────────────────────────────────────────────────────
const saveHardware = async () => {
  savingHardware.value = true
  try {
    await updateSettings({
      print_receipt_automatically: hardwareForm.value.print_receipt_automatically,
      show_tax_on_receipt: hardwareForm.value.show_tax_on_receipt,
      show_barcodes_on_receipt: hardwareForm.value.show_barcodes_on_receipt,
      printer_enabled: hardwareForm.value.printerEnabled,
      printer_port: hardwareForm.value.printerPort,
      printer_model: hardwareForm.value.printerModel,
      till_numpad_enabled: hardwareForm.value.till_numpad_enabled,
      customer_display_enabled: hardwareForm.value.customer_display_enabled,
    })
  } catch {} finally {
    savingHardware.value = false
  }
}

// ─── Save: EFD ───────────────────────────────────────────────────────────────
const saveEfd = async () => {
  savingEfd.value = true
  try {
    const hasNewApiKey = efdForm.value.efd_api_key.trim() !== ''
    await updateSettings({
      efd_enabled: efdForm.value.efd_enabled,
      efd_endpoint: efdForm.value.efd_endpoint,
      ...(hasNewApiKey ? { efd_api_key: efdForm.value.efd_api_key } : {}),
    })
    efdForm.value.efd_api_key = ''
  } catch {} finally {
    savingEfd.value = false
  }
}

const removeEfdApiKey = async () => {
  savingEfd.value = true
  try {
    await updateSettings({ efd_api_key: '' })
  } catch {} finally {
    savingEfd.value = false
  }
}

// ─── Save: Notifications ─────────────────────────────────────────────────────
// Sends all notification fields → settings table
const saveNotifications = async () => {
  savingNotifications.value = true
  try {
    await updateSettings({ ...notificationForm.value })
  } catch {} finally {
    savingNotifications.value = false
  }
}

const efdBadgeVariant = computed(() => (settings.value?.efd_enabled ? 'default' as const : 'secondary' as const))
const efdBadgeLabel = computed(() => {
  if (!settings.value?.efd_enabled) return 'Disabled'
  return settings.value.efd_api_key_set ? 'Enabled · key saved' : 'Enabled · no key'
})
</script>

<template>
  <div class="flex flex-col gap-6 p-6 max-w-4xl">

    <div>
      <h1 class="text-2xl font-semibold tracking-tight">Settings</h1>
      <p class="text-sm text-muted-foreground mt-1">Manage your business and system configuration</p>
    </div>

    <!-- Skeleton while first load -->
    <div v-if="loading && !settings" class="flex flex-col gap-3">
      <div v-for="i in 4" :key="i" class="h-28 rounded-lg bg-muted animate-pulse" />
    </div>

    <Tabs v-else v-model="activeSettingsTab">
      <TabsList class="w-full justify-start overflow-x-auto">
        <TabsTrigger value="business">
          <Building2 />Business
        </TabsTrigger>
        <TabsTrigger value="branding">
          <Palette />Branding
        </TabsTrigger>
        <TabsTrigger value="system">
          <Settings2 />System
        </TabsTrigger>
        <TabsTrigger value="hardware">
          <Printer />Hardware
        </TabsTrigger>
        <TabsTrigger value="efd">
          <Wifi />EFD
        </TabsTrigger>
        <TabsTrigger value="notifications">
          <Bell />Notifications
        </TabsTrigger>
        <TabsTrigger v-if="showDesktopTabs" value="backups">
          <DatabaseBackup />Backups
        </TabsTrigger>
        <TabsTrigger v-if="showNetworkTab" value="network">
          <Network />Network
        </TabsTrigger>
        <TabsTrigger v-if="runningInTauri" value="updates">
          <RefreshCw />Updates
        </TabsTrigger>
      </TabsList>

      <!-- ══════════════════════════════════════════════ -->
      <!-- BUSINESS                                       -->
      <!-- ══════════════════════════════════════════════ -->
      <TabsContent value="business" class="flex flex-col gap-4 mt-4">

        <!-- Details card -->
        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-base">Business Details</CardTitle>
            <CardDescription>Saved to your company profile — shown on receipts and reports</CardDescription>
          </CardHeader>
          <CardContent class="flex flex-col gap-4">
            <div class="grid grid-cols-2 gap-4">
              <div class="flex flex-col gap-1.5">
                <Label for="business-name">Business Name</Label>
                <Input id="business-name" v-model="businessForm.business_name" placeholder="Acme Ltd." />
              </div>
              <div class="flex flex-col gap-1.5">
                <Label for="business-phone">Phone Number</Label>
                <div class="relative">
                  <Phone class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input id="business-phone" v-model="businessForm.business_phone" class="pl-9" placeholder="+255 XXX XXX XXX" />
                </div>
              </div>
            </div>

            <div class="flex flex-col gap-1.5 max-w-xs">
              <Label for="business-tin">TIN Number</Label>
              <div class="relative">
                <Hash class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input id="business-tin" v-model="businessForm.business_tin" class="pl-9" placeholder="123-456-789" />
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <Label for="business-address">Address</Label>
              <div class="relative">
                <MapPin class="absolute left-3 top-3 size-4 text-muted-foreground" />
                <Textarea id="business-address" v-model="businessForm.business_address" class="pl-9 min-h-20 resize-none" placeholder="Street, City, Region" />
              </div>
            </div>

            <Separator />

            <div class="flex flex-col gap-1.5">
              <Label for="receipt-header">Receipt Header</Label>
              <Textarea id="receipt-header" v-model="businessForm.receipt_header" class="min-h-16 resize-none" placeholder="e.g. Thank you for shopping with us!" />
            </div>
            <div class="flex flex-col gap-1.5">
              <Label for="receipt-footer">Receipt Footer</Label>
              <Textarea id="receipt-footer" v-model="businessForm.receipt_footer" class="min-h-16 resize-none" placeholder="e.g. Goods sold are not returnable." />
            </div>

            <div class="flex justify-end pt-1">
              <Button :disabled="savingBusiness" @click="saveBusiness">
                <Save class="size-4 mr-2" />
                {{ savingBusiness ? 'Saving…' : 'Save Business Info' }}
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="branding" class="mt-4">
        <BrandingPanel />
      </TabsContent>

      <!-- ══════════════════════════════════════════════ -->
      <!-- SYSTEM                                         -->
      <!-- ══════════════════════════════════════════════ -->
      <TabsContent value="system" class="flex flex-col gap-4 mt-4">
        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-base">Currency &amp; Tax</CardTitle>
            <CardDescription>Applied to all sales and reports</CardDescription>
          </CardHeader>
          <CardContent class="flex flex-col gap-4">
            <div class="grid gap-4 sm:grid-cols-3">
              <div class="flex flex-col gap-1.5">
                <Label for="currency-code">Currency Code</Label>
                <Select v-model="systemForm.currency_code">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TZS">TZS — Tanzanian Shilling</SelectItem>
                    <SelectItem value="USD">USD — US Dollar</SelectItem>
                    <SelectItem value="KES">KES — Kenyan Shilling</SelectItem>
                    <SelectItem value="UGX">UGX — Ugandan Shilling</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="flex flex-col gap-1.5">
                <Label for="currency-decimals">Decimal places</Label>
                <Select v-model="systemForm.currency_decimals">
                  <SelectTrigger id="currency-decimals"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem :value="0">None (1,500)</SelectItem>
                    <SelectItem :value="2">Two (1,500.00)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="flex flex-col gap-1.5">
                <Label for="tax-rate">Tax Rate (%)</Label>
                <Input id="tax-rate" v-model.number="systemForm.tax_rate" type="number" min="0" max="100" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-base">Date &amp; Receipt Format</CardTitle>
            <CardDescription>Controls how dates and receipt numbers are displayed</CardDescription>
          </CardHeader>
          <CardContent class="flex flex-col gap-4">
            <div class="grid grid-cols-2 gap-4">
              <div class="flex flex-col gap-1.5">
                <Label for="date-format">Date Format</Label>
                <Select v-model="systemForm.date_format">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="flex flex-col gap-1.5">
                <Label for="receipt-number-format">Receipt Number Format</Label>
                <Input id="receipt-number-format" v-model="systemForm.receipt_number_format" placeholder="SALE-{DATE}-{COUNTER}" />
                <p class="text-xs text-muted-foreground">Tokens: <code class="text-xs">{DATE}</code> · <code class="text-xs">{COUNTER}</code></p>
              </div>
            </div>
            <div class="flex justify-end pt-1">
              <Button :disabled="savingSystem" @click="saveSystem">
                <Save class="size-4 mr-2" />
                {{ savingSystem ? 'Saving…' : 'Save System Settings' }}
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <!-- ══════════════════════════════════════════════ -->
      <!-- HARDWARE                                       -->
      <!-- ══════════════════════════════════════════════ -->
      <TabsContent value="hardware" class="flex flex-col gap-4 mt-4">

        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-base">Till extras</CardTitle>
            <CardDescription>Only switch on what your tills use. Everything off stays hidden at the till.</CardDescription>
          </CardHeader>
          <CardContent>
            <div class="flex flex-col gap-3">
              <div class="flex items-center justify-between gap-4">
                <div>
                  <p class="text-sm">On-screen number pad</p>
                  <p class="text-xs text-muted-foreground">For touch screens: type quantities and cash without a keyboard</p>
                </div>
                <Switch v-model="hardwareForm.till_numpad_enabled" aria-label="On-screen number pad" />
              </div>
              <div class="flex items-center justify-between gap-4">
                <div>
                  <p class="text-sm">Customer display</p>
                  <p class="text-xs text-muted-foreground">A second screen facing the customer shows the items, total and change</p>
                </div>
                <Switch v-model="hardwareForm.customer_display_enabled" aria-label="Customer display" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-base">Receipt options</CardTitle>
            <CardDescription>Apply to printed and on-screen receipts</CardDescription>
          </CardHeader>
          <CardContent>
            <div class="flex flex-col gap-3">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm">Print automatically after sale</p>
                  <p class="text-xs text-muted-foreground">No prompt — prints immediately on completion</p>
                </div>
                <Switch v-model="hardwareForm.print_receipt_automatically" />
              </div>
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm">Show tax on receipt</p>
                  <p class="text-xs text-muted-foreground">Display VAT as a separate line item</p>
                </div>
                <Switch v-model="hardwareForm.show_tax_on_receipt" />
              </div>
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm">Print barcodes on receipt</p>
                  <p class="text-xs text-muted-foreground">Include product barcodes below line items</p>
                </div>
                <Switch v-model="hardwareForm.show_barcodes_on_receipt" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card v-if="runningInTauri">
          <CardHeader class="pb-3">
            <div class="flex items-center justify-between">
              <div>
                <CardTitle class="text-base">Thermal Receipt Printer</CardTitle>
                <CardDescription class="mt-0.5">Connect a USB or network thermal printer</CardDescription>
              </div>
              <Switch v-model="hardwareForm.printerEnabled" />
            </div>
          </CardHeader>
          <CardContent v-if="hardwareForm.printerEnabled" class="flex flex-col gap-4">
            <div class="flex flex-col gap-1.5">
              <div class="flex items-center justify-between">
                <Label>Detected Printers</Label>
                <Button variant="ghost" size="sm" :disabled="scanning" @click="fetchDevices">
                  <RefreshCw class="size-3.5 mr-1.5" :class="{ 'animate-spin': scanning }" />
                  {{ scanning ? 'Scanning…' : 'Refresh' }}
                </Button>
              </div>

              <div v-if="detectedPrinters.length === 0" class="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
                No USB or serial printer detected. Plug it in and click Refresh — or enter a network/Bluetooth address manually below.
              </div>
              <div v-else class="flex flex-col gap-1.5">
                <button
                  v-for="device in detectedPrinters"
                  :key="device.port"
                  type="button"
                  class="flex items-center justify-between rounded-md border px-3 py-2 text-left transition-colors hover:bg-accent"
                  :class="hardwareForm.printerPort === device.port ? 'border-primary bg-primary/5' : ''"
                  @click="hardwareForm.printerPort = device.port"
                >
                  <div class="flex flex-col min-w-0">
                    <span class="text-sm font-medium truncate">{{ device.product || device.port }}</span>
                    <span class="text-xs text-muted-foreground font-mono">{{ device.port }}</span>
                  </div>
                  <CheckCircle2 v-if="hardwareForm.printerPort === device.port" class="size-4 text-primary shrink-0" />
                </button>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="flex flex-col gap-1.5">
                <Label for="printer-port">Port <span class="text-muted-foreground text-xs">(pick above, or enter a network/Bluetooth address)</span></Label>
                <Input id="printer-port" v-model="hardwareForm.printerPort" placeholder="e.g. COM3, /dev/ttyUSB0, or 192.168.1.50" />
              </div>
              <div class="flex flex-col gap-1.5">
                <Label for="printer-model">Printer Model <span class="text-muted-foreground text-xs">(optional)</span></Label>
                <Input id="printer-model" v-model="hardwareForm.printerModel" placeholder="e.g. Epson TM-T20III" />
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              class="self-start"
              :disabled="!hardwareForm.printerPort || testingPort"
              @click="testPrint(hardwareForm.printerPort)"
            >
              <TestTube class="size-4 mr-2" />
              {{ testingPort ? 'Printing…' : 'Test Print' }}
            </Button>

          </CardContent>
        </Card>

        <div class="flex justify-end">
          <Button :disabled="savingHardware" @click="saveHardware">
            <Save class="size-4 mr-2" />
            {{ savingHardware ? 'Saving…' : 'Save Hardware Settings' }}
          </Button>
        </div>
      </TabsContent>

      <!-- ══════════════════════════════════════════════ -->
      <!-- EFD                                            -->
      <!-- ══════════════════════════════════════════════ -->
      <TabsContent value="efd" class="flex flex-col gap-4 mt-4">
        <Card>
          <CardHeader class="pb-3">
            <div class="flex items-center justify-between">
              <div>
                <CardTitle class="text-base flex items-center gap-2">
                  Electronic Fiscal Device
                  <Badge :variant="efdBadgeVariant">{{ efdBadgeLabel }}</Badge>
                </CardTitle>
                <CardDescription class="mt-0.5">Send every sale to your EFD service after it is saved</CardDescription>
              </div>
              <Switch v-model="efdForm.efd_enabled" aria-label="Send sales to the EFD" />
            </div>
          </CardHeader>
          <CardContent v-if="efdForm.efd_enabled" class="flex flex-col gap-4">
            <div class="flex flex-col gap-1.5">
              <Label for="efd-endpoint">EFD Endpoint URL</Label>
              <Input id="efd-endpoint" v-model="efdForm.efd_endpoint" placeholder="https://efd.tra.go.tz/api/v1" />
            </div>
            <div class="flex flex-col gap-1.5">
              <Label for="efd-api-key">API Key</Label>
              <Input
                id="efd-api-key"
                v-model="efdForm.efd_api_key"
                type="password"
                autocomplete="off"
                :placeholder="settings?.efd_api_key_set ? 'Saved. Type a new key to replace it' : 'Paste the key from TRA'"
              />
            </div>
            <div class="flex flex-wrap gap-2 pt-1">
              <Button :disabled="savingEfd" @click="saveEfd">
                <Save class="size-4 mr-2" />
                {{ savingEfd ? 'Saving…' : 'Save EFD Settings' }}
              </Button>
              <Button v-if="settings?.efd_api_key_set" variant="outline" :disabled="savingEfd" @click="removeEfdApiKey">
                Remove saved key
              </Button>
            </div>
          </CardContent>
          <CardContent v-else>
            <div class="rounded-md border bg-muted/40 p-3 flex items-start gap-2">
              <Wifi class="size-4 mt-0.5 text-muted-foreground shrink-0" />
              <p class="text-sm text-muted-foreground">When on, each sale is sent to the EFD address below. Selling keeps working if the EFD is offline; waiting receipts can be sent again from Sales History.</p>
            </div>
            <Button v-if="settings?.efd_enabled" class="mt-3" :disabled="savingEfd" @click="saveEfd">
              <Save class="size-4 mr-2" />
              {{ savingEfd ? 'Saving…' : 'Turn EFD off' }}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <!-- ══════════════════════════════════════════════ -->
      <!-- NOTIFICATIONS                                  -->
      <!-- ══════════════════════════════════════════════ -->
      <TabsContent value="notifications" class="flex flex-col gap-4 mt-4">

        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-base">Alert Sound</CardTitle>
            <CardDescription>Play a sound when stock alerts are triggered in-app</CardDescription>
          </CardHeader>
          <CardContent>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <Volume2 class="size-4 text-muted-foreground" />
                <p class="text-sm">Enable notification sounds</p>
              </div>
              <Switch v-model="notificationForm.alert_sound_enabled" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-base">Stock Alerts</CardTitle>
            <CardDescription>Notifications when inventory reaches critical levels</CardDescription>
          </CardHeader>
          <CardContent class="flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm">Low stock alert</p>
                <p class="text-xs text-muted-foreground">Triggers when quantity falls below the threshold</p>
              </div>
              <Switch v-model="notificationForm.alert_on_low_stock" />
            </div>
            <div v-if="notificationForm.alert_on_low_stock" class="flex flex-col gap-1.5 max-w-xs">
              <Label for="low-stock-threshold">Low Stock Threshold (units)</Label>
              <Input id="low-stock-threshold" v-model.number="notificationForm.low_stock_threshold" type="number" min="1" />
            </div>

            <Separator />

            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm">Out of stock alert</p>
                <p class="text-xs text-muted-foreground">Triggers when a product reaches zero units</p>
              </div>
              <Switch v-model="notificationForm.alert_on_out_of_stock" />
            </div>

            <Separator />

            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm">Dead stock alert</p>
                <p class="text-xs text-muted-foreground">Items with no sales movement over a set period</p>
              </div>
              <Switch v-model="notificationForm.alert_on_dead_stock" />
            </div>
            <div v-if="notificationForm.alert_on_dead_stock" class="flex flex-col gap-1.5 max-w-xs">
              <Label for="dead-stock-period">Dead Stock Period (days)</Label>
              <Input id="dead-stock-period" v-model.number="notificationForm.dead_stock_days" type="number" min="1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="pb-3">
            <div class="flex items-center justify-between">
              <div>
                <CardTitle class="text-base">Email Notifications</CardTitle>
                <CardDescription>Receive stock alerts by email in addition to in-app</CardDescription>
              </div>
              <Switch v-model="notificationForm.email_notifications_enabled" />
            </div>
          </CardHeader>
          <CardContent v-if="notificationForm.email_notifications_enabled">
            <div class="flex flex-col gap-1.5 max-w-sm">
              <Label for="notification-email">Notification Email</Label>
              <div class="relative">
                <Mail class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input id="notification-email" v-model="notificationForm.notification_email" type="email" class="pl-9" placeholder="you@example.com" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div class="flex justify-end">
          <Button :disabled="savingNotifications" @click="saveNotifications">
            <Save class="size-4 mr-2" />
            {{ savingNotifications ? 'Saving…' : 'Save Notification Settings' }}
          </Button>
        </div>
      </TabsContent>

      <!-- ══════════════════════════════════════════════ -->
      <!-- UPDATES                                        -->
      <!-- ══════════════════════════════════════════════ -->
      <TabsContent v-if="showDesktopTabs" value="backups" class="mt-4">
        <BackupPanel />
      </TabsContent>

      <TabsContent v-if="showNetworkTab" value="network" class="mt-4">
        <NetworkPanel />
      </TabsContent>

      <TabsContent v-if="runningInTauri" value="updates" class="flex flex-col gap-4 mt-4">
        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-base">App Version</CardTitle>
            <CardDescription>New versions are checked automatically</CardDescription>
          </CardHeader>
          <CardContent class="flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm">Current version</p>
                <p class="text-xs text-muted-foreground mt-0.5 select-none" @click="onVersionTap">{{ currentVersion || '—' }}</p>
              </div>
              <Badge v-if="updateStatus === 'up-to-date'" variant="secondary">
                <CheckCircle2 class="size-3 mr-1" />Up to date
              </Badge>
              <Badge v-else-if="updateStatus === 'available'" variant="default">
                Update available: {{ latestVersion }}
              </Badge>
            </div>

            <p v-if="updateStatus === 'error'" class="text-sm text-destructive">{{ updateError }}</p>

            <div
              v-if="updateStatus === 'available'"
              class="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm"
            >
              <p class="font-medium">Version {{ latestVersion }} is ready to install</p>
              <p class="text-muted-foreground mt-0.5">
                A backup is saved on this PC first. The POS then closes and reopens by itself. Your sales, products and settings are kept.
              </p>
            </div>

            <div v-if="updateStatus === 'downloading' || updateStatus === 'installing'" class="flex flex-col gap-2">
              <div class="flex items-center justify-between text-sm">
                <span>{{ updateStatus === 'downloading' ? 'Downloading update…' : 'Saving a backup and installing…' }}</span>
                <span v-if="updateStatus === 'downloading' && downloadProgress !== null" class="tabular-nums text-muted-foreground">
                  {{ downloadProgress }}%
                </span>
              </div>
              <div class="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  class="h-full rounded-full bg-primary transition-[width] duration-300"
                  :class="updateStatus === 'installing' || downloadProgress === null ? 'w-full animate-pulse' : ''"
                  :style="updateStatus === 'downloading' && downloadProgress !== null ? { width: `${downloadProgress}%` } : undefined"
                />
              </div>
              <p class="text-xs text-muted-foreground">Keep the POS open. It will restart by itself when the update is installed.</p>
            </div>

            <div class="flex gap-2">
              <Button
                v-if="updateStatus !== 'downloaded' && updateStatus !== 'downloading' && updateStatus !== 'installing'"
                variant="outline"
                :disabled="updateStatus === 'checking'"
                @click="checkForUpdate()"
              >
                <RefreshCw class="size-4 mr-2" :class="updateStatus === 'checking' ? 'animate-spin' : ''" />
                {{ updateStatus === 'checking' ? 'Checking…' : 'Check for Updates' }}
              </Button>

              <Button v-if="updateStatus === 'available'" @click="downloadAndInstall">
                <DownloadCloud class="size-4 mr-2" />Update and restart
              </Button>

              <Button v-if="updateStatus === 'downloaded'" @click="relaunchApp">
                <RotateCw class="size-4 mr-2" />Restart to finish
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>

    <TeamCatalogDialog v-model:open="showTeamTools" />
  </div>
</template>