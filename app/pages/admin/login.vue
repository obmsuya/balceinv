<script setup lang="ts">
import { Toaster } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { faltasiNavy, setThemeColor } from '~/utils/brandTheme'

definePageMeta({ layout: false })

const { t } = useI18n()
const { busy, signIn } = useAdmin()
useHead({ title: computed(() => t('admin.signIn.title')) })
onMounted(() => setThemeColor(faltasiNavy))

const email = ref('')
const password = ref('')
const code = ref('')

const canSubmit = computed(() => email.value.includes('@') && password.value.length > 0 && code.value.replace(/\s/g, '').length >= 6 && !busy.value)

const submit = async () => {
  if (!canSubmit.value) return
  const isSignedIn = await signIn(email.value.trim(), password.value, code.value.replace(/\s/g, ''))
  if (isSignedIn) await navigateTo('/admin')
  else code.value = ''
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-muted/30 px-4">
    <form class="w-full max-w-sm rounded-xl border bg-background p-6 shadow-sm" @submit.prevent="submit">
      <div class="mb-6 flex flex-col items-center gap-2 text-center">
        <img src="/faltasi-icon.png" alt="Faltasi" class="size-14 rounded-xl">
        <p class="text-xs font-bold tracking-[0.24em] text-[#8A6420] dark:text-[#D6A24F]">FALTASI</p>
        <h1 class="text-xl font-semibold">{{ t('admin.signIn.title') }}</h1>
        <p class="text-sm text-muted-foreground">{{ t('admin.signIn.subtitle') }}</p>
      </div>
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1.5">
          <Label for="admin-email">{{ t('admin.signIn.email') }}</Label>
          <Input id="admin-email" v-model="email" type="email" autocomplete="username" />
        </div>
        <div class="flex flex-col gap-1.5">
          <Label for="admin-password">{{ t('admin.signIn.password') }}</Label>
          <Input id="admin-password" v-model="password" type="password" autocomplete="current-password" />
        </div>
        <div class="flex flex-col gap-1.5">
          <Label for="admin-code">{{ t('admin.signIn.code') }}</Label>
          <Input id="admin-code" v-model="code" inputmode="numeric" autocomplete="one-time-code" maxlength="8" class="tracking-[0.3em]" />
          <p class="text-xs text-muted-foreground">{{ t('admin.signIn.codeHelp') }}</p>
        </div>
        <Button type="submit" class="w-full" :disabled="!canSubmit">{{ t('admin.signIn.submit') }}</Button>
      </div>
    </form>
    <Toaster />
  </div>
</template>
