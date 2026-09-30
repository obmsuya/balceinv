<script setup lang="ts">
import { CircleCheck, FileUp, LoaderCircle, Monitor } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { MoveResult } from '@/composables/useBusinessMove'

const open = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
const { moving, moveFromDesktop } = useBusinessMove()

const fileInput = ref<HTMLInputElement | null>(null)
const chosenFile = ref<File | null>(null)
const moveResult = ref<MoveResult | null>(null)

const dialogOpen = computed({
  get: () => open.value,
  set: (isOpen: boolean) => {
    if (!isOpen && moving.value) return
    open.value = isOpen
  },
})

const chooseFile = (event: Event) => {
  const input = event.target as HTMLInputElement
  chosenFile.value = input.files?.[0] ?? null
}

const move = async () => {
  if (!chosenFile.value) return
  moveResult.value = await moveFromDesktop(chosenFile.value)
}

const goToSignIn = () => navigateTo('/login')
</script>

<template>
  <Dialog v-model:open="dialogOpen">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{{ moveResult ? t('setup.move.doneTitle', { name: moveResult.business_name }) : t('setup.move.title') }}</DialogTitle>
        <DialogDescription>{{ moveResult ? t('setup.move.doneBody') : t('setup.move.description') }}</DialogDescription>
      </DialogHeader>

      <div v-if="moveResult" class="flex flex-col gap-3">
        <div class="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
          <CircleCheck class="mt-0.5 size-5 shrink-0 text-primary" />
          <p>{{ t('setup.move.signInWith', { email: moveResult.owner_email }) }}</p>
        </div>
        <p class="text-sm text-muted-foreground">{{ t('setup.move.stopComputer') }}</p>
      </div>

      <div v-else class="flex flex-col gap-4">
        <ol class="flex list-decimal flex-col gap-2 pl-5 text-sm">
          <li>{{ t('setup.move.stepComputer') }}</li>
          <li>{{ t('setup.move.stepChoose') }}</li>
          <li>{{ t('setup.move.stepSignIn') }}</li>
        </ol>
        <input ref="fileInput" type="file" accept=".balce" class="hidden" @change="chooseFile">
        <button
          type="button"
          class="flex items-center gap-3 rounded-lg border border-dashed p-4 text-left text-sm transition-colors hover:bg-accent disabled:opacity-60"
          :disabled="moving"
          @click="fileInput?.click()"
        >
          <FileUp class="size-5 shrink-0 text-muted-foreground" />
          <span class="min-w-0">
            <span class="block font-medium">{{ chosenFile ? chosenFile.name : t('setup.move.chooseFile') }}</span>
            <span class="block text-xs text-muted-foreground">{{ chosenFile ? t('setup.move.chooseAnother') : t('setup.move.fileHint') }}</span>
          </span>
        </button>
        <p v-if="moving" class="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle class="size-4 animate-spin" />{{ t('setup.move.moving') }}
        </p>
      </div>

      <DialogFooter class="gap-2">
        <template v-if="moveResult">
          <Button class="w-full sm:w-auto" @click="goToSignIn">{{ t('setup.move.signIn') }}</Button>
        </template>
        <template v-else>
          <Button variant="outline" :disabled="moving" @click="open = false">{{ t('common.actions.cancel') }}</Button>
          <Button :disabled="!chosenFile || moving" @click="move">
            <Monitor />{{ moving ? t('setup.move.movingShort') : t('setup.move.moveButton') }}
          </Button>
        </template>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
