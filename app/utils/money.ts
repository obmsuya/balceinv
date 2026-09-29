import { shallowRef } from 'vue'

interface MoneyFormat {
  currencyCode: string
  decimals: number
  locale: string | undefined
  formatter: Intl.NumberFormat
}

const buildMoneyFormat = (currencyCode: string, decimals: number, locale: string | undefined): MoneyFormat => ({
  currencyCode,
  decimals,
  locale,
  formatter: new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }),
})

const activeMoneyFormat = shallowRef<MoneyFormat>(buildMoneyFormat('TZS', 0, undefined))

export const setMoneyFormat = (currencyCode: string, decimals: number) => {
  const isUnchanged = activeMoneyFormat.value.currencyCode === currencyCode && activeMoneyFormat.value.decimals === decimals
  if (isUnchanged) return
  activeMoneyFormat.value = buildMoneyFormat(currencyCode, decimals, activeMoneyFormat.value.locale)
}

export const setMoneyLocale = (locale: string) => {
  if (activeMoneyFormat.value.locale === locale) return
  const { currencyCode, decimals } = activeMoneyFormat.value
  activeMoneyFormat.value = buildMoneyFormat(currencyCode, decimals, locale)
}

export const formatMoney = (minorUnits: number | null | undefined): string => {
  const { formatter, decimals } = activeMoneyFormat.value
  const safeMinorUnits = Number.isFinite(minorUnits) ? Number(minorUnits) : 0
  return formatter.format(safeMinorUnits / 10 ** decimals)
}

export const currencyCode = (): string => activeMoneyFormat.value.currencyCode

export const currencyDecimals = (): number => activeMoneyFormat.value.decimals

export const majorToMinor = (majorUnits: number): number =>
  Math.round(majorUnits * 10 ** activeMoneyFormat.value.decimals)

export const minorToInputText = (minorUnits: number | null | undefined): string => {
  if (minorUnits == null || !Number.isFinite(minorUnits)) return ''
  const { decimals } = activeMoneyFormat.value
  return (minorUnits / 10 ** decimals).toFixed(decimals)
}

export const inputTextToMinor = (inputText: string): number | null => {
  const cleanedText = inputText.replace(/[\s,]/g, '')
  if (cleanedText === '') return null
  const majorUnits = Number(cleanedText)
  if (!Number.isFinite(majorUnits) || majorUnits < 0) return Number.NaN
  return majorToMinor(majorUnits)
}
