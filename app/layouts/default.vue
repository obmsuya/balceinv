<template>
  <div class="min-h-screen flex flex-col">
    <PaywallOverlay />
    <AppHeader />
    <div class="flex flex-1 pt-16">
      <CustomSidebar />
      <main
        :class="[
          'min-w-0 flex-1 p-4 transition-all duration-200 md:p-6',
          sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'
        ]"
      >
        <slot />
      </main>
      <Toaster v-if="!isHardLocked" />
    </div>
    <AppFooter />
  </div>
</template>

<script setup>
import 'vue-sonner/style.css'
import { Toaster } from '@/components/ui/sonner'
import PaywallOverlay from '@/components/license/PaywallOverlay.vue'
import { useLicense } from '~/composables/useLicense'

const sidebarCollapsed = useState('sidebar-collapsed', () => false)
const { isHardLocked } = useLicense()

</script>