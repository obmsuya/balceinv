<script setup lang="ts">
import { CheckCircle2, Loader2, Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useClearData } from '~/composables/useClearData'

const emit = defineEmits<{
  cancel: []
  'update:busy': [isBusy: boolean]
}>()

const reloadAfterClearMilliseconds = 1500

const { t } = useI18n()
const { user } = useAuth()
const { isDesktopInstall } = usePlatform()
const { clearing, clearError, clearBusinessData } = useClearData()

const typedName = ref('')
const password = ref('')
const isDone = ref(false)

const businessName = computed(() => user.value?.company_name ?? '')
const keptShopName = computed(() => user.value?.shops.find(shop => shop.id === user.value?.shop_id)?.name ?? '')
const normalized = (name: string) => name.trim().split(/\s+/).join(' ').toLowerCase()
const nameMatches = computed(() => businessName.value !== '' && normalized(typedName.value) === normalized(businessName.value))
const canConfirm = computed(() => nameMatches.value && password.value !== '' && !clearing.value && !isDone.value)
const isBusy = computed(() => clearing.value || isDone.value)

watch(isBusy, busy => emit('update:busy', busy))

const confirmClear = async () => {
  if (!canConfirm.value) return
  const clearResult = await clearBusinessData(typedName.value, password.value)
  if (!clearResult) return
  isDone.value = true
  setTimeout(() => window.location.assign('/dashboard'), reloadAfterClearMilliseconds)
}
</script>

<template>
  <form class="flex flex-col gap-4" @submit.prevent="confirmClear">
    <div class="grid gap-3 text-sm sm:grid-cols-2">
      <div class="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
        <p class="font-medium text-destructive">{{ t('clearData.removes.title') }}</p>
        <ul class="mt-1.5 list-disc space-y-1 pl-4 text-muted-foreground">
          <li>{{ t('clearData.removes.items') }}</li>
          <li>{{ t('clearData.removes.sales') }}</li>
          <li>{{ t('clearData.removes.suppliers') }}</li>
          <li>{{ t('clearData.removes.books') }}</li>
          <li>{{ t('clearData.removes.shops', { shop: keptShopName }) }}</li>
          <li>{{ t('clearData.removes.staff') }}</li>
        </ul>
      </div>
      <div class="rounded-lg border bg-muted/30 p-3">
        <p class="font-medium">{{ t('clearData.keeps.title') }}</p>
        <p class="mt-1.5 text-muted-foreground">{{ t('clearData.keeps.items') }}</p>
      </div>
    </div>

    <p v-if="isDesktopInstall" class="text-xs text-muted-foreground">{{ t('clearData.dialog.backupFirst') }}</p>

    <div class="flex flex-col gap-1.5">
      <Label for="clear-data-name">{{ t('clearData.dialog.typeName') }}</Label>
      <Input
        id="clear-data-name"
        v-model="typedName"
        autocomplete="off"
        :placeholder="t('clearData.dialog.typeNameHint', { name: businessName })"
        :disabled="isBusy"
      />
    </div>
    <div class="flex flex-col gap-1.5">
      <Label for="clear-data-password">{{ t('clearData.dialog.password') }}</Label>
      <Input id="clear-data-password" v-model="password" type="password" autocomplete="current-password" :disabled="isBusy" />
    </div>

    <p v-if="clearError && !clearing" class="text-sm text-destructive" role="alert">{{ clearError }}</p>
    <p v-if="clearing" class="flex items-center gap-2 text-sm text-muted-foreground" role="status">
      <Loader2 class="size-4 animate-spin" />{{ t('clearData.dialog.clearing') }}
    </p>
    <p v-if="isDone" class="flex items-center gap-2 text-sm text-primary" role="status">
      <CheckCircle2 class="size-4" />{{ t('clearData.dialog.done') }}
    </p>

    <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <Button type="button" variant="outline" :disabled="isBusy" @click="emit('cancel')">{{ t('common.actions.cancel') }}</Button>
      <Button type="submit" variant="destructive" :disabled="!canConfirm">
        <Loader2 v-if="clearing" class="size-4 mr-2 animate-spin" />
        <Trash2 v-else class="size-4 mr-2" />
        {{ t('clearData.dialog.confirm') }}
      </Button>
    </div>
  </form>
</template>
