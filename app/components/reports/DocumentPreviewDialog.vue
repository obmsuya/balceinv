<script setup lang="ts">
import { FileSpreadsheet, FileText, Loader2, Printer, RotateCw } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import type { StatementFormat } from '@/composables/useStatements'
import { apiErrorMessage } from '~/utils/i18n'
import { drawPdfPage, openPdf, pdfPageImages, type PdfDocument, type PdfLoading } from '~/utils/pdfPages'
import '~/assets/css/print-document.css'

const props = defineProps<{
  title: string
  subtitle: string
  loadPdf: () => Promise<Uint8Array>
  saving: StatementFormat | null
}>()
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ download: [format: StatementFormat] }>()

const { t } = useI18n()

const maximumPageWidth = 860
const pagesArea = ref<HTMLElement | null>(null)
const pageCanvases = ref<HTMLCanvasElement[]>([])
const pdfDocument = shallowRef<PdfDocument | null>(null)
const pageCount = ref(0)
const loading = ref(false)
const printing = ref(false)
const errorMessage = ref('')
let drawGeneration = 0
let pdfLoading: PdfLoading | null = null
let drawnWidth = 0
let resizeTimer: ReturnType<typeof setTimeout> | undefined
let resizeObserver: ResizeObserver | null = null

const pageWidth = (): number => Math.max(Math.min((pagesArea.value?.clientWidth ?? maximumPageWidth) - 32, maximumPageWidth), 240)

const drawPages = async (): Promise<void> => {
  const generation = ++drawGeneration
  const openDocument = pdfDocument.value
  if (!openDocument) return
  await nextTick()
  drawnWidth = pageWidth()
  for (let pageNumber = 1; pageNumber <= openDocument.numPages; pageNumber++) {
    if (generation !== drawGeneration) return
    const pageCanvas = pageCanvases.value[pageNumber - 1]
    if (pageCanvas) await drawPdfPage(openDocument, pageNumber, pageCanvas, drawnWidth)
  }
}

const closeDocument = (): void => {
  drawGeneration++
  pdfLoading?.destroy()
  pdfLoading = null
  pdfDocument.value = null
  pageCount.value = 0
}

const load = async (): Promise<void> => {
  closeDocument()
  loading.value = true
  errorMessage.value = ''
  try {
    const pdfBytes = await props.loadPdf()
    pdfLoading = openPdf(pdfBytes)
    const openedDocument = await pdfLoading.promise
    pdfDocument.value = openedDocument
    pageCount.value = openedDocument.numPages
    loading.value = false
    await drawPages()
  } catch (error: any) {
    errorMessage.value = apiErrorMessage(error, 'reports.preview.failed')
  } finally {
    loading.value = false
  }
}

const printDocument = async (): Promise<void> => {
  if (!pdfDocument.value) return
  printing.value = true
  try {
    const pageImages = await pdfPageImages(pdfDocument.value)
    const printArea = document.createElement('div')
    printArea.id = 'document-print'
    const imageLoads = pageImages.map((imageSource) => {
      const pageImage = new Image()
      pageImage.src = imageSource
      printArea.append(pageImage)
      return pageImage.decode()
    })
    document.body.append(printArea)
    await Promise.all(imageLoads)
    document.body.classList.add('printing-document')
    const cleanUp = () => {
      printArea.remove()
      document.body.classList.remove('printing-document')
      window.removeEventListener('afterprint', cleanUp)
    }
    window.addEventListener('afterprint', cleanUp)
    window.print()
  } catch (error: any) {
    errorMessage.value = apiErrorMessage(error, 'reports.preview.printFailed')
  } finally {
    printing.value = false
  }
}

watch(open, (isOpen) => {
  if (isOpen) load()
  else closeDocument()
})

watch(pagesArea, (area) => {
  resizeObserver?.disconnect()
  if (!area) return
  resizeObserver = new ResizeObserver(() => {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      if (pdfDocument.value && Math.abs(pageWidth() - drawnWidth) > 8) drawPages()
    }, 150)
  })
  resizeObserver.observe(area)
})

onBeforeUnmount(() => {
  clearTimeout(resizeTimer)
  resizeObserver?.disconnect()
  closeDocument()
})
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="flex h-[100dvh] max-w-none flex-col gap-0 overflow-hidden p-0 sm:h-[92dvh] sm:max-w-5xl sm:rounded-xl">
      <div class="flex flex-wrap items-center gap-3 border-b px-4 py-3 sm:px-5 sm:pr-12">
        <div class="w-full min-w-0 pr-8 sm:w-auto sm:flex-1 sm:pr-0">
          <DialogTitle class="truncate text-base font-semibold">{{ title }}</DialogTitle>
          <DialogDescription class="truncate text-sm">
            {{ subtitle }}<template v-if="pageCount"> · {{ t('reports.preview.pages', { count: pageCount, formatted: String(pageCount) }) }}</template>
          </DialogDescription>
        </div>
        <div class="flex gap-2">
          <Button variant="outline" size="sm" :disabled="saving !== null" @click="emit('download', 'xlsx')">
            <Loader2 v-if="saving === 'xlsx'" class="animate-spin" />
            <FileSpreadsheet v-else />
            {{ t('reports.excel') }}
          </Button>
          <Button variant="outline" size="sm" :disabled="saving !== null" @click="emit('download', 'pdf')">
            <Loader2 v-if="saving === 'pdf'" class="animate-spin" />
            <FileText v-else />
            {{ t('reports.pdf') }}
          </Button>
          <Button size="sm" :disabled="!pdfDocument || printing" @click="printDocument">
            <Loader2 v-if="printing" class="animate-spin" />
            <Printer v-else />
            {{ t('reports.print') }}
          </Button>
        </div>
      </div>

      <div ref="pagesArea" class="min-h-0 flex-1 overflow-auto bg-muted/70 px-4 py-5">
        <div v-if="loading" class="mx-auto flex w-full max-w-[860px] flex-col gap-4" :aria-label="t('reports.preview.loading')">
          <Skeleton class="aspect-[210/297] w-full rounded-sm" />
        </div>
        <div v-else-if="errorMessage" class="flex h-full flex-col items-center justify-center gap-3 text-center">
          <p class="max-w-sm text-sm text-muted-foreground">{{ errorMessage }}</p>
          <Button variant="outline" size="sm" @click="load">
            <RotateCw />
            {{ t('common.actions.retry') }}
          </Button>
        </div>
        <div v-else class="flex flex-col items-center gap-5">
          <canvas
            v-for="pageNumber in pageCount"
            :key="pageNumber"
            :ref="(pageCanvas) => { if (pageCanvas) pageCanvases[pageNumber - 1] = pageCanvas as HTMLCanvasElement }"
            role="img"
            :aria-label="t('reports.preview.page', { number: pageNumber, count: pageCount })"
            class="rounded-sm bg-white shadow-[0_2px_12px_rgba(0,0,0,0.18)]"
          />
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
