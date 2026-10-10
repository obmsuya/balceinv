<script setup lang="ts">
import { ClipboardList, LifeBuoy, LogOut, Store } from 'lucide-vue-next'
import { Toaster } from '@/components/ui/sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const { t } = useI18n()
const route = useRoute()
const { staff, signOut } = useAdmin()

const navigationItems = computed(() => [
  { path: '/admin', label: t('admin.nav.shops'), icon: Store, isVisible: true },
  { path: '/admin/support', label: t('admin.nav.support'), icon: LifeBuoy, isVisible: true },
  { path: '/admin/audit', label: t('admin.nav.audit'), icon: ClipboardList, isVisible: staff.value?.role === 'admin' },
].filter(item => item.isVisible))

const isActive = (path: string) => (path === '/admin' ? route.path === '/admin' || route.path.startsWith('/admin/shops') : route.path.startsWith(path))
</script>

<template>
  <div class="flex min-h-screen flex-col bg-muted/30">
    <header class="sticky top-0 z-40 border-b bg-background">
      <div class="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <NuxtLink to="/admin" class="flex items-center gap-2">
          <span class="text-sm font-bold tracking-[0.24em]">FALTASI</span>
          <Badge variant="secondary">{{ t('admin.nav.teamOnly') }}</Badge>
        </NuxtLink>
        <nav class="flex flex-1 items-center gap-1 overflow-x-auto">
          <NuxtLink
            v-for="item in navigationItems"
            :key="item.path"
            :to="item.path"
            class="inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-accent"
            :class="isActive(item.path) ? 'bg-accent font-medium text-foreground' : 'text-muted-foreground'"
          >
            <component :is="item.icon" class="size-4" />
            <span class="hidden sm:inline">{{ item.label }}</span>
          </NuxtLink>
        </nav>
        <div v-if="staff" class="flex items-center gap-2">
          <div class="hidden text-right leading-tight sm:block">
            <p class="text-sm font-medium">{{ staff.name }}</p>
            <p class="text-xs text-muted-foreground">{{ t(`admin.roles.${staff.role}`) }}</p>
          </div>
          <Button variant="ghost" size="icon" :aria-label="t('admin.nav.signOut')" @click="signOut"><LogOut /></Button>
        </div>
      </div>
    </header>
    <main class="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
      <slot />
    </main>
    <Toaster />
  </div>
</template>
