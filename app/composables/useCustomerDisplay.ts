import { isTauri } from '~/composables/usePlatform'
import { t } from '~/utils/i18n'

export interface CustomerDisplayLine {
  name: string
  quantity: number
  amount: string
}

export interface CustomerDisplayState {
  phase: 'idle' | 'cart' | 'paid'
  companyName: string
  logoUrl: string | null
  lines: CustomerDisplayLine[]
  itemCount: number
  total: string
  discount: string | null
  paid: string | null
  change: string | null
  updatedAt: number
}

export const customerDisplayStorageKey = 'balce:customer-display'
export const customerDisplayChannelName = 'balce:customer-display'
const displayWindowLabel = 'customer-display'

export const readCustomerDisplay = (): CustomerDisplayState | null => {
  try {
    return JSON.parse(localStorage.getItem(customerDisplayStorageKey) ?? 'null')
  } catch {
    return null
  }
}

export const useCustomerDisplay = () => {
  let displayChannel: BroadcastChannel | null = null

  const publish = (state: Omit<CustomerDisplayState, 'updatedAt'>) => {
    const stampedState: CustomerDisplayState = { ...state, updatedAt: Date.now() }
    try {
      localStorage.setItem(customerDisplayStorageKey, JSON.stringify(stampedState))
    } catch {
    }
    if (typeof BroadcastChannel === 'undefined') return
    displayChannel ??= new BroadcastChannel(customerDisplayChannelName)
    displayChannel.postMessage(stampedState)
  }

  const openDisplay = async () => {
    if (isTauri()) {
      const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow')
      const existingWindow = await WebviewWindow.getByLabel(displayWindowLabel)
      if (existingWindow) {
        await existingWindow.setFocus()
        return
      }
      new WebviewWindow(displayWindowLabel, { url: '/display', title: t('display.title'), width: 1024, height: 768 })
      return
    }
    const displayWindow = window.open('/display', displayWindowLabel, 'popup,width=1024,height=768')
    displayWindow?.focus()
  }

  onBeforeUnmount(() => displayChannel?.close())

  return { publish, openDisplay }
}
