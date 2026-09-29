<script setup lang="ts">
import { FileSpreadsheet, FileText } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import type { MoneyReport } from '@/composables/useMoney'

const props = defineProps<{ report: MoneyReport; query: Record<string, string | undefined> }>()

const { t } = useI18n()
const { exportReport, exporting } = useMoney()
</script>

<template>
  <div class="flex gap-2">
    <Button variant="outline" size="sm" :disabled="exporting !== null" @click="exportReport(props.report, 'xlsx', props.query)">
      <FileSpreadsheet />
      {{ exporting === 'xlsx' ? t('common.actions.saving') : t('money.reports.excel') }}
    </Button>
    <Button variant="outline" size="sm" :disabled="exporting !== null" @click="exportReport(props.report, 'pdf', props.query)">
      <FileText />
      {{ exporting === 'pdf' ? t('common.actions.saving') : t('money.reports.pdf') }}
    </Button>
  </div>
</template>
