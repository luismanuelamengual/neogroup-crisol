import { describe, expect, it } from 'vitest'
import { ARROW_LOOKS, arrowKindOf } from '@/app/(protected)/(battle)/utils/arrows'
import { getSkill } from '@/app/(protected)/(engine)/data/skills'
import { DamageType } from '@/app/(protected)/(engine)/models/DamageType'
import { StatusType } from '@/app/(protected)/(engine)/models/StatusType'

describe('arrows', () => {
  it('picks the arrow of a skill by what it does', () => {
    expect(arrowKindOf(getSkill('sera-shot'))).toBe('plain')
    expect(arrowKindOf(getSkill('sera-frost-bolt'))).toBe('ice')
    expect(arrowKindOf(getSkill('sera-gale-shot'))).toBe('lightning')
    expect(arrowKindOf(getSkill('sera-blinding-arrow'))).toBe('light')
    expect(arrowKindOf({ damageType: DamageType.FIRE })).toBe('fire')
    expect(arrowKindOf({ damageType: DamageType.DARKNESS })).toBe('magic')
    expect(
      arrowKindOf({ damageType: DamageType.PIERCE, statuses: [{ type: StatusType.POISON, chance: 1, turns: 2 }] })
    ).toBe('poison')
  })

  it('has a look for every kind', () => {
    for (const look of Object.values(ARROW_LOOKS)) {
      expect(typeof look.shaft).toBe('number')
      expect(typeof look.trail).toBe('number')
    }
  })
})
