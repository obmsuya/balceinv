import { applyBrandColor, cachedBrandColor } from '~/utils/brandTheme'

export default defineNuxtPlugin({
  name: 'brand',
  enforce: 'pre',
  setup() {
    applyBrandColor(cachedBrandColor())
  },
})
