<script setup lang="ts">
import { FileText, Loader2 } from 'lucide-vue-next'
import { drawPdfPage, openPdf, type PdfLoading } from '~/utils/pdfPages'

const props = defineProps<{ pdfBytes: Uint8Array | null; loading: boolean }>()

const { t } = useI18n()

const pagesArea = ref<HTMLElement | null>(null)
const pageCanvases = ref<HTMLCanvasElement[]>([])
const pageCount = ref(0)
const drawFailed = ref(false)
let pdfLoading: PdfLoading | null = null
let drawGeneration = 0

const draw = async (): Promise<void> => {
  const generation = ++drawGeneration
  pdfLoading?.destroy()
  pdfLoading = null
  drawFailed.value = false
  if (!props.pdfBytes) {
    pageCount.value = 0
    return
  }
  try {
    pdfLoading = openPdf(props.pdfBytes)
    const pdfDocument = await pdfLoading.promise
    if (generation !== drawGeneration) return
    pageCount.value = pdfDocument.numPages
    await nextTick()
    const pageWidth = Math.max((pagesArea.value?.clientWidth ?? 400) - 2, 240)
    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber++) {
      if (generation !== drawGeneration) return
      const pageCanvas = pageCanvases.value[pageNumber - 1]
      if (pageCanvas) await drawPdfPage(pdfDocument, pageNumber, pageCanvas, pageWidth)
    }
  } catch {
    drawFailed.value = true
  }
}

watch(() => props.pdfBytes, draw)
onMounted(draw)
onBeforeUnmount(() => {
  drawGeneration++
  pdfLoading?.destroy()
})
</script>

<template>
  <div ref="pagesArea" class="relative flex min-h-80 flex-col gap-3">
    <div v-if="!pdfBytes && !loading" class="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center">
      <FileText class="size-10 text-muted-foreground/50" />
      <p class="font-medium">{{ t('invoices.preview.emptyTitle') }}</p>
      <p class="max-w-xs text-sm text-muted-foreground">{{ t('invoices.preview.emptyBody') }}</p>
    </div>
    <p v-else-if="drawFailed" class="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{{ t('invoices.preview.failed') }}</p>
    <canvas
      v-for="pageNumber in pageCount"
      :key="pageNumber"
      ref="pageCanvases"
      class="rounded-md border bg-white shadow-sm"
      :aria-label="t('invoices.preview.page', { page: pageNumber, pages: pageCount })"
    />
    <div v-if="loading" class="absolute inset-0 flex items-start justify-center bg-background/60 pt-16">
      <Loader2 class="size-6 animate-spin text-muted-foreground" />
    </div>
  </div>
</template>
