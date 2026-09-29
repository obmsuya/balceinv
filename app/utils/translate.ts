export type Locale = 'en' | 'sw'
export type MessageParams = Record<string, string | number>
export type Dictionary = { [key: string]: string | Dictionary }
export type Dictionaries = Record<Locale, Dictionary>

export const supportedLocales: Locale[] = ['en', 'sw']

export const isLocale = (value: unknown): value is Locale => value === 'en' || value === 'sw'

export const lookupMessage = (dictionary: Dictionary, key: string): string | Dictionary | undefined => {
  let current: string | Dictionary | undefined = dictionary
  for (const keyPart of key.split('.')) {
    if (current == null || typeof current === 'string') return undefined
    current = current[keyPart]
  }
  return current
}

const pickPluralForm = (entry: Dictionary, count: number): string | undefined => {
  const exactForm = entry[String(count)]
  if (typeof exactForm === 'string') return exactForm
  const pluralForm = count === 1 ? entry.one : entry.other
  return typeof pluralForm === 'string' ? pluralForm : undefined
}

const resolveTemplate = (dictionary: Dictionary, key: string, params?: MessageParams): string | undefined => {
  const entry = lookupMessage(dictionary, key)
  if (typeof entry === 'string') return entry === '' ? undefined : entry
  if (entry && typeof params?.count === 'number') return pickPluralForm(entry, params.count)
  return undefined
}

export const formatMessage = (dictionaries: Dictionaries, locale: Locale, key: string, params?: MessageParams): string => {
  const template = resolveTemplate(dictionaries[locale], key, params) ?? resolveTemplate(dictionaries.en, key, params) ?? key
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (placeholder, paramName: string) => {
    const value = params[paramName]
    return value == null ? placeholder : String(value)
  })
}

export const hasMessage = (dictionaries: Dictionaries, locale: Locale, key: string): boolean =>
  lookupMessage(dictionaries[locale], key) !== undefined

export const intlLocaleFor = (locale: Locale): string => (locale === 'sw' ? 'sw-TZ' : 'en-TZ')
