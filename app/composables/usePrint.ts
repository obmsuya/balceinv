import { toast } from 'vue-sonner'

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

  const printerEnabled = ref(false)
  const autoPrint = ref(false)
  const statusLoaded = ref(false)
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

  const printReceipt = async (saleId: number, openDrawer = false): Promise<boolean> => {
    try {
      await $apiFetch<ApiResponse<null>>(
        `${apiBase}/api/print/receipt`,
        {
          method: 'POST' as const,
          body: { sale_id: saleId, open_drawer: openDrawer },
          credentials: 'include' as const,
        },
      )
      toast.success('Receipt printed')
      return true
    } catch (error: any) {
      toast.error(error?.data?.message || 'Could not reach the printer')
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
      toast.error(error?.data?.message || 'Could not scan for printers')
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
      toast.success('Test print sent')
      return true
    } catch (error: any) {
      toast.error(error?.data?.message || 'Test print failed — check the connection')
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
    fetchDevices,
    testPrint,
  }
}