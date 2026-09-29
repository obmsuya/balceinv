<script setup lang="ts">
import { Languages } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { isLocale, supportedLocales } from '~/utils/translate'

const { t, locale, chooseLanguage } = useI18n()

const selectLanguage = (chosenLocale: unknown) => {
  if (!isLocale(chosenLocale) || chosenLocale === locale.value) return
  chooseLanguage(chosenLocale)
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" size="icon" :aria-label="t('common.language.label')">
        <Languages class="size-5" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuLabel>{{ t('common.language.label') }}</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuRadioGroup :model-value="locale" @update:model-value="selectLanguage">
        <DropdownMenuRadioItem v-for="supportedLocale in supportedLocales" :key="supportedLocale" :value="supportedLocale">
          {{ t(`common.language.${supportedLocale}`) }}
        </DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
