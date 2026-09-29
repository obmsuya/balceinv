<script setup lang="ts">
import { LoaderCircle, RefreshCw, Smartphone, WifiOff } from 'lucide-vue-next'
import QRCode from 'qrcode'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { PhoneUploadLink } from '@/composables/useProducts'

const pollMilliseconds = 1500

const emit = defineEmits<{ photo: [photoFile: File] }>()
const open = defineModel<boolean>('open', { default: false })

const { user } = useAuth()
const { startPhoneUpload, checkPhoneUpload } = useProducts()

const uploadLink = ref<PhoneUploadLink | null>(null)
const qrCode = ref('')
const isExpired = ref(false)
const isStarting = ref(false)
const connectionTrouble = ref(false)
let pollTimer: ReturnType<typeof setInterval> | null = null

const stopPolling = () => {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = null
}

const dataUriToFile = async (dataUri: string, contentType: string): Promise<File> => {
  const imageBlob = await (await fetch(dataUri)).blob()
  const extension = contentType.split('/')[1] ?? 'jpg'
  return new File([imageBlob], `phone-photo.${extension}`, { type: contentType })
}

const poll = async () => {
  const token = uploadLink.value?.token
  if (!token) return
  try {
    const uploadState = await checkPhoneUpload(token)
    connectionTrouble.value = false
    if (uploadState === null) {
      isExpired.value = true
      stopPolling()
      return
    }
    if (uploadState.status === 'done' && uploadState.image && uploadState.content_type) {
      stopPolling()
      emit('photo', await dataUriToFile(uploadState.image, uploadState.content_type))
      open.value = false
    }
  } catch {
    connectionTrouble.value = true
  }
}

const startLink = async () => {
  stopPolling()
  isStarting.value = true
  isExpired.value = false
  qrCode.value = ''
  uploadLink.value = await startPhoneUpload()
  isStarting.value = false
  const firstUrl = uploadLink.value?.upload_urls[0]
  if (!firstUrl) return
  qrCode.value = await QRCode.toDataURL(firstUrl, { margin: 1, width: 240 })
  pollTimer = setInterval(poll, pollMilliseconds)
}

const openNetworkSettings = () => {
  open.value = false
  navigateTo({ path: '/settings', query: { tab: 'network' } })
}

watch(open, isOpen => {
  if (isOpen) startLink()
  else stopPolling()
})

onBeforeUnmount(stopPolling)
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2"><Smartphone class="size-5" /> Take the photo with a phone</DialogTitle>
        <DialogDescription>Scan the code with the phone's camera, take the photo and press Send. It appears here by itself.</DialogDescription>
      </DialogHeader>

      <div v-if="isStarting" class="flex justify-center py-10">
        <LoaderCircle class="size-8 animate-spin text-muted-foreground" />
      </div>

      <div v-else-if="uploadLink && !uploadLink.reachable" class="flex flex-col items-center gap-3 py-4 text-center">
        <WifiOff class="size-10 text-muted-foreground" />
        <p class="text-sm">{{ uploadLink.reason }}</p>
        <Button v-if="user?.is_owner" variant="outline" size="sm" @click="openNetworkSettings">Open network settings</Button>
      </div>

      <div v-else-if="isExpired" class="flex flex-col items-center gap-3 py-6 text-center">
        <p class="text-sm">This code has expired.</p>
        <Button size="sm" @click="startLink"><RefreshCw /> Make a new code</Button>
      </div>

      <div v-else-if="uploadLink" class="flex flex-col items-center gap-3">
        <img v-if="qrCode" :src="qrCode" alt="QR code for the phone" class="size-60 rounded-lg bg-white p-2">
        <code class="max-w-full break-all rounded bg-muted px-2 py-1 text-center text-xs">{{ uploadLink.upload_urls[0] }}</code>
        <p class="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle class="size-4 animate-spin" />
          {{ connectionTrouble ? 'Trying to reach this computer…' : 'Waiting for the photo…' }}
        </p>
        <p class="text-xs text-muted-foreground">The phone must be on the same Wi-Fi. The code works for 5 minutes.</p>
      </div>
    </DialogContent>
  </Dialog>
</template>
