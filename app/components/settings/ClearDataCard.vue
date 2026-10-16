<script setup lang="ts">
import { Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import ClearDataDialog from './ClearDataDialog.vue'

const { t } = useI18n()
const dialogOpen = ref(false)
</script>

<template>
  <Card id="clear-data" class="border-destructive/40">
    <CardHeader class="pb-3">
      <CardTitle class="text-base text-destructive">{{ t('clearData.card.title') }}</CardTitle>
      <CardDescription>{{ t('clearData.card.description') }}</CardDescription>
    </CardHeader>
    <CardContent class="flex justify-end">
      <Button variant="destructive" @click="dialogOpen = true">
        <Trash2 class="size-4 mr-2" />{{ t('clearData.card.button') }}
      </Button>
    </CardContent>
    <ClearDataDialog v-model:open="dialogOpen" />
  </Card>
</template>
