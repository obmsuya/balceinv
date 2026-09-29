<script setup lang="ts">
import { MapPin, Pencil, Phone, Plus, Receipt, Store } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import type { Shop } from '@/composables/useShops'

const { user } = useAuth()
const { canCreate, canEdit, canDelete } = usePermissions()
const { shops, loading, saving, fetchShops, saveShop, closeShop } = useShops()

const showFormDialog = ref(false)
const editingShop = ref<Shop | null>(null)
const closeTarget = ref<Shop | null>(null)
const form = ref({ name: '', address: '', phone: '', receiptPrefix: '' })

const openShops = computed(() => shops.value.filter(shop => shop.is_active))
const closedShops = computed(() => shops.value.filter(shop => !shop.is_active))

const openForm = (shop: Shop | null) => {
  editingShop.value = shop
  form.value = {
    name: shop?.name ?? '',
    address: shop?.address ?? '',
    phone: shop?.phone ?? '',
    receiptPrefix: shop?.receipt_prefix ?? '',
  }
  showFormDialog.value = true
}

const submit = async () => {
  if (!form.value.name.trim()) {
    toast.error('Enter the shop name')
    return
  }
  if (form.value.receiptPrefix && !/^[a-z0-9]{1,12}$/i.test(form.value.receiptPrefix.trim())) {
    toast.error('The receipt prefix can only use letters and numbers, up to 12')
    return
  }
  try {
    await saveShop(editingShop.value?.id ?? null, {
      name: form.value.name.trim(),
      address: form.value.address.trim() || null,
      phone: form.value.phone.trim() || null,
      receipt_prefix: form.value.receiptPrefix.trim(),
      is_active: editingShop.value?.is_active ?? true,
    })
    showFormDialog.value = false
  } catch {
  }
}

const reopen = async (shop: Shop) => {
  try {
    await saveShop(shop.id, { name: shop.name, address: shop.address, phone: shop.phone, receipt_prefix: shop.receipt_prefix, is_active: true })
  } catch {
  }
}

const confirmClose = async () => {
  if (!closeTarget.value) return
  try {
    await closeShop(closeTarget.value.id)
    closeTarget.value = null
  } catch {
  }
}

onMounted(fetchShops)
</script>

<template>
  <div class="container mx-auto flex flex-col gap-6 py-2 sm:px-4 sm:py-6">
    <div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Shops</h1>
        <p class="mt-1 text-muted-foreground">Every branch of {{ user?.company_name }}</p>
      </div>
      <Button v-if="canCreate('shops')" @click="openForm(null)">
        <Plus />
        Add shop
      </Button>
    </div>

    <div v-if="loading && !shops.length" class="grid gap-4 md:grid-cols-2">
      <Skeleton v-for="skeletonCard in 2" :key="skeletonCard" class="h-36 w-full" />
    </div>

    <div v-else class="grid gap-4 md:grid-cols-2">
      <Card v-for="shop in openShops" :key="shop.id">
        <CardContent class="flex flex-col gap-3">
          <div class="flex items-start gap-3">
            <div class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Store class="size-5 text-primary" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <p class="font-semibold">{{ shop.name }}</p>
                <Badge v-if="shop.id === user?.shop_id" variant="secondary">You are here</Badge>
              </div>
              <p class="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Receipt class="size-3.5" />
                Receipts start with {{ shop.receipt_prefix }}
              </p>
            </div>
            <Button v-if="canEdit('shops')" variant="ghost" size="icon" :aria-label="`Edit ${shop.name}`" @click="openForm(shop)">
              <Pencil />
            </Button>
          </div>
          <div class="flex flex-col gap-1 text-sm text-muted-foreground">
            <p v-if="shop.address" class="flex items-center gap-1.5"><MapPin class="size-3.5 shrink-0" />{{ shop.address }}</p>
            <p v-if="shop.phone" class="flex items-center gap-1.5"><Phone class="size-3.5 shrink-0" />{{ shop.phone }}</p>
          </div>
          <Button
            v-if="canDelete('shops') && openShops.length > 1"
            variant="outline"
            size="sm"
            class="self-start text-destructive hover:text-destructive"
            @click="closeTarget = shop"
          >
            Close shop
          </Button>
        </CardContent>
      </Card>
    </div>

    <div v-if="closedShops.length" class="flex flex-col gap-2">
      <p class="text-sm font-medium text-muted-foreground">Closed</p>
      <div v-for="shop in closedShops" :key="shop.id" class="flex items-center gap-3 rounded-lg border px-4 py-3">
        <Store class="size-4 text-muted-foreground" />
        <span class="flex-1 text-sm">{{ shop.name }}</span>
        <Button v-if="canEdit('shops')" variant="outline" size="sm" :disabled="saving" @click="reopen(shop)">Reopen</Button>
      </div>
    </div>

    <Dialog v-model:open="showFormDialog">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{{ editingShop ? 'Edit shop' : 'Add shop' }}</DialogTitle>
          <DialogDescription>Staff only see the shops you assign to them on the Users page.</DialogDescription>
        </DialogHeader>
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-1.5">
            <Label for="shop-name">Name</Label>
            <Input id="shop-name" v-model="form.name" placeholder="Kariakoo Branch" />
          </div>
          <div class="flex flex-col gap-1.5">
            <Label for="shop-address">Address (optional)</Label>
            <Input id="shop-address" v-model="form.address" placeholder="Msimbazi Street" />
          </div>
          <div class="flex flex-col gap-1.5">
            <Label for="shop-phone">Phone (optional)</Label>
            <Input id="shop-phone" v-model="form.phone" inputmode="tel" placeholder="0712 000 000" />
          </div>
          <div class="flex flex-col gap-1.5">
            <Label for="shop-prefix">Receipt prefix</Label>
            <Input id="shop-prefix" v-model="form.receiptPrefix" placeholder="SALE" autocapitalize="characters" class="uppercase" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showFormDialog = false">Cancel</Button>
          <Button :disabled="saving" @click="submit">{{ editingShop ? 'Save' : 'Add shop' }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog :open="closeTarget !== null" @update:open="isOpen => { if (!isOpen) closeTarget = null }">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Close {{ closeTarget?.name }}?</AlertDialogTitle>
          <AlertDialogDescription>
            Nobody can sell or move stock there until you reopen it. Its history and stock stay as they are.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction class="bg-destructive text-white hover:bg-destructive/90" :disabled="saving" @click="confirmClose">Close shop</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
