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
