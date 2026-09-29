const brandStorageKey = 'balce:brand-color'
const hexColorPattern = /^#[0-9a-f]{6}$/i
const darkText = '#0a0a0a'
const lightText = '#ffffff'

export const isBrandColor = (candidate: string | null | undefined): candidate is string =>
  typeof candidate === 'string' && hexColorPattern.test(candidate)

const channelsOf = (hexColor: string): [number, number, number] => [
  Number.parseInt(hexColor.slice(1, 3), 16),
  Number.parseInt(hexColor.slice(3, 5), 16),
  Number.parseInt(hexColor.slice(5, 7), 16),
]

const toHex = (channels: number[]): string =>
  `#${channels.map(channel => Math.round(channel).toString(16).padStart(2, '0')).join('')}`

const relativeLuminance = (hexColor: string): number => {
  const [red, green, blue] = channelsOf(hexColor).map((channel) => {
    const unit = channel / 255
    return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * red! + 0.7152 * green! + 0.0722 * blue!
}

export const contrastRatio = (firstColor: string, secondColor: string): number => {
  const lighter = Math.max(relativeLuminance(firstColor), relativeLuminance(secondColor))
  const darker = Math.min(relativeLuminance(firstColor), relativeLuminance(secondColor))
  return (lighter + 0.05) / (darker + 0.05)
}

export const readableTextOn = (backgroundColor: string): string =>
  contrastRatio(backgroundColor, lightText) >= contrastRatio(backgroundColor, darkText) ? lightText : darkText

const darkPageBackground = '#0a0a0a'
const minimumDarkBackgroundContrast = 3

const mixWithWhite = (brandColor: string, whiteShare: number): string =>
  toHex(channelsOf(brandColor).map(channel => channel + (255 - channel) * whiteShare))

export const darkThemeVariant = (brandColor: string): string => {
  for (let whiteShare = 0.2; whiteShare < 0.85; whiteShare += 0.1) {
    const candidateColor = mixWithWhite(brandColor, whiteShare)
    const isVisibleOnDarkPage = contrastRatio(candidateColor, darkPageBackground) >= minimumDarkBackgroundContrast
    if (isVisibleOnDarkPage) return candidateColor
  }
  return mixWithWhite(brandColor, 0.85)
}

export const applyBrandColor = (brandColor: string | null | undefined) => {
  if (!isBrandColor(brandColor) || typeof document === 'undefined') return

  const darkVariant = darkThemeVariant(brandColor)
  const rootStyle = document.documentElement.style
  rootStyle.setProperty('--brand', brandColor)
  rootStyle.setProperty('--brand-foreground', readableTextOn(brandColor))
  rootStyle.setProperty('--brand-dark', darkVariant)
  rootStyle.setProperty('--brand-dark-foreground', readableTextOn(darkVariant))

  try {
    localStorage.setItem(brandStorageKey, brandColor)
  } catch {}
}

export const cachedBrandColor = (): string | null => {
  try {
    return localStorage.getItem(brandStorageKey)
  } catch {
    return null
  }
}
