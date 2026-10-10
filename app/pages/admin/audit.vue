<script setup lang="ts">
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { AdminAuditEntry } from '@/composables/useAdmin'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const { t, formatDateTime } = useI18n()
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
    <div class="overflow-hidden rounded-lg border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{{ t('admin.audit.when') }}</TableHead>
            <TableHead>{{ t('admin.audit.who') }}</TableHead>
            <TableHead>{{ t('admin.audit.action') }}</TableHead>
            <TableHead class="hidden md:table-cell">{{ t('admin.audit.business') }}</TableHead>
            <TableHead class="hidden lg:table-cell">{{ t('admin.audit.details') }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="loading"><TableCell colspan="5"><Skeleton class="h-6 w-full" /></TableCell></TableRow>
          <TableRow v-else-if="!entries.length"><TableCell colspan="5" class="py-10 text-center text-muted-foreground">{{ t('admin.audit.empty') }}</TableCell></TableRow>
          <TableRow v-for="entry in entries" v-else :key="entry.id">
            <TableCell class="whitespace-nowrap text-sm text-muted-foreground">{{ formatDateTime(entry.created_at) }}</TableCell>
            <TableCell class="text-sm font-medium">{{ entry.staff_name }}</TableCell>
            <TableCell class="text-sm">{{ t(`admin.audit.actions.${entry.action}`) }}</TableCell>
            <TableCell class="hidden text-sm md:table-cell">
              <NuxtLink v-if="entry.company_id" :to="`/admin/shops/${entry.company_id}`" class="hover:underline">{{ entry.company_name }}</NuxtLink>
              <span v-else class="text-muted-foreground">—</span>
            </TableCell>
            <TableCell class="hidden max-w-xs truncate text-sm text-muted-foreground lg:table-cell">{{ entry.details }}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>
</template>
