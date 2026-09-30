<script setup lang="ts">
import {
  Cloud,
  CloudOff,
  DatabaseBackup,
  FolderOpen,
  Globe,
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
const { savingFile, saveMovingFile } = useBusinessMove()
const { t, formatDate, formatRelativeTime } = useI18n()
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

const userIsAdmin = computed(() => user.value?.is_owner === true)
const localBackups = computed(() => status.value?.local_backups ?? [])
const latestLocalBackup = computed(() => localBackups.value[0] ?? null)
const beforeRestoreCopy = computed(() => status.value?.before_restore_copy ?? null)
const todayBackupDate = new Date().toLocaleDateString('en-CA')

const pendingRestore = ref<{ source: RestoreSource; target: string } | null>(null)
const showRestoreDialog = ref(false)

const formatBackupDate = (backupDate: string): string =>
  formatDate(new Date(`${backupDate}T00:00:00`), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

const formatSize = (sizeInBytes: number): string => {
  if (sizeInBytes < 1024 * 1024) return `${Math.max(1, Math.round(sizeInBytes / 1024))} KB`
  return `${(sizeInBytes / 1024 / 1024).toFixed(1)} MB`
}

const timeAgo = (timestamp: string): string => formatRelativeTime(timestamp)

const fileNameFromPath = (filePath: string): string => filePath.split(/[\\/]/).pop() ?? filePath

const isUndo = computed(() => pendingRestore.value?.target === beforeRestoreBackupName)

const restoreLabel = (source: RestoreSource, target: string): string => {
  if (source === 'file') return fileNameFromPath(target)
  if (target === beforeRestoreBackupName) return t('backup.confirm.beforeLastRestore')
  return t('backup.confirm.backupFrom', { date: formatBackupDate(target) })
}

const pendingRestoreLabel = computed(() => (pendingRestore.value ? restoreLabel(pendingRestore.value.source, pendingRestore.value.target) : ''))

const askToRestore = (source: RestoreSource, target: string) => {
  pendingRestore.value = { source, target }
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
        <p class="font-medium">{{ t('backup.restorePending.title') }}</p>
        <p class="text-muted-foreground">{{ t('backup.restorePending.body') }}</p>
      </div>
      <Button size="sm" @click="restartToFinishRestore">
        <RotateCcw class="size-4 mr-2" />{{ t('backup.restorePending.restartNow') }}
      </Button>
    </div>

    <Card>
      <CardHeader class="pb-3">
        <div class="flex items-start justify-between gap-4">
          <div>
            <CardTitle class="text-base flex items-center gap-2">
              <ShieldCheck class="size-4 text-primary" />{{ t('backup.automatic.title') }}
            </CardTitle>
            <CardDescription class="mt-1">
              {{ t('backup.automatic.description') }}
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" :disabled="loadingStatus" :aria-label="t('common.actions.refresh')" @click="refresh">
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
              <p class="text-sm font-medium">{{ t('backup.automatic.onThisPc') }}</p>
              <template v-if="latestLocalBackup">
                <p class="text-sm text-muted-foreground">{{ t('backup.automatic.lastSaved', { time: timeAgo(latestLocalBackup.created_at) }) }}</p>
                <p class="text-xs text-muted-foreground mt-1">{{ t('backup.automatic.copiesKept', { count: localBackups.length }) }}</p>
              </template>
              <p v-else class="text-sm text-muted-foreground">{{ t('backup.automatic.noBackupYet') }}</p>
            </div>
          </div>

          <div class="rounded-lg border p-4 flex gap-3">
            <div class="rounded-md bg-muted p-2 h-fit">
              <CloudOff v-if="!status?.cloud_available || !isOnline" class="size-5 text-muted-foreground" />
              <Cloud v-else class="size-5 text-muted-foreground" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <p class="text-sm font-medium">{{ t('backup.automatic.cloud') }}</p>
                <Badge v-if="status?.cloud_available && !isOnline" variant="outline" class="text-xs">
                  <WifiOff class="size-3 mr-1" />{{ t('common.states.offline') }}
                </Badge>
              </div>
              <p v-if="!status?.cloud_available" class="text-sm text-muted-foreground">
                {{ t('backup.automatic.cloudNeedsLicense') }}
              </p>
              <p v-else-if="!isOnline" class="text-sm text-muted-foreground">
                {{ t('backup.automatic.cloudOffline') }}
              </p>
              <template v-else>
                <p v-if="status.last_cloud_success_at" class="text-sm text-muted-foreground">
                  {{ t('backup.automatic.lastUploaded', { time: timeAgo(status.last_cloud_success_at) }) }}
                </p>
                <p v-else-if="cloudBackups[0]" class="text-sm text-muted-foreground">
                  {{ t('backup.automatic.latestCloudCopy', { date: formatBackupDate(cloudBackups[0].date) }) }}
                </p>
                <p v-else-if="cloudListError" class="text-sm text-muted-foreground">{{ t('backup.automatic.cloudUnreachable') }}</p>
                <p v-else class="text-sm text-muted-foreground">{{ t('backup.automatic.noCloudCopy') }}</p>
                <p v-if="status.last_cloud_error" class="text-xs text-destructive mt-1 line-clamp-2">
                  {{ t('backup.automatic.lastUploadFailed', { error: status.last_cloud_error }) }}
                </p>
              </template>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          <Button :disabled="activeAction !== null" @click="backupNow">
            <RefreshCw v-if="activeAction === 'backup'" class="size-4 mr-2 animate-spin" />
            <DatabaseBackup v-else class="size-4 mr-2" />
            {{ activeAction === 'backup' ? t('backup.automatic.backingUp') : t('backup.automatic.backUpNow') }}
          </Button>
          <Button v-if="userIsAdmin" variant="outline" :disabled="activeAction !== null" @click="exportToFile">
            <RefreshCw v-if="activeAction === 'export'" class="size-4 mr-2 animate-spin" />
            <Usb v-else class="size-4 mr-2" />
            {{ activeAction === 'export' ? t('common.actions.saving') : t('backup.automatic.saveToUsb') }}
          </Button>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="pb-3">
        <CardTitle class="text-base flex items-center gap-2">
          <History class="size-4" />{{ t('backup.restore.title') }}
        </CardTitle>
        <CardDescription>
          {{ t('backup.restore.description') }}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <p v-if="!userIsAdmin" class="text-sm text-muted-foreground">
          {{ t('backup.restore.adminOnly') }}
        </p>

        <Tabs v-else default-value="local">
          <TabsList class="grid w-full grid-cols-3">
            <TabsTrigger value="local">{{ t('backup.restore.tabLocal') }}</TabsTrigger>
            <TabsTrigger value="cloud" :disabled="!status?.cloud_available">{{ t('backup.restore.tabCloud') }}</TabsTrigger>
            <TabsTrigger value="file">{{ t('backup.restore.tabFile') }}</TabsTrigger>
          </TabsList>

          <TabsContent value="local" class="mt-3 flex flex-col gap-3">
            <div
              v-if="beforeRestoreCopy"
              class="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3"
            >
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium">{{ t('backup.restore.undoTitle') }}</p>
                <p class="text-xs text-muted-foreground">
                  {{ t('backup.restore.undoDescription', { time: timeAgo(beforeRestoreCopy.created_at), size: formatSize(beforeRestoreCopy.size) }) }}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                :disabled="activeAction !== null"
                @click="askToRestore('local', beforeRestoreBackupName)"
              >
                <RotateCcw class="size-3.5 mr-1.5" />{{ t('backup.restore.undo') }}
              </Button>
            </div>

            <p v-if="localBackups.length === 0" class="text-sm text-muted-foreground py-6 text-center">
              {{ t('backup.restore.noLocalBackups') }}
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
                    <Badge v-if="localBackup.date === todayBackupDate" variant="secondary" class="text-xs">{{ t('common.time.today') }}</Badge>
                  </div>
                  <p class="text-xs text-muted-foreground">
                    {{ t('backup.restore.savedAt', { time: timeAgo(localBackup.created_at), size: formatSize(localBackup.size) }) }}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  :disabled="activeAction !== null"
                  @click="askToRestore('local', localBackup.date)"
                >
                  <RotateCcw class="size-3.5 mr-1.5" />{{ t('backup.restore.restore') }}
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
                <RefreshCw class="size-3.5 mr-1.5" />{{ t('common.actions.retry') }}
              </Button>
            </div>
            <p v-else-if="cloudBackups.length === 0" class="text-sm text-muted-foreground py-6 text-center">
              {{ t('backup.restore.noCloudBackups') }}
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
                  <RotateCcw class="size-3.5 mr-1.5" />{{ t('backup.restore.restore') }}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="file" class="mt-3">
            <div class="flex flex-col items-center gap-3 rounded-lg border border-dashed py-8 px-4 text-center">
              <FolderOpen class="size-8 text-muted-foreground/50" />
              <p class="text-sm text-muted-foreground max-w-sm">
                {{ t('backup.restore.fileHelp') }}
              </p>
              <Button variant="outline" :disabled="activeAction !== null" @click="askToRestoreFromFile">
                <FolderOpen class="size-4 mr-2" />{{ t('backup.restore.chooseFile') }}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>

    <Card v-if="userIsAdmin">
      <CardHeader class="pb-3">
        <CardTitle class="text-base flex items-center gap-2">
          <Globe class="size-4" />{{ t('backup.move.title') }}
        </CardTitle>
        <CardDescription>{{ t('backup.move.description') }}</CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col gap-4">
        <ol class="flex list-decimal flex-col gap-1.5 pl-5 text-sm">
          <li>{{ t('backup.move.stepSave') }}</li>
          <li>{{ t('backup.move.stepOpen') }}</li>
          <li>{{ t('backup.move.stepUpload') }}</li>
        </ol>
        <p class="flex gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <TriangleAlert class="mt-0.5 size-4 shrink-0 text-amber-600" />
          <span>{{ t('backup.move.warning') }}</span>
        </p>
        <Button class="self-start" :disabled="savingFile" @click="saveMovingFile(user?.company_name ?? '')">
          <RefreshCw v-if="savingFile" class="size-4 mr-2 animate-spin" />
          {{ savingFile ? t('common.actions.saving') : t('backup.move.saveButton') }}
        </Button>
      </CardContent>
    </Card>

    <AlertDialog v-model:open="showRestoreDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{{ t('backup.confirm.title', { label: pendingRestoreLabel }) }}</AlertDialogTitle>
          <AlertDialogDescription class="flex flex-col gap-2">
            <span>{{ t('backup.confirm.replacesEverything') }}</span>
            <span v-if="!isUndo">{{ t('backup.confirm.canUndo') }}</span>
            <span>{{ t('backup.confirm.restartAndSignIn') }}</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{{ t('common.actions.cancel') }}</AlertDialogCancel>
          <AlertDialogAction class="bg-destructive hover:bg-destructive/90" @click="confirmRestore">
            {{ t('backup.confirm.action') }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <div
      v-if="activeAction === 'restore'"
      class="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm"
    >
      <RefreshCw class="size-8 animate-spin text-primary" />
      <p class="text-sm font-medium">{{ t('backup.preparing') }}</p>
      <p class="text-xs text-muted-foreground">{{ t('backup.doNotClose') }}</p>
    </div>
  </div>
</template>
