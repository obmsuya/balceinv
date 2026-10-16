<script setup lang="ts">
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import ClearDataForm from './ClearDataForm.vue'

const open = defineModel<boolean>('open', { required: true })

const { t } = useI18n()
const isBusy = ref(false)

const changeOpen = (nextOpen: boolean) => {
  if (isBusy.value) return
  open.value = nextOpen
}

const keepOpenWhileBusy = (event: Event) => {
  if (isBusy.value) event.preventDefault()
}
</script>

<template>
  <Dialog :open="open" @update:open="changeOpen">
    <DialogContent class="sm:max-w-xl" @escape-key-down="keepOpenWhileBusy" @interact-outside="keepOpenWhileBusy">
      <DialogHeader>
        <DialogTitle>{{ t('clearData.dialog.title') }}</DialogTitle>
        <DialogDescription>{{ t('clearData.dialog.description') }}</DialogDescription>
      </DialogHeader>
      <ClearDataForm v-if="open" @update:busy="isBusy = $event" @cancel="changeOpen(false)" />
    </DialogContent>
  </Dialog>
</template>
