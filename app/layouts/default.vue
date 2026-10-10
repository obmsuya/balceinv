<template>
  <div class="min-h-screen flex flex-col">
    <PaywallOverlay />
    <AppHeader class="print:hidden" />
    <div class="flex flex-1 pt-16 print:pt-0">
      <CustomSidebar class="print:hidden" />
      <main
        :class="[
          'min-w-0 flex-1 p-4 transition-all duration-200 md:p-6 print:!m-0 print:p-0',
          sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'
        ]"
      >
        <slot />
      </main>
      <Toaster v-if="!isHardLocked" />
    </div>
    <AppFooter class="print:hidden" />
  </div>
</template>

<script setup>
import { useEventListener } from '@vueuse/core'
import { Toaster } from '@/components/ui/sonner'
import PaywallOverlay from '@/components/license/PaywallOverlay.vue'
import { useLicense } from '~/composables/useLicense'

const sidebarCollapsed = useState('sidebar-collapsed', () => false)
const { isHardLocked } = useLicense()

const route = useRoute()
const { t } = useI18n()
const navigationSections = ['dashboard', 'pos', 'sales', 'orders', 'customers', 'products', 'stock', 'suppliers', 'discounts', 'money', 'reports', 'notifications', 'shops', 'users', 'roles', 'settings']
const pageTitle = computed(() => {
  const section = route.path.split('/')[1]
  return navigationSections.includes(section) ? t(`nav.items.${section}`) : ''
})
useHead({ title: pageTitle })
const { startIfNew, stop: stopTour } = useTour()
const { user, fetchCurrentUser } = useAuth()
const settingsRefreshMilliseconds = 60000
let lastSettingsRefresh = Date.now()

useEventListener(window, 'focus', () => {
  const isDue = Date.now() - lastSettingsRefresh > settingsRefreshMilliseconds
  if (!user.value || !isDue) return
  lastSettingsRefresh = Date.now()
  fetchCurrentUser().catch(() => {})
})
const pageSettleMilliseconds = 900
let tourTimer

onMounted(() => {
  watch(() => route.path, (path) => {
    stopTour()
    clearTimeout(tourTimer)
    tourTimer = setTimeout(() => {
      if (!isHardLocked.value) startIfNew(path)
    }, pageSettleMilliseconds)
  }, { immediate: true })
})

onUnmounted(() => {
  clearTimeout(tourTimer)
  stopTour()
})

</script>