<script setup lang="ts">
import { Check, Copy, MonitorSmartphone, ShieldCheck, TriangleAlert, Wifi, WifiOff } from 'lucide-vue-next'
import QRCode from 'qrcode'
import { toast } from 'vue-sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'

const restartWaitAttempts = 20

const { platform, fetchPlatform, setLanEnabled } = usePlatform()

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
      toast.error('This computer could not open the network address. It stays on this computer only.')
    } else {
      toast.success(wantedEnabled ? 'Other devices can now open Balce' : 'Balce is back to this computer only')
    }
  } catch (error: any) {
    toast.error(error?.data?.message || 'The network setting could not be changed')
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
              Let other devices on this network use Balce
              <Badge :variant="isListeningOnNetwork ? 'default' : 'secondary'">{{ isListeningOnNetwork ? 'On' : 'Off' }}</Badge>
            </CardTitle>
            <CardDescription class="mt-1">
              Other tills, tablets and phones on the same Wi-Fi open Balce in their browser. This computer keeps the data, so leave it switched on while the shop is open.
            </CardDescription>
          </div>
          <Switch
            :model-value="lanEnabled"
            :disabled="switching || platform?.lan_available === false"
            aria-label="Let other devices on this network use Balce"
            @update:model-value="value => toggleLan(Boolean(value))"
          />
        </div>
      </CardHeader>
      <CardContent class="flex flex-col gap-4">
        <p v-if="platform?.lan_available === false" class="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <TriangleAlert class="mt-0.5 size-4 shrink-0" />
          The address is fixed by the LISTEN_ADDR setting on this computer, so this switch is off.
        </p>
        <p v-if="switching" class="text-sm text-muted-foreground">Restarting the connection…</p>

        <div v-else-if="isListeningOnNetwork" class="flex flex-col gap-3">
          <p class="text-sm">Open this address on the other device, or scan the code with its camera:</p>
          <div class="grid gap-3 sm:grid-cols-2">
            <div v-for="(networkUrl, urlIndex) in lanUrls" :key="networkUrl" class="flex flex-col items-center gap-2 rounded-lg border p-4">
              <img v-if="qrCodes[networkUrl]" :src="qrCodes[networkUrl]" :alt="`QR code for ${networkUrl}`" class="size-44 rounded bg-white p-1">
              <div class="flex items-center gap-2">
                <code class="rounded bg-muted px-2 py-1 text-sm">{{ networkUrl }}</code>
                <Button variant="ghost" size="icon" class="size-8" :aria-label="`Copy ${networkUrl}`" @click="copyUrl(networkUrl)">
                  <Check v-if="copiedUrl === networkUrl" class="text-emerald-600" />
                  <Copy v-else />
                </Button>
              </div>
              <span v-if="urlIndex === 0 && lanUrls.length > 1" class="text-xs text-muted-foreground">Try this one first</span>
            </div>
          </div>
        </div>

        <div v-else-if="lanEnabled" class="flex items-start gap-2 rounded-md border p-3 text-sm text-muted-foreground">
          <WifiOff class="mt-0.5 size-4 shrink-0" />
          This computer isn't connected to a network right now. Connect it to the shop Wi-Fi and the address will show here.
        </div>

        <div v-else class="flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
          <Wifi class="mt-0.5 size-4 shrink-0" />
          Off: only this computer can use Balce. Nothing is reachable from the network.
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="pb-3">
        <CardTitle class="text-base">Setting up the other tills</CardTitle>
      </CardHeader>
      <CardContent>
        <ol class="flex list-decimal flex-col gap-2 pl-5 text-sm">
          <li>When Windows asks about the firewall, allow <strong>private networks</strong> only.</li>
          <li>Ask whoever set up the router to <strong>reserve this computer's address</strong> so it never changes.</li>
          <li>On each till, open the address above in Chrome or Edge and bookmark it. "Install app" in the browser menu gives it its own window.</li>
          <li>Each cashier signs in with their own account. Receipts print from that till's own printer through the browser.</li>
        </ol>
        <p class="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
          <ShieldCheck class="mt-0.5 size-3.5 shrink-0" />
          Only people with a Balce account can sign in. Switch this off when the shop is closed if the Wi-Fi is shared with customers.
        </p>
        <p class="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
          <MonitorSmartphone class="mt-0.5 size-3.5 shrink-0" />
          Phone photos for products also need this switched on, so the phone can reach this computer.
        </p>
      </CardContent>
    </Card>
  </div>
</template>
