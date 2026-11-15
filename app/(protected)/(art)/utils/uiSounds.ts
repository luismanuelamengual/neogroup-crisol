import { playSfx } from '@/app/(protected)/(art)/utils/sound'

/** What sounds when pressed: buttons, links, tabs, switches and menu entries. */
const PRESSABLE =
  'button, a[href], [role="button"], [role="tab"], [role="menuitem"], [role="option"], [role="switch"], input[type="checkbox"]'
/** Windows that sound when they open and close: dialogs, drawers and menus (MUI mounts them on the body). */
const WINDOW = '.MuiModal-root'

/**
 * The sounds of the interface, for every screen at once: a click when a
 * button (or link, tab...) is pressed and a whoosh when a window opens or
 * closes. An element with data-silent (or inside one) makes no click.
 * Returns the function that removes them.
 */
export function installUiSounds(): () => void {
  const handleClick = (event: MouseEvent) => {
    const element = (event.target as Element | null)?.closest?.(PRESSABLE)

    if (
      element &&
      !element.closest('[data-silent]') &&
      !element.matches(':disabled') &&
      element.getAttribute('aria-disabled') !== 'true'
    ) {
      playSfx('button')
    }
  }

  const windows = (nodes: NodeList) =>
    [...nodes].some((node) => node instanceof Element && node.matches(WINDOW) && !node.closest('[data-silent]'))
  const observer = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => windows(mutation.addedNodes))) {
      playSfx('menu-open')
    } else if (mutations.some((mutation) => windows(mutation.removedNodes))) {
      playSfx('menu-close')
    }
  })

  document.addEventListener('click', handleClick, true)
  observer.observe(document.body, { childList: true })

  return () => {
    document.removeEventListener('click', handleClick, true)
    observer.disconnect()
  }
}
