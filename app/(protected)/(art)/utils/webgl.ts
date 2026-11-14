import { Application } from 'pixi.js'

/**
 * The canvases of the game after the WebGL context is lost and restored: it
 * happens on phones when the app goes to the background (above all an
 * installed PWA that the system suspends) and comes back.
 *
 * PixiJS uploads the textures that have an image again on its own, but two
 * things come back black and are fixed here:
 * - its record of which texture sits in each texture unit is reset only for
 *   the first 16 units, and many GPUs have 32: the sprites batched in the
 *   others show as black boxes until the record is reset in full;
 * - the pictures drawn by code into the GPU (render textures) have no image
 *   to upload from: whoever owns them draws them again (`onRestored`).
 *
 * Returns the function that stops listening (call it before destroying the app).
 */
export function recoverFromContextLoss(app: Application, onRestored?: () => void): () => void {
  const canvas = app.canvas

  // Added after the listener of PixiJS (in app.init), so it runs once PixiJS has restored its systems.
  const handleRestored = () => {
    app.renderer.resetState()
    onRestored?.()
  }

  canvas.addEventListener('webglcontextrestored', handleRestored)

  return () => canvas.removeEventListener('webglcontextrestored', handleRestored)
}
