import { useDebounceFn } from '@vueuse/core'
import type { CartLine } from '~/composables/useCart'
import type { SaleLine, SaleLineInput, SaleQuote } from '~/composables/useSales'

export interface LinePrice {
  amount: number
  isExact: boolean
  quoted: SaleLine | null
  inStock: number | null
}

const quoteDelayMilliseconds = 120

export const useTillQuote = () => {
  const { activeSlot } = useCart()
  const { quoteSale } = useSales()

  const quote = ref<SaleQuote | null>(null)
  const quotedKeys = ref<string[]>([])
  const quoteError = ref('')
  const quoting = ref(false)
  let quoteGeneration = 0

  const cartItems = computed<SaleLineInput[]>(() => activeSlot.value.lines.map(cartLine => ({
    product_id: cartLine.productId,
    quantity: cartLine.quantity,
    addon_ids: cartLine.addons.map(addon => addon.id),
  })))

  const quotedByKey = computed(() => {
    const linesByKey = new Map<string, SaleLine>()
    quotedKeys.value.forEach((lineKey, lineIndex) => {
      const quotedLine = quote.value?.lines[lineIndex]
      if (quotedLine) linesByKey.set(lineKey, quotedLine)
    })
    return linesByKey
  })

  const priceOf = (cartLine: CartLine): LinePrice => {
    const quotedLine = quotedByKey.value.get(cartLine.key) ?? null
    const inStock = quotedLine?.in_stock ?? null
    if (quotedLine && quotedLine.quantity === cartLine.quantity) {
      return { amount: quotedLine.line_total, isExact: true, quoted: quotedLine, inStock }
    }
    if (quotedLine) {
      return { amount: Math.round((quotedLine.line_total / quotedLine.quantity) * cartLine.quantity), isExact: false, quoted: quotedLine, inStock }
    }
    const addonsUnitTotal = cartLine.addons.reduce((sum, addon) => sum + addon.price, 0)
    return { amount: (cartLine.price + addonsUnitTotal) * cartLine.quantity, isExact: false, quoted: null, inStock }
  }

  const linePrices = computed(() => activeSlot.value.lines.map(priceOf))
  const total = computed(() => linePrices.value.reduce((sum, linePrice) => sum + linePrice.amount, 0))
  const isExact = computed(() => quote.value !== null
    && quote.value.lines.length === linePrices.value.length
    && linePrices.value.every(linePrice => linePrice.isExact))
  const shortLineCount = computed(() => activeSlot.value.lines.filter((cartLine, lineIndex) => {
    const inStock = linePrices.value[lineIndex]?.inStock
    return inStock != null && cartLine.quantity > inStock
  }).length)

  const requestQuote = async (): Promise<void> => {
    const generation = ++quoteGeneration
    const requestedItems = cartItems.value
    const requestedKeys = activeSlot.value.lines.map(cartLine => cartLine.key)
    if (!requestedItems.length) {
      quote.value = null
      quotedKeys.value = []
      quoteError.value = ''
      quoting.value = false
      return
    }
    quoting.value = true
    try {
      const freshQuote = await quoteSale(requestedItems)
      if (generation !== quoteGeneration) return
      quote.value = freshQuote
      quotedKeys.value = requestedKeys
      quoteError.value = ''
    } catch (error: any) {
      if (generation !== quoteGeneration) return
      const isOffline = !error?.status && !error?.statusCode
      quoteError.value = isOffline ? 'Cannot reach the server to price the cart. Check the connection.' : error?.data?.message || 'Could not price the cart'
    } finally {
      if (generation === quoteGeneration) quoting.value = false
    }
  }

  const requestQuoteSoon = useDebounceFn(requestQuote, quoteDelayMilliseconds)

  const settleQuote = async (): Promise<void> => {
    for (let attempt = 0; attempt < 3; attempt++) {
      await requestQuote()
      if (quoteError.value || (isExact.value && !quoting.value)) return
    }
  }

  watch(cartItems, () => {
    quoting.value = true
    requestQuoteSoon()
  }, { deep: true })

  return {
    quote,
    quoteError,
    quoting,
    cartItems,
    linePrices,
    total,
    isExact,
    shortLineCount,
    requestQuote,
    settleQuote,
  }
}
