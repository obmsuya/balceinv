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
  Languages,
  ToggleRight,
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
import MoneyInput from '@/components/MoneyInput.vue'
import NetworkPanel from '@/components/settings/NetworkPanel.vue'
import FeaturesPanel from '@/components/settings/FeaturesPanel.vue'
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
const { t } = useI18n()
const { canEdit } = usePermissions()
const canEditSettings = computed(() => canEdit('settings'))
const runningInTauri = isTauri()
const { vatOn } = useFeatures()

// ─── Business form ─────────────────────────────────────────────────────────
// Source: settings.company.* (companies table)
const businessForm = ref({
  business_name: '',
  business_phone: '',
  business_address: '',
  business_tin: '',
  receipt_header: '',
  receipt_footer: '',
  default_locale: 'en',
  receipt_language: 'en',
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
// Sends the receipt, printer and till options, including till_discount_limit_basis_points (the percent × 100).
const hardwareForm = ref({
  printerEnabled: false,
  printerPort: '',
  printerModel: '',
  print_receipt_automatically: false,
  show_tax_on_receipt: true,
  show_barcodes_on_receipt: false,
  till_numpad_enabled: false,
  customer_display_enabled: false,
  tillDiscountLimitPercent: '100',
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
    default_locale: c.default_locale || 'en',
    receipt_language: s.receipt_language || 'en',
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
  hardwareForm.value.tillDiscountLimitPercent = String((s.till_discount_limit_basis_points ?? 10000) / 100)

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
//        receipt_header, receipt_footer, default_locale, receipt_language  →  companies and settings tables via service layer
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
      till_discount_limit_basis_points: Math.min(10000, Math.max(0, Math.round(Number(hardwareForm.value.tillDiscountLimitPercent || 0) * 100))),
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
  if (!settings.value?.efd_enabled) return t('settings.efd.badgeDisabled')
  return settings.value.efd_api_key_set ? t('settings.efd.badgeKeySaved') : t('settings.efd.badgeNoKey')
})
</script>

<template>
  <div class="flex flex-col gap-6 p-6 max-w-4xl">

    <div>
      <h1 class="text-2xl font-semibold tracking-tight">{{ t('settings.page.title') }}</h1>
      <p class="text-sm text-muted-foreground mt-1">{{ t('settings.page.subtitle') }}</p>
    </div>

    <!-- Skeleton while first load -->
    <div v-if="loading && !settings" class="flex flex-col gap-3">
      <div v-for="i in 4" :key="i" class="h-28 rounded-lg bg-muted animate-pulse" />
    </div>

    <Tabs v-else v-model="activeSettingsTab">
      <TabsList data-tour="settings-tabs" class="w-full justify-start overflow-x-auto">
        <TabsTrigger value="business">
          <Building2 />{{ t('settings.tabs.business') }}
        </TabsTrigger>
        <TabsTrigger value="features" data-tour="tab-features">
          <ToggleRight />{{ t('settings.tabs.features') }}
        </TabsTrigger>
        <TabsTrigger value="branding" data-tour="tab-branding">
          <Palette />{{ t('settings.tabs.branding') }}
        </TabsTrigger>
        <TabsTrigger value="system">
          <Settings2 />{{ t('settings.tabs.system') }}
        </TabsTrigger>
        <TabsTrigger value="hardware" data-tour="tab-hardware">
          <Printer />{{ t('settings.tabs.hardware') }}
        </TabsTrigger>
        <TabsTrigger value="efd">
          <Wifi />{{ t('settings.tabs.efd') }}
        </TabsTrigger>
        <TabsTrigger value="notifications">
          <Bell />{{ t('settings.tabs.notifications') }}
        </TabsTrigger>
        <TabsTrigger v-if="showDesktopTabs" value="backups">
          <DatabaseBackup />{{ t('settings.tabs.backups') }}
        </TabsTrigger>
        <TabsTrigger v-if="showNetworkTab" value="network">
          <Network />{{ t('settings.tabs.network') }}
        </TabsTrigger>
        <TabsTrigger v-if="runningInTauri" value="updates">
          <RefreshCw />{{ t('settings.tabs.updates') }}
        </TabsTrigger>
      </TabsList>

      <!-- ══════════════════════════════════════════════ -->
      <!-- BUSINESS                                       -->
      <!-- ══════════════════════════════════════════════ -->
      <TabsContent value="business" class="flex flex-col gap-4 mt-4">

        <!-- Details card -->
        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-base">{{ t('settings.business.title') }}</CardTitle>
            <CardDescription>{{ t('settings.business.description') }}</CardDescription>
          </CardHeader>
          <CardContent class="flex flex-col gap-4">
            <div class="grid grid-cols-2 gap-4">
              <div class="flex flex-col gap-1.5">
                <Label for="business-name">{{ t('settings.business.name') }}</Label>
                <Input id="business-name" v-model="businessForm.business_name" placeholder="Acme Ltd." />
              </div>
              <div class="flex flex-col gap-1.5">
                <Label for="business-phone">{{ t('settings.business.phone') }}</Label>
                <div class="relative">
                  <Phone class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input id="business-phone" v-model="businessForm.business_phone" class="pl-9" placeholder="+255 XXX XXX XXX" />
                </div>
              </div>
            </div>

            <div class="flex flex-col gap-1.5 max-w-xs">
              <Label for="business-tin">{{ t('settings.business.tin') }}</Label>
              <div class="relative">
                <Hash class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input id="business-tin" v-model="businessForm.business_tin" class="pl-9" placeholder="123-456-789" />
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <Label for="business-address">{{ t('settings.business.address') }}</Label>
              <div class="relative">
                <MapPin class="absolute left-3 top-3 size-4 text-muted-foreground" />
                <Textarea id="business-address" v-model="businessForm.business_address" class="pl-9 min-h-20 resize-none" :placeholder="t('settings.business.addressPlaceholder')" />
              </div>
            </div>

            <Separator />

            <div class="flex flex-col gap-1.5">
              <Label for="receipt-header">{{ t('settings.business.receiptHeader') }}</Label>
              <Textarea id="receipt-header" v-model="businessForm.receipt_header" class="min-h-16 resize-none" :placeholder="t('settings.business.receiptHeaderPlaceholder')" />
            </div>
            <div class="flex flex-col gap-1.5">
              <Label for="receipt-footer">{{ t('settings.business.receiptFooter') }}</Label>
              <Textarea id="receipt-footer" v-model="businessForm.receipt_footer" class="min-h-16 resize-none" :placeholder="t('settings.business.receiptFooterPlaceholder')" />
            </div>

            <Separator />

            <div class="flex flex-col gap-3">
              <p class="flex items-center gap-2 text-sm font-medium">
                <Languages class="size-4 text-muted-foreground" />{{ t('settings.language.title') }}
              </p>
              <div class="grid gap-4 sm:grid-cols-2">
                <div class="flex min-w-0 flex-col gap-1.5">
                  <Label for="default-locale">{{ t('settings.language.defaultLocale') }}</Label>
                  <Select v-model="businessForm.default_locale" :disabled="!canEditSettings">
                    <SelectTrigger id="default-locale"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">{{ t('common.language.en') }}</SelectItem>
                      <SelectItem value="sw">{{ t('common.language.sw') }}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p class="text-xs text-muted-foreground">{{ t('settings.language.defaultLocaleHelp') }}</p>
                </div>
                <div class="flex min-w-0 flex-col gap-1.5">
                  <Label for="receipt-language">{{ t('settings.language.receiptLanguage') }}</Label>
                  <Select v-model="businessForm.receipt_language" :disabled="!canEditSettings">
                    <SelectTrigger id="receipt-language"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">{{ t('common.language.en') }}</SelectItem>
                      <SelectItem value="sw">{{ t('common.language.sw') }}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p class="text-xs text-muted-foreground">{{ t('settings.language.receiptLanguageHelp') }}</p>
                </div>
              </div>
              <p class="text-xs text-muted-foreground">{{ t('settings.language.personalChoice') }}</p>
            </div>

            <div class="flex justify-end pt-1">
              <Button data-tour="settings-save" :disabled="savingBusiness" @click="saveBusiness">
                <Save class="size-4 mr-2" />
                {{ savingBusiness ? t('common.actions.saving') : t('settings.business.save') }}
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="features" class="mt-4">
        <FeaturesPanel />
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
            <CardTitle class="text-base">{{ t('settings.system.currencyTitle') }}</CardTitle>
            <CardDescription>{{ t('settings.system.currencyDescription') }}</CardDescription>
          </CardHeader>
          <CardContent class="flex flex-col gap-4">
            <div class="grid gap-4 sm:grid-cols-3">
              <div class="flex flex-col gap-1.5">
                <Label for="currency-code">{{ t('settings.system.currencyCode') }}</Label>
                <Select v-model="systemForm.currency_code">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TZS">{{ t('settings.system.currencies.tzs') }}</SelectItem>
                    <SelectItem value="USD">{{ t('settings.system.currencies.usd') }}</SelectItem>
                    <SelectItem value="KES">{{ t('settings.system.currencies.kes') }}</SelectItem>
                    <SelectItem value="UGX">{{ t('settings.system.currencies.ugx') }}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="flex flex-col gap-1.5">
                <Label for="currency-decimals">{{ t('settings.system.decimalPlaces') }}</Label>
                <Select v-model="systemForm.currency_decimals">
                  <SelectTrigger id="currency-decimals"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem :value="0">{{ t('settings.system.decimalsNone') }}</SelectItem>
                    <SelectItem :value="2">{{ t('settings.system.decimalsTwo') }}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="flex flex-col gap-1.5">
                <Label for="tax-rate">{{ t('settings.system.taxRate') }}</Label>
                <Input id="tax-rate" v-model.number="systemForm.tax_rate" type="number" min="0" max="100" aria-describedby="tax-rate-help" />
                <p id="tax-rate-help" class="text-xs text-muted-foreground">{{ vatOn ? t('settings.system.taxRateHelpRegistered') : t('settings.system.taxRateHelpNotRegistered') }}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-base">{{ t('settings.system.formatTitle') }}</CardTitle>
            <CardDescription>{{ t('settings.system.formatDescription') }}</CardDescription>
          </CardHeader>
          <CardContent class="flex flex-col gap-4">
            <div class="grid grid-cols-2 gap-4">
              <div class="flex flex-col gap-1.5">
                <Label for="date-format">{{ t('settings.system.dateFormat') }}</Label>
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
                <Label for="receipt-number-format">{{ t('settings.system.receiptNumberFormat') }}</Label>
                <Input id="receipt-number-format" v-model="systemForm.receipt_number_format" placeholder="SALE-{DATE}-{COUNTER}" />
                <p class="text-xs text-muted-foreground">{{ t('settings.system.tokens') }} <code class="text-xs">{DATE}</code> · <code class="text-xs">{COUNTER}</code></p>
              </div>
            </div>
            <div class="flex justify-end pt-1">
              <Button :disabled="savingSystem" @click="saveSystem">
                <Save class="size-4 mr-2" />
                {{ savingSystem ? t('common.actions.saving') : t('settings.system.save') }}
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
            <CardTitle class="text-base">{{ t('settings.hardware.tillTitle') }}</CardTitle>
            <CardDescription>{{ t('settings.hardware.tillDescription') }}</CardDescription>
          </CardHeader>
          <CardContent>
            <div class="flex flex-col gap-3">
              <div class="flex items-center justify-between gap-4">
                <div>
                  <p class="text-sm">{{ t('settings.hardware.numpad') }}</p>
                  <p class="text-xs text-muted-foreground">{{ t('settings.hardware.numpadHelp') }}</p>
                </div>
                <Switch v-model="hardwareForm.till_numpad_enabled" :aria-label="t('settings.hardware.numpad')" />
              </div>
              <div class="flex items-center justify-between gap-4">
                <div>
                  <p class="text-sm">{{ t('settings.hardware.customerDisplay') }}</p>
                  <p class="text-xs text-muted-foreground">{{ t('settings.hardware.customerDisplayHelp') }}</p>
                </div>
                <Switch v-model="hardwareForm.customer_display_enabled" :aria-label="t('settings.hardware.customerDisplay')" />
              </div>
              <div class="flex items-center justify-between gap-4">
                <div>
                  <p class="text-sm">{{ t('settings.hardware.discountLimit') }}</p>
                  <p class="text-xs text-muted-foreground">{{ t('settings.hardware.discountLimitHelp') }}</p>
                </div>
                <div class="flex shrink-0 items-center gap-1.5">
                  <MoneyInput v-model="hardwareForm.tillDiscountLimitPercent" :decimals="2" class="w-20 text-right" :aria-label="t('settings.hardware.discountLimit')" />
                  <span class="text-sm text-muted-foreground">%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-base">{{ t('settings.hardware.receiptTitle') }}</CardTitle>
            <CardDescription>{{ t('settings.hardware.receiptDescription') }}</CardDescription>
          </CardHeader>
          <CardContent>
            <div class="flex flex-col gap-3">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm">{{ t('settings.hardware.autoPrint') }}</p>
                  <p class="text-xs text-muted-foreground">{{ t('settings.hardware.autoPrintHelp') }}</p>
                </div>
                <Switch v-model="hardwareForm.print_receipt_automatically" />
              </div>
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm">{{ t('settings.hardware.showTax') }}</p>
                  <p class="text-xs text-muted-foreground">{{ t('settings.hardware.showTaxHelp') }}</p>
                </div>
                <Switch v-model="hardwareForm.show_tax_on_receipt" />
              </div>
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm">{{ t('settings.hardware.barcodes') }}</p>
                  <p class="text-xs text-muted-foreground">{{ t('settings.hardware.barcodesHelp') }}</p>
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
                <CardTitle class="text-base">{{ t('settings.hardware.printerTitle') }}</CardTitle>
                <CardDescription class="mt-0.5">{{ t('settings.hardware.printerDescription') }}</CardDescription>
              </div>
              <Switch v-model="hardwareForm.printerEnabled" />
            </div>
          </CardHeader>
          <CardContent v-if="hardwareForm.printerEnabled" class="flex flex-col gap-4">
            <div class="flex flex-col gap-1.5">
              <div class="flex items-center justify-between">
                <Label>{{ t('settings.hardware.detectedPrinters') }}</Label>
                <Button variant="ghost" size="sm" :disabled="scanning" @click="fetchDevices">
                  <RefreshCw class="size-3.5 mr-1.5" :class="{ 'animate-spin': scanning }" />
                  {{ scanning ? t('settings.hardware.scanning') : t('common.actions.refresh') }}
                </Button>
              </div>

              <div v-if="detectedPrinters.length === 0" class="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
                {{ t('settings.hardware.noPrinters') }}
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
                <Label for="printer-port">{{ t('settings.hardware.port') }} <span class="text-muted-foreground text-xs">{{ t('settings.hardware.portHint') }}</span></Label>
                <Input id="printer-port" v-model="hardwareForm.printerPort" :placeholder="t('settings.hardware.portPlaceholder')" />
              </div>
              <div class="flex flex-col gap-1.5">
                <Label for="printer-model">{{ t('settings.hardware.model') }} <span class="text-muted-foreground text-xs">{{ t('settings.hardware.optionalHint') }}</span></Label>
                <Input id="printer-model" v-model="hardwareForm.printerModel" :placeholder="t('settings.hardware.modelPlaceholder')" />
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
              {{ testingPort ? t('settings.hardware.printing') : t('settings.hardware.testPrint') }}
            </Button>

          </CardContent>
        </Card>

        <div class="flex justify-end">
          <Button :disabled="savingHardware" @click="saveHardware">
            <Save class="size-4 mr-2" />
            {{ savingHardware ? t('common.actions.saving') : t('settings.hardware.save') }}
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
                  {{ t('settings.efd.title') }}
                  <Badge :variant="efdBadgeVariant">{{ efdBadgeLabel }}</Badge>
                </CardTitle>
                <CardDescription class="mt-0.5">{{ t('settings.efd.description') }}</CardDescription>
              </div>
              <Switch v-model="efdForm.efd_enabled" :aria-label="t('settings.efd.switchLabel')" />
            </div>
          </CardHeader>
          <CardContent v-if="efdForm.efd_enabled" class="flex flex-col gap-4">
            <div class="flex flex-col gap-1.5">
              <Label for="efd-endpoint">{{ t('settings.efd.endpoint') }}</Label>
              <Input id="efd-endpoint" v-model="efdForm.efd_endpoint" placeholder="https://efd.tra.go.tz/api/v1" />
            </div>
            <div class="flex flex-col gap-1.5">
              <Label for="efd-api-key">{{ t('settings.efd.apiKey') }}</Label>
              <Input
                id="efd-api-key"
                v-model="efdForm.efd_api_key"
                type="password"
                autocomplete="off"
                :placeholder="settings?.efd_api_key_set ? t('settings.efd.apiKeySavedPlaceholder') : t('settings.efd.apiKeyPlaceholder')"
              />
            </div>
            <div class="flex flex-wrap gap-2 pt-1">
              <Button :disabled="savingEfd" @click="saveEfd">
                <Save class="size-4 mr-2" />
                {{ savingEfd ? t('common.actions.saving') : t('settings.efd.save') }}
              </Button>
              <Button v-if="settings?.efd_api_key_set" variant="outline" :disabled="savingEfd" @click="removeEfdApiKey">
                {{ t('settings.efd.removeKey') }}
              </Button>
            </div>
          </CardContent>
          <CardContent v-else>
            <div class="rounded-md border bg-muted/40 p-3 flex items-start gap-2">
              <Wifi class="size-4 mt-0.5 text-muted-foreground shrink-0" />
              <p class="text-sm text-muted-foreground">{{ t('settings.efd.offHelp') }}</p>
            </div>
            <Button v-if="settings?.efd_enabled" class="mt-3" :disabled="savingEfd" @click="saveEfd">
              <Save class="size-4 mr-2" />
              {{ savingEfd ? t('common.actions.saving') : t('settings.efd.turnOff') }}
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
            <CardTitle class="text-base">{{ t('settings.notifications.soundTitle') }}</CardTitle>
            <CardDescription>{{ t('settings.notifications.soundDescription') }}</CardDescription>
          </CardHeader>
          <CardContent>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <Volume2 class="size-4 text-muted-foreground" />
                <p class="text-sm">{{ t('settings.notifications.soundToggle') }}</p>
              </div>
              <Switch v-model="notificationForm.alert_sound_enabled" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-base">{{ t('settings.notifications.stockTitle') }}</CardTitle>
            <CardDescription>{{ t('settings.notifications.stockDescription') }}</CardDescription>
          </CardHeader>
          <CardContent class="flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm">{{ t('settings.notifications.lowStock') }}</p>
                <p class="text-xs text-muted-foreground">{{ t('settings.notifications.lowStockHelp') }}</p>
              </div>
              <Switch v-model="notificationForm.alert_on_low_stock" />
            </div>
            <div v-if="notificationForm.alert_on_low_stock" class="flex flex-col gap-1.5 max-w-xs">
              <Label for="low-stock-threshold">{{ t('settings.notifications.lowStockThreshold') }}</Label>
              <Input id="low-stock-threshold" v-model.number="notificationForm.low_stock_threshold" type="number" min="1" />
            </div>

            <Separator />

            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm">{{ t('settings.notifications.outOfStock') }}</p>
                <p class="text-xs text-muted-foreground">{{ t('settings.notifications.outOfStockHelp') }}</p>
              </div>
              <Switch v-model="notificationForm.alert_on_out_of_stock" />
            </div>

            <Separator />

            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm">{{ t('settings.notifications.deadStock') }}</p>
                <p class="text-xs text-muted-foreground">{{ t('settings.notifications.deadStockHelp') }}</p>
              </div>
              <Switch v-model="notificationForm.alert_on_dead_stock" />
            </div>
            <div v-if="notificationForm.alert_on_dead_stock" class="flex flex-col gap-1.5 max-w-xs">
              <Label for="dead-stock-period">{{ t('settings.notifications.deadStockPeriod') }}</Label>
              <Input id="dead-stock-period" v-model.number="notificationForm.dead_stock_days" type="number" min="1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="pb-3">
            <div class="flex items-center justify-between">
              <div>
                <CardTitle class="text-base">{{ t('settings.notifications.emailTitle') }}</CardTitle>
                <CardDescription>{{ t('settings.notifications.emailDescription') }}</CardDescription>
              </div>
              <Switch v-model="notificationForm.email_notifications_enabled" />
            </div>
          </CardHeader>
          <CardContent v-if="notificationForm.email_notifications_enabled">
            <div class="flex flex-col gap-1.5 max-w-sm">
              <Label for="notification-email">{{ t('settings.notifications.emailAddress') }}</Label>
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
            {{ savingNotifications ? t('common.actions.saving') : t('settings.notifications.save') }}
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
            <CardTitle class="text-base">{{ t('updates.settings.title') }}</CardTitle>
            <CardDescription>{{ t('updates.settings.description') }}</CardDescription>
          </CardHeader>
          <CardContent class="flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm">{{ t('updates.settings.currentVersion') }}</p>
                <p class="text-xs text-muted-foreground mt-0.5 select-none" @click="onVersionTap">{{ currentVersion || '—' }}</p>
              </div>
              <Badge v-if="updateStatus === 'up-to-date'" variant="secondary">
                <CheckCircle2 class="size-3 mr-1" />{{ t('updates.settings.upToDate') }}
              </Badge>
              <Badge v-else-if="updateStatus === 'available'" variant="default">
                {{ t('updates.settings.available', { version: latestVersion }) }}
              </Badge>
            </div>

            <p v-if="updateStatus === 'error'" class="text-sm text-destructive">{{ updateError }}</p>

            <div
              v-if="updateStatus === 'available'"
              class="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm"
            >
              <p class="font-medium">{{ t('updates.settings.readyToInstall', { version: latestVersion }) }}</p>
              <p class="text-muted-foreground mt-0.5">
                {{ t('updates.settings.backupFirst') }}
              </p>
            </div>

            <div v-if="updateStatus === 'downloading' || updateStatus === 'installing'" class="flex flex-col gap-2">
              <div class="flex items-center justify-between text-sm">
                <span>{{ updateStatus === 'downloading' ? t('updates.settings.downloading') : t('updates.settings.installing') }}</span>
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
              <p class="text-xs text-muted-foreground">{{ t('updates.settings.keepOpen') }}</p>
            </div>

            <div class="flex gap-2">
              <Button
                v-if="updateStatus !== 'downloaded' && updateStatus !== 'downloading' && updateStatus !== 'installing'"
                variant="outline"
                :disabled="updateStatus === 'checking'"
                @click="checkForUpdate()"
              >
                <RefreshCw class="size-4 mr-2" :class="updateStatus === 'checking' ? 'animate-spin' : ''" />
                {{ updateStatus === 'checking' ? t('updates.settings.checking') : t('updates.settings.check') }}
              </Button>

              <Button v-if="updateStatus === 'available'" @click="downloadAndInstall">
                <DownloadCloud class="size-4 mr-2" />{{ t('updates.updateAndRestart') }}
              </Button>

              <Button v-if="updateStatus === 'downloaded'" @click="relaunchApp">
                <RotateCw class="size-4 mr-2" />{{ t('updates.settings.restartToFinish') }}
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>

    <TeamCatalogDialog v-model:open="showTeamTools" />
  </div>
</template>