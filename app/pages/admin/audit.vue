<script setup lang="ts">
import DataTable from '@/components/admin/DataTable.vue'
import { auditColumns } from '@/components/admin/columns'
import type { AdminAuditEntry } from '@/composables/useAdmin'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const { t } = useI18n()
const { fetchAudit } = useAdmin()
useHead({ title: computed(() => t('admin.audit.title')) })

const loading = ref(true)
const entries = ref<AdminAuditEntry[]>([])

onMounted(async () => {
  entries.value = await fetchAudit()
  loading.value = false
})
</script>

<template>
  <div class="flex flex-col gap-5">
    <div>
      <h1 class="text-2xl font-bold tracking-tight">{{ t('admin.audit.title') }}</h1>
      <p class="mt-1 text-sm text-muted-foreground">{{ t('admin.audit.subtitle') }}</p>
    </div>
    <DataTable :columns="auditColumns" :data="entries" :loading="loading" :page-size="50" :empty-text="t('admin.audit.empty')" />
  </div>
</template>
