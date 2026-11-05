<script setup lang="ts">
import { CircleHelp } from 'lucide-vue-next'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

defineProps<{
  title: string
  text: string
}>()
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <button
        type="button"
        class="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        :aria-label="title"
        :title="title"
        @click.stop
      >
        <CircleHelp class="size-3.5" />
      </button>
    </PopoverTrigger>
    <PopoverContent class="z-[60] w-64 space-y-1 text-sm" side="top" @click.stop>
      <p class="font-medium">{{ title }}</p>
      <p class="text-muted-foreground">{{ text }}</p>
    </PopoverContent>
  </Popover>
</template>
