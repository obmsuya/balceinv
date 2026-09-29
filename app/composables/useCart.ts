export interface CartAddon {
  id: string
  name: string
  price: number
}

export interface CartLine {
  key: string
  productId: string
  name: string
  variantLabel: string
  sku: string
  unit: string
  price: number
  quantity: number
  addons: CartAddon[]
}

export interface CartSlot {
  lines: CartLine[]
  clientRef: string | null
  note: string
}

export const cartSlotCount = 3

const emptySlot = (): CartSlot => ({ lines: [], clientRef: null, note: '' })

const storageKeyFor = (shopId: string | null | undefined) => `balce:pos-carts:${shopId ?? 'none'}`

const readSlots = (storageKey: string): CartSlot[] => {
  try {
    const storedSlots = JSON.parse(localStorage.getItem(storageKey) ?? 'null')
    if (Array.isArray(storedSlots) && storedSlots.length === cartSlotCount) return storedSlots
  } catch {
  }
  return Array.from({ length: cartSlotCount }, emptySlot)
}

const randomReference = (): string => {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const randomBytes = crypto.getRandomValues(new Uint8Array(16))
  randomBytes[6] = (randomBytes[6]! & 0x0f) | 0x40
  randomBytes[8] = (randomBytes[8]! & 0x3f) | 0x80
  const hex = [...randomBytes].map(randomByte => randomByte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

const lineKeyFor = (productId: string, addons: CartAddon[]) =>
  [productId, ...addons.map(addon => addon.id).sort()].join('+')

export const useCart = () => {
  const { user } = useAuth()
  const storageKey = computed(() => storageKeyFor(user.value?.shop_id))

  const slots = useState<CartSlot[]>('pos:slots', () => Array.from({ length: cartSlotCount }, emptySlot))
  const activeSlotIndex = useState<number>('pos:active-slot', () => 0)
  const lastAddedKey = useState<string | null>('pos:last-added', () => null)
  const selectedKey = useState<string | null>('pos:selected-line', () => null)
  const numpadBuffer = useState<string>('pos:numpad-buffer', () => '')

  const activeSlot = computed(() => slots.value[activeSlotIndex.value]!)
  const unitCount = computed(() => activeSlot.value.lines.reduce((sum, line) => sum + line.quantity, 0))
  const slotUnitCounts = computed(() => slots.value.map(slot => slot.lines.reduce((sum, line) => sum + line.quantity, 0)))

  const loadCarts = () => {
    slots.value = readSlots(storageKey.value)
  }

  const persist = () => {
    try {
      localStorage.setItem(storageKey.value, JSON.stringify(slots.value))
    } catch {
    }
  }

  const touch = () => {
    activeSlot.value.clientRef = null
    persist()
  }

  const addLine = (line: Omit<CartLine, 'key' | 'quantity'>, quantity: number) => {
    const key = lineKeyFor(line.productId, line.addons)
    const existingLine = activeSlot.value.lines.find(cartLine => cartLine.key === key)
    if (existingLine) existingLine.quantity = Math.min(existingLine.quantity + quantity, 100000)
    else activeSlot.value.lines.push({ ...line, key, quantity })
    lastAddedKey.value = key
    touch()
  }

  const setQuantity = (key: string, quantity: number) => {
    const cartLine = activeSlot.value.lines.find(line => line.key === key)
    if (!cartLine) return
    if (quantity <= 0) {
      activeSlot.value.lines = activeSlot.value.lines.filter(line => line.key !== key)
      if (selectedKey.value === key) selectedKey.value = null
    } else cartLine.quantity = Math.min(Math.floor(quantity), 100000)
    touch()
  }

  const clearActive = (): CartSlot => {
    const clearedSlot = activeSlot.value
    slots.value[activeSlotIndex.value] = emptySlot()
    selectedKey.value = null
    persist()
    return clearedSlot
  }

  const restoreSlot = (slotIndex: number, slot: CartSlot) => {
    slots.value[slotIndex] = slot
    persist()
  }

  const setNote = (note: string) => {
    activeSlot.value.note = note
    touch()
  }

  const selectSlot = (slotIndex: number) => {
    activeSlotIndex.value = slotIndex
    selectedKey.value = null
  }

  const takeMultiplier = (): number => {
    const typedQuantity = Number(numpadBuffer.value)
    numpadBuffer.value = ''
    return Number.isInteger(typedQuantity) && typedQuantity > 0 ? Math.min(typedQuantity, 100000) : 1
  }

  const checkoutReference = (): string => {
    if (!activeSlot.value.clientRef) {
      activeSlot.value.clientRef = randomReference()
      persist()
    }
    return activeSlot.value.clientRef
  }

  return {
    slots,
    activeSlotIndex,
    activeSlot,
    lastAddedKey,
    selectedKey,
    numpadBuffer,
    unitCount,
    slotUnitCounts,
    loadCarts,
    persist,
    addLine,
    setQuantity,
    clearActive,
    restoreSlot,
    setNote,
    selectSlot,
    takeMultiplier,
    checkoutReference,
  }
}
