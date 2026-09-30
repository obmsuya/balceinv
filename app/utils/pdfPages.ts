import { getDocument, GlobalWorkerOptions, type PDFDocumentLoadingTask, type PDFDocumentProxy } from 'pdfjs-dist/legacy/build/pdf.mjs'
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'

GlobalWorkerOptions.workerSrc = pdfWorkerUrl

export type PdfDocument = PDFDocumentProxy
export type PdfLoading = PDFDocumentLoadingTask

export const openPdf = (pdfBytes: Uint8Array): PdfLoading =>
  getDocument({ data: pdfBytes.slice(), isEvalSupported: false })

export const drawPdfPage = async (pdfDocument: PdfDocument, pageNumber: number, canvas: HTMLCanvasElement, cssWidth: number): Promise<void> => {
  const pdfPage = await pdfDocument.getPage(pageNumber)
  const naturalViewport = pdfPage.getViewport({ scale: 1 })
  const pixelRatio = window.devicePixelRatio || 1
  const viewport = pdfPage.getViewport({ scale: (cssWidth / naturalViewport.width) * pixelRatio })
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)
  canvas.style.width = `${cssWidth}px`
  canvas.style.height = `${Math.floor(viewport.height / pixelRatio)}px`
  await pdfPage.render({ canvas, viewport }).promise
}

export const pdfPageImages = async (pdfDocument: PdfDocument): Promise<string[]> => {
  const printScale = 2
  const pageImages: string[] = []
  for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber++) {
    const pdfPage = await pdfDocument.getPage(pageNumber)
    const viewport = pdfPage.getViewport({ scale: printScale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)
    await pdfPage.render({ canvas, viewport }).promise
    pageImages.push(canvas.toDataURL('image/png'))
  }
  return pageImages
}
