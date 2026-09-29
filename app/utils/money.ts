import { shallowRef } from 'vue'

interface MoneyFormat {
  currencyCode: string
  decimals: number
  formatter: Intl.NumberFormat
}

const buildMoneyFormat = (currencyCode: string, decimals: number): MoneyFormat => ({
  currencyCode,
  decimals,
  formatter: new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }),
})

const activeMoneyFormat = shallowRef<MoneyFormat>(buildMoneyFormat('TZS', 0))

export const setMoneyFormat = (currencyCode: string, decimals: number) => {
  const isUnchanged = activeMoneyFormat.value.currencyCode === currencyCode && activeMoneyFormat.value.decimals === decimals
  if (isUnchanged) return
  activeMoneyFormat.value = buildMoneyFormat(currencyCode, decimals)
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
