import { MUSIC_LEVELS, MusicId, ONE_SHOT_MUSIC, SfxId } from '@/app/(protected)/(art)/data/audio'
import { loadArtManifest } from '@/app/(protected)/(art)/utils/art'
import { synthesize } from '@/app/(protected)/(art)/utils/sfxSynth'

/**
 * Music and sound effects, on one Web Audio context:
 *
 *   music tracks ─▶ music volume ─┐
 *   effects ──────▶ effects volume ┴─▶ mute ─▶ speakers
 *
 * One theme plays at a time and the next one fades in over it; a theme
 * without a file is silent. Themes stream from an <audio> element (they are
 * long) routed through the context, so their volume works on phones too. An
 * effect plays its file when there is one and is synthesized otherwise (see
 * sfxSynth.ts). Browsers keep audio locked until the first tap or key: then
 * it starts. When the game goes to the background everything pauses. The
 * volumes are kept on the device.
 */

export interface SoundSettings {
  /** 0..1 */
  music: number
  sfx: number
  muted: boolean
}

interface Track {
  id: MusicId
  element: HTMLAudioElement
  source: MediaElementAudioSourceNode
  gain: GainNode
}

interface Engine {
  context: AudioContext
  mute: GainNode
  music: GainNode
  sfx: GainNode
}

const STORAGE_KEY = 'crisol:sound'
const DEFAULT_SETTINGS: SoundSettings = { music: 0.6, sfx: 0.8, muted: false }
const FADE_S = 1.2
/** At most this many effects at once (a phone chokes with more). */
const MAX_VOICES = 14
/** The same effect is not repeated closer than this (seconds). */
const REPEAT_GAP_S = 0.035
/** A theme left (the map's, when a battle starts) is kept paused this long, to go on where it was when coming back. */
const KEEP_PAUSED_MS = 3 * 60 * 1000
const EXTENSIONS = ['ogg', 'mp3'] as const
let settings: SoundSettings = readSettings()
let engine: Engine | null = null
let current: Track | null = null
/** The theme left last, paused, and since when. */
let paused: { track: Track; since: number } | null = null
/** The theme asked for last (the manifest may still be loading). */
let requested: MusicId | null = null
let voices = 0
const lastPlayed = new Map<SfxId, number>()
const buffers = new Map<SfxId, Promise<AudioBuffer | null>>()
const listeners = new Set<(settings: SoundSettings) => void>()

function readSettings(): SoundSettings {
  try {
    const stored = typeof localStorage === 'undefined' ? null : localStorage.getItem(STORAGE_KEY)

    return stored ? { ...DEFAULT_SETTINGS, ...(JSON.parse(stored) as Partial<SoundSettings>) } : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

/** The audio context and its volumes, made the first time they are needed (in the browser only). */
function getEngine(): Engine | null {
  if (engine || typeof window === 'undefined') {
    return engine
  }

  const Context =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext

  if (!Context) {
    return null
  }

  const context = new Context({ latencyHint: 'interactive' })
  const mute = context.createGain()
  const music = context.createGain()
  const sfx = context.createGain()
  // Keeps several effects at once from clipping.
  const limiter = context.createDynamicsCompressor()

  limiter.threshold.value = -10
  limiter.knee.value = 8
  limiter.ratio.value = 6
  limiter.attack.value = 0.003
  limiter.release.value = 0.15
  sfx.connect(limiter).connect(mute)
  music.connect(mute)
  mute.connect(context.destination)
  engine = { context, mute, music, sfx }
  applyVolumes()
  installUnlock(context)

  return engine
}

function applyVolumes(): void {
  if (!engine) {
    return
  }

  const now = engine.context.currentTime

  engine.mute.gain.setTargetAtTime(settings.muted ? 0 : 1, now, 0.03)
  engine.music.gain.setTargetAtTime(settings.music, now, 0.03)
  engine.sfx.gain.setTargetAtTime(settings.sfx, now, 0.03)
}

/**
 * Browsers start audio only from a tap or a key: the first one resumes the
 * context (and plays a silent sound, which iOS needs) and the theme waiting
 * starts. Going to the background pauses it all; coming back resumes it.
 */
function installUnlock(context: AudioContext): void {
  const unlock = () => {
    if (document.visibilityState !== 'visible') {
      return
    }

    void context.resume().then(() => {
      if (current && current.element.paused) {
        void current.element.play().catch(() => undefined)
      }
    })

    const silent = context.createBufferSource()

    silent.buffer = context.createBuffer(1, 1, context.sampleRate)
    silent.connect(context.destination)
    silent.start()
  }

  const events = ['pointerdown', 'touchend', 'keydown'] as const

  for (const event of events) {
    window.addEventListener(event, unlock, { capture: true, passive: true })
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      current?.element.pause()
      void context.suspend().catch(() => undefined)
    } else {
      unlock()
    }
  })
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

  applyVolumes()
  listeners.forEach((listener) => listener(settings))
}

export function onSoundSettings(listener: (settings: SoundSettings) => void): () => void {
  listeners.add(listener)

  return () => listeners.delete(listener)
}

/**
 * The file of a sound, if there is one: the manifest lists them as
 * "<name>.<extension>" (older ones without extension are MP3). OGG first
 * when the browser plays it (it loops without a gap), MP3 otherwise.
 */
export function audioFile(kind: 'music' | 'sfx', id: string, files: string[]): string | null {
  const found = files
    .map((file) => (/\.(mp3|ogg)$/.test(file) ? file : `${file}.mp3`))
    .filter((file) => file.replace(/\.(mp3|ogg)$/, '') === id)
  const oggPlays =
    typeof document !== 'undefined' && document.createElement('audio').canPlayType('audio/ogg; codecs="vorbis"') !== ''
  const file = EXTENSIONS.filter((extension) => extension !== 'ogg' || oggPlays)
    .map((extension) => found.find((name) => name.endsWith(`.${extension}`)))
    .find(Boolean)

  return file ? `/audio/${kind}/${file}` : null
}

function fadeOut(track: Track, keep: boolean): void {
  const { context } = engine!
  const now = context.currentTime

  track.gain.gain.cancelScheduledValues(now)
  track.gain.gain.setValueAtTime(track.gain.gain.value, now)
  track.gain.gain.linearRampToValueAtTime(0, now + FADE_S)

  if (keep && track.element.loop) {
    if (paused && paused.track !== track) {
      unload(paused.track)
    }

    paused = { track, since: Date.now() }
    setTimeout(() => paused?.track === track && current !== track && track.element.pause(), FADE_S * 1000 + 50)
  } else {
    setTimeout(() => current !== track && paused?.track !== track && unload(track), FADE_S * 1000 + 50)
  }
}

function unload(track: Track): void {
  track.element.pause()
  track.element.removeAttribute('src')
  track.element.load()
  track.source.disconnect()
  track.gain.disconnect()
}

function fadeIn(track: Track): void {
  const { context } = engine!
  const now = context.currentTime
  const level = MUSIC_LEVELS[track.id] ?? 1

  track.gain.gain.cancelScheduledValues(now)
  track.gain.gain.setValueAtTime(track.gain.gain.value, now)
  track.gain.gain.linearRampToValueAtTime(level, now + FADE_S)
  // Locked until the first tap: installUnlock starts it then.
  void track.element.play().catch(() => undefined)
}

/** Plays a theme (fading out the previous one); nothing when it is already playing. A theme without a file is silence. */
export async function playMusic(id: MusicId): Promise<void> {
  if (requested === id) {
    return
  }

  requested = id

  const { music } = await loadArtManifest()
  const sound = getEngine()

  if (requested !== id || !sound) {
    return
  }

  const previous = current

  current = null

  if (previous) {
    // A battle's theme is never kept; a map's (or the menu's) is, to go on where it was.
    fadeOut(previous, !['battle', 'boss', 'seal', 'crisol'].includes(previous.id))
  }

  if (paused?.track.id === id && Date.now() - paused.since < KEEP_PAUSED_MS) {
    current = paused.track
    paused = null
    fadeIn(current)

    return
  }

  const src = audioFile('music', id, music)

  if (!src) {
    return
  }

  const element = new Audio()

  element.src = src
  element.preload = 'auto'
  element.loop = !ONE_SHOT_MUSIC.includes(id)
  // Plays inline on iOS (no full screen player).
  element.setAttribute('playsinline', '')

  const gain = sound.context.createGain()
  const source = sound.context.createMediaElementSource(element)

  gain.gain.value = 0
  source.connect(gain).connect(sound.music)

  const track: Track = { id, element, source, gain }

  current = track
  element.addEventListener('ended', () => {
    // A one-shot theme (victory, defeat) can play again later.
    if (current === track) {
      current = null
      requested = null
      unload(track)
    }
  })
  fadeIn(track)
}

export function stopMusic(): void {
  requested = null

  if (current && engine) {
    fadeOut(current, false)
    current = null
  }
}

/** The theme playing now (for the sounds page). */
export function currentMusic(): MusicId | null {
  return current?.id ?? null
}

/** The decoded file of an effect, loaded once. */
function effectBuffer(id: SfxId, src: string, context: AudioContext): Promise<AudioBuffer | null> {
  let buffer = buffers.get(id)

  if (!buffer) {
    buffer = fetch(src)
      .then((response) => (response.ok ? response.arrayBuffer() : Promise.reject(new Error(src))))
      .then((data) => context.decodeAudioData(data))
      .catch(() => null)
    buffers.set(id, buffer)
  }

  return buffer
}

/** Plays a sound effect: its file when it has one, synthesized otherwise. Silent until audio is unlocked. */
export function playSfx(id: SfxId): void {
  if (settings.muted || settings.sfx === 0) {
    return
  }

  const sound = getEngine()

  // Before the first tap nothing is heard: queued effects would all burst at once later.
  if (!sound || sound.context.state !== 'running' || voices >= MAX_VOICES) {
    return
  }

  const now = sound.context.currentTime

  if (now - (lastPlayed.get(id) ?? -1) < REPEAT_GAP_S) {
    return
  }

  lastPlayed.set(id, now)

  const finished = (seconds: number) => {
    voices++
    setTimeout(() => voices--, seconds * 1000 + 100)
  }

  void loadArtManifest().then(async ({ sfx }) => {
    const src = audioFile('sfx', id, sfx)
    const buffer = src ? await effectBuffer(id, src, sound.context) : null

    if (!buffer) {
      finished(synthesize(id, sound.context, sound.sfx))

      return
    }

    const source = sound.context.createBufferSource()

    source.buffer = buffer
    source.connect(sound.sfx)
    source.start()
    finished(buffer.duration)
  })
}
