<script setup lang="ts">
import { CircleCheck, Circle, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import type { GettingStarted } from '@/composables/useDashboard'

const props = defineProps<{ progress: GettingStarted }>()

const { t } = useI18n()
const { user } = useAuth()
const { hasSeen, markSeen } = useTour()

const steps = computed(() => [
  { key: 'businessDetails', done: props.progress.business_details, to: '/settings' },
  { key: 'logo', done: props.progress.logo, to: '/settings' },
  { key: 'firstProduct', done: props.progress.first_product, to: '/products' },
  { key: 'firstCashier', done: props.progress.first_cashier, to: '/users' },
  { key: 'firstSale', done: props.progress.first_sale, to: '/pos' },
])
const doneCount = computed(() => steps.value.filter(step => step.done).length)
const dismissed = ref(hasSeen('checklist'))
const isVisible = computed(() => user.value?.is_owner === true && !dismissed.value && doneCount.value < steps.value.length)

const hide = () => {
  dismissed.value = true
  markSeen('checklist')
}
</script>

<template>
  <section v-if="isVisible" class="rounded-xl border border-primary/30 bg-primary/5 p-4 sm:p-5" data-tour="dashboard-checklist">
    <div class="flex items-start justify-between gap-3">
      <div>
        <h2 class="font-semibold">{{ t('dashboard.gettingStarted.title') }}</h2>
        <p class="mt-0.5 text-sm text-muted-foreground">{{ t('dashboard.gettingStarted.progress', { done: doneCount, total: steps.length }) }}</p>
      </div>
      <Button variant="ghost" size="icon" class="size-8 shrink-0" :aria-label="t('dashboard.gettingStarted.hide')" @click="hide"><X /></Button>
    </div>
    <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-primary/15">
      <div class="h-full rounded-full bg-primary transition-all" :style="{ width: `${(doneCount / steps.length) * 100}%` }" />
    </div>
    <ul class="mt-3 grid gap-1 sm:grid-cols-2 lg:grid-cols-5">
      <li v-for="step in steps" :key="step.key">
        <NuxtLink
          :to="step.to"
          class="flex items-start gap-2 rounded-lg p-2 text-sm transition-colors hover:bg-background"
          :class="step.done ? 'text-muted-foreground' : ''"
        >
          <component :is="step.done ? CircleCheck : Circle" class="mt-0.5 size-4 shrink-0" :class="step.done ? 'text-primary' : 'text-muted-foreground'" />
          <span :class="step.done ? 'line-through' : 'font-medium'">{{ t(`dashboard.gettingStarted.steps.${step.key}`) }}</span>
        </NuxtLink>
      </li>
    </ul>
  </section>
</template>
