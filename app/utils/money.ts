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
