import { isTauri } from '~/composables/usePlatform'

export interface SaveFilter {
  name: string
  extensions: string[]
}

export const saveFile = async (fileBytes: Uint8Array, fileName: string, filter: SaveFilter): Promise<string | null> => {
  if (isTauri()) {
    const { save } = await import('@tauri-apps/plugin-dialog')
    const savePath = await save({ defaultPath: fileName, filters: [filter] })
    if (!savePath) return null
    const { writeFile } = await import('@tauri-apps/plugin-fs')
    await writeFile(savePath, fileBytes)
    return savePath
  }

  const downloadUrl = URL.createObjectURL(new Blob([fileBytes]))
  const downloadLink = document.createElement('a')
  downloadLink.href = downloadUrl
  downloadLink.download = fileName
  downloadLink.click()
  URL.revokeObjectURL(downloadUrl)
  return fileName
}

export type ShareOutcome = { shared: true } | { shared: false; savedName: string | null; cancelled: boolean }

export const sharePdf = async (fileBytes: Uint8Array, fileName: string, title: string, filter: SaveFilter): Promise<ShareOutcome> => {
  const pdfFile = new File([fileBytes], fileName, { type: 'application/pdf' })
  const canShareFile = typeof navigator.canShare === 'function' && navigator.canShare({ files: [pdfFile] })
  if (canShareFile) {
    try {
      await navigator.share({ files: [pdfFile], title })
      return { shared: true }
    } catch (shareError: any) {
      if (shareError?.name === 'AbortError') return { shared: false, savedName: null, cancelled: true }
    }
  }
  return { shared: false, savedName: await saveFile(fileBytes, fileName, filter), cancelled: false }
}
