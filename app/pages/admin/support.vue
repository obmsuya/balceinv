<script setup lang="ts">
import { CheckCircle2, Mail, Phone } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { AdminSupportMessage } from '@/composables/useAdmin'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const { t, formatDateTime } = useI18n()
const { busy, fetchSupport, markHandled } = useAdmin()
useHead({ title: computed(() => t('admin.support.title')) })

const show = ref<'open' | 'all'>('open')
const loading = ref(true)
const messages = ref<AdminSupportMessage[]>([])

const load = async () => {
  loading.value = true
  messages.value = await fetchSupport(show.value === 'all')
  loading.value = false
}
watch(show, load)
onMounted(load)

const submitHandled = async (messageId: string) => {
  const isHandled = await markHandled(messageId)
  if (isHandled) load()
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">{{ t('admin.support.title') }}</h1>
        <p class="mt-1 text-sm text-muted-foreground">{{ t('admin.support.subtitle') }}</p>
      </div>
      <Tabs v-model="show">
        <TabsList>
          <TabsTrigger value="open">{{ t('admin.support.open') }}</TabsTrigger>
          <TabsTrigger value="all">{{ t('admin.support.all') }}</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>

    <Skeleton v-if="loading && !messages.length" class="h-32 w-full" />
    <p v-else-if="!messages.length" class="rounded-lg border bg-background p-8 text-center text-muted-foreground">{{ t('admin.support.empty') }}</p>
    <article v-for="message in messages" v-else :key="message.id" class="flex flex-col gap-3 rounded-lg border bg-background p-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{{ t(`admin.support.topics.${message.topic}`) }}</Badge>
          <NuxtLink :to="`/admin/shops/${message.company_id}`" class="font-medium hover:underline">{{ message.company_name }}</NuxtLink>
          <span v-if="message.user_name" class="text-sm text-muted-foreground">{{ t('admin.support.from', { name: message.user_name }) }}</span>
        </div>
        <span class="text-xs text-muted-foreground">{{ formatDateTime(message.created_at) }}</span>
      </div>
      <p class="whitespace-pre-line text-sm">{{ message.message }}</p>
      <div class="flex flex-wrap items-center justify-between gap-2 text-sm">
        <div class="flex flex-wrap items-center gap-3 text-muted-foreground">
          <a v-if="message.contact_phone" :href="`tel:${message.contact_phone}`" class="inline-flex items-center gap-1 hover:text-foreground"><Phone class="size-3.5" />{{ message.contact_phone }}</a>
          <a v-if="message.contact_email" :href="`mailto:${message.contact_email}`" class="inline-flex items-center gap-1 hover:text-foreground"><Mail class="size-3.5" />{{ message.contact_email }}</a>
          <span class="text-xs">{{ t('admin.support.emailStatus', { status: message.email_status }) }}</span>
        </div>
        <span v-if="message.handled_at" class="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400"><CheckCircle2 class="size-3.5" />{{ t('admin.support.handledBy', { name: message.handled_by_name ?? '', date: formatDateTime(message.handled_at) }) }}</span>
        <Button v-else size="sm" variant="outline" :disabled="busy" @click="submitHandled(message.id)"><CheckCircle2 />{{ t('admin.support.markHandled') }}</Button>
      </div>
    </article>
  </div>
</template>
