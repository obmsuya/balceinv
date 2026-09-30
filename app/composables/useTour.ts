import { driver, type Driver, type DriveStep, type Side } from 'driver.js'
import 'driver.js/dist/driver.css'
import '~/assets/css/tour.css'
import type { CurrentUser } from '~/composables/useAuth'
import { t } from '~/utils/i18n'

type TourName = 'welcome' | 'settings' | 'products' | 'pos'

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
}

const pageTours: Record<string, TourName> = {
  '/settings': 'settings',
  '/products': 'products',
  '/pos': 'pos',
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

  const storageKey = (tourName: TourName): string => `balce:tour:${user.value?.id ?? 'guest'}:${tourName}`

  const hasSeen = (tourName: TourName): boolean => {
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

  return { startIfNew, replay, stop }
}
