import { applyBrandColor, cachedBrandColor } from '~/utils/brandTheme'
import { restoreSavedLocale } from '~/utils/i18n'

export default defineNuxtPlugin({
  name: 'brand',
  enforce: 'pre',
  setup() {
    applyBrandColor(cachedBrandColor())
    restoreSavedLocale()
    useHead({ titleTemplate: pageTitle => (pageTitle ? `${pageTitle} · Faltasi POS` : 'Faltasi POS') })
  },
})
