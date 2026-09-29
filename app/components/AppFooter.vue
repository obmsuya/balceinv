<template>
  <footer class="mt-auto border-t bg-background">
    <div class="container mx-auto flex flex-col items-center gap-2 px-4 py-6 md:flex-row md:justify-between">
      <p class="text-center text-sm text-muted-foreground md:text-left">
        © {{ currentYear }} {{ user?.company_name || 'Balce' }}. {{ t('nav.footer.rights') }}
      </p>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        @click="openSupport"
      >
        <LifeBuoy class="size-4" />
        {{ t('support.link') }}
      </button>
    </div>
    <SupportDialog />
  </footer>
</template>

<script setup lang="ts">
import { LifeBuoy } from 'lucide-vue-next'
import SupportDialog from '@/components/SupportDialog.vue'

const { user } = useAuth()
const { t } = useI18n()
const { openSupport } = useSupport()
const currentYear = new Date().getFullYear()
</script>
