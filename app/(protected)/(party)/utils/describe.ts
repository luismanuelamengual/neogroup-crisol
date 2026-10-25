import { getSkill } from '@/app/(protected)/(engine)/data/skills'
import { getTalent } from '@/app/(protected)/(engine)/data/talents'
import { BonusesPart } from '@/app/(protected)/(engine)/models/Bonuses'
import { CombatStats } from '@/app/(protected)/(engine)/models/CombatStats'
import { DamageType } from '@/app/(protected)/(engine)/models/DamageType'
import { Rune } from '@/app/(protected)/(engine)/models/Rune'
import { Talent } from '@/app/(protected)/(engine)/models/Talent'
import type { MessageKey } from '@/app/i18n/messages'
import type { Translator } from '@/app/i18n/translate'

/** Texts of the build: bonuses, talents, runes and attributes, written from the catalogs. */

/** A share as a signed percentage: 0.08 → "+8%". */
export function formatShare(value: number): string {
  const percent = Math.round(value * 1000) / 10

  return `${percent >= 0 ? '+' : '−'}${Math.abs(percent)}%`
}

/** An attribute as it is shown: critical chance as a percentage, critical damage as a multiplier. */
export function formatStat(stat: keyof CombatStats, value: number): string {
  if (stat === 'critChance') {
    return `${Math.round(value * 1000) / 10}%`
  }

  if (stat === 'critDamage') {
    return `×${value.toFixed(2)}`
  }

  return String(Math.round(value))
}

export function skillName(t: Translator, skillId: string): string {
  return t(`skills.${skillId}` as MessageKey)
}

export function skillInfo(t: Translator, skillId: string): string {
  const skill = getSkill(skillId)

  return t('bonuses.skillInfo', {
    cost: skill.cost,
    target: t(`targets.${skill.target}`),
    type: t(`damageTypes.${skill.damageType}`)
  })
}

/** One line per bonus. */
export function describeBonuses(t: Translator, part: BonusesPart): string[] {
  const lines: string[] = []

  for (const [stat, value] of Object.entries(part.stats ?? {}) as [keyof CombatStats, number][]) {
    lines.push(t('bonuses.stat', { value: formatShare(value), stat: t(`attributes.${stat}`) }))
  }

  for (const [type, value] of Object.entries(part.damage ?? {}) as [DamageType, number][]) {
    lines.push(t('bonuses.damage', { value: formatShare(value), type: t(`damageTypes.${type}`) }))
  }

  if (part.lifesteal) {
    lines.push(t('bonuses.lifesteal', { value: formatShare(part.lifesteal).slice(1) }))
  }

  if (part.focusRegen) {
    lines.push(t('bonuses.focusRegen', { value: formatShare(part.focusRegen).slice(1) }))
  }

  if (part.regen) {
    lines.push(t('bonuses.regen', { value: formatShare(part.regen).slice(1) }))
  }

  if (part.initiative) {
    lines.push(t('bonuses.initiative', { value: part.initiative }))
  }

  if (part.guard) {
    lines.push(t('bonuses.guard', { value: formatShare(part.guard).slice(1) }))
  }

  if (part.weakness) {
    lines.push(t('bonuses.weakness', { value: formatShare(part.weakness) }))
  }

  if (part.statusChance) {
    lines.push(t('bonuses.statusChance', { value: formatShare(part.statusChance) }))
  }

  for (const effect of part.onHit ?? []) {
    lines.push(t('bonuses.onHit', { status: t(`statuses.${effect.type}`), value: formatShare(effect.chance).slice(1) }))
  }

  for (const [skillId, upgrade] of Object.entries(part.upgrades ?? {})) {
    const skill = skillName(t, skillId)

    if (upgrade.power) {
      lines.push(t('bonuses.power', { skill, value: formatShare(upgrade.power).slice(1) }))
    }

    if (upgrade.cost) {
      lines.push(t('bonuses.skillCost', { skill, value: upgrade.cost }))
    }

    if (upgrade.statusChance) {
      lines.push(t('bonuses.skillStatus', { skill, value: formatShare(upgrade.statusChance).slice(1) }))
    }
  }

  return lines
}

export function talentName(t: Translator, talent: Talent): string {
  return talent.skillId ? skillName(t, talent.skillId) : t(`talents.${talent.id}` as MessageKey)
}

export function describeTalent(t: Translator, talentId: string): string[] {
  const talent = getTalent(talentId)

  if (talent.skillId) {
    return [t('bonuses.skill', { skill: skillName(t, talent.skillId), info: skillInfo(t, talent.skillId) })]
  }

  return describeBonuses(t, talent.bonuses ?? {})
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V']

export function runeName(t: Translator, rune: Rune): string {
  return t('runes.name', {
    family: t(`runes.families.${rune.family}` as MessageKey),
    rank: ROMAN[rune.rank - 1] ?? String(rune.rank)
  })
}

/** The effect of a rune, and (equipped, not as an echo) its attribute shifts. */
export function describeRune(t: Translator, rune: Rune, withStats = true): string[] {
  return [...describeBonuses(t, rune.effect), ...(withStats ? describeBonuses(t, { stats: rune.stats }) : [])]
}

export function itemName(t: Translator, itemId: string): string {
  return t(`items.${itemId}.name` as MessageKey)
}
