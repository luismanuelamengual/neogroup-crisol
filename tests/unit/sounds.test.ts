import { describe, expect, it } from 'vitest'
import { SFX } from '@/app/(protected)/(art)/data/audio'
import { synthesize } from '@/app/(protected)/(art)/utils/sfxSynth'
import { audioFile } from '@/app/(protected)/(art)/utils/sound'
import { soundOf } from '@/app/(protected)/(battle)/utils/battleSounds'
import { DamageType } from '@/app/(protected)/(engine)/models/DamageType'
import { StatusType } from '@/app/(protected)/(engine)/models/StatusType'

/** Just enough of an audio context to schedule the effects and count what they make. */
function fakeContext() {
  const made = { oscillators: 0, noises: 0 }
  const param = () => ({
    value: 0,
    setValueAtTime: () => undefined,
    linearRampToValueAtTime: () => undefined,
    exponentialRampToValueAtTime: () => undefined,
    setValueCurveAtTime: () => undefined
  })
  const node = (): object => ({ connect: (next: unknown) => next ?? node(), disconnect: () => undefined })
  const context = {
    currentTime: 0,
    sampleRate: 8000,
    createGain: () => ({ ...node(), gain: param() }),
    createBiquadFilter: () => ({ ...node(), type: 'lowpass', Q: param(), frequency: param() }),
    createOscillator: () => {
      made.oscillators++

      return { ...node(), type: 'sine', frequency: param(), start: () => undefined, stop: () => undefined }
    },
    createBufferSource: () => {
      made.noises++

      return { ...node(), buffer: null, start: () => undefined, stop: () => undefined }
    },
    createBuffer: (channels: number, length: number) => ({
      duration: length / 8000,
      getChannelData: () => new Float32Array(length)
    })
  }

  return { context: context as unknown as BaseAudioContext, made }
}

describe('sounds', () => {
  it('synthesizes every effect, short enough not to pile up', () => {
    for (const id of SFX) {
      const { context, made } = fakeContext()
      const seconds = synthesize(id, context, context as unknown as AudioNode)

      expect(made.oscillators + made.noises, id).toBeGreaterThan(0)
      expect(seconds, id).toBeGreaterThan(0)
      expect(seconds, id).toBeLessThanOrEqual(2.5)
    }
  })

  it('finds the file of a sound, MP3 when the browser cannot play OGG', () => {
    expect(audioFile('music', 'battle', ['battle.mp3', 'boss.ogg'])).toBe('/audio/music/battle.mp3')
    expect(audioFile('music', 'battle', ['battle'])).toBe('/audio/music/battle.mp3')
    expect(audioFile('music', 'menu', ['battle.mp3'])).toBeNull()
  })

  it('gives each battle event its sound', () => {
    const hit = {
      type: 'damage',
      targetId: 'a',
      amount: 10,
      damageType: DamageType.FIRE,
      critical: false,
      weak: false,
      resisted: false
    } as const

    expect(soundOf(hit, 'enemy')).toEqual(['fire'])
    expect(soundOf(hit, 'hero')).toEqual(['fire', 'hurt'])
    expect(soundOf({ ...hit, critical: true }, 'enemy')).toEqual(['critical'])
    expect(soundOf({ type: 'status', targetId: 'a', status: StatusType.POISON, turns: 2 }, 'enemy')).toEqual(['debuff'])
    expect(soundOf({ type: 'status', targetId: 'a', status: StatusType.REGEN, turns: 2 }, 'hero')).toEqual(['buff'])
    expect(soundOf({ type: 'shields', targetId: 'a', change: -1, shields: 1 }, 'enemy')).toEqual(['block'])
    expect(soundOf({ type: 'turn', actorId: 'a' }, null)).toEqual([])
  })
})
