import assert from 'node:assert/strict'
import { caretAfterAmountCharacters, cleanAmountText, countAmountCharacters, groupAmountText } from '../app/utils/amountText.ts'

const shown = (typedText: string, decimals = 0) => groupAmountText(cleanAmountText(typedText, decimals))

assert.equal(shown('1500000'), '1,500,000')
assert.equal(shown('1,500,000'), '1,500,000')
assert.equal(shown('150,0000'), '1,500,000')
assert.equal(shown('999'), '999')
assert.equal(shown('1000'), '1,000')
assert.equal(shown(''), '')
assert.equal(shown('0'), '0')
assert.equal(shown('007'), '7')
assert.equal(shown('12a3b'), '123')
assert.equal(shown('1500.50'), '1,500')
assert.equal(shown('1500.5', 2), '1,500.5')
assert.equal(shown('1500.567', 2), '1,500.56')
assert.equal(shown('.5', 2), '0.5')
assert.equal(shown('1.2.3', 2), '1.23')
assert.equal(shown('12.', 2), '12.')
assert.equal(shown('TSh 25,000'), '25,000')

assert.equal(cleanAmountText('1,500,000', 0), '1500000')
assert.equal(cleanAmountText('1,500.25', 2), '1500.25')

const typedAt = (textBefore: string, caret: number) => {
  const cleanText = cleanAmountText(textBefore, 0)
  const groupedText = groupAmountText(cleanText)
  return caretAfterAmountCharacters(groupedText, countAmountCharacters(textBefore.slice(0, caret)))
}
assert.equal(typedAt('1,5000', 6), 6)
assert.equal(typedAt('15,000', 1), 1)
assert.equal(typedAt('1,000', 0), 0)
assert.equal(typedAt('1,0500', 4), 4)
assert.equal(caretAfterAmountCharacters('1,500,000', 4), 5)
assert.equal(caretAfterAmountCharacters('1,500', 99), 5)

console.log('amount text ok')
