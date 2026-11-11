import { describe, expect, it } from 'vitest'
import { CHARACTERS } from '@/app/(protected)/(engine)/data/characters'
import {
  BOSS_SPECIES,
  ENEMIES,
  FINAL_BOSS_SPECIES,
  getBiomeSpecies,
  getSpecies,
  GUARDIAN_SPECIES
} from '@/app/(protected)/(engine)/data/enemies'
import { getSkill, SKILLS } from '@/app/(protected)/(engine)/data/skills'
import { getSkillTree } from '@/app/(protected)/(engine)/data/skillTrees'
import { Biome } from '@/app/(protected)/(engine)/models/Biome'
import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'
import { Stance } from '@/app/(protected)/(engine)/models/Stance'
import { World } from '@/app/(protected)/(engine)/models/World'
import { getEncounterPhases } from '@/app/(protected)/(engine)/utils/encounters'
import { createInitialGameState } from '@/app/(protected)/(engine)/utils/gameState'
import { getEncounter, indexWorld } from '@/app/(protected)/(engine)/utils/worldMap'
import { LOCALES } from '@/app/i18n/config'
import { getMessages } from '@/app/i18n/messages'
import storedWorld from '@/public/world/world.json'

const index = indexWorld(storedWorld as unknown as World)
const section = (locale: (typeof LOCALES)[number], name: string) =>
  (getMessages(locale) as unknown as Record<string, Record<string, unknown>>)[name]

describe('bestiary content', () => {
  it('has nine species in each biome and 54 bosses', () => {
    for (const biome of Object.values(Biome)) {
      expect(getBiomeSpecies(biome), biome).toHaveLength(9)
    }

    expect(ENEMIES.filter((species) => species.rarity === 'boss')).toHaveLength(54)
  })

  it('gives every species a free basic attack, known skills and a name in every language', () => {
    for (const species of ENEMIES) {
      expect(getSkill(species.skills[0]).cost, species.id).toBe(0)
      species.skills.forEach((skill) => getSkill(skill))
      species.phaseSkills?.flat().forEach((skill) => getSkill(skill))

      for (const locale of LOCALES) {
        expect(section(locale, 'enemies')[species.id], `${locale} ${species.id}`).toBeTypeOf('string')
      }
    }
  })

  it('names every skill in every language', () => {
    for (const skill of SKILLS) {
      for (const locale of LOCALES) {
        expect(section(locale, 'skills')[skill.id], `${locale} ${skill.id}`).toBeTypeOf('string')
      }
    }
  })
})

describe('skill trees', () => {
  it('gives each hero a web of its own specials, of its own shape, all reachable from its starting one', () => {
    const seen = new Set<string>()
    const shapes = new Set<string>()

    for (const character of CHARACTERS) {
      const tree = getSkillTree(character.id)

      expect(tree.root).toBe(character.skills[1])
      expect(tree.nodes.length).toBeGreaterThanOrEqual(20)
      expect(new Set(tree.nodes.map((node) => `${node.x},${node.y}`)).size).toBe(tree.nodes.length)
      shapes.add(
        tree.nodes
          .map((node) => `${node.x},${node.y}`)
          .sort()
          .join(' ')
      )

      for (const node of tree.nodes) {
        expect(seen.has(node.skillId), node.skillId).toBe(false)
        seen.add(node.skillId)
        expect(node.skillId.startsWith(character.id), node.skillId).toBe(true)
        expect(node.cost > 0, node.skillId).toBe(node.skillId !== tree.root)
        expect(section('es', 'skills')[node.skillId], node.skillId).toBeTypeOf('string')
        expect(section('en', 'skills')[node.skillId], node.skillId).toBeTypeOf('string')
      }
    }

    expect(shapes.size).toBe(CHARACTERS.length)
  })
})

describe('bosses of the world', () => {
  it('has its own boss for every camp, captor and Seal, and a guardian for every guarded sanctuary', () => {
    for (const node of index.world.nodes) {
      if (node.bossId) {
        expect(getSpecies(BOSS_SPECIES[node.bossId]).rarity, node.bossId).toBe('boss')
      }

      if (node.guardian) {
        expect(GUARDIAN_SPECIES[node.biome], `rune ${node.runeIndex}`).toContain(node.guardianId)
        expect(getSpecies(node.guardianId!).rarity, `rune ${node.runeIndex}`).toBe('boss')
      }
    }

    expect(getSpecies(FINAL_BOSS_SPECIES).bars).toBe(3)
  })

  it('builds the enemies of every point from known species', () => {
    const fresh = { ...createInitialGameState('test'), clearedNodeIds: [] }

    for (const node of index.world.nodes) {
      const encounter = getEncounter(index, fresh, node.id)

      if (encounter) {
        getEncounterPhases(node, encounter)
          .flat()
          .forEach((spawn) => getSpecies(spawn.speciesId))
      }
    }
  })
})

describe('Kael’s stances', () => {
  const tree = getSkillTree(CharacterId.KAEL).nodes.map((node) => getSkill(node.skillId))

  it('moves only Kael between stances, with every stance reachable and the virtuous one only from the offensive', () => {
    for (const skill of SKILLS) {
      if (skill.stance || skill.requires) {
        expect(skill.id.startsWith('kael-'), skill.id).toBe(true)
      }

      if (skill.stance === Stance.VIRTUOUS) {
        expect(skill.requires, skill.id).toEqual([Stance.OFFENSE])
      }
    }

    for (const stance of [Stance.DEFENSE, Stance.OFFENSE, Stance.VIRTUOUS]) {
      expect(
        tree.some((skill) => skill.stance === stance && !skill.requires?.includes(stance)),
        stance
      ).toBe(true)
    }

    // Its first special takes him out of having none, and the weapon attacks keep the stance.
    expect(getSkill(getSkillTree(CharacterId.KAEL).root).requires).toBeUndefined()
    expect(getSkill(getSkillTree(CharacterId.KAEL).root).stance).toBe(Stance.OFFENSE)
    expect(getSkill('kael-strike').stance).toBeUndefined()
  })
})
