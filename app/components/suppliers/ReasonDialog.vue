<script setup lang="ts">
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

defineProps<{ title: string; description: string; confirmLabel: string; busy?: boolean }>()
const emit = defineEmits<{ confirm: [reason: string] }>()

const open = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
const reason = ref('')

watch(open, isOpen => {
  if (isOpen) reason.value = ''
})

const confirm = () => {
  const trimmedReason = reason.value.trim()
  if (!trimmedReason) {
    toast.error(t('suppliers.reason.required'))
    return
  }
  emit('confirm', trimmedReason)
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription>{{ description }}</DialogDescription>
      </DialogHeader>
      <div class="flex flex-col gap-1.5">
        <Label for="reason-text">{{ t('suppliers.reason.label') }}</Label>
        <Textarea id="reason-text" v-model="reason" :placeholder="t('suppliers.reason.placeholder')" maxlength="300" />
      </div>
      <DialogFooter>
        <Button variant="outline" @click="open = false">{{ t('common.actions.cancel') }}</Button>
        <Button variant="destructive" :disabled="busy" @click="confirm">{{ confirmLabel }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
