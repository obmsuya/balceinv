<script setup lang="ts">
import { Banknote, CreditCard, Smartphone } from 'lucide-vue-next'
import type { CustomerPaymentMethod } from '@/composables/useCustomers'
import { paymentMethodLabel } from '@/composables/useSales'

const method = defineModel<CustomerPaymentMethod | null>({ default: 'cash' })

const choices: { method: CustomerPaymentMethod; icon: any }[] = [
  { method: 'cash', icon: Banknote },
  { method: 'card', icon: CreditCard },
  { method: 'mobile', icon: Smartphone },
]
</script>

<template>
  <div class="grid grid-cols-3 gap-2" role="radiogroup">
    <button
      v-for="choice in choices"
      :key="choice.method"
      type="button"
      role="radio"
      class="flex flex-col items-center gap-1 rounded-lg border p-2 text-xs font-medium transition-colors hover:bg-accent sm:flex-row sm:justify-center sm:text-sm"
      :class="method === choice.method ? 'border-primary bg-primary/5' : ''"
      :aria-checked="method === choice.method"
      @click="method = choice.method"
    >
      <component :is="choice.icon" class="size-4 text-muted-foreground" />
      {{ paymentMethodLabel(choice.method) }}
    </button>
  </div>
</template>
