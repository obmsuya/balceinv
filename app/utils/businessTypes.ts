import type { Component } from 'vue'
import { Hammer, Pill, ShoppingCart, Sparkles, Store, Warehouse, Wine } from 'lucide-vue-next'
import { t } from '~/utils/i18n'

export interface BusinessTypeOption {
  value: string
  label: string
  icon: Component
}

const businessTypeOption = (value: string, icon: Component): BusinessTypeOption => ({
  value,
  icon,
  get label() {
    return t(`setup.businessTypes.${value}`)
  },
})

export const businessTypes: BusinessTypeOption[] = [
  businessTypeOption('pharmacy', Pill),
  businessTypeOption('supermarket', ShoppingCart),
  businessTypeOption('retail', Store),
  businessTypeOption('hardware', Hammer),
  businessTypeOption('wholesale', Warehouse),
  businessTypeOption('winehouse', Wine),
  businessTypeOption('beauty', Sparkles),
]

export const businessTypeLabel = (value: string): string =>
  businessTypes.find(businessType => businessType.value === value)?.label ?? value
