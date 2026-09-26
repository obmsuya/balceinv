<script setup lang="ts">
import type { TabsTriggerProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { TabsTrigger, useForwardProps } from "reka-ui"
import { cn } from "@/lib/utils"

const props = defineProps<TabsTriggerProps & { class?: HTMLAttributes["class"] }>()

const delegatedProps = reactiveOmit(props, "class")

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <TabsTrigger
    v-bind="forwardedProps"
    :class="cn(
      'relative z-10 inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-t-md px-3.5 py-2.5 text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground data-[state=inactive]:hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40 data-[state=active]:text-foreground [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:transition-colors data-[state=active]:[&_svg]:text-primary',
      props.class,
    )"
  >
    <slot />
  </TabsTrigger>
</template>
