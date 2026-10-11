<script setup lang="ts">
import { BadgeCheck, ClipboardList, LifeBuoy, LogOut, Menu, Store } from 'lucide-vue-next'
import { Toaster } from '@/components/ui/sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cachedBrandColor, clearThemeColor, faltasiNavy, setThemeColor } from '~/utils/brandTheme'

const { t } = useI18n()
const route = useRoute()
const { staff, signOut } = useAdmin()
const sidebarCollapsed = useState('admin-sidebar-collapsed', () => false)

const navigationGroups = computed(() => [
  {
    label: t('admin.nav.groupShops'),
    items: [
      { path: '/admin', label: t('admin.nav.shops'), icon: Store, isVisible: true },
      { path: '/admin/licences', label: t('admin.nav.licences'), icon: BadgeCheck, isVisible: true },
      { path: '/admin/support', label: t('admin.nav.support'), icon: LifeBuoy, isVisible: true },
    ],
  },
  {
    label: t('admin.nav.groupTeam'),
    items: [
      { path: '/admin/audit', label: t('admin.nav.audit'), icon: ClipboardList, isVisible: staff.value?.role === 'admin' },
    ],
  },
].map(group => ({ ...group, items: group.items.filter(item => item.isVisible) })).filter(group => group.items.length))

const isActive = (path: string) => (path === '/admin' ? route.path === '/admin' || route.path.startsWith('/admin/shops') : route.path.startsWith(path))
const initials = computed(() => (staff.value?.name ?? '?').split(' ').map(part => part[0]).join('').toUpperCase().slice(0, 2))

watch(() => route.path, () => {
  if (window.matchMedia('(max-width: 767px)').matches) sidebarCollapsed.value = true
})

onMounted(() => {
  setThemeColor(faltasiNavy)
  if (window.matchMedia('(max-width: 767px)').matches) sidebarCollapsed.value = true
})

onBeforeUnmount(() => {
  const shopColor = cachedBrandColor()
  if (shopColor) setThemeColor(shopColor)
  else clearThemeColor()
})
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <header class="fixed left-0 right-0 top-0 z-50 h-16 border-b bg-background">
      <div class="flex h-full items-center justify-between gap-4 px-4">
        <div class="flex min-w-0 items-center gap-3">
          <button
            type="button"
            :aria-label="t('nav.header.toggleNavigation')"
            class="flex size-9 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-accent"
            @click="sidebarCollapsed = !sidebarCollapsed"
          >
            <Menu class="size-5" />
          </button>
          <NuxtLink to="/admin" class="flex min-w-0 items-center gap-2.5">
            <img src="/faltasi-icon.png" alt="Faltasi" class="size-8 shrink-0 rounded-md">
            <div class="hidden min-w-0 flex-col sm:flex">
              <span class="text-base font-semibold leading-tight">{{ t('admin.title') }}</span>
              <span class="text-[10px] font-semibold uppercase leading-tight tracking-[0.2em] text-[#8A6420] dark:text-[#D6A24F]">{{ t('admin.nav.teamOnly') }}</span>
            </div>
          </NuxtLink>
        </div>
        <Button variant="ghost" size="icon" :aria-label="t('admin.nav.signOut')" @click="signOut"><LogOut class="size-5" /></Button>
      </div>
    </header>

    <div class="flex flex-1 pt-16">
      <aside
        :class="[
          'fixed bottom-0 left-0 top-16 z-40 border-r bg-background transition-all duration-200',
          sidebarCollapsed ? 'w-16 -translate-x-full md:translate-x-0' : 'w-64 shadow-lg md:shadow-none',
        ]"
      >
        <div class="flex h-full flex-col p-3">
          <div class="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain">
            <template v-for="(group, groupIndex) in navigationGroups" :key="group.label">
              <Separator v-if="groupIndex > 0" />
              <div>
                <p v-if="!sidebarCollapsed" class="mb-2 px-3 text-xs font-semibold uppercase text-muted-foreground">{{ group.label }}</p>
                <NuxtLink
                  v-for="item in group.items"
                  :key="item.path"
                  :to="item.path"
                  :class="[
                    'relative flex h-10 w-full items-center rounded-md transition-colors hover:bg-accent',
                    sidebarCollapsed ? 'justify-center px-2' : 'justify-start px-3',
                    isActive(item.path) ? 'bg-[#D6A24F]/15 font-semibold text-foreground before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full before:bg-[#D6A24F]' : '',
                  ]"
                >
                  <component :is="item.icon" class="size-4 shrink-0" :class="[{ 'mr-3': !sidebarCollapsed }, isActive(item.path) ? 'text-[#8A6420] dark:text-[#D6A24F]' : '']" />
                  <span v-if="!sidebarCollapsed" class="text-sm font-medium">{{ item.label }}</span>
                </NuxtLink>
              </div>
            </template>
          </div>

          <div class="border-t pt-3">
            <div v-if="!sidebarCollapsed && staff" class="flex items-center gap-3 px-3 py-2">
              <Avatar class="size-8">
                <AvatarFallback class="rounded-full bg-[#00113A] text-xs text-[#D6A24F]">{{ initials }}</AvatarFallback>
              </Avatar>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium">{{ staff.name }}</p>
                <p class="truncate text-xs text-muted-foreground">{{ t(`admin.roles.${staff.role}`) }}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main :class="['min-w-0 flex-1 p-4 transition-all duration-200 md:p-6', sidebarCollapsed ? 'md:ml-16' : 'md:ml-64']">
        <slot />
      </main>
    </div>
    <Toaster />
  </div>
</template>
