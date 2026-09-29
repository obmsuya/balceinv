<script setup lang="ts">
import { Building2, Check, Save, TriangleAlert, Upload } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { contrastRatio, darkThemeVariant, isBrandColor, readableTextOn } from '~/utils/brandTheme'
import { assetUrl, useSettings } from '~/composables/useSettings'

const maximumLogoBytes = 1024 * 1024
const minimumBackgroundContrast = 3
const lightBackground = '#ffffff'
const darkBackground = '#0a0a0a'
const brandPresets = [
  '#5ea500', '#16a34a', '#0d9488', '#0284c7', '#2563eb', '#4f46e5', '#7c3aed',
  '#c026d3', '#db2777', '#dc2626', '#ea580c', '#b45309', '#0f172a',
]

const { settings, updateSettings, uploadLogo } = useSettings()
const { t } = useI18n()

const selectedColor = ref(settings.value?.company.primary_color ?? '#5ea500')
watch(() => settings.value?.company.primary_color, (savedColor) => {
  if (savedColor) selectedColor.value = savedColor
})

const normalizedColor = computed(() => selectedColor.value.trim().toLowerCase())
const isValidColor = computed(() => isBrandColor(normalizedColor.value))
const previewColor = computed(() => (isValidColor.value ? normalizedColor.value : '#5ea500'))
const darkVariant = computed(() => darkThemeVariant(previewColor.value))
const lightSwatchStyle = computed(() => ({ backgroundColor: previewColor.value, color: readableTextOn(previewColor.value) }))
const darkSwatchStyle = computed(() => ({ backgroundColor: darkVariant.value, color: readableTextOn(darkVariant.value) }))
const lowestContrast = computed(() => Math.min(contrastRatio(previewColor.value, lightBackground), contrastRatio(darkVariant.value, darkBackground)))
const hasWeakContrast = computed(() => isValidColor.value && lowestContrast.value < minimumBackgroundContrast)
const isUnchanged = computed(() => normalizedColor.value === settings.value?.company.primary_color)

const savingColor = ref(false)
const saveColor = async () => {
  savingColor.value = true
  try {
    await updateSettings({ primary_color: normalizedColor.value })
  } catch {} finally {
    savingColor.value = false
  }
}

const logoInput = ref<HTMLInputElement | null>(null)
const logoSource = computed(() => assetUrl(settings.value?.company.logo_url))
const uploadingLogo = ref(false)

const onLogoPicked = async (pickEvent: Event) => {
  const fileInput = pickEvent.target as HTMLInputElement
  const pickedFile = fileInput.files?.[0]
  if (!pickedFile) return

  if (pickedFile.size > maximumLogoBytes) {
    toast.error(t('settings.toasts.logoTooLarge'))
    fileInput.value = ''
    return
  }

  uploadingLogo.value = true
  try {
    await uploadLogo(pickedFile)
  } catch {} finally {
    uploadingLogo.value = false
    fileInput.value = ''
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <Card>
      <CardHeader class="pb-3">
        <CardTitle class="text-base">{{ t('settings.branding.colorTitle') }}</CardTitle>
        <CardDescription>{{ t('settings.branding.colorDescription') }}</CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col gap-5">
        <div class="flex flex-wrap items-end gap-3">
          <div class="flex flex-col gap-1.5">
            <Label for="brand-color-picker">{{ t('settings.branding.color') }}</Label>
            <input
              id="brand-color-picker"
              v-model="selectedColor"
              type="color"
              class="size-10 cursor-pointer rounded-md border bg-background p-1"
            >
          </div>
          <div class="flex flex-col gap-1.5">
            <Label for="brand-color-hex">{{ t('settings.branding.hexValue') }}</Label>
            <Input
              id="brand-color-hex"
              v-model="selectedColor"
              class="w-32 font-mono"
              maxlength="7"
              :aria-invalid="!isValidColor"
            />
          </div>
        </div>
        <p v-if="!isValidColor" class="text-sm text-destructive">{{ t('settings.branding.invalidColor') }}</p>

        <div class="flex flex-wrap gap-2" role="radiogroup" :aria-label="t('settings.branding.presets')">
          <button
            v-for="presetColor in brandPresets"
            :key="presetColor"
            type="button"
            role="radio"
            :aria-checked="normalizedColor === presetColor"
            :aria-label="presetColor"
            class="flex size-8 items-center justify-center rounded-full border border-border ring-offset-background transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            :style="{ backgroundColor: presetColor, color: readableTextOn(presetColor) }"
            @click="selectedColor = presetColor"
          >
            <Check v-if="normalizedColor === presetColor" class="size-4" />
          </button>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <div class="flex flex-col gap-3 rounded-lg border bg-white p-4 text-neutral-900">
            <p class="text-xs font-medium uppercase tracking-wide text-neutral-500">{{ t('settings.branding.lightMode') }}</p>
            <div class="flex items-center gap-2">
              <span class="inline-flex h-9 items-center rounded-md px-4 text-sm font-medium" :style="lightSwatchStyle">{{ t('settings.branding.sampleButton') }}</span>
              <span class="inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium" :style="lightSwatchStyle">{{ t('settings.branding.sampleBadge') }}</span>
            </div>
          </div>
          <div class="flex flex-col gap-3 rounded-lg border border-neutral-800 bg-neutral-950 p-4 text-neutral-50">
            <p class="text-xs font-medium uppercase tracking-wide text-neutral-400">{{ t('settings.branding.darkMode') }}</p>
            <div class="flex items-center gap-2">
              <span class="inline-flex h-9 items-center rounded-md px-4 text-sm font-medium" :style="darkSwatchStyle">{{ t('settings.branding.sampleButton') }}</span>
              <span class="inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium" :style="darkSwatchStyle">{{ t('settings.branding.sampleBadge') }}</span>
            </div>
          </div>
        </div>

        <div
          v-if="hasWeakContrast"
          role="alert"
          class="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300"
        >
          <TriangleAlert class="mt-0.5 size-4 shrink-0" />
          <p>{{ t('settings.branding.weakContrast', { ratio: lowestContrast.toFixed(1) }) }}</p>
        </div>

        <div class="flex justify-end">
          <Button :disabled="!isValidColor || isUnchanged || savingColor" @click="saveColor">
            <Save class="size-4" />
            {{ savingColor ? t('common.actions.saving') : t('settings.branding.saveColor') }}
          </Button>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="pb-3">
        <CardTitle class="text-base">{{ t('settings.branding.logoTitle') }}</CardTitle>
        <CardDescription>{{ t('settings.branding.logoDescription') }}</CardDescription>
      </CardHeader>
      <CardContent>
        <div class="flex items-center gap-4">
          <div class="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
            <img v-if="logoSource" :src="logoSource" :alt="t('settings.branding.logoAlt')" class="size-full object-contain">
            <Building2 v-else class="size-8 text-muted-foreground" />
          </div>
          <div class="flex flex-col gap-2">
            <input
              ref="logoInput"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              class="hidden"
              @change="onLogoPicked"
            >
            <Button variant="outline" size="sm" :disabled="uploadingLogo" @click="logoInput?.click()">
              <Upload class="size-4" />
              {{ uploadingLogo ? t('settings.branding.uploading') : t('settings.branding.chooseImage') }}
            </Button>
            <p class="text-xs text-muted-foreground">{{ t('settings.branding.logoHint') }}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
