<script setup lang="ts">
import { formatTimeAgo } from '@vueuse/core'
import {
  Cloud,
  CloudOff,
  DatabaseBackup,
  FolderOpen,
  HardDrive,
  History,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  TriangleAlert,
  Usb,
  WifiOff,
} from 'lucide-vue-next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { RestoreSource } from '@/composables/useBackup'
import { beforeRestoreBackupName, useBackup } from '@/composables/useBackup'

const { user } = useAuth()
const {
  status,
  cloudBackups,
  cloudListError,
  loadingStatus,
  loadingCloud,
  activeAction,
  isOnline,
  refresh,
  fetchCloudBackups,
  backupNow,
  exportToFile,
  pickBackupFile,
  restoreBackup,
  restartToFinishRestore,
} = useBackup()

const userIsAdmin = computed(() => user.value?.role === 'Admin')
const localBackups = computed(() => status.value?.local_backups ?? [])
const latestLocalBackup = computed(() => localBackups.value[0] ?? null)
const beforeRestoreCopy = computed(() => status.value?.before_restore_copy ?? null)
const todayBackupDate = new Date().toLocaleDateString('en-CA')

const pendingRestore = ref<{ source: RestoreSource; target: string; label: string } | null>(null)
const showRestoreDialog = ref(false)

const formatBackupDate = (backupDate: string): string =>
  new Date(`${backupDate}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

const formatSize = (sizeInBytes: number): string => {
  if (sizeInBytes < 1024 * 1024) return `${Math.max(1, Math.round(sizeInBytes / 1024))} KB`
  return `${(sizeInBytes / 1024 / 1024).toFixed(1)} MB`
}

const timeAgo = (timestamp: string): string => formatTimeAgo(new Date(timestamp))

const fileNameFromPath = (filePath: string): string => filePath.split(/[\\/]/).pop() ?? filePath

const isUndo = computed(() => pendingRestore.value?.target === beforeRestoreBackupName)

const restoreLabel = (source: RestoreSource, target: string): string => {
  if (source === 'file') return fileNameFromPath(target)
  if (target === beforeRestoreBackupName) return 'the data from before the last restore'
  return `the backup from ${formatBackupDate(target)}`
}

const askToRestore = (source: RestoreSource, target: string) => {
  pendingRestore.value = { source, target, label: restoreLabel(source, target) }
  showRestoreDialog.value = true
}

const askToRestoreFromFile = async () => {
  const pickedPath = await pickBackupFile()
  if (pickedPath) askToRestore('file', pickedPath)
}

const confirmRestore = async () => {
  if (!pendingRestore.value) return
  const { source, target } = pendingRestore.value
  showRestoreDialog.value = false
  await restoreBackup(source, target)
}

onMounted(refresh)

watch(isOnline, (online) => {
  if (online) refresh()
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <div
      v-if="status?.restore_pending"
      class="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4"
    >
      <TriangleAlert class="size-5 text-amber-600 shrink-0" />
      <div class="flex-1 text-sm">
        <p class="font-medium">A restore is waiting to be applied</p>
        <p class="text-muted-foreground">Restart Balce now. Anything recorded before the restart will be replaced by the backup.</p>
      </div>
      <Button size="sm" @click="restartToFinishRestore">
        <RotateCcw class="size-4 mr-2" />Restart now
      </Button>
    </div>

    <Card>
      <CardHeader class="pb-3">
        <div class="flex items-start justify-between gap-4">
          <div>
            <CardTitle class="text-base flex items-center gap-2">
              <ShieldCheck class="size-4 text-primary" />Automatic backups
            </CardTitle>
            <CardDescription class="mt-1">
              A copy is saved on this PC every 6 hours and the last 7 days are kept.
              With an activated license each copy is also uploaded to the cloud.
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" :disabled="loadingStatus" @click="refresh">
            <RefreshCw class="size-4" :class="loadingStatus ? 'animate-spin' : ''" />
          </Button>
        </div>
      </CardHeader>

      <CardContent class="flex flex-col gap-4">
        <div v-if="!status && loadingStatus" class="grid gap-3 sm:grid-cols-2">
          <Skeleton class="h-24" />
          <Skeleton class="h-24" />
        </div>

        <div v-else class="grid gap-3 sm:grid-cols-2">
          <div class="rounded-lg border p-4 flex gap-3">
            <div class="rounded-md bg-muted p-2 h-fit">
              <HardDrive class="size-5 text-muted-foreground" />
            </div>
            <div class="min-w-0">
              <p class="text-sm font-medium">On this PC</p>
              <template v-if="latestLocalBackup">
                <p class="text-sm text-muted-foreground">Last saved {{ timeAgo(latestLocalBackup.created_at) }}</p>
                <p class="text-xs text-muted-foreground mt-1">{{ localBackups.length }} of 7 daily copies kept</p>
              </template>
              <p v-else class="text-sm text-muted-foreground">No backup yet. Click Back up now.</p>
            </div>
          </div>

          <div class="rounded-lg border p-4 flex gap-3">
            <div class="rounded-md bg-muted p-2 h-fit">
              <CloudOff v-if="!status?.cloud_available || !isOnline" class="size-5 text-muted-foreground" />
              <Cloud v-else class="size-5 text-muted-foreground" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <p class="text-sm font-medium">Cloud</p>
                <Badge v-if="status?.cloud_available && !isOnline" variant="outline" class="text-xs">
                  <WifiOff class="size-3 mr-1" />Offline
                </Badge>
              </div>
              <p v-if="!status?.cloud_available" class="text-sm text-muted-foreground">
                Available with an activated license. Backups on this PC and to USB still work.
              </p>
              <p v-else-if="!isOnline" class="text-sm text-muted-foreground">
                No internet. Your data is safe on this PC and will upload when the internet is back.
              </p>
              <template v-else>
                <p v-if="status.last_cloud_success_at" class="text-sm text-muted-foreground">
                  Last uploaded {{ timeAgo(status.last_cloud_success_at) }}
                </p>
                <p v-else-if="cloudBackups[0]" class="text-sm text-muted-foreground">
                  Latest cloud copy: {{ formatBackupDate(cloudBackups[0].date) }}
                </p>
                <p v-else class="text-sm text-muted-foreground">No cloud copy yet</p>
                <p v-if="status.last_cloud_error" class="text-xs text-destructive mt-1 line-clamp-2">
                  Last upload failed: {{ status.last_cloud_error }}. Retrying automatically.
                </p>
              </template>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          <Button :disabled="activeAction !== null" @click="backupNow">
            <RefreshCw v-if="activeAction === 'backup'" class="size-4 mr-2 animate-spin" />
            <DatabaseBackup v-else class="size-4 mr-2" />
            {{ activeAction === 'backup' ? 'Backing up…' : 'Back up now' }}
          </Button>
          <Button v-if="userIsAdmin" variant="outline" :disabled="activeAction !== null" @click="exportToFile">
            <RefreshCw v-if="activeAction === 'export'" class="size-4 mr-2 animate-spin" />
            <Usb v-else class="size-4 mr-2" />
            {{ activeAction === 'export' ? 'Saving…' : 'Save to USB / file' }}
          </Button>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="pb-3">
        <CardTitle class="text-base flex items-center gap-2">
          <History class="size-4" />Restore
        </CardTitle>
        <CardDescription>
          Replace the data on this PC with an earlier backup. Your current data is saved on this PC first, so a restore can be undone.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <p v-if="!userIsAdmin" class="text-sm text-muted-foreground">
          Only an admin can restore a backup. Ask your admin to sign in on this PC.
        </p>

        <Tabs v-else default-value="local">
          <TabsList class="grid w-full grid-cols-3">
            <TabsTrigger value="local">On this PC</TabsTrigger>
            <TabsTrigger value="cloud" :disabled="!status?.cloud_available">Cloud</TabsTrigger>
            <TabsTrigger value="file">From a file</TabsTrigger>
          </TabsList>

          <TabsContent value="local" class="mt-3 flex flex-col gap-3">
            <div
              v-if="beforeRestoreCopy"
              class="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3"
            >
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium">Undo last restore</p>
                <p class="text-xs text-muted-foreground">
                  Your data as it was before the last restore, saved {{ timeAgo(beforeRestoreCopy.created_at) }} · {{ formatSize(beforeRestoreCopy.size) }}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                :disabled="activeAction !== null"
                @click="askToRestore('local', beforeRestoreBackupName)"
              >
                <RotateCcw class="size-3.5 mr-1.5" />Undo
              </Button>
            </div>

            <p v-if="localBackups.length === 0" class="text-sm text-muted-foreground py-6 text-center">
              No backups on this PC yet.
            </p>
            <div v-else class="divide-y rounded-lg border">
              <div
                v-for="localBackup in localBackups"
                :key="localBackup.date"
                class="flex items-center gap-3 px-4 py-3"
              >
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <p class="text-sm font-medium">{{ formatBackupDate(localBackup.date) }}</p>
                    <Badge v-if="localBackup.date === todayBackupDate" variant="secondary" class="text-xs">Today</Badge>
                  </div>
                  <p class="text-xs text-muted-foreground">
                    Saved {{ timeAgo(localBackup.created_at) }} · {{ formatSize(localBackup.size) }}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  :disabled="activeAction !== null"
                  @click="askToRestore('local', localBackup.date)"
                >
                  <RotateCcw class="size-3.5 mr-1.5" />Restore
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="cloud" class="mt-3">
            <div v-if="loadingCloud" class="flex flex-col gap-2">
              <Skeleton v-for="skeletonIndex in 3" :key="skeletonIndex" class="h-14" />
            </div>
            <div v-else-if="cloudListError" class="flex flex-col items-center gap-3 py-6 text-center">
              <CloudOff class="size-8 text-muted-foreground/50" />
              <p class="text-sm text-muted-foreground max-w-sm">{{ cloudListError }}</p>
              <Button size="sm" variant="outline" :disabled="!isOnline" @click="fetchCloudBackups">
                <RefreshCw class="size-3.5 mr-1.5" />Try again
              </Button>
            </div>
            <p v-else-if="cloudBackups.length === 0" class="text-sm text-muted-foreground py-6 text-center">
              No cloud backups yet.
            </p>
            <div v-else class="divide-y rounded-lg border">
              <div
                v-for="cloudBackup in cloudBackups"
                :key="cloudBackup.key"
                class="flex items-center gap-3 px-4 py-3"
              >
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium">{{ formatBackupDate(cloudBackup.date) }}</p>
                  <p class="text-xs text-muted-foreground">{{ formatSize(cloudBackup.size) }}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  :disabled="activeAction !== null || !isOnline"
                  @click="askToRestore('cloud', cloudBackup.date)"
                >
                  <RotateCcw class="size-3.5 mr-1.5" />Restore
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="file" class="mt-3">
            <div class="flex flex-col items-center gap-3 rounded-lg border border-dashed py-8 px-4 text-center">
              <FolderOpen class="size-8 text-muted-foreground/50" />
              <p class="text-sm text-muted-foreground max-w-sm">
                Pick a backup file saved with Save to USB / file. Use this to move your data to a new PC or when there is no internet.
              </p>
              <Button variant="outline" :disabled="activeAction !== null" @click="askToRestoreFromFile">
                <FolderOpen class="size-4 mr-2" />Choose backup file…
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>

    <AlertDialog v-model:open="showRestoreDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Restore {{ pendingRestore?.label }}?</AlertDialogTitle>
          <AlertDialogDescription class="flex flex-col gap-2">
            <span>All data on this PC will be replaced. Sales recorded after this backup was made will no longer show.</span>
            <span v-if="!isUndo">Your current data is kept first, so you can undo this with Undo last restore.</span>
            <span>Balce will restart and you will need to sign in again.</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction class="bg-destructive hover:bg-destructive/90" @click="confirmRestore">
            Restore and restart
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <div
      v-if="activeAction === 'restore'"
      class="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm"
    >
      <RefreshCw class="size-8 animate-spin text-primary" />
      <p class="text-sm font-medium">Preparing your backup…</p>
      <p class="text-xs text-muted-foreground">Do not close Balce</p>
    </div>
  </div>
</template>
