import { isMobile } from 'pixi.js'

/**
 * How hard the canvases of the game can push the device. Phones and tablets
 * have screens with many pixels and GPUs that heat up quickly: there the
 * canvases draw fewer pixels, without antialiasing, and the art is lighter.
 */

/** A phone or a tablet (also an iPad that says it is a Mac: touch only, no mouse). */
export function isHandheld(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  const touchOnly = navigator.maxTouchPoints > 1 && window.matchMedia?.('(pointer: coarse)').matches

  return isMobile.any || Boolean(touchOnly)
}

/** Most screen pixels per CSS pixel a canvas draws: 2 on a computer, 1.5 on a phone (about half the pixels of 2). */
export function canvasResolution(): number {
  return Math.min(window.devicePixelRatio || 1, isHandheld() ? 1.5 : 2)
}

/** Antialiasing (MSAA) only on a computer: on a phone it costs too much for what it shows at its density. */
export function canvasAntialias(): boolean {
  return !isHandheld()
}
