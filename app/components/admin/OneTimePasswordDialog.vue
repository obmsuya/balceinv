<script setup lang="ts">
import { Check, Copy } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { AdminOneTimePassword } from '@/composables/useAdmin'

const props = defineProps<{ result: AdminOneTimePassword | null }>()
const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const isCopied = ref(false)

watch(() => props.result, () => { isCopied.value = false })

const copyPassword = async () => {
  if (!props.result) return
  try {
    await navigator.clipboard.writeText(props.result.one_time_password)
    isCopied.value = true
  } catch {
  }
}
</script>

<template>
  <Dialog :open="result !== null" @update:open="isOpen => { if (!isOpen) emit('close') }">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ t('admin.oneTime.title') }}</DialogTitle>
        <DialogDescription>{{ t('admin.oneTime.body', { email: result?.email ?? '' }) }}</DialogDescription>
      </DialogHeader>
      <div class="flex items-center gap-2 rounded-md border bg-muted/40 p-3">
        <code class="flex-1 select-all break-all font-mono text-base">{{ result?.one_time_password }}</code>
        <Button variant="outline" size="sm" @click="copyPassword">
          <component :is="isCopied ? Check : Copy" />
          {{ isCopied ? t('admin.oneTime.copied') : t('admin.oneTime.copy') }}
        </Button>
      </div>
      <DialogFooter>
        <Button @click="emit('close')">{{ t('admin.oneTime.done') }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
