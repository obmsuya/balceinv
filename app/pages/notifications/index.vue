<script setup lang="ts">
import { BellOff, CheckCheck, Eraser, PackageX, TriangleAlert, Volume2, VolumeX } from 'lucide-vue-next'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { StockNotification } from '~/composables/useNotifications'
import { notificationMessage, notificationPageSize, relativeTime } from '~/composables/useNotifications'

const {
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
} = useNotifications()
const { t } = useI18n()

const activeView = ref<'unread' | 'all'>('unread')
const pageOffset = ref(0)
const showClearDialog = ref(false)

const hasReadNotifications = computed(() => activeView.value === 'all' && notifications.value.some(notification => notification.is_read))

const reload = () => fetchNotifications(activeView.value === 'unread', pageOffset.value)

watch(activeView, () => {
  pageOffset.value = 0
  reload()
})

const goToPage = (nextOffset: number) => {
  pageOffset.value = Math.max(nextOffset, 0)
  reload()
}

const openProduct = async (notification: StockNotification) => {
  if (!notification.is_read) await markRead(notification.id)
  navigateTo({ path: '/products', query: { view: notification.product_id } })
}

const readEverything = async () => {
  await markAllRead()
  reload()
}

const confirmClear = async () => {
  await clearRead()
  showClearDialog.value = false
  reload()
}

onMounted(() => {
  loadSoundSetting()
  fetchUnreadCount()
  reload()
})
</script>

<template>
  <div class="container mx-auto flex max-w-3xl flex-col gap-6 py-2 sm:px-4 sm:py-6">
    <div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">{{ t('notifications.page.title') }}</h1>
        <p class="mt-1 text-muted-foreground">{{ t('notifications.page.subtitle') }}</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" @click="toggleSound">
          <Volume2 v-if="soundEnabled" />
          <VolumeX v-else />
          {{ soundEnabled ? t('notifications.page.soundOn') : t('notifications.page.soundOff') }}
        </Button>
        <Button variant="outline" size="sm" :disabled="!unreadCount" @click="readEverything">
          <CheckCheck />
          {{ t('notifications.page.markAllRead') }}
        </Button>
        <Button v-if="hasReadNotifications" variant="outline" size="sm" @click="showClearDialog = true">
          <Eraser />
          {{ t('notifications.page.clearRead') }}
        </Button>
      </div>
    </div>

    <Tabs v-model="activeView">
      <TabsList>
        <TabsTrigger value="unread">
          {{ t('notifications.page.unread') }}
          <Badge v-if="unreadCount" variant="secondary" class="ml-1 tabular-nums">{{ unreadCount }}</Badge>
        </TabsTrigger>
        <TabsTrigger value="all">{{ t('common.states.all') }}</TabsTrigger>
      </TabsList>
    </Tabs>

    <div v-if="loading && !notifications.length" class="flex flex-col gap-2">
      <Skeleton v-for="skeletonRow in 4" :key="skeletonRow" class="h-16 w-full" />
    </div>

    <Card v-else-if="!notifications.length">
      <CardContent class="flex flex-col items-center gap-2 py-12 text-center">
        <BellOff class="size-10 text-muted-foreground/50" />
        <p class="font-medium">{{ activeView === 'unread' ? t('notifications.page.caughtUp') : t('notifications.page.empty') }}</p>
        <p class="text-sm text-muted-foreground">{{ t('notifications.page.explainer') }}</p>
      </CardContent>
    </Card>

    <div v-else class="flex flex-col gap-2">
      <div
        v-for="notification in notifications"
        :key="notification.id"
        class="flex items-start gap-3 rounded-lg border p-4"
        :class="notification.is_read ? 'opacity-70' : 'bg-muted/30'"
      >
        <span
          class="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full"
          :class="notification.kind === 'out_of_stock' ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-600'"
        >
          <PackageX v-if="notification.kind === 'out_of_stock'" class="size-4" />
          <TriangleAlert v-else class="size-4" />
        </span>
        <button type="button" class="min-w-0 flex-1 text-left" @click="openProduct(notification)">
          <span class="block font-medium">{{ notificationMessage(notification) }}</span>
          <span class="block text-sm text-muted-foreground">
            {{ relativeTime(notification.created_at) }} · {{ t('notifications.page.nowQuantity', { quantity: notification.current_quantity, unit: notification.unit }) }}
          </span>
        </button>
        <Button v-if="!notification.is_read" variant="ghost" size="sm" class="shrink-0" @click="markRead(notification.id)">{{ t('notifications.page.markRead') }}</Button>
      </div>
    </div>

    <div v-if="totalNotifications > notificationPageSize" class="flex justify-end gap-2">
      <Button variant="outline" size="sm" :disabled="pageOffset === 0 || loading" @click="goToPage(pageOffset - notificationPageSize)">{{ t('common.pagination.previous') }}</Button>
      <Button variant="outline" size="sm" :disabled="pageOffset + notificationPageSize >= totalNotifications || loading" @click="goToPage(pageOffset + notificationPageSize)">{{ t('common.pagination.next') }}</Button>
    </div>

    <AlertDialog v-model:open="showClearDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{{ t('notifications.page.clearDialog.title') }}</AlertDialogTitle>
          <AlertDialogDescription>{{ t('notifications.page.clearDialog.description') }}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{{ t('common.actions.cancel') }}</AlertDialogCancel>
          <AlertDialogAction @click="confirmClear">{{ t('notifications.page.clearDialog.confirm') }}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
