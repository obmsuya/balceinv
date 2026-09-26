import type { Component } from 'vue'
import { Hammer, Pill, ShoppingCart, Sparkles, Store, Warehouse, Wine } from 'lucide-vue-next'

export interface BusinessTypeOption {
  value: string
  label: string
  icon: Component
}

export const businessTypes: BusinessTypeOption[] = [
  { value: 'pharmacy', label: 'Pharmacy', icon: Pill },
  { value: 'supermarket', label: 'Supermarket', icon: ShoppingCart },
  { value: 'retail', label: 'Retail Store', icon: Store },
  { value: 'hardware', label: 'Hardware Store', icon: Hammer },
  { value: 'wholesale', label: 'Wholesaler', icon: Warehouse },
  { value: 'winehouse', label: 'Wine & Spirits', icon: Wine },
  { value: 'beauty', label: 'Beauty & Cosmetics', icon: Sparkles },
]

export const businessTypeLabel = (value: string): string =>
  businessTypes.find(businessType => businessType.value === value)?.label ?? value
