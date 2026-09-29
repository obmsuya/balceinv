<script setup lang="ts">
import { BadgePercent, CalendarClock, Pencil, Plus } from 'lucide-vue-next'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import DiscountFormDialog from '@/components/discounts/DiscountFormDialog.vue'
import type { Discount, DiscountStatus } from '@/composables/useDiscounts'
import { discountPageSize, discountTargetLabel, discountValueLabel } from '@/composables/useDiscounts'

const { canCreate, canEdit, canDelete } = usePermissions()
const { discounts, totalDiscounts, loading, saving, fetchDiscounts, stopDiscount } = useDiscounts()

const pageOffset = ref(0)
const showFormDialog = ref(false)
const editingDiscount = ref<Discount | null>(null)
const stopTarget = ref<Discount | null>(null)

const statusBadge: Record<DiscountStatus, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  active: { label: 'Running', variant: 'default' },
  scheduled: { label: 'Scheduled', variant: 'outline' },
  expired: { label: 'Ended', variant: 'secondary' },
  stopped: { label: 'Stopped', variant: 'secondary' },
}

const formatWindow = (discount: Discount): string => {
  const formatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  return `${formatter.format(new Date(discount.starts_at))} – ${formatter.format(new Date(discount.ends_at))}`
}

const reload = () => fetchDiscounts(pageOffset.value)

const openForm = (discount: Discount | null) => {
  editingDiscount.value = discount
  showFormDialog.value = true
}

const confirmStop = async () => {
  if (!stopTarget.value) return
  try {
    await stopDiscount(stopTarget.value.id)
    stopTarget.value = null
    reload()
  } catch {
  }
}

const goToPage = (nextOffset: number) => {
  pageOffset.value = Math.max(nextOffset, 0)
  reload()
}

onMounted(reload)
</script>

<template>
  <div class="container mx-auto flex max-w-4xl flex-col gap-6 py-2 sm:px-4 sm:py-6">
    <div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Discounts</h1>
        <p class="mt-1 text-muted-foreground">Offers the till applies on its own while they run</p>
      </div>
      <Button v-if="canCreate('discounts')" @click="openForm(null)">
        <Plus />
        New discount
      </Button>
    </div>

    <div v-if="loading && !discounts.length" class="flex flex-col gap-2">
      <Skeleton v-for="skeletonRow in 3" :key="skeletonRow" class="h-20 w-full" />
    </div>

    <Card v-else-if="!discounts.length">
      <CardContent class="flex flex-col items-center gap-2 py-12 text-center">
        <BadgePercent class="size-10 text-muted-foreground/50" />
        <p class="font-medium">No discounts yet</p>
        <p class="text-sm text-muted-foreground">Create one and the till picks it up while it runs.</p>
      </CardContent>
    </Card>

    <div v-else class="flex flex-col gap-2">
      <div
        v-for="discount in discounts"
        :key="discount.id"
        class="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center"
        :class="discount.status === 'active' ? '' : 'opacity-75'"
      >
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <p class="font-semibold">{{ discount.name }}</p>
            <Badge :variant="statusBadge[discount.status].variant">{{ statusBadge[discount.status].label }}</Badge>
          </div>
          <p class="mt-1 text-sm">{{ discountValueLabel(discount) }} · {{ discountTargetLabel(discount) }}</p>
          <p class="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarClock class="size-3.5" />
            {{ formatWindow(discount) }}
          </p>
        </div>
        <div class="flex gap-2">
          <Button v-if="canEdit('discounts')" variant="outline" size="sm" @click="openForm(discount)">
            <Pencil />
            Edit
          </Button>
          <Button
            v-if="canDelete('discounts') && discount.is_active && discount.status !== 'expired'"
            variant="outline"
            size="sm"
            class="text-destructive hover:text-destructive"
            @click="stopTarget = discount"
          >
            Stop
          </Button>
        </div>
      </div>
    </div>

    <div v-if="totalDiscounts > discountPageSize" class="flex justify-end gap-2">
      <Button variant="outline" size="sm" :disabled="pageOffset === 0 || loading" @click="goToPage(pageOffset - discountPageSize)">Previous</Button>
      <Button variant="outline" size="sm" :disabled="pageOffset + discountPageSize >= totalDiscounts || loading" @click="goToPage(pageOffset + discountPageSize)">Next</Button>
    </div>

    <DiscountFormDialog v-model:open="showFormDialog" :discount="editingDiscount" @saved="reload" />

    <AlertDialog :open="stopTarget !== null" @update:open="isOpen => { if (!isOpen) stopTarget = null }">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Stop {{ stopTarget?.name }}?</AlertDialogTitle>
          <AlertDialogDescription>The till stops applying it straight away. Past sales keep the discount they got, and you can restart it by editing it.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction class="bg-destructive text-white hover:bg-destructive/90" :disabled="saving" @click="confirmStop">Stop discount</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
