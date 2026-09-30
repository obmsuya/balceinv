import { driver, type Driver, type DriveStep, type Side } from 'driver.js'
import 'driver.js/dist/driver.css'
import '~/assets/css/tour.css'
import type { CurrentUser } from '~/composables/useAuth'
import { t } from '~/utils/i18n'

export type TourName = 'welcome' | 'settings' | 'products' | 'pos' | 'users' | 'roles' | 'shops' | 'stock' | 'customers' | 'orders' | 'suppliers' | 'money' | 'reports' | 'dashboard' | 'discounts' | 'sales' | 'checklist'

interface TourStep {
  key: string
  target?: string
  side?: Side
}

const tourSteps: Record<TourName, TourStep[]> = {
  welcome: [
    { key: 'welcome.hello' },
    { key: 'welcome.menu', target: 'sidebar', side: 'right' },
    { key: 'welcome.pos', target: 'nav-pos', side: 'right' },
    { key: 'welcome.products', target: 'nav-products', side: 'right' },
    { key: 'welcome.users', target: 'nav-users', side: 'right' },
    { key: 'welcome.settings', target: 'nav-settings', side: 'right' },
    { key: 'welcome.language', target: 'language', side: 'bottom' },
    { key: 'welcome.notifications', target: 'notifications', side: 'bottom' },
    { key: 'welcome.account', target: 'account', side: 'bottom' },
    { key: 'welcome.start' },
  ],
  settings: [
    { key: 'settings.tabs', target: 'settings-tabs', side: 'bottom' },
    { key: 'settings.business', target: 'settings-save', side: 'top' },
    { key: 'settings.features', target: 'tab-features', side: 'bottom' },
    { key: 'settings.branding', target: 'tab-branding', side: 'bottom' },
    { key: 'settings.hardware', target: 'tab-hardware', side: 'bottom' },
  ],
  products: [
    { key: 'products.add', target: 'products-add', side: 'bottom' },
    { key: 'products.import', target: 'products-import', side: 'bottom' },
    { key: 'products.search', target: 'products-search', side: 'bottom' },
    { key: 'products.next' },
  ],
  pos: [
    { key: 'pos.search', target: 'pos-search', side: 'bottom' },
    { key: 'pos.products', target: 'pos-products', side: 'top' },
    { key: 'pos.carts', target: 'pos-carts', side: 'left' },
    { key: 'pos.pay', target: 'pos-pay', side: 'top' },
  ],
  users: [
    { key: 'users.add', target: 'users-add', side: 'bottom' },
    { key: 'users.list', target: 'users-list', side: 'top' },
    { key: 'users.roles', target: 'nav-roles', side: 'right' },
  ],
  roles: [
    { key: 'roles.what' },
    { key: 'roles.add', target: 'roles-add', side: 'bottom' },
    { key: 'roles.list', target: 'roles-list', side: 'top' },
  ],
  shops: [
    { key: 'shops.add', target: 'shops-add', side: 'bottom' },
    { key: 'shops.list', target: 'shops-list', side: 'top' },
    { key: 'shops.switch', target: 'account', side: 'bottom' },
  ],
  stock: [
    { key: 'stock.change', target: 'stock-change', side: 'bottom' },
    { key: 'stock.arrived', target: 'stock-arrived', side: 'bottom' },
    { key: 'stock.send', target: 'stock-send', side: 'bottom' },
    { key: 'stock.tabs', target: 'stock-tabs', side: 'bottom' },
  ],
  customers: [
    { key: 'customers.add', target: 'customers-add', side: 'bottom' },
    { key: 'customers.owing', target: 'customers-tabs', side: 'bottom' },
    { key: 'customers.credit' },
  ],
  orders: [
    { key: 'orders.add', target: 'orders-add', side: 'bottom' },
    { key: 'orders.tabs', target: 'orders-tabs', side: 'bottom' },
  ],
  suppliers: [
    { key: 'suppliers.arrived', target: 'suppliers-arrived', side: 'bottom' },
    { key: 'suppliers.pay', target: 'suppliers-pay', side: 'bottom' },
    { key: 'suppliers.tabs', target: 'suppliers-tabs', side: 'bottom' },
  ],
  money: [
    { key: 'money.intro' },
    { key: 'money.out', target: 'money-out', side: 'bottom' },
    { key: 'money.other', target: 'money-other', side: 'bottom' },
    { key: 'money.table', target: 'money-table', side: 'top' },
    { key: 'money.more', target: 'money-more', side: 'bottom' },
  ],
  reports: [
    { key: 'reports.filters', target: 'reports-filters', side: 'bottom' },
    { key: 'reports.list', target: 'reports-table', side: 'top' },
    { key: 'reports.preview', target: 'reports-preview', side: 'left' },
  ],
  dashboard: [
    { key: 'dashboard.today', target: 'dashboard-stats', side: 'bottom' },
    { key: 'dashboard.checklist', target: 'dashboard-checklist', side: 'bottom' },
  ],
  discounts: [
    { key: 'discounts.add', target: 'discounts-add', side: 'bottom' },
    { key: 'discounts.how' },
  ],
  sales: [
    { key: 'sales.search', target: 'sales-filters', side: 'bottom' },
    { key: 'sales.list', target: 'sales-table', side: 'top' },
    { key: 'sales.refund' },
  ],
  checklist: [],
}

const pageTours: Record<string, TourName> = {
  '/settings': 'settings',
  '/products': 'products',
  '/pos': 'pos',
  '/users': 'users',
  '/roles': 'roles',
  '/shops': 'shops',
  '/stock': 'stock',
  '/customers': 'customers',
  '/orders': 'orders',
  '/suppliers': 'suppliers',
  '/money': 'money',
  '/reports': 'reports',
  '/dashboard': 'dashboard',
  '/discounts': 'discounts',
  '/sales': 'sales',
}

let activeTour: Driver | null = null

const isOnScreen = (element: Element): boolean => {
  const bounds = element.getBoundingClientRect()
  return bounds.width > 0 && bounds.height > 0 && bounds.right > 0 && bounds.left < window.innerWidth
}

const findTarget = (target: string): Element | undefined =>
  Array.from(document.querySelectorAll(`[data-tour="${target}"]`)).find(isOnScreen)

const addSkipButton = (footer: HTMLElement, tour: Driver): void => {
  const skipButton = document.createElement('button')
  skipButton.type = 'button'
  skipButton.className = 'balce-tour-skip'
  skipButton.textContent = t('tour.buttons.skip')
  skipButton.addEventListener('click', () => tour.destroy())
  footer.prepend(skipButton)
}

export const useTour = () => {
  const user = useState<CurrentUser | null>('auth:user')
  const { $apiFetch } = useNuxtApp()
  const apiFetch = $apiFetch as typeof $fetch

  const storageKey = (tourName: TourName): string => `balce:tour:${user.value?.id ?? 'guest'}:${tourName}`

  const hasSeen = (tourName: TourName): boolean => {
    if (user.value?.seen_tours?.includes(tourName)) return true
    try {
      return localStorage.getItem(storageKey(tourName)) !== null
    } catch {
      return true
    }
  }

  const markSeen = (tourName: TourName): void => {
    try {
      localStorage.setItem(storageKey(tourName), 'seen')
    } catch {
    }
    if (!user.value || user.value.seen_tours?.includes(tourName)) return
    user.value = { ...user.value, seen_tours: [...(user.value.seen_tours ?? []), tourName] }
    apiFetch('/api/auth/tours', { method: 'PUT', body: { tour: tourName } }).catch(() => {})
  }

  const buildSteps = (tourName: TourName): DriveStep[] => {
    const firstName = user.value?.name.trim().split(/\s+/)[0] ?? ''
    const steps: DriveStep[] = []
    for (const tourStep of tourSteps[tourName]) {
      const element = tourStep.target ? findTarget(tourStep.target) : undefined
      const isTargetMissing = tourStep.target !== undefined && element === undefined
      if (isTargetMissing) continue
      steps.push({
        element,
        popover: {
          title: t(`tour.${tourStep.key}.title`, { name: firstName }),
          description: t(`tour.${tourStep.key}.body`),
          side: tourStep.side,
          align: 'start',
          showButtons: steps.length === 0 ? ['next', 'close'] : ['next', 'previous', 'close'],
        },
      })
    }
    return steps
  }

  const stop = (): void => {
    activeTour?.destroy()
    activeTour = null
  }

  const start = (tourName: TourName): void => {
    stop()
    const steps = buildSteps(tourName)
    if (!steps.length) return
    markSeen(tourName)
    activeTour = driver({
      steps,
      popoverClass: 'balce-tour',
      showProgress: steps.length > 1,
      progressText: t('tour.buttons.progress'),
      nextBtnText: t('tour.buttons.next'),
      prevBtnText: t('tour.buttons.back'),
      doneBtnText: t('tour.buttons.done'),
      overlayOpacity: 0.55,
      stagePadding: 6,
      stageRadius: 10,
      smoothScroll: true,
      onPopoverRender: (popover, { driver: tour }) => {
        if (!tour.isLastStep()) addSkipButton(popover.footer, tour)
      },
      onDestroyed: () => {
        activeTour = null
      },
    })
    activeTour.drive()
  }

  const startIfNew = (path: string): void => {
    if (!user.value) return
    if (!hasSeen('welcome')) {
      start('welcome')
      return
    }
    const pageTour = pageTours[path]
    if (pageTour && !hasSeen(pageTour)) start(pageTour)
  }

  const replay = (path: string): void => {
    start(pageTours[path] ?? 'welcome')
  }

  return { startIfNew, replay, stop, hasSeen, markSeen }
}
