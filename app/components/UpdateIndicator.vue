<script setup lang="ts">
import { Download, Sparkles } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const backgroundCheckIntervalHours = 6

const { t } = useI18n()

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
  if (status.value === 'installing') return t('updates.indicator.installing')
  if (status.value === 'downloading') {
    return downloadProgress.value === null ? t('updates.indicator.downloading') : t('updates.indicator.progress', { percent: downloadProgress.value })
  }
  return t('updates.indicator.available')
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
  toast.info(t('updates.indicator.toastAvailable', { version: newVersion }), {
    action: { label: t('updates.indicator.seeUpdate'), onClick: () => { showUpdatePanel.value = true } },
  })
})

const startUpdate = async () => {
  await downloadAndInstall()
}
</script>

<template>
  <Popover v-if="indicatorIsVisible" v-model:open="showUpdatePanel">
    <PopoverTrigger as-child>
      <Button
        variant="ghost"
        size="icon"
        class="relative"
        :title="indicatorLabel"
        :aria-label="indicatorLabel"
      >
        <svg v-if="updateIsRunning" viewBox="0 0 24 24" class="absolute inset-1.5 -rotate-90" aria-hidden="true">
          <circle cx="12" cy="12" r="10" fill="none" stroke-width="2.5" class="stroke-muted" />
          <circle
            cx="12"
            cy="12"
            r="10"
            fill="none"
            stroke-width="2.5"
            stroke-linecap="round"
            pathLength="100"
            class="stroke-primary transition-[stroke-dasharray] duration-300"
            :class="status === 'installing' || downloadProgress === null ? 'animate-pulse' : ''"
            :stroke-dasharray="`${status === 'downloading' && downloadProgress !== null ? downloadProgress : 100} 100`"
          />
        </svg>
        <Download class="h-5 w-5" :class="updateIsRunning ? 'scale-75 text-primary' : ''" />
        <span v-if="!updateIsRunning" class="absolute top-1.5 right-1.5 flex size-2.5">
          <span class="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60 motion-reduce:animate-none" />
          <span class="relative inline-flex size-2.5 rounded-full border-2 border-background bg-primary" />
        </span>
      </Button>
    </PopoverTrigger>

    <PopoverContent align="end" class="w-80 p-0 overflow-hidden">
      <div class="flex items-start gap-3 p-4">
        <div class="rounded-lg bg-primary/10 p-2">
          <Sparkles class="size-4 text-primary" />
        </div>
        <div class="min-w-0">
          <p class="text-sm font-semibold">{{ t('updates.indicator.ready', { version: latestVersion }) }}</p>
          <p v-if="currentVersion" class="text-xs text-muted-foreground mt-0.5">{{ t('updates.indicator.youAreOn', { version: currentVersion }) }}</p>
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
          {{ status === 'installing' ? t('updates.indicator.installingDetail') : t('updates.indicator.downloadingDetail') }}
        </p>
      </div>

      <template v-else>
        <p class="px-4 pb-4 text-xs text-muted-foreground leading-relaxed">
          {{ t('updates.indicator.howItWorks') }}
        </p>
        <div class="flex justify-end gap-2 border-t bg-muted/30 px-4 py-3">
          <Button variant="ghost" size="sm" @click="showUpdatePanel = false">{{ t('updates.indicator.later') }}</Button>
          <Button size="sm" @click="startUpdate">
            <Download class="size-4 mr-1.5" />{{ t('updates.updateAndRestart') }}
          </Button>
        </div>
      </template>
    </PopoverContent>
  </Popover>
</template>
