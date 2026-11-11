import { describe, expect, it } from 'vitest'
import { ActorStyle, attackEffectOf, LOOK_COLORS } from '@/app/(protected)/(battle)/utils/attackEffects'
import { ENEMIES } from '@/app/(protected)/(engine)/data/enemies'
import { getSkill, SKILLS } from '@/app/(protected)/(engine)/data/skills'
import { TargetType } from '@/app/(protected)/(engine)/models/TargetType'

const STYLES: ActorStyle[] = ['melee', 'archer', 'mage']

describe('attack effects', () => {
  it('gives every skill a visual effect, for every kind of fighter and side', () => {
    for (const skill of SKILLS) {
      for (const style of STYLES) {
        for (const side of ['hero', 'enemy'] as const) {
          const effect = attackEffectOf(skill, style, side)

          expect(LOOK_COLORS[effect.look], `${skill.id} ${style} ${side}`).toBeDefined()
          expect(effect.scale).toBeGreaterThan(0)
          expect(effect.strike === null).toBe(effect.delivery !== 'contact')
        }
      }
    }
  })

  it('gives every skill of the bestiary a look', () => {
    for (const species of ENEMIES) {
      for (const id of species.skills) {
        expect(attackEffectOf(getSkill(id), 'melee', 'enemy').delivery, `${species.id} ${id}`).toBeTruthy()
      }
    }
  })

  it('puts the heals, buffs and shields over the allies', () => {
    for (const skill of SKILLS.filter(
      (skill) => skill.target !== TargetType.ENEMY && skill.target !== TargetType.ALL_ENEMIES
    )) {
      expect(attackEffectOf(skill, 'melee', 'hero').delivery, skill.id).toBe('aura')
    }

    expect(attackEffectOf(getSkill('oren-mend'), 'melee', 'hero').look).toBe('heal')
    expect(attackEffectOf(getSkill('ysolde-arcane-shield'), 'mage', 'hero').shield).toBe(true)
  })

  it('cuts, stabs and hits up close with the weapons and the claws', () => {
    expect(attackEffectOf(getSkill('kael-strike'), 'melee', 'hero')).toMatchObject({
      approach: 'lunge',
      strike: 'slash'
    })
    expect(attackEffectOf(getSkill('kael-mace-blow'), 'melee', 'hero').strike).toBe('blunt')
    expect(attackEffectOf(getSkill('kael-flame-edge'), 'melee', 'hero')).toMatchObject({
      strike: 'slash',
      look: 'fire'
    })
    expect(attackEffectOf(getSkill('claw'), 'melee', 'enemy').strike).toBe('claw')
    expect(attackEffectOf(getSkill('venom-bite'), 'melee', 'enemy')).toMatchObject({ strike: 'bite', look: 'poison' })
    expect(attackEffectOf(getSkill('gore'), 'melee', 'enemy').strike).toBe('pierce')
  })

  it('shoots arrows with the bows and the archers of the bestiary', () => {
    expect(attackEffectOf(getSkill('sera-shot'), 'archer', 'hero').delivery).toBe('arrow')
    expect(attackEffectOf(getSkill('arrow'), 'melee', 'enemy').delivery).toBe('arrow')
  })

  it('has Ysolde cast every attack from her spot, with a different ray for each kind', () => {
    const ysolde = SKILLS.filter((skill) => skill.id.startsWith('ysolde-'))

    for (const skill of ysolde) {
      expect(attackEffectOf(skill, 'mage', 'hero').approach, skill.id).toBe('cast')
    }

    const delivery = (id: string) => attackEffectOf(getSkill(id), 'mage', 'hero').delivery

    expect(attackEffectOf(getSkill('ysolde-seal-bolt'), 'mage', 'hero')).toMatchObject({
      delivery: 'bolt',
      look: 'arcane'
    })
    expect(delivery('ysolde-thunder-page')).toBe('zigzag')
    expect(delivery('ysolde-prism-ray')).toBe('beam')
    expect(delivery('ysolde-fireball')).toBe('bolt')
    expect(delivery('ysolde-frost-lance')).toBe('lance')
    expect(delivery('ysolde-chain-lightning')).toBe('chain')
    expect(delivery('ysolde-meteor')).toBe('meteor')
    expect(delivery('ysolde-blizzard')).toBe('storm')
    expect(delivery('ysolde-frozen-tomb')).toBe('rise')
  })

  it('has the casters of the bestiary cast their elements from their spot', () => {
    expect(attackEffectOf(getSkill('fire-bolt'), 'melee', 'enemy')).toMatchObject({
      approach: 'cast',
      delivery: 'bolt'
    })
    expect(attackEffectOf(getSkill('lightning-wave'), 'melee', 'enemy').delivery).toBe('sky')
    expect(attackEffectOf(getSkill('fire-breath'), 'melee', 'enemy').delivery).toBe('breath')
    expect(attackEffectOf(getSkill('soul-drain'), 'melee', 'enemy').delivery).toBe('drain')
    expect(attackEffectOf(getSkill('claw'), 'melee', 'enemy').approach).toBe('lunge')
  })

  it('draws the strongest skills bigger', () => {
    expect(attackEffectOf(getSkill('kael-execution'), 'melee', 'hero').scale).toBeGreaterThan(
      attackEffectOf(getSkill('kael-strike'), 'melee', 'hero').scale
    )
  })
})
