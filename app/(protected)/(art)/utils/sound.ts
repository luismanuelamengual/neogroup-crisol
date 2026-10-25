import { Howl, Howler } from 'howler'
import { MusicId, ONE_SHOT_MUSIC, SfxId } from '@/app/(protected)/(art)/data/audio'
import { loadArtManifest } from '@/app/(protected)/(art)/utils/art'

/**
 * Music and sound effects (Howler). One theme plays at a time and the next
 * one fades in over it; the themes and effects not made yet are silent. The
 * volumes are kept on the device.
 */

export interface SoundSettings {
  /** 0..1 */
  music: number
  sfx: number
  muted: boolean
}

const STORAGE_KEY = 'crisol:sound'
const DEFAULT_SETTINGS: SoundSettings = { music: 0.6, sfx: 0.8, muted: false }
const FADE_MS = 900
let settings: SoundSettings = readSettings()
let current: { id: MusicId; howl: Howl } | null = null
/** The theme asked for last (the manifest may still be loading). */
let requested: MusicId | null = null
const effects = new Map<SfxId, Howl>()
const listeners = new Set<(settings: SoundSettings) => void>()

function readSettings(): SoundSettings {
  try {
    const stored = typeof localStorage === 'undefined' ? null : localStorage.getItem(STORAGE_KEY)

    return stored ? { ...DEFAULT_SETTINGS, ...(JSON.parse(stored) as Partial<SoundSettings>) } : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function getSoundSettings(): SoundSettings {
  return settings
}

export function setSoundSettings(change: Partial<SoundSettings>): void {
  settings = { ...settings, ...change }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Not kept (private mode): it still applies now.
  }

  Howler.mute(settings.muted)
  current?.howl.volume(settings.music)
  listeners.forEach((listener) => listener(settings))
}

export function onSoundSettings(listener: (settings: SoundSettings) => void): () => void {
  listeners.add(listener)

  return () => listeners.delete(listener)
}

/** Plays a theme (fading out the previous one); nothing when it is already playing or does not exist yet. */
export async function playMusic(id: MusicId): Promise<void> {
  if (requested === id) {
    return
  }

  requested = id

  const { music } = await loadArtManifest()

  if (requested !== id) {
    return
  }

  const previous = current

  current = null

  if (previous) {
    previous.howl.fade(previous.howl.volume(), 0, FADE_MS)
    setTimeout(() => previous.howl.unload(), FADE_MS + 50)
  }

  if (!music.includes(id)) {
    return
  }

  const howl = new Howl({
    src: [`/audio/music/${id}.mp3`],
    loop: !ONE_SHOT_MUSIC.includes(id),
    volume: 0,
    html5: true
  })

  Howler.mute(settings.muted)
  current = { id, howl }
  // Browsers block sound until the first tap: then it starts.
  howl.once('playerror', () => howl.once('unlock', () => howl.play()))
  howl.once('end', () => {
    // A one-shot theme (victory, defeat) can play again later.
    if (current?.howl === howl && !howl.loop()) {
      current = null
      requested = null
    }
  })
  howl.play()
  howl.fade(0, settings.music, FADE_MS)
}

export function stopMusic(): void {
  requested = null

  if (current) {
    const { howl } = current

    howl.fade(howl.volume(), 0, FADE_MS)
    setTimeout(() => howl.unload(), FADE_MS + 50)
    current = null
  }
}

/** Plays a sound effect, when it exists. */
export function playSfx(id: SfxId): void {
  void loadArtManifest().then(({ sfx }) => {
    if (!sfx.includes(id) || settings.muted || settings.sfx === 0) {
      return
    }

    let howl = effects.get(id)

    if (!howl) {
      howl = new Howl({ src: [`/audio/sfx/${id}.mp3`] })
      effects.set(id, howl)
    }

    howl.volume(settings.sfx)
    howl.play()
  })
}
