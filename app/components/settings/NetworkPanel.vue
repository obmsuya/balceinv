<script setup lang="ts">
import { Check, Copy, MonitorSmartphone, ShieldCheck, TriangleAlert, Wifi, WifiOff } from 'lucide-vue-next'
import QRCode from 'qrcode'
import { toast } from 'vue-sonner'
import { apiErrorMessage } from '~/utils/i18n'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'

const restartWaitAttempts = 20

const { platform, fetchPlatform, setLanEnabled } = usePlatform()
const { t } = useI18n()

const switching = ref(false)
const qrCodes = ref<Record<string, string>>({})
const copiedUrl = ref('')

const lanEnabled = computed(() => platform.value?.lan_enabled ?? false)
const lanUrls = computed(() => platform.value?.lan_urls ?? [])
const isListeningOnNetwork = computed(() => lanUrls.value.length > 0)

watch(lanUrls, async networkUrls => {
  const renderedCodes: Record<string, string> = {}
  for (const networkUrl of networkUrls) {
    renderedCodes[networkUrl] = await QRCode.toDataURL(networkUrl, { margin: 1, width: 220 })
  }
  qrCodes.value = renderedCodes
}, { immediate: true })

const waitForRestart = async (wantedEnabled: boolean) => {
  for (let attempt = 0; attempt < restartWaitAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 500))
    const freshPlatform = await fetchPlatform(true)
    const isSettled = freshPlatform !== null && freshPlatform.lan_enabled === wantedEnabled && (freshPlatform.lan_urls.length > 0) === wantedEnabled
    if (isSettled) return true
  }
  return false
}

const toggleLan = async (wantedEnabled: boolean) => {
  switching.value = true
  try {
    await setLanEnabled(wantedEnabled)
    const isSettled = await waitForRestart(wantedEnabled)
    if (!isSettled && wantedEnabled) {
      toast.error(t('settings.network.toasts.couldNotOpen'))
    } else {
      toast.success(wantedEnabled ? t('settings.network.toasts.enabled') : t('settings.network.toasts.disabled'))
    }
  } catch (error: any) {
    toast.error(apiErrorMessage(error, 'settings.network.toasts.changeFailed'))
  } finally {
    switching.value = false
  }
}

const copyUrl = async (networkUrl: string) => {
  await navigator.clipboard.writeText(networkUrl)
  copiedUrl.value = networkUrl
  setTimeout(() => { copiedUrl.value = '' }, 1500)
}

onMounted(() => fetchPlatform(true))
</script>

<template>
  <div class="flex flex-col gap-4">
    <Card>
      <CardHeader class="pb-3">
        <div class="flex items-start justify-between gap-4">
          <div>
            <CardTitle class="flex items-center gap-2 text-base">
              {{ t('settings.network.title') }}
              <Badge :variant="isListeningOnNetwork ? 'default' : 'secondary'">{{ isListeningOnNetwork ? t('common.states.on') : t('common.states.off') }}</Badge>
            </CardTitle>
            <CardDescription class="mt-1">
              {{ t('settings.network.description') }}
            </CardDescription>
          </div>
          <Switch
            :model-value="lanEnabled"
            :disabled="switching || platform?.lan_available === false"
            :aria-label="t('settings.network.title')"
            @update:model-value="value => toggleLan(Boolean(value))"
          />
        </div>
      </CardHeader>
      <CardContent class="flex flex-col gap-4">
        <p v-if="platform?.lan_available === false" class="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <TriangleAlert class="mt-0.5 size-4 shrink-0" />
          {{ t('settings.network.addressFixed') }}
        </p>
        <p v-if="switching" class="text-sm text-muted-foreground">{{ t('settings.network.restarting') }}</p>

        <div v-else-if="isListeningOnNetwork" class="flex flex-col gap-3">
          <p class="text-sm">{{ t('settings.network.openAddress') }}</p>
          <div class="grid gap-3 sm:grid-cols-2">
            <div v-for="(networkUrl, urlIndex) in lanUrls" :key="networkUrl" class="flex flex-col items-center gap-2 rounded-lg border p-4">
              <img v-if="qrCodes[networkUrl]" :src="qrCodes[networkUrl]" :alt="t('settings.network.qrAlt', { url: networkUrl })" class="size-44 rounded bg-white p-1">
              <div class="flex items-center gap-2">
                <code class="rounded bg-muted px-2 py-1 text-sm">{{ networkUrl }}</code>
                <Button variant="ghost" size="icon" class="size-8" :aria-label="t('settings.network.copyUrl', { url: networkUrl })" @click="copyUrl(networkUrl)">
                  <Check v-if="copiedUrl === networkUrl" class="text-emerald-600" />
                  <Copy v-else />
                </Button>
              </div>
              <span v-if="urlIndex === 0 && lanUrls.length > 1" class="text-xs text-muted-foreground">{{ t('settings.network.tryFirst') }}</span>
            </div>
          </div>
        </div>

        <div v-else-if="lanEnabled" class="flex items-start gap-2 rounded-md border p-3 text-sm text-muted-foreground">
          <WifiOff class="mt-0.5 size-4 shrink-0" />
          {{ t('settings.network.notConnected') }}
        </div>

        <div v-else class="flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
          <Wifi class="mt-0.5 size-4 shrink-0" />
          {{ t('settings.network.offHelp') }}
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="pb-3">
        <CardTitle class="text-base">{{ t('settings.network.setupTitle') }}</CardTitle>
      </CardHeader>
      <CardContent>
        <ol class="flex list-decimal flex-col gap-2 pl-5 text-sm">
          <li>{{ t('settings.network.firewallBefore') }} <strong>{{ t('settings.network.firewallStrong') }}</strong> {{ t('settings.network.firewallAfter') }}</li>
          <li>{{ t('settings.network.routerBefore') }} <strong>{{ t('settings.network.routerStrong') }}</strong> {{ t('settings.network.routerAfter') }}</li>
          <li>{{ t('settings.network.bookmarkStep') }}</li>
          <li>{{ t('settings.network.cashierStep') }}</li>
        </ol>
        <p class="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
          <ShieldCheck class="mt-0.5 size-3.5 shrink-0" />
          {{ t('settings.network.securityNote') }}
        </p>
        <p class="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
          <MonitorSmartphone class="mt-0.5 size-3.5 shrink-0" />
          {{ t('settings.network.phonePhotosNote') }}
        </p>
      </CardContent>
    </Card>
  </div>
</template>
