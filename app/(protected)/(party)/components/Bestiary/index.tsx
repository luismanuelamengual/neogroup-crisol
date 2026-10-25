'use client'

import './index.scss'
import { enemyName } from '@/app/(protected)/(battle)/utils/names'
import { getBestiaryLevel, getBestiaryThresholds } from '@/app/(protected)/(engine)/data/bestiary'
import { BIOMES } from '@/app/(protected)/(engine)/data/biomes'
import { getEnemyStats, getSpecies } from '@/app/(protected)/(engine)/data/enemies'
import { BIOME_POTIONS, BIOME_STONE } from '@/app/(protected)/(engine)/data/items'
import { Affinity } from '@/app/(protected)/(engine)/models/Affinity'
import { DamageType } from '@/app/(protected)/(engine)/models/DamageType'
import { itemName, skillName } from '@/app/(protected)/(party)/utils/describe'
import { useT } from '@/app/i18n/I18nProvider'
import type { MessageKey } from '@/app/i18n/messages'

interface BestiaryProps {
  kills: Record<string, number>
}

const biomeOrder = (speciesId: string) =>
  BIOMES.findIndex((definition) => definition.biome === getSpecies(speciesId).biome)

/** Every species the party met, showing more of each one as more of it fall. */
export default function Bestiary({ kills }: BestiaryProps) {
  const t = useT()
  const seen = Object.keys(kills).sort((a, b) => biomeOrder(a) - biomeOrder(b) || a.localeCompare(b))
  const types = (affinity: Affinity, affinities: Partial<Record<DamageType, Affinity>>) =>
    (Object.entries(affinities) as [DamageType, Affinity][])
      .filter(([, value]) => value === affinity)
      .map(([type]) => t(`damageTypes.${type}`))
      .join(', ')

  return (
    <section className="bestiary">
      <h3>{t('party.bestiary')}</h3>
      <p className="hint">{t('party.bestiaryHint')}</p>
      {seen.length === 0 ? (
        <p className="lines">{t('party.empty')}</p>
      ) : (
        <ul>
          {seen.map((speciesId) => {
            const species = getSpecies(speciesId)
            const level = getBestiaryLevel(speciesId, kills)
            const next = getBestiaryThresholds(speciesId)[level]
            const biome = BIOMES.find((definition) => definition.biome === species.biome)!
            const weak = types(Affinity.WEAK, species.affinities)
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
                const list = types(affinity, species.affinities)

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
                  items: [BIOME_STONE[species.biome], ...BIOME_POTIONS[species.biome]]
                    .map((id) => itemName(t, id))
                    .join(', ')
                })
              )
            }

            return (
              <li key={speciesId}>
                <span className="swatch" style={{ background: `#${species.color.toString(16).padStart(6, '0')}` }} />
                <div className="body">
                  <div className="titles">
                    <span className="name">{enemyName(t, speciesId)}</span>
                    <span className="kills">{t('party.kills', { count: kills[speciesId] })}</span>
                  </div>
                  <p className="lines">
                    {t(`world.biomes.${species.biome}` as MessageKey)}
                    {next !== undefined && ` · ${t('party.nextUnlock', { count: next })}`}
                  </p>
                  {lines.map((line) => (
                    <p key={line} className="lines">
                      {line}
                    </p>
                  ))}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
