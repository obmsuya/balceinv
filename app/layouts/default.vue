<template>
  <div class="min-h-screen flex flex-col">
    <PaywallOverlay />
    <AppHeader />
    <div class="flex flex-1 pt-16">
      <CustomSidebar />
      <main
        :class="[
          'flex-1 p-6 transition-all duration-200',
          sidebarCollapsed ? 'ml-16' : 'ml-64'
        ]"
      >
        <slot />
      </main>
      <Toaster />
    </div>
    <AppFooter />
  </div>
</template>

<script setup>
import 'vue-sonner/style.css'
import { Toaster } from '@/components/ui/sonner'
import PaywallOverlay from '@/components/license/PaywallOverlay.vue'
import { useAuth } from '~/composables/useAuth'
import { usePermissions } from '~/composables/usePermissions'

const sidebarCollapsed = useState('sidebar-collapsed', () => false)
const { user } = useAuth()
const { fetchUserPermissions } = usePermissions()

onMounted(async () => {
  if (user.value?.id) {
    await fetchUserPermissions(user.value.id)
  }
})
</script>