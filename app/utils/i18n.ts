import { ref } from 'vue'
import { setMoneyLocale } from '~/utils/money'
import { formatMessage, hasMessage, intlLocaleFor, isLocale } from '~/utils/translate'
import type { Dictionaries, Dictionary, Locale, MessageParams } from '~/utils/translate'

const localeStorageKey = 'balce-locale'

const loadDictionaries = (): Dictionaries => {
  const dictionaryFiles = import.meta.glob<Dictionary>('../locales/*/*.json', { eager: true, import: 'default' })
  const loaded: Dictionaries = { en: {}, sw: {} }
  for (const [filePath, contents] of Object.entries(dictionaryFiles)) {
    const pathMatch = filePath.match(/locales\/(\w+)\/(\w+)\.json$/)
    if (!pathMatch || !isLocale(pathMatch[1])) continue
    loaded[pathMatch[1]][pathMatch[2]!] = contents
  }
  return loaded
}

const dictionaries = loadDictionaries()

export const activeLocale = ref<Locale>('en')

export const t = (key: string, params?: MessageParams): string => formatMessage(dictionaries, activeLocale.value, key, params)

export const translateIn = (locale: string | null | undefined, key: string, params?: MessageParams): string =>
  formatMessage(dictionaries, isLocale(locale) ? locale : 'en', key, params)

export const intlLocale = (): string => intlLocaleFor(activeLocale.value)

export const setActiveLocale = (requestedLocale: string | null | undefined) => {
  const nextLocale: Locale = isLocale(requestedLocale) ? requestedLocale : 'en'
  activeLocale.value = nextLocale
  setMoneyLocale(intlLocaleFor(nextLocale))
  if (typeof document !== 'undefined') document.documentElement.lang = nextLocale
  try {
    localStorage.setItem(localeStorageKey, nextLocale)
  } catch {}
}

export const restoreSavedLocale = () => {
  try {
    setActiveLocale(localStorage.getItem(localeStorageKey))
  } catch {
    setActiveLocale('en')
  }
}

export const formatNumber = (value: number | null | undefined, options?: Intl.NumberFormatOptions): string =>
  new Intl.NumberFormat(intlLocale(), options).format(Number.isFinite(value) ? Number(value) : 0)

export const formatDate = (value: string | number | Date | null | undefined, options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }): string => {
  if (value == null || value === '') return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(intlLocale(), options).format(date)
}

export const formatDateTime = (value: string | number | Date | null | undefined): string =>
  formatDate(value, { dateStyle: 'medium', timeStyle: 'short' })

export const formatRelativeTime = (value: string | Date): string => {
  const elapsedMinutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000)
  if (elapsedMinutes < 1) return t('common.time.justNow')
  const relativeFormat = new Intl.RelativeTimeFormat(intlLocale(), { numeric: 'auto', style: 'short' })
  if (elapsedMinutes < 60) return relativeFormat.format(-elapsedMinutes, 'minute')
  const elapsedHours = Math.floor(elapsedMinutes / 60)
  if (elapsedHours < 24) return relativeFormat.format(-elapsedHours, 'hour')
  return formatDate(value)
}

export const apiErrorMessage = (error: any, fallbackKey: string): string => {
  const hasNoResponse = error && !error.response && !error.data
  if (hasNoResponse) return t('errors.offline')
  const errorCode: unknown = error?.data?.code
  const codeKey = `errors.${errorCode}`
  if (activeLocale.value === 'en') return error?.data?.message || t(fallbackKey)
  if (typeof errorCode === 'string' && hasMessage(dictionaries, activeLocale.value, codeKey)) return t(codeKey)
  return t(fallbackKey)
}
