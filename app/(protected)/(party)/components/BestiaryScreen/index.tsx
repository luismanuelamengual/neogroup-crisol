'use client'

import './index.scss'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import { useState } from 'react'
import { enemyName } from '@/app/(protected)/(battle)/utils/names'
import { getBestiaryLevel, getBestiaryThresholds } from '@/app/(protected)/(engine)/data/bestiary'
import { BIOMES } from '@/app/(protected)/(engine)/data/biomes'
import { ENEMIES, getEnemyStats, getSpecies } from '@/app/(protected)/(engine)/data/enemies'
import { BIOME_POTIONS, BIOME_STONE } from '@/app/(protected)/(engine)/data/items'
import { Affinity } from '@/app/(protected)/(engine)/models/Affinity'
import { DamageType } from '@/app/(protected)/(engine)/models/DamageType'
import EnemyPortrait from '@/app/(protected)/(party)/components/EnemyPortrait'
import { itemName, skillName } from '@/app/(protected)/(party)/utils/describe'
import GameScreen from '@/app/components/GameScreen'
import { useT } from '@/app/i18n/I18nProvider'
import type { MessageKey } from '@/app/i18n/messages'
import type { Translator } from '@/app/i18n/translate'

interface BestiaryScreenProps {
  kills: Record<string, number>
  onClose: () => void
}

const biomeOrder = (speciesId: string) =>
  BIOMES.findIndex((definition) => definition.biome === getSpecies(speciesId).biome)

/** What the party knows of a species, by how many of it fell (see data/bestiary). */
function describeSpecies(t: Translator, speciesId: string, kills: Record<string, number>): string[] {
  const species = getSpecies(speciesId)
  const level = getBestiaryLevel(speciesId, kills)
  const biome = BIOMES.find((definition) => definition.biome === species.biome)!
  const types = (affinity: Affinity) =>
    (Object.entries(species.affinities) as [DamageType, Affinity][])
      .filter(([, value]) => value === affinity)
      .map(([type]) => t(`damageTypes.${type}`))
      .join(', ')
  const weak = types(Affinity.WEAK)
  const lines: string[] = []

  if (level === 1) {
    const main = (Object.entries(species.affinities) as [DamageType, Affinity][]).find(
      ([, value]) => value === Affinity.WEAK
    )

    lines.push(main ? t('party.weakTo', { types: t(`damageTypes.${main[0]}`) }) : t('party.noWeakness'))
  }

  if (level >= 2) {
    lines.push(weak ? t('party.weakTo', { types: weak }) : t('party.noWeakness'))

    for (const [affinity, key] of [
      [Affinity.RESIST, 'party.resists'],
      [Affinity.IMMUNE, 'party.immuneTo'],
      [Affinity.ABSORB, 'party.absorbs']
    ] as const) {
      const list = types(affinity)

      if (list) {
        lines.push(t(key, { types: list }))
      }
    }
  }

  if (level >= 3) {
    const stats = getEnemyStats(speciesId, biome.levelMin)

    lines.push(t('party.archetype', { archetype: t(`archetypes.${species.archetype}`) }))
    lines.push(
      t('party.statsLine', {
        health: stats.maxHealth,
        attack: stats.attack,
        defense: stats.defense,
        speed: stats.speed,
        level: biome.levelMin
      })
    )
    lines.push(t('party.skillsLine', { skills: species.skills.map((id) => skillName(t, id)).join(', ') }))
    lines.push(
      t('party.dropsLine', {
        items: [BIOME_STONE[species.biome], ...BIOME_POTIONS[species.biome]].map((id) => itemName(t, id)).join(', ')
      })
    )
  }

  return lines
}

/** Every species the party met (full screen over the map), with its picture; tap one to see what is known of it. */
export default function BestiaryScreen({ kills, onClose }: BestiaryScreenProps) {
  const t = useT()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const seen = Object.keys(kills).sort((a, b) => biomeOrder(a) - biomeOrder(b) || a.localeCompare(b))

  return (
    <GameScreen open title={t('party.bestiary')} onClose={onClose} className="bestiary-screen">
      <p className="hint">
        {t('bestiary.discovered', { count: seen.length, total: ENEMIES.length })} · {t('party.bestiaryHint')}
      </p>
      {seen.length === 0 ? (
        <p className="empty">{t('bestiary.empty')}</p>
      ) : (
        <ul className="grid">
          {seen.map((speciesId) => (
            <li key={speciesId}>
              <button type="button" className="tile" onClick={() => setSelectedId(speciesId)}>
                <EnemyPortrait speciesId={speciesId} size={84} />
                <span className="name">{enemyName(t, speciesId)}</span>
                <span className="kills">{t('party.kills', { count: kills[speciesId] })}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {selectedId && <SpeciesDialog speciesId={selectedId} kills={kills} onClose={() => setSelectedId(null)} />}
    </GameScreen>
  )
}

/** What is known of one species. */
function SpeciesDialog({
  speciesId,
  kills,
  onClose
}: {
  speciesId: string
  kills: Record<string, number>
  onClose: () => void
}) {
  const t = useT()
  const species = getSpecies(speciesId)
  const level = getBestiaryLevel(speciesId, kills)
  const next = getBestiaryThresholds(speciesId)[level]
  const lines = describeSpecies(t, speciesId, kills)

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs" className="bestiary-entry">
      <div className="portrait">
        <EnemyPortrait speciesId={speciesId} size={160} />
      </div>
      <DialogTitle className="title">{enemyName(t, speciesId)}</DialogTitle>
      <div className="body">
        <p className="meta">
          {t(`world.biomes.${species.biome}` as MessageKey)} · {t('party.kills', { count: kills[speciesId] })}
        </p>
        {lines.length === 0 && <p className="lines">{t('bestiary.nothingYet')}</p>}
        {lines.map((line) => (
          <p key={line} className="lines">
            {line}
          </p>
        ))}
        {next !== undefined && <p className="note">{t('party.nextUnlock', { count: next })}</p>}
      </div>
    </Dialog>
  )
}
