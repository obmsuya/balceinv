import { formatNumber, t } from '~/utils/i18n'

export type RangePreset = 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'custom'

export const rangePresetLabel = (preset: RangePreset): string => t(`reports.presets.${preset}`)

export const todayIn = (timezone: string | undefined): string => {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  } catch {
    return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  }
}

export const shiftDate = (isoDate: string, dayCount: number): string => {
  const shifted = new Date(`${isoDate}T12:00:00Z`)
  shifted.setUTCDate(shifted.getUTCDate() + dayCount)
  return shifted.toISOString().slice(0, 10)
}

export const presetRange = (preset: RangePreset, today: string): { from: string; to: string } => {
  const monthStart = `${today.slice(0, 7)}-01`
  switch (preset) {
    case 'today':
      return { from: today, to: today }
    case 'yesterday':
      return { from: shiftDate(today, -1), to: shiftDate(today, -1) }
    case 'last7':
      return { from: shiftDate(today, -6), to: today }
    case 'thisMonth':
      return { from: monthStart, to: today }
    case 'lastMonth': {
      const lastMonthEnd = shiftDate(monthStart, -1)
      return { from: `${lastMonthEnd.slice(0, 7)}-01`, to: lastMonthEnd }
    }
    default:
      return { from: shiftDate(today, -29), to: today }
  }
}

export const percentChange = (current: number, previous: number): number | null => {
  if (previous === 0) return null
  return ((current - previous) / Math.abs(previous)) * 100
}

export const marginText = (basisPoints: number): string =>
  `${formatNumber(basisPoints / 100, { maximumFractionDigits: 1 })}%`
