<script setup lang="ts">
import { Download, RefreshCw, Sparkles } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const backgroundCheckIntervalHours = 6

const {
  status,
  currentVersion,
  latestVersion,
  downloadProgress,
  fetchCurrentVersion,
  checkForUpdate,
  downloadAndInstall,
} = useUpdater()

const showUpdatePanel = ref(false)
const updateIsRunning = computed(() => status.value === 'downloading' || status.value === 'installing')
const indicatorIsVisible = computed(() => status.value === 'available' || updateIsRunning.value)

const indicatorLabel = computed(() => {
  if (status.value === 'installing') return 'Installing…'
  if (status.value === 'downloading') {
    return downloadProgress.value === null ? 'Downloading…' : `Updating ${downloadProgress.value}%`
  }
  return 'Update available'
})

const checkQuietly = () => checkForUpdate(true)

let backgroundCheckTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  fetchCurrentVersion()
  checkQuietly()
  backgroundCheckTimer = setInterval(checkQuietly, backgroundCheckIntervalHours * 60 * 60 * 1000)
  window.addEventListener('online', checkQuietly)
})

onUnmounted(() => {
  if (backgroundCheckTimer) clearInterval(backgroundCheckTimer)
  window.removeEventListener('online', checkQuietly)
})

watch(latestVersion, (newVersion, previousVersion) => {
  const newUpdateWasFound = newVersion && newVersion !== previousVersion && status.value === 'available'
  if (!newUpdateWasFound) return
  toast.info(`Balce ${newVersion} is available`, {
    action: { label: 'See update', onClick: () => { showUpdatePanel.value = true } },
  })
})

const startUpdate = async () => {
  await downloadAndInstall()
}
</script>

<template>
  <Popover v-if="indicatorIsVisible" v-model:open="showUpdatePanel">
    <PopoverTrigger as-child>
      <button
        type="button"
        class="group inline-flex h-8 items-center gap-2 rounded-full border border-primary/30 bg-primary/10 pl-2.5 pr-3 text-xs font-medium text-foreground transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        :aria-label="indicatorLabel"
      >
        <span v-if="!updateIsRunning" class="relative flex size-2">
          <span class="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60 motion-reduce:animate-none" />
          <span class="relative inline-flex size-2 rounded-full bg-primary" />
        </span>
        <RefreshCw v-else class="size-3.5 animate-spin text-primary" />
        <span class="hidden sm:inline tabular-nums">{{ indicatorLabel }}</span>
      </button>
    </PopoverTrigger>

    <PopoverContent align="end" class="w-80 p-0 overflow-hidden">
      <div class="flex items-start gap-3 p-4">
        <div class="rounded-lg bg-primary/10 p-2">
          <Sparkles class="size-4 text-primary" />
        </div>
        <div class="min-w-0">
          <p class="text-sm font-semibold">Balce {{ latestVersion }} is ready</p>
          <p v-if="currentVersion" class="text-xs text-muted-foreground mt-0.5">You are on {{ currentVersion }}</p>
        </div>
      </div>

      <div v-if="updateIsRunning" class="flex flex-col gap-2 px-4 pb-4">
        <div class="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            class="h-full rounded-full bg-primary transition-[width] duration-300"
            :class="status === 'installing' || downloadProgress === null ? 'w-full animate-pulse' : ''"
            :style="status === 'downloading' && downloadProgress !== null ? { width: `${downloadProgress}%` } : undefined"
          />
        </div>
        <p class="text-xs text-muted-foreground">
          {{ status === 'installing' ? 'Saving a backup and installing. Balce will reopen by itself.' : 'Downloading. You can keep working.' }}
        </p>
      </div>

      <template v-else>
        <p class="px-4 pb-4 text-xs text-muted-foreground leading-relaxed">
          Usually takes a minute or two. A backup is saved first, then Balce closes and reopens by itself. Your sales, products and settings are kept.
        </p>
        <div class="flex justify-end gap-2 border-t bg-muted/30 px-4 py-3">
          <Button variant="ghost" size="sm" @click="showUpdatePanel = false">Later</Button>
          <Button size="sm" @click="startUpdate">
            <Download class="size-4 mr-1.5" />Update and restart
          </Button>
        </div>
      </template>
    </PopoverContent>
  </Popover>
</template>
