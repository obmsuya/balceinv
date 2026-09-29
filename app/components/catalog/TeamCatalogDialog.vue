<script setup lang="ts">
import {
  Braces,
  Check,
  CircleAlert,
  FileSpreadsheet,
  KeyRound,
  Loader2,
  Lock,
  Search,
  ShieldCheck,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  CatalogImportError,
  catalogFileProblem,
  matchesCatalogSearch,
  readCatalogError,
  useCatalog,
} from '@/composables/useCatalog'
import type { CatalogImportMode, CatalogImportResult, CatalogProduct } from '@/composables/useCatalog'
import { businessTypeLabel, businessTypes } from '~/utils/businessTypes'
import { formatMoney, majorToMinor } from '~/utils/money'

const open = defineModel<boolean>('open', { default: false })

const { t, formatNumber } = useI18n()

const {
  teamUnlocked,
  teamSummary,
  unlockTeamTools,
  lockTeamTools,
  fetchTeamItems,
  importCatalogFile,
  clearCatalog,
  downloadCatalogTemplate,
  exportCatalogJson,
} = useCatalog()

const previewLimit = 60

const passcode = ref('')
const passcodeError = ref('')
const unlocking = ref(false)
const passcodeField = ref<InstanceType<typeof Input> | null>(null)

const selectedBusinessType = ref('')
const selectedFile = ref<File | null>(null)
const fileProblem = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const dragActive = ref(false)
const importMode = ref<CatalogImportMode>('merge')
const importing = ref(false)
const importResult = ref<CatalogImportResult | null>(null)
const importFailure = ref<{ message: string; result: CatalogImportResult | null } | null>(null)

const previewItems = ref<CatalogProduct[]>([])
const previewLoading = ref(false)
const previewError = ref('')
const previewSearch = ref('')
const confirmingClear = ref(false)
const clearing = ref(false)
const exporting = ref(false)

const countFor = (businessType: string): number =>
  teamSummary.value?.counts.find(count => count.business_type === businessType)?.count ?? 0

const companyBusinessType = computed(() => teamSummary.value?.company_business_type ?? '')
const selectedLabel = computed(() => businessTypeLabel(selectedBusinessType.value))
const selectedCount = computed(() => countFor(selectedBusinessType.value))

const businessTypeTiles = computed(() => {
  const knownTiles = businessTypes.map(businessType => ({ ...businessType, count: countFor(businessType.value) }))
  const unknownCounts = (teamSummary.value?.counts ?? []).filter(
    count => !businessTypes.some(businessType => businessType.value === count.business_type),
  )
  return [
    ...knownTiles,
    ...unknownCounts.map(count => ({ value: count.business_type, label: count.business_type, icon: FileSpreadsheet, count: count.count })),
  ]
})

const matchingPreviewItems = computed(() =>
  previewItems.value.filter(catalogProduct => matchesCatalogSearch(catalogProduct, previewSearch.value)),
)

const shownProblems = computed(() => importResult.value?.problems ?? importFailure.value?.result?.problems ?? [])
const hiddenProblemCount = computed(() => {
  const problemsTotal = importResult.value?.problems_total ?? importFailure.value?.result?.problems_total ?? 0
  return Math.max(0, problemsTotal - shownProblems.value.length)
})

const formatFileSize = (bytes: number): string =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`

const resetImport = () => {
  selectedFile.value = null
  fileProblem.value = ''
  importResult.value = null
  importFailure.value = null
  importMode.value = 'merge'
  if (fileInput.value) fileInput.value.value = ''
}

const resetDialog = () => {
  passcode.value = ''
  passcodeError.value = ''
  previewItems.value = []
  previewSearch.value = ''
  confirmingClear.value = false
  selectedBusinessType.value = ''
  resetImport()
}

const loadPreview = async () => {
  if (!selectedBusinessType.value || !teamUnlocked.value) return
  const requestedBusinessType = selectedBusinessType.value
  previewLoading.value = true
  previewError.value = ''
  try {
    const catalogProducts = await fetchTeamItems(requestedBusinessType)
    if (requestedBusinessType === selectedBusinessType.value) previewItems.value = catalogProducts
  } catch (error: any) {
    if (requestedBusinessType === selectedBusinessType.value) {
      previewError.value = readCatalogError(error, 'catalog.errors.previewFailed')
      previewItems.value = []
    }
  } finally {
    if (requestedBusinessType === selectedBusinessType.value) previewLoading.value = false
  }
}

const submitPasscode = async () => {
  if (!passcode.value.trim() || unlocking.value) return
  unlocking.value = true
  passcodeError.value = ''
  try {
    await unlockTeamTools(passcode.value.trim())
    passcode.value = ''
    selectedBusinessType.value = companyBusinessType.value || businessTypes[0]!.value
  } catch (error: any) {
    passcodeError.value = readCatalogError(error, 'catalog.errors.passcodeFailed')
    passcode.value = ''
    await nextTick()
    passcodeField.value?.$el?.focus?.()
  } finally {
    unlocking.value = false
  }
}

const selectBusinessType = (businessType: string) => {
  if (importing.value || businessType === selectedBusinessType.value) return
  selectedBusinessType.value = businessType
}

const acceptFile = (file: File | undefined | null) => {
  importResult.value = null
  importFailure.value = null
  if (!file) return
  const problem = catalogFileProblem(file)
  fileProblem.value = problem ?? ''
  selectedFile.value = problem ? null : file
}

const onFileChosen = (event: Event) => {
  acceptFile((event.target as HTMLInputElement).files?.[0])
}

const onFileDropped = (event: DragEvent) => {
  dragActive.value = false
  if (importing.value) return
  acceptFile(event.dataTransfer?.files?.[0])
}

const clearChosenFile = () => {
  selectedFile.value = null
  fileProblem.value = ''
  if (fileInput.value) fileInput.value.value = ''
}

const runImport = async () => {
  if (!selectedFile.value || importing.value) return
  importing.value = true
  importResult.value = null
  importFailure.value = null
  try {
    importResult.value = await importCatalogFile(selectedFile.value, selectedBusinessType.value, importMode.value)
    toast.success(t('catalog.team.listSaved', { name: selectedLabel.value }), {
      description: t('catalog.team.addedUpdated', { added: formatNumber(importResult.value.added), updated: formatNumber(importResult.value.updated) }),
    })
    clearChosenFile()
    await loadPreview()
  } catch (error: any) {
    importFailure.value = error instanceof CatalogImportError
      ? { message: error.message, result: error.result }
      : { message: t('catalog.errors.saveFailed'), result: null }
  } finally {
    importing.value = false
  }
}

const confirmClear = async () => {
  clearing.value = true
  const cleared = await clearCatalog(selectedBusinessType.value)
  clearing.value = false
  confirmingClear.value = false
  if (cleared) {
    importResult.value = null
    await loadPreview()
  }
}

const exportJson = async () => {
  exporting.value = true
  await exportCatalogJson(selectedBusinessType.value)
  exporting.value = false
}

const lockedOnPurpose = ref(false)

const lockNow = () => {
  lockedOnPurpose.value = true
  lockTeamTools()
  resetDialog()
}

watch(selectedBusinessType, () => {
  previewSearch.value = ''
  confirmingClear.value = false
  importResult.value = null
  importFailure.value = null
  loadPreview()
})

watch(open, (isOpen) => {
  if (isOpen) return
  lockedOnPurpose.value = true
  lockTeamTools()
  resetDialog()
})

watch(teamUnlocked, (unlocked) => {
  if (unlocked || !open.value) {
    lockedOnPurpose.value = false
    return
  }
  if (lockedOnPurpose.value) {
    lockedOnPurpose.value = false
    return
  }
  resetDialog()
  passcodeError.value = t('catalog.team.sessionEnded')
})
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent
      class="max-h-[90vh] overflow-y-auto"
      :class="teamUnlocked ? 'sm:max-w-3xl' : 'sm:max-w-sm'"
      @interact-outside="importing && $event.preventDefault()"
      @escape-key-down="importing && $event.preventDefault()"
    >
      <template v-if="!teamUnlocked">
        <DialogHeader class="items-center text-center">
          <span class="flex size-12 items-center justify-center rounded-2xl bg-primary/10">
            <KeyRound class="size-6 text-primary" />
          </span>
          <DialogTitle class="pt-2">{{ t('catalog.team.lockedTitle') }}</DialogTitle>
          <DialogDescription>{{ t('catalog.team.lockedDescription') }}</DialogDescription>
        </DialogHeader>

        <form class="flex flex-col gap-3" @submit.prevent="submitPasscode">
          <Input
            ref="passcodeField"
            v-model="passcode"
            type="password"
            autocomplete="off"
            autofocus
            :placeholder="t('catalog.team.passcode')"
            class="h-11 text-center tracking-widest"
            :aria-invalid="passcodeError !== ''"
            :disabled="unlocking"
          />
          <p v-if="passcodeError" class="flex items-center justify-center gap-1.5 text-sm text-destructive" role="alert">
            <CircleAlert class="size-4 shrink-0" />{{ passcodeError }}
          </p>
          <Button type="submit" class="h-11" :disabled="!passcode.trim() || unlocking">
            <Loader2 v-if="unlocking" class="size-4 mr-2 animate-spin" />
            <ShieldCheck v-else class="size-4 mr-2" />
            {{ t('catalog.team.unlock') }}
          </Button>
        </form>
      </template>

      <template v-else>
        <DialogHeader class="flex-row items-start justify-between gap-4 space-y-0 pr-8">
          <div class="flex items-center gap-3">
            <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <FileSpreadsheet class="size-5 text-primary" />
            </span>
            <div class="text-left">
              <DialogTitle class="flex items-center gap-2">
                {{ t('catalog.team.title') }}
                <Badge variant="secondary" class="gap-1 font-normal"><ShieldCheck class="size-3" />{{ t('catalog.team.teamBadge') }}</Badge>
              </DialogTitle>
              <DialogDescription>{{ t('catalog.team.description') }}</DialogDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" class="shrink-0" :disabled="importing" @click="lockNow">
            <Lock class="size-4 mr-1.5" />{{ t('catalog.team.lock') }}
          </Button>
        </DialogHeader>

        <div class="flex flex-col gap-5">
          <section class="flex flex-col gap-2">
            <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">{{ t('catalog.team.businessType') }}</p>
            <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button
                v-for="tile in businessTypeTiles"
                :key="tile.value"
                type="button"
                class="group relative flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-colors hover:bg-muted/50 disabled:opacity-60"
                :class="tile.value === selectedBusinessType ? 'border-primary bg-primary/5 ring-1 ring-primary' : ''"
                :aria-pressed="tile.value === selectedBusinessType"
                :disabled="importing"
                @click="selectBusinessType(tile.value)"
              >
                <span
                  class="flex size-8 items-center justify-center rounded-lg"
                  :class="tile.value === selectedBusinessType ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground group-hover:text-foreground'"
                >
                  <component :is="tile.icon" class="size-4" />
                </span>
                <span class="text-sm font-medium leading-tight">{{ tile.label }}</span>
                <span class="text-xs tabular-nums" :class="tile.count ? 'text-foreground' : 'text-muted-foreground'">
                  {{ tile.count ? t('catalog.team.productCount', { count: tile.count, formatted: formatNumber(tile.count) }) : t('catalog.team.empty') }}
                </span>
                <span
                  v-if="tile.value === companyBusinessType"
                  class="absolute right-2 top-2 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400"
                >{{ t('catalog.team.thisShop') }}</span>
              </button>
            </div>
          </section>

          <section class="flex flex-col gap-3 rounded-xl border p-4">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm font-semibold">{{ t('catalog.team.uploadTo', { name: selectedLabel }) }}</p>
              <Button variant="link" size="sm" class="h-auto p-0" @click="downloadCatalogTemplate">
                <FileSpreadsheet class="size-3.5 mr-1" />{{ t('catalog.team.getTemplate') }}
              </Button>
            </div>

            <label
              v-if="!selectedFile"
              class="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-7 text-center transition-colors"
              :class="dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/40'"
              @dragover.prevent="dragActive = true"
              @dragleave.prevent="dragActive = false"
              @drop.prevent="onFileDropped"
            >
              <UploadCloud class="size-8" :class="dragActive ? 'text-primary' : 'text-muted-foreground'" />
              <span class="text-sm font-medium">{{ t('catalog.team.dropFile') }}</span>
              <span class="text-xs text-muted-foreground">
                {{ t('catalog.team.needsColumnBefore') }} <code class="rounded bg-muted px-1">name</code> {{ t('catalog.team.needsColumnAfter') }}
              </span>
              <input
                ref="fileInput"
                type="file"
                accept=".xlsx,.csv"
                class="sr-only"
                @change="onFileChosen"
              >
            </label>

            <div v-else class="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
              <span class="flex size-9 items-center justify-center rounded-lg bg-emerald-500/15">
                <FileSpreadsheet class="size-4 text-emerald-700 dark:text-emerald-400" />
              </span>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium">{{ selectedFile.name }}</p>
                <p class="text-xs text-muted-foreground">{{ formatFileSize(selectedFile.size) }}</p>
              </div>
              <Button variant="ghost" size="icon" class="size-8" :disabled="importing" :aria-label="t('catalog.team.removeFile')" @click="clearChosenFile">
                <X class="size-4" />
              </Button>
            </div>

            <p v-if="fileProblem" class="flex items-center gap-1.5 text-sm text-destructive" role="alert">
              <CircleAlert class="size-4 shrink-0" />{{ fileProblem }}
            </p>

            <div class="grid grid-cols-2 gap-2" role="radiogroup" :aria-label="t('catalog.team.importMode')">
              <button
                type="button"
                role="radio"
                :aria-checked="importMode === 'merge'"
                class="rounded-lg border px-3 py-2 text-left transition-colors disabled:opacity-60"
                :class="importMode === 'merge' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted/50'"
                :disabled="importing"
                @click="importMode = 'merge'"
              >
                <span class="block text-sm font-medium">{{ t('catalog.team.merge') }}</span>
                <span class="block text-xs text-muted-foreground">{{ t('catalog.team.mergeHint') }}</span>
              </button>
              <button
                type="button"
                role="radio"
                :aria-checked="importMode === 'replace'"
                class="rounded-lg border px-3 py-2 text-left transition-colors disabled:opacity-60"
                :class="importMode === 'replace' ? 'border-destructive bg-destructive/5 ring-1 ring-destructive' : 'hover:bg-muted/50'"
                :disabled="importing"
                @click="importMode = 'replace'"
              >
                <span class="block text-sm font-medium">{{ t('catalog.team.replace') }}</span>
                <span class="block text-xs text-muted-foreground">
                  {{ selectedCount ? t('catalog.team.replaceHint', { count: selectedCount, formatted: formatNumber(selectedCount) }) : t('catalog.team.replaceHintEmpty') }}
                </span>
              </button>
            </div>

            <Button
              class="h-11"
              :variant="importMode === 'replace' ? 'destructive' : 'default'"
              :disabled="!selectedFile || importing"
              @click="runImport"
            >
              <Loader2 v-if="importing" class="size-4 mr-2 animate-spin" />
              <UploadCloud v-else class="size-4 mr-2" />
              {{ importing ? t('catalog.team.reading') : importMode === 'replace' ? t('catalog.team.replaceList', { name: selectedLabel }) : t('catalog.team.uploadTo', { name: selectedLabel }) }}
            </Button>

            <div
              v-if="importResult"
              class="flex flex-col gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3"
              role="status"
            >
              <p class="flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                <Check class="size-4" />{{ t('catalog.team.listNowHas', { name: selectedLabel, count: importResult.total_in_list, formatted: formatNumber(importResult.total_in_list) }) }}
              </p>
              <div class="flex flex-wrap gap-1.5 text-xs">
                <Badge variant="outline">{{ t('catalog.team.added', { count: formatNumber(importResult.added) }) }}</Badge>
                <Badge variant="outline">{{ t('catalog.team.updated', { count: formatNumber(importResult.updated) }) }}</Badge>
                <Badge v-if="importResult.skipped" variant="outline" class="border-amber-500/40 text-amber-700 dark:text-amber-400">
                  {{ t('catalog.team.rowsSkipped', { count: importResult.skipped, formatted: formatNumber(importResult.skipped) }) }}
                </Badge>
              </div>
            </div>

            <div
              v-if="importFailure"
              class="flex items-start gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
              role="alert"
            >
              <CircleAlert class="size-4 mt-0.5 shrink-0" />{{ importFailure.message }}
            </div>

            <div v-if="shownProblems.length" class="flex flex-col gap-1">
              <p class="text-xs font-medium text-muted-foreground">{{ t('catalog.team.skippedRows') }}</p>
              <ul class="max-h-36 overflow-y-auto rounded-lg border divide-y text-xs">
                <li v-for="problem in shownProblems" :key="problem.row" class="flex gap-3 px-3 py-1.5">
                  <span class="w-14 shrink-0 tabular-nums text-muted-foreground">{{ t('catalog.team.row', { row: problem.row }) }}</span>
                  <span class="min-w-0 flex-1 truncate">{{ problem.name || '—' }}</span>
                  <span class="shrink-0 text-amber-700 dark:text-amber-400">{{ problem.problem }}</span>
                </li>
              </ul>
              <p v-if="hiddenProblemCount" class="text-xs text-muted-foreground">
                {{ t('catalog.team.andMore', { count: formatNumber(hiddenProblemCount) }) }}
              </p>
            </div>
          </section>

          <section class="flex flex-col gap-2">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm font-semibold">
                {{ t('catalog.team.listName', { name: selectedLabel }) }}
                <span class="font-normal text-muted-foreground">· {{ formatNumber(selectedCount) }}</span>
              </p>
              <div class="relative w-48">
                <Search class="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input v-model="previewSearch" :placeholder="t('common.actions.search')" class="h-8 pl-8 text-sm" :disabled="!previewItems.length" />
              </div>
            </div>

            <div class="max-h-56 overflow-y-auto rounded-lg border">
              <div v-if="previewLoading" class="flex flex-col gap-1 p-2">
                <Skeleton v-for="i in 4" :key="i" class="h-9 w-full" />
              </div>
              <div v-else-if="previewError" class="flex flex-col items-center gap-2 px-4 py-6 text-center text-sm">
                <p class="text-destructive">{{ previewError }}</p>
                <Button variant="outline" size="sm" @click="loadPreview">{{ t('common.actions.retry') }}</Button>
              </div>
              <div v-else-if="!previewItems.length" class="px-4 py-8 text-center text-sm text-muted-foreground">
                {{ t('catalog.team.emptyList', { name: selectedLabel }) }}
              </div>
              <div v-else-if="!matchingPreviewItems.length" class="px-4 py-8 text-center text-sm text-muted-foreground">
                {{ t('catalog.team.noMatch', { search: previewSearch }) }}
              </div>
              <ul v-else class="divide-y text-sm">
                <li
                  v-for="catalogProduct in matchingPreviewItems.slice(0, previewLimit)"
                  :key="catalogProduct.id"
                  class="flex items-center gap-3 px-3 py-2"
                >
                  <span class="min-w-0 flex-1">
                    <span class="block truncate font-medium">{{ catalogProduct.name }}</span>
                    <span class="block truncate text-xs text-muted-foreground">
                      {{ [catalogProduct.category, catalogProduct.sub_category].filter(Boolean).join(' · ') || t('catalog.picker.noCategory') }}
                    </span>
                  </span>
                  <Badge variant="outline" class="shrink-0 font-normal">{{ catalogProduct.unit }}</Badge>
                  <span class="w-24 shrink-0 text-right tabular-nums text-xs text-muted-foreground">
                    {{ catalogProduct.default_price ? formatMoney(majorToMinor(catalogProduct.default_price)) : '—' }}
                  </span>
                </li>
                <li
                  v-if="matchingPreviewItems.length > previewLimit"
                  class="px-3 py-2 text-center text-xs text-muted-foreground"
                >
                  {{ t('catalog.team.showingSome', { shown: previewLimit, total: formatNumber(matchingPreviewItems.length) }) }}
                </li>
              </ul>
            </div>
          </section>

          <section class="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
            <Button
              variant="outline"
              size="sm"
              :disabled="!selectedCount || exporting || importing"
              :title="t('catalog.team.exportHint')"
              @click="exportJson"
            >
              <Loader2 v-if="exporting" class="size-4 mr-1.5 animate-spin" />
              <Braces v-else class="size-4 mr-1.5" />
              {{ t('catalog.team.export') }}
            </Button>

            <div v-if="!confirmingClear">
              <Button
                variant="ghost"
                size="sm"
                class="text-destructive hover:bg-destructive/10 hover:text-destructive"
                :disabled="!selectedCount || importing"
                @click="confirmingClear = true"
              >
                <Trash2 class="size-4 mr-1.5" />{{ t('catalog.team.clearList') }}
              </Button>
            </div>
            <div v-else class="flex items-center gap-2">
              <span class="text-sm">{{ t('catalog.team.confirmClear', { count: formatNumber(selectedCount) }) }}</span>
              <Button variant="outline" size="sm" :disabled="clearing" @click="confirmingClear = false">{{ t('catalog.team.keep') }}</Button>
              <Button variant="destructive" size="sm" :disabled="clearing" @click="confirmClear">
                <Loader2 v-if="clearing" class="size-4 mr-1.5 animate-spin" />{{ t('common.actions.remove') }}
              </Button>
            </div>
          </section>
        </div>
      </template>
    </DialogContent>
  </Dialog>
</template>
