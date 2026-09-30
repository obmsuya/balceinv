const amountCharacter = /[0-9.]/

export const cleanAmountText = (typedText: string, decimals: number): string => {
  const digitsAndDots = typedText.replace(/[^0-9.]/g, '')
  const firstDotIndex = digitsAndDots.indexOf('.')
  const hasDot = firstDotIndex !== -1
  const wholeDigits = (hasDot ? digitsAndDots.slice(0, firstDotIndex) : digitsAndDots).replace(/^0+(?=\d)/, '')
  if (!hasDot || decimals === 0) return wholeDigits
  const fractionDigits = digitsAndDots.slice(firstDotIndex + 1).replace(/\./g, '').slice(0, decimals)
  return `${wholeDigits || '0'}.${fractionDigits}`
}

export const groupAmountText = (cleanText: string): string => {
  const [wholeDigits = '', fractionDigits] = cleanText.split('.')
  const groupedWhole = wholeDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return fractionDigits === undefined ? groupedWhole : `${groupedWhole}.${fractionDigits}`
}

export const countAmountCharacters = (text: string): number =>
  [...text].filter(character => amountCharacter.test(character)).length

export const caretAfterAmountCharacters = (groupedText: string, amountCharacterCount: number): number => {
  if (amountCharacterCount <= 0) return 0
  let seenCount = 0
  for (let position = 0; position < groupedText.length; position++) {
    if (amountCharacter.test(groupedText[position]!)) seenCount++
    if (seenCount === amountCharacterCount) return position + 1
  }
  return groupedText.length
}
