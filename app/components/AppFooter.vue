<template>
  <footer class="mt-auto border-t bg-background">
    <div class="container mx-auto px-4 py-6">
      <p class="text-center text-sm text-muted-foreground md:text-left">
        © {{ currentYear }} {{ user?.company_name || 'Balce' }}. {{ t('nav.footer.rights') }}
      </p>
    </div>
  </footer>
</template>

<script setup lang="ts">
const { user } = useAuth()
const { t } = useI18n()
const currentYear = new Date().getFullYear()
</script>
