export type MobileMoneyProvider = 'Mpesa' | 'Tigo' | 'Airtel' | 'Halopesa' | 'Azampesa'

export interface MobileMoneyOption {
  value: MobileMoneyProvider
  label: string
  initials: string
  color: string
}

export const mobileMoneyOptions: MobileMoneyOption[] = [
  { value: 'Mpesa', label: 'M-Pesa', initials: 'M', color: '#e60000' },
  { value: 'Tigo', label: 'Tigo Pesa', initials: 'T', color: '#1b4fa0' },
  { value: 'Airtel', label: 'Airtel Money', initials: 'A', color: '#ed1c24' },
  { value: 'Halopesa', label: 'HaloPesa', initials: 'H', color: '#f47920' },
  { value: 'Azampesa', label: 'AzamPesa', initials: 'Az', color: '#0f766e' },
]

const providerByPrefix: Record<string, MobileMoneyProvider> = {
  '074': 'Mpesa',
  '075': 'Mpesa',
  '076': 'Mpesa',
  '065': 'Tigo',
  '067': 'Tigo',
  '071': 'Tigo',
  '077': 'Tigo',
  '068': 'Airtel',
  '069': 'Airtel',
  '078': 'Airtel',
  '061': 'Halopesa',
  '062': 'Halopesa',
}

const toLocalDigits = (rawPhone: string): string => {
  const digits = rawPhone.replace(/\D/g, '')
  if (digits.startsWith('255')) return `0${digits.slice(3)}`
  if (/^[67]/.test(digits)) return `0${digits}`
  return digits
}

export const normalizePhone = (rawPhone: string): string | null => {
  const localDigits = toLocalDigits(rawPhone)
  return /^0[67]\d{8}$/.test(localDigits) ? localDigits : null
}

export const detectProvider = (rawPhone: string): MobileMoneyProvider | null =>
  providerByPrefix[toLocalDigits(rawPhone).slice(0, 3)] ?? null

export const formatPhone = (rawPhone: string): string => {
  const localDigits = toLocalDigits(rawPhone).slice(0, 10)
  return [localDigits.slice(0, 4), localDigits.slice(4, 7), localDigits.slice(7)].filter(Boolean).join(' ')
}

export type DurationUnit = 'year' | 'month' | 'day'

export const describeDuration = (days: number): { unit: DurationUnit; count: number } => {
  if (days % 365 === 0) return { unit: 'year', count: days / 365 }
  if (days % 30 === 0) return { unit: 'month', count: days / 30 }
  return { unit: 'day', count: days }
}

export const formatShillings = (value: string | number): string => {
  const amount = typeof value === 'number' ? value : Number.parseFloat(String(value).replace(/[^0-9.]/g, ''))
  if (Number.isNaN(amount)) return ''
  return `TSh ${Math.round(amount).toLocaleString('en-US')}`
}
