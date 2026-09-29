<script setup lang="ts">
import { ShoppingBag, Store } from 'lucide-vue-next'
import type { CustomerDisplayState } from '~/composables/useCustomerDisplay'
import { customerDisplayChannelName, customerDisplayStorageKey, readCustomerDisplay } from '~/composables/useCustomerDisplay'
import { assetUrl } from '~/composables/useSettings'
import { applyBrandColor, cachedBrandColor } from '~/utils/brandTheme'
import { restoreSavedLocale } from '~/utils/i18n'

definePageMeta({ layout: false })
const { t, formatDate } = useI18n()
useHead({ title: computed(() => t('display.title')) })

const pollMilliseconds = 1000

const displayState = ref<CustomerDisplayState | null>(null)
const clockText = ref('')
const lineList = ref<HTMLElement | null>(null)
let displayChannel: BroadcastChannel | null = null
let pollTimer: ReturnType<typeof setInterval> | null = null

const phase = computed(() => displayState.value?.phase ?? 'idle')
const logoSource = computed(() => assetUrl(displayState.value?.logoUrl))

const showState = async (nextState: CustomerDisplayState | null) => {
  if (!nextState || nextState.updatedAt === displayState.value?.updatedAt) return
  displayState.value = nextState
  await nextTick()
  lineList.value?.scrollTo({ top: lineList.value.scrollHeight, behavior: 'smooth' })
}

const tickClock = () => {
  clockText.value = formatDate(new Date(), { hour: '2-digit', minute: '2-digit' })
}

const onStorage = (storageEvent: StorageEvent) => {
  if (storageEvent.key === customerDisplayStorageKey) showState(readCustomerDisplay())
  if (storageEvent.key === 'balce-locale') restoreSavedLocale()
}

onMounted(() => {
  applyBrandColor(cachedBrandColor())
  showState(readCustomerDisplay())
  tickClock()
  window.addEventListener('storage', onStorage)
  if (typeof BroadcastChannel !== 'undefined') {
    displayChannel = new BroadcastChannel(customerDisplayChannelName)
    displayChannel.onmessage = messageEvent => showState(messageEvent.data)
  }
  pollTimer = setInterval(() => {
    tickClock()
    showState(readCustomerDisplay())
  }, pollMilliseconds)
})

onUnmounted(() => {
  window.removeEventListener('storage', onStorage)
  displayChannel?.close()
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<template>
  <div class="flex h-dvh flex-col bg-background text-foreground">
    <header class="flex items-center justify-between gap-4 border-b px-8 py-4">
      <div class="flex min-w-0 items-center gap-3">
        <div class="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary text-primary-foreground">
          <img v-if="logoSource" :src="logoSource" alt="" class="size-full bg-background object-contain">
          <Store v-else class="size-6" />
        </div>
        <span class="truncate text-2xl font-semibold">{{ displayState?.companyName }}</span>
      </div>
      <span class="text-2xl tabular-nums text-muted-foreground">{{ clockText }}</span>
    </header>

    <main v-if="phase === 'idle'" class="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <ShoppingBag class="size-20 text-primary" />
      <p class="text-5xl font-bold">{{ t('display.welcome') }}</p>
      <p class="text-2xl text-muted-foreground">{{ t('display.itemsHint') }}</p>
    </main>

    <main v-else-if="phase === 'paid'" class="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <p class="text-5xl font-bold">{{ t('display.thanks') }}</p>
      <div class="grid grid-cols-2 gap-6 text-left">
        <div class="rounded-2xl bg-muted px-8 py-6">
          <p class="text-xl text-muted-foreground">{{ t('display.paid') }}</p>
          <p class="text-4xl font-bold tabular-nums">{{ displayState?.paid }}</p>
        </div>
        <div class="rounded-2xl bg-primary px-8 py-6 text-primary-foreground">
          <p class="text-xl opacity-80">{{ t('display.change') }}</p>
          <p class="text-4xl font-bold tabular-nums">{{ displayState?.change }}</p>
        </div>
      </div>
    </main>

    <main v-else class="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1fr_24rem]">
      <div ref="lineList" class="min-h-0 overflow-y-auto px-8 py-4">
        <div
          v-for="(displayLine, lineIndex) in displayState?.lines"
          :key="lineIndex"
          class="flex items-baseline justify-between gap-6 border-b py-4 text-2xl"
        >
          <span class="min-w-0 truncate">
            <span class="mr-3 tabular-nums text-muted-foreground">{{ displayLine.quantity }} ×</span>{{ displayLine.name }}
          </span>
          <span class="shrink-0 font-semibold tabular-nums">{{ displayLine.amount }}</span>
        </div>
      </div>
      <aside class="flex flex-col justify-end gap-3 border-t bg-muted/40 p-8 lg:border-l lg:border-t-0">
        <p class="text-xl text-muted-foreground">{{ t('display.itemCount', { count: displayState?.itemCount ?? 0 }) }}</p>
        <p v-if="displayState?.discount" class="text-xl text-emerald-700 dark:text-emerald-400">{{ t('display.youSave', { amount: displayState.discount }) }}</p>
        <p class="text-xl text-muted-foreground">{{ t('display.total') }}</p>
        <p class="break-all text-6xl font-bold tabular-nums">{{ displayState?.total }}</p>
      </aside>
    </main>
  </div>
</template>
