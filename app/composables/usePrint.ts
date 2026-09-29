import { toast } from 'vue-sonner'
import { apiErrorMessage, t } from '~/utils/i18n'
import { isTauri } from '~/composables/usePlatform'

interface PrinterStatus {
  enabled: boolean
  port: string
  paper_width: number
  open_drawer: boolean
  auto_print: boolean
}

export interface DetectedPrinter {
  port: string
  is_usb: boolean
  vendor_id: string
  product_id: string
  manufacturer: string
  product: string
}

interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

export const usePrint = () => {
  const { public: { apiBase } } = useRuntimeConfig()
  const { $apiFetch } = useNuxtApp()

  const printerEnabled = useState('print:enabled', () => false)
  const autoPrint = useState('print:auto', () => false)
  const statusLoaded = useState('print:loaded', () => false)
  const devices = ref<DetectedPrinter[]>([])
  const scanning = ref(false)
  const testingPort = ref(false)

  const fetchPrinterStatus = async (): Promise<void> => {
    try {
      const response = await $apiFetch<ApiResponse<PrinterStatus>>(
        `${apiBase}/api/print/status`,
        { credentials: 'include' as const },
      )
      printerEnabled.value = response.data.enabled
      autoPrint.value = response.data.auto_print
      statusLoaded.value = true
    } catch {
      printerEnabled.value = false
      autoPrint.value = false
      statusLoaded.value = true
    }
  }

  const openBrowserReceipt = (saleId: string, printAtOnce = true) => {
    window.open(`/receipts/${saleId}${printAtOnce ? '?print=1' : ''}`, '_blank', 'width=420,height=720')
  }

  const printSaleReceipt = async (saleId: string, openDrawer = false): Promise<void> => {
    if (isTauri() && !statusLoaded.value) await fetchPrinterStatus()
    const usesReceiptPrinter = isTauri() && printerEnabled.value
    if (!usesReceiptPrinter) {
      openBrowserReceipt(saleId)
      return
    }
    const isPrinted = await printReceipt(saleId, openDrawer)
    if (!isPrinted) openBrowserReceipt(saleId)
  }

  const printReceipt = async (saleId: string, openDrawer = false): Promise<boolean> => {
    try {
      await $apiFetch<ApiResponse<null>>(
        `${apiBase}/api/print/receipt`,
        {
          method: 'POST' as const,
          body: { sale_id: saleId, open_drawer: openDrawer },
          credentials: 'include' as const,
        },
      )
      toast.success(t('receipt.toasts.printed'))
      return true
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'receipt.toasts.printerUnreachable'))
      return false
    }
  }

  const fetchDevices = async (): Promise<void> => {
    scanning.value = true
    try {
      const response = await $apiFetch<ApiResponse<DetectedPrinter[]>>(
        `${apiBase}/api/print/devices`,
        { credentials: 'include' as const },
      )
      devices.value = response.data ?? []
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'receipt.toasts.scanFailed'))
    } finally {
      scanning.value = false
    }
  }

  const testPrint = async (port: string): Promise<boolean> => {
    testingPort.value = true
    try {
      await $apiFetch<ApiResponse<null>>(
        `${apiBase}/api/print/test`,
        {
          method: 'POST' as const,
          body: { port },
          credentials: 'include' as const,
        },
      )
      toast.success(t('receipt.toasts.testSent'))
      return true
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'receipt.toasts.testFailed'))
      return false
    } finally {
      testingPort.value = false
    }
  }

  return {
    printerEnabled,
    autoPrint,
    statusLoaded,
    devices,
    scanning,
    testingPort,
    fetchPrinterStatus,
    printReceipt,
    printSaleReceipt,
    openBrowserReceipt,
    fetchDevices,
    testPrint,
  }
}