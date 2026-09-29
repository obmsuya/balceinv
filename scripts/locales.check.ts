import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { formatMessage } from '../app/utils/translate.ts'
import type { Dictionaries, Dictionary } from '../app/utils/translate.ts'

const localesDirectory = new URL('../app/locales/', import.meta.url).pathname
const appDirectory = new URL('../app/', import.meta.url).pathname

const loadLocale = (locale: string): Dictionary => {
  const dictionary: Dictionary = {}
  for (const fileName of readdirSync(join(localesDirectory, locale))) {
    dictionary[fileName.replace(/\.json$/, '')] = JSON.parse(readFileSync(join(localesDirectory, locale, fileName), 'utf8'))
  }
  return dictionary
}

const flatten = (dictionary: Dictionary, prefix = ''): Map<string, string> => {
  const flatEntries = new Map<string, string>()
  for (const [key, value] of Object.entries(dictionary)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'string') flatEntries.set(fullKey, value)
    else for (const [nestedKey, nestedValue] of flatten(value, fullKey)) flatEntries.set(nestedKey, nestedValue)
  }
  return flatEntries
}

const placeholdersOf = (message: string): string => [...message.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort().join(',')

const dictionaries: Dictionaries = { en: loadLocale('en'), sw: loadLocale('sw') }
const english = flatten(dictionaries.en)
const swahili = flatten(dictionaries.sw)

for (const [key, message] of english) {
  assert.ok(message.trim() !== '', `en ${key} is empty`)
  assert.ok(swahili.has(key), `sw is missing ${key}`)
  assert.ok(swahili.get(key)!.trim() !== '', `sw ${key} is empty`)
  assert.equal(placeholdersOf(swahili.get(key)!), placeholdersOf(message), `sw ${key} has different placeholders`)
}
for (const key of swahili.keys()) assert.ok(english.has(key), `en is missing ${key}`)

const bannedSwahiliWords = [/\barifa\b/i, /\bskani\b/i, /\btengu/i, /\bamilish/i]
for (const [key, message] of swahili) {
  for (const bannedWord of bannedSwahiliWords) assert.ok(!bannedWord.test(message), `sw ${key} uses ${bannedWord}; see app/locales/glossary.md`)
}

const sourceFiles = (directory: string): string[] => readdirSync(directory).flatMap((entryName) => {
  const entryPath = join(directory, entryName)
  if (statSync(entryPath).isDirectory()) return entryName === 'ui' || entryName === 'locales' ? [] : sourceFiles(entryPath)
  return /\.(vue|ts)$/.test(entryName) ? [entryPath] : []
})

const usedKeys = new Set<string>()
for (const sourcePath of sourceFiles(appDirectory)) {
  const source = readFileSync(sourcePath, 'utf8')
  for (const keyMatch of source.matchAll(/\bt\(\s*'([a-zA-Z][\w.]*)'/g)) {
    usedKeys.add(keyMatch[1]!)
    const pluralParent = keyMatch[1]!
    const isKnown = english.has(pluralParent) || english.has(`${pluralParent}.other`)
    assert.ok(isKnown, `${sourcePath.replace(appDirectory, 'app/')} uses unknown key ${pluralParent}`)
  }
  for (const keyMatch of source.matchAll(/apiErrorMessage\([^,]+,\s*'([\w.]+)'/g)) {
    assert.ok(english.has(keyMatch[1]!), `${sourcePath.replace(appDirectory, 'app/')} uses unknown fallback ${keyMatch[1]}`)
  }
}

const testDictionaries: Dictionaries = {
  en: { shop: { greeting: 'Hello {name}', onlyEnglish: 'English only', items: { one: '{count} item', other: '{count} items' } } },
  sw: { shop: { greeting: 'Habari {name}', onlyEnglish: '', items: { one: 'bidhaa {count}', other: 'bidhaa {count}' } } },
}
assert.equal(formatMessage(testDictionaries, 'sw', 'shop.greeting', { name: 'Asha' }), 'Habari Asha')
assert.equal(formatMessage(testDictionaries, 'sw', 'shop.onlyEnglish'), 'English only')
assert.equal(formatMessage(testDictionaries, 'sw', 'shop.missing'), 'shop.missing')
assert.equal(formatMessage({ en: testDictionaries.en, sw: {} }, 'sw', 'shop.greeting', { name: 'Juma' }), 'Hello Juma')
assert.equal(formatMessage(testDictionaries, 'en', 'shop.items', { count: 1 }), '1 item')
assert.equal(formatMessage(testDictionaries, 'en', 'shop.items', { count: 3 }), '3 items')
assert.equal(formatMessage(testDictionaries, 'sw', 'shop.greeting'), 'Habari {name}')

console.log(`locales ok: ${english.size} keys in each language, ${usedKeys.size} used in the app`)
