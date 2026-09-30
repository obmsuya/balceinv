<script setup lang="ts">
import { isTauri } from '~/composables/usePlatform'
import { Bell, BellOff, Compass, Fingerprint, LifeBuoy, Menu, Moon, PackageX, RefreshCw, Store, Sun, TriangleAlert, Volume2, VolumeX } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { assetUrl } from '~/composables/useSettings'
import { notificationMessage } from '~/composables/useNotifications'
import type { StockNotification } from '~/composables/useNotifications'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import UpdateIndicator from '@/components/UpdateIndicator.vue'
import SubscriptionIndicator from '@/components/license/SubscriptionIndicator.vue'
import ShopSwitcher from '@/components/ShopSwitcher.vue'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'
import { isLocale, supportedLocales } from '~/utils/translate'

const notificationPollMilliseconds = 30000
const popoverNotificationCount = 5

const colorMode = useColorMode()
const { t, locale, chooseLanguage, formatRelativeTime } = useI18n()

const selectLanguage = (chosenLocale: unknown) => {
  if (!isLocale(chosenLocale) || chosenLocale === locale.value) return
  chooseLanguage(chosenLocale)
}
const { user, logout } = useAuth()
const { canView } = usePermissions()
const { openSupport } = useSupport()
const { status: updateStatus, checkForUpdate } = useUpdater()
const { hardwareId, fetchHardwareId } = useLicense()
const runningInTauri = isTauri()
const route = useRoute()
const { replay: replayTour } = useTour()
const {
  notifications,
  unreadCount,
  soundEnabled,
  fetchNotifications,
  fetchUnreadCount,
  markRead,
  loadSoundSetting,
  toggleSound,
} = useNotifications()

const sidebarCollapsed = useState('sidebar-collapsed', () => false)
const showNotificationPopover = ref(false)
let notificationTimer: ReturnType<typeof setInterval> | null = null

const companyLogoSource = computed(() => assetUrl(user.value?.branding?.logo_url))
const canSeeNotifications = computed(() => canView('notifications'))
const unreadBadge = computed(() => ((unreadCount.value ?? 0) > 99 ? '99+' : String(unreadCount.value ?? 0)))

const initialsOf = (name: string): string =>
  name.split(' ').map(namePart => namePart[0]).join('').toUpperCase().slice(0, 2)

const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
  try {
    localStorage.setItem('sidebar-collapsed', String(sidebarCollapsed.value))
  } catch {
  }
}

const handleCheckForUpdates = async () => {
  await checkForUpdate()
  if (updateStatus.value === 'available') navigateTo({ path: '/settings', query: { tab: 'updates' } })
}

const reloadApp = () => window.location.reload()

const copyHardwareId = async () => {
  if (!hardwareId.value) return
  await navigator.clipboard.writeText(hardwareId.value)
  toast.success(t('nav.header.hardwareIdCopied'))
}

const openNotification = async (notification: StockNotification) => {
  await markRead(notification.id)
  showNotificationPopover.value = false
  navigateTo({ path: '/products', query: { view: notification.product_id } })
}

const viewAllNotifications = () => {
  showNotificationPopover.value = false
  navigateTo('/notifications')
}

watch(showNotificationPopover, isOpen => {
  if (isOpen) fetchNotifications(true, 0, popoverNotificationCount)
})

onMounted(() => {
  const savedCollapsed = localStorage.getItem('sidebar-collapsed')
  const isPhoneWidth = window.matchMedia('(max-width: 767px)').matches
  if (isPhoneWidth) sidebarCollapsed.value = true
  else if (savedCollapsed !== null) sidebarCollapsed.value = savedCollapsed === 'true'

  fetchHardwareId()
  if (!canSeeNotifications.value) return
  loadSoundSetting()
  fetchUnreadCount()
  notificationTimer = setInterval(fetchUnreadCount, notificationPollMilliseconds)
})

onUnmounted(() => {
  if (notificationTimer) clearInterval(notificationTimer)
})
</script>

<template>
  <header class="fixed left-0 right-0 top-0 z-50 h-16 border-b bg-background">
    <div class="flex h-full items-center justify-between gap-4 px-4">
      <div class="flex min-w-0 items-center gap-3">
        <button
          type="button"
          :aria-label="t('nav.header.toggleNavigation')"
          class="flex size-9 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-accent"
          @click="toggleSidebar"
        >
          <Menu class="size-5" />
        </button>
        <div class="flex min-w-0 items-center gap-2.5">
          <div class="hidden size-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary text-primary-foreground sm:flex">
            <img v-if="companyLogoSource" :src="companyLogoSource" alt="" class="size-full bg-background object-contain">
            <Store v-else class="size-4" />
          </div>
          <span class="hidden truncate text-base font-semibold sm:block">{{ user?.company_name || 'Balce' }}</span>
        </div>
      </div>

      <div class="flex items-center gap-1 sm:gap-2">
        <ShopSwitcher />
        <SubscriptionIndicator />
        <UpdateIndicator />

        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="ghost" size="icon" class="hidden sm:inline-flex" :aria-label="t('nav.header.theme')">
              <Moon class="size-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Sun class="absolute size-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem @click="colorMode.preference = 'light'">{{ t('nav.header.light') }}</DropdownMenuItem>
            <DropdownMenuItem @click="colorMode.preference = 'dark'">{{ t('nav.header.dark') }}</DropdownMenuItem>
            <DropdownMenuItem @click="colorMode.preference = 'system'">{{ t('nav.header.system') }}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div class="hidden sm:block" data-tour="language">
          <LanguageSwitcher />
        </div>

        <Button variant="ghost" size="icon" class="hidden sm:inline-flex" :aria-label="t('nav.header.refresh')" @click="reloadApp">
          <RefreshCw class="size-5" />
        </Button>

        <template v-if="canSeeNotifications">
          <Button
            variant="ghost"
            size="icon"
            class="hidden sm:inline-flex"
            :aria-label="soundEnabled ? t('nav.header.muteSound') : t('nav.header.unmuteSound')"
            @click="toggleSound"
          >
            <Volume2 v-if="soundEnabled" class="size-5" />
            <VolumeX v-else class="size-5" />
          </Button>

          <Popover v-model:open="showNotificationPopover">
            <PopoverTrigger as-child>
              <Button variant="ghost" size="icon" class="relative" data-tour="notifications" :aria-label="t('nav.header.notifications')">
                <Bell class="size-5" />
                <Badge v-if="unreadCount" variant="destructive" class="absolute -right-1 -top-1 h-5 min-w-5 justify-center px-1 text-xs tabular-nums">
                  {{ unreadBadge }}
                </Badge>
              </Button>
            </PopoverTrigger>
            <PopoverContent class="w-80 p-0" align="end">
              <div class="flex items-center justify-between p-4">
                <h4 class="font-semibold">{{ t('nav.header.notifications') }}</h4>
                <Badge v-if="unreadCount" variant="secondary">{{ t('nav.header.newCount', { count: unreadCount }) }}</Badge>
              </div>
              <Separator />
              <ScrollArea class="max-h-96">
                <div v-if="!notifications.length" class="flex flex-col items-center gap-2 p-8 text-center">
                  <BellOff class="size-8 text-muted-foreground/50" />
                  <p class="text-sm text-muted-foreground">{{ t('nav.header.nothingNew') }}</p>
                </div>
                <div v-else class="divide-y">
                  <button
                    v-for="notification in notifications"
                    :key="notification.id"
                    type="button"
                    class="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-accent"
                    @click="openNotification(notification)"
                  >
                    <span
                      class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full"
                      :class="notification.kind === 'out_of_stock' ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-600'"
                    >
                      <PackageX v-if="notification.kind === 'out_of_stock'" class="size-4" />
                      <TriangleAlert v-else class="size-4" />
                    </span>
                    <span class="min-w-0 flex-1">
                      <span class="line-clamp-2 block text-sm font-medium">{{ notificationMessage(notification) }}</span>
                      <span class="block text-xs text-muted-foreground">{{ formatRelativeTime(notification.created_at) }}</span>
                    </span>
                  </button>
                </div>
              </ScrollArea>
              <Separator />
              <div class="p-2">
                <Button variant="ghost" class="w-full" @click="viewAllNotifications">{{ t('nav.header.seeAll') }}</Button>
              </div>
            </PopoverContent>
          </Popover>
        </template>

        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <button type="button" data-tour="account" class="flex items-center gap-2 rounded-md border-l px-2 py-1 pl-3 transition-colors hover:bg-accent">
              <Avatar class="size-9">
                <AvatarFallback>{{ user ? initialsOf(user.name) : 'GU' }}</AvatarFallback>
              </Avatar>
              <span class="hidden text-left text-sm md:block">
                <span class="block font-medium leading-none">{{ user?.name }}</span>
                <span class="mt-1 block text-xs text-muted-foreground">{{ user?.role }}</span>
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-56">
            <DropdownMenuLabel>
              <p class="text-sm font-medium">{{ user?.name }}</p>
              <p class="text-xs font-normal text-muted-foreground">{{ user?.email }}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuLabel class="text-xs font-normal text-muted-foreground sm:hidden">{{ t('common.language.label') }}</DropdownMenuLabel>
            <DropdownMenuRadioGroup class="sm:hidden" :model-value="locale" @update:model-value="selectLanguage">
              <DropdownMenuRadioItem v-for="supportedLocale in supportedLocales" :key="supportedLocale" :value="supportedLocale">
                {{ t(`common.language.${supportedLocale}`) }}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuLabel class="text-xs font-normal text-muted-foreground sm:hidden">{{ t('nav.header.theme') }}</DropdownMenuLabel>
            <DropdownMenuRadioGroup v-model="colorMode.preference" class="sm:hidden">
              <DropdownMenuRadioItem value="light">{{ t('nav.header.light') }}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">{{ t('nav.header.dark') }}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system">{{ t('nav.header.system') }}</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator class="sm:hidden" />
            <DropdownMenuItem @click="navigateTo('/settings')">{{ t('nav.header.settings') }}</DropdownMenuItem>
            <DropdownMenuItem v-if="runningInTauri" :disabled="updateStatus === 'checking'" @click="handleCheckForUpdates">
              {{ updateStatus === 'checking' ? t('nav.header.checkingUpdates') : t('nav.header.checkUpdates') }}
            </DropdownMenuItem>
            <DropdownMenuItem @click="openSupport"><LifeBuoy class="size-4" /> {{ t('support.menu') }}</DropdownMenuItem>
            <DropdownMenuItem @click="replayTour(route.path)"><Compass class="size-4" /> {{ t('tour.menu.showTour') }}</DropdownMenuItem>
            <DropdownMenuSeparator v-if="hardwareId" />
            <DropdownMenuItem v-if="hardwareId" class="flex-col items-start gap-0.5" @click="copyHardwareId">
              <span class="flex items-center gap-2 text-xs text-muted-foreground">
                <Fingerprint class="size-3" />
                {{ t('nav.header.hardwareId') }}
              </span>
              <span class="w-full truncate font-mono text-xs">{{ hardwareId.slice(0, 16) }}…</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem class="text-destructive focus:text-destructive" @click="logout">{{ t('nav.header.signOut') }}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  </header>
</template>
