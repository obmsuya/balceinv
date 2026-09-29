import { toast } from 'vue-sonner'

export type NotificationKind = 'low_stock' | 'out_of_stock'

export interface StockNotification {
  id: string
  kind: NotificationKind
  product_id: string
  product_name: string
  variant_label: string
  sku: string
  unit: string
  quantity: number
  min_stock: number
  current_quantity: number
  is_read: boolean
  created_at: string
  read_at: string | null
}

interface ApiEnvelope<Payload> {
  success: boolean
  message: string
  data: Payload
}

interface Page<Item> {
  items: Item[]
  total: number
  limit: number
  offset: number
}

export const notificationPageSize = 50

const soundSettingKey = 'notification-sound-enabled'

export const notificationMessage = (notification: StockNotification): string => {
  const productName = notification.variant_label ? `${notification.product_name} · ${notification.variant_label}` : notification.product_name
  if (notification.kind === 'out_of_stock') return `${productName} ran out`
  return `${productName} is running low (${notification.quantity} ${notification.unit} left)`
}

export const relativeTime = (isoDate: string): string => {
  const elapsedMinutes = Math.floor((Date.now() - new Date(isoDate).getTime()) / 60000)
  if (elapsedMinutes < 1) return 'Just now'
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`
  const elapsedHours = Math.floor(elapsedMinutes / 60)
  if (elapsedHours < 24) return `${elapsedHours}h ago`
  return new Date(isoDate).toLocaleDateString()
}

let audioContext: AudioContext | null = null

const playChime = () => {
  try {
    const AudioContextClass = window.AudioContext ?? (window as any).webkitAudioContext
    if (!AudioContextClass) return
    audioContext ??= new AudioContextClass()
    const beep = (frequency: number, startSeconds: number) => {
      const oscillator = audioContext!.createOscillator()
      const gain = audioContext!.createGain()
      oscillator.connect(gain)
      gain.connect(audioContext!.destination)
      oscillator.frequency.value = frequency
      gain.gain.value = 0.3
      oscillator.start(audioContext!.currentTime + startSeconds)
      oscillator.stop(audioContext!.currentTime + startSeconds + 0.2)
    }
    beep(800, 0)
    beep(1000, 0.25)
  } catch {
  }
}

export const useNotifications = () => {
  const { $apiFetch } = useNuxtApp()
  const apiFetch = $apiFetch as typeof $fetch

  const notifications = ref<StockNotification[]>([])
  const totalNotifications = ref(0)
  const unreadCount = useState<number | null>('notifications:unread', () => null)
  const soundEnabled = useState<boolean>('notifications:sound', () => true)
  const loading = ref(false)

  const fetchNotifications = async (unreadOnly: boolean, offset = 0, limit = notificationPageSize): Promise<void> => {
    loading.value = true
    try {
      const notificationPage = await apiFetch<ApiEnvelope<Page<StockNotification>>>('/api/notifications', {
        query: { unread: unreadOnly || undefined, limit, offset },
      })
      notifications.value = notificationPage.data.items
      totalNotifications.value = notificationPage.data.total
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to load notifications')
    } finally {
      loading.value = false
    }
  }

  const fetchUnreadCount = async (): Promise<void> => {
    try {
      const countResponse = await apiFetch<ApiEnvelope<{ count: number }>>('/api/notifications/unread-count')
      const hasNewNotification = unreadCount.value !== null && countResponse.data.count > unreadCount.value
      unreadCount.value = countResponse.data.count
      if (hasNewNotification && soundEnabled.value) playChime()
    } catch {
    }
  }

  const markRead = async (notificationId: string): Promise<void> => {
    try {
      const markResponse = await apiFetch<ApiEnvelope<{ changed: number }>>(`/api/notifications/${notificationId}/read`, { method: 'POST' })
      const readNotification = notifications.value.find(notification => notification.id === notificationId)
      if (readNotification) readNotification.is_read = true
      unreadCount.value = Math.max((unreadCount.value ?? 0) - markResponse.data.changed, 0)
    } catch (error: any) {
      toast.error(error?.data?.message || 'Could not mark it as read')
    }
  }

  const markAllRead = async (): Promise<void> => {
    try {
      const markResponse = await apiFetch<ApiEnvelope<{ changed: number }>>('/api/notifications/read-all', { method: 'POST' })
      notifications.value.forEach(notification => { notification.is_read = true })
      unreadCount.value = 0
      toast.success(markResponse.message)
    } catch (error: any) {
      toast.error(error?.data?.message || 'Could not mark them as read')
    }
  }

  const clearRead = async (): Promise<void> => {
    try {
      const clearResponse = await apiFetch<ApiEnvelope<{ changed: number }>>('/api/notifications/read', { method: 'DELETE' })
      notifications.value = notifications.value.filter(notification => !notification.is_read)
      totalNotifications.value = Math.max(totalNotifications.value - clearResponse.data.changed, 0)
      toast.success(clearResponse.message)
    } catch (error: any) {
      toast.error(error?.data?.message || 'Could not clear them')
    }
  }

  const loadSoundSetting = () => {
    try {
      const savedSetting = localStorage.getItem(soundSettingKey)
      if (savedSetting !== null) soundEnabled.value = savedSetting === 'true'
    } catch {
    }
  }

  const toggleSound = () => {
    soundEnabled.value = !soundEnabled.value
    try {
      localStorage.setItem(soundSettingKey, String(soundEnabled.value))
    } catch {
    }
    toast.success(soundEnabled.value ? 'Notification sound on' : 'Notification sound off')
  }

  return {
    notifications,
    totalNotifications,
    unreadCount,
    soundEnabled,
    loading,
    fetchNotifications,
    fetchUnreadCount,
    markRead,
    markAllRead,
    clearRead,
    loadSoundSetting,
    toggleSound,
  }
}
