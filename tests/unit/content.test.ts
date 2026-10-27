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
import { getTree } from '@/app/(protected)/(engine)/data/talents'
import { Biome } from '@/app/(protected)/(engine)/models/Biome'
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
  it('has nine species in each biome and 52 bosses', () => {
    for (const biome of Object.values(Biome)) {
      expect(getBiomeSpecies(biome), biome).toHaveLength(9)
    }

    expect(ENEMIES.filter((species) => species.rarity === 'boss')).toHaveLength(52)
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
  it('has three branches of fifteen nodes for each hero, with known skills and names', () => {
    for (const character of CHARACTERS) {
      const tree = getTree(character.id)

      expect(tree).toHaveLength(45)

      for (const branch of [0, 1, 2]) {
        expect(
          tree.filter((talent) => talent.branch === branch),
          `${character.id} ${branch}`
        ).toHaveLength(15)
      }

      for (const talent of tree) {
        if (talent.skillId) {
          getSkill(talent.skillId)
        } else {
          expect(section('en', 'talents')[talent.id], talent.id).toBeTypeOf('string')
        }
      }
    }
  })
})

describe('bosses of the world', () => {
  it('has its own boss for every camp, captor and Seal, and a guardian for every guarded sanctuary', () => {
    for (const node of index.world.nodes) {
      if (node.bossId) {
        expect(getSpecies(BOSS_SPECIES[node.bossId]).rarity, node.bossId).toBe('boss')
      }

      if (node.guardian) {
        expect(getSpecies(GUARDIAN_SPECIES[node.runeIndex!]).rarity, `rune ${node.runeIndex}`).toBe('boss')
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
