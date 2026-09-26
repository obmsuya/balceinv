<script setup lang="ts">
import { CreditCard, Wallet } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useLicense } from '@/composables/useLicense'
import { useAuth } from '@/composables/useAuth'

const {
  licenseStatus,
  isTrial,
  isInGracePeriod,
  isExpiringSoon,
  isHardLocked,
  openPaymentDialog,
} = useLicense()

const { user } = useAuth()

const showPanel = ref(false)
const currentUserCanManageBilling = computed(() => user.value?.role === 'Admin')
const indicatorIsVisible = computed(() => !isHardLocked.value && (isTrial.value || isInGracePeriod.value || isExpiringSoon.value))

const daysLeft = computed(() => {
  const days = isInGracePeriod.value
    ? licenseStatus.value?.grace_days_remaining
    : licenseStatus.value?.days_remaining
  return Math.max(0, days ?? 0)
})

const daysLeftText = computed(() => (daysLeft.value === 1 ? '1 day' : `${daysLeft.value} days`))

const expiryDate = computed(() => {
  const expiresAt = licenseStatus.value?.expires_at
  if (!expiresAt) return ''
  return new Date(expiresAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })
})

const panelTitle = computed(() => {
  if (isInGracePeriod.value) return 'Subscription ended'
  if (isTrial.value) return 'Free trial'
  return 'Subscription ends soon'
})

const panelMessage = computed(() => {
  if (isInGracePeriod.value) return `${daysLeftText.value} left to renew before the POS locks.`
  if (isTrial.value) return `${daysLeftText.value} left in the free trial.`
  return `Ends in ${daysLeftText.value}${expiryDate.value ? `, on ${expiryDate.value}` : ''}.`
})

const actionLabel = computed(() => (isTrial.value ? 'Subscribe' : 'Renew now'))
const badgeClass = computed(() => (isInGracePeriod.value ? 'bg-destructive text-white' : 'bg-amber-500 text-white'))

const startPayment = () => {
  showPanel.value = false
  openPaymentDialog()
}

watch(isInGracePeriod, (inGrace) => {
  if (!inGrace) return
  toast.warning('Subscription ended', {
    description: `${daysLeftText.value} left to renew before the POS locks.`,
    action: currentUserCanManageBilling.value ? { label: 'Renew', onClick: startPayment } : undefined,
    duration: 10000,
  })
}, { immediate: true })
</script>

<template>
  <Popover v-if="indicatorIsVisible" v-model:open="showPanel">
    <PopoverTrigger as-child>
      <Button
        variant="ghost"
        size="icon"
        class="relative"
        :title="panelTitle"
        :aria-label="`${panelTitle}: ${daysLeftText} left`"
      >
        <CreditCard class="h-5 w-5" />
        <span
          class="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-background px-0.5 text-[10px] font-bold leading-none tabular-nums"
          :class="badgeClass"
        >{{ daysLeft > 99 ? '99+' : daysLeft }}</span>
      </Button>
    </PopoverTrigger>

    <PopoverContent align="end" class="w-72 p-0 overflow-hidden">
      <div class="flex items-start gap-3 p-4">
        <span
          class="flex size-9 shrink-0 items-center justify-center rounded-lg"
          :class="isInGracePeriod ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'"
        >
          <CreditCard class="size-4" />
        </span>
        <div class="min-w-0">
          <p class="text-sm font-semibold">{{ panelTitle }}</p>
          <p class="text-xs text-muted-foreground mt-0.5">{{ panelMessage }}</p>
        </div>
      </div>
      <div class="border-t bg-muted/30 px-4 py-3">
        <Button v-if="currentUserCanManageBilling" size="sm" class="w-full" @click="startPayment">
          <Wallet class="size-4 mr-1.5" />{{ actionLabel }}
        </Button>
        <p v-else class="text-xs text-muted-foreground text-center">Ask the owner or an admin to renew.</p>
      </div>
    </PopoverContent>
  </Popover>
</template>
