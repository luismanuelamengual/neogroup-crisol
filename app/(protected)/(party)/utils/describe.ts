import { getSkill } from '@/app/(protected)/(engine)/data/skills'
import { getSkillLevelUpgrade } from '@/app/(protected)/(engine)/data/skillTrees'
import { BonusesPart, SkillUpgrade } from '@/app/(protected)/(engine)/models/Bonuses'
import { CombatStats } from '@/app/(protected)/(engine)/models/CombatStats'
import { DamageType } from '@/app/(protected)/(engine)/models/DamageType'
import { Rune } from '@/app/(protected)/(engine)/models/Rune'
import { Stance } from '@/app/(protected)/(engine)/models/Stance'
import { TargetType } from '@/app/(protected)/(engine)/models/TargetType'
import type { MessageKey } from '@/app/i18n/messages'
import type { Translator } from '@/app/i18n/translate'

/** Texts of the build: bonuses, skills, runes and attributes, written from the catalogs. */

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

    if (upgrade.turns) {
      lines.push(t('bonuses.skillTurns', { skill, value: upgrade.turns }))
    }
  }

  return lines
}

/**
 * What a special does at a level of the skill tree (1 when not learned): its
 * damage or healing, its statuses and the rest, one line each.
 */
export function describeSkill(t: Translator, skillId: string, level = 1): string[] {
  const skill = getSkill(skillId)
  const upgrade = level > 1 ? getSkillLevelUpgrade(skillId, level) : {}
  const target = t(`targets.${skill.target}`)
  const power = (skill.power * (1 + (upgrade.power ?? 0))).toFixed(2).replace(/\.?0+$/, '')
  const lines: string[] = []

  if (skill.revive) {
    lines.push(t('skillEffects.revive'))
  }

  if (skill.power > 0) {
    lines.push(
      skill.heal
        ? t('skillEffects.heal', { power, target })
        : t('skillEffects.damage', { power, target, type: t(`damageTypes.${skill.damageType}`) })
    )
  } else if (skill.target !== TargetType.SELF) {
    lines.push(t('skillEffects.buff', { target }))
  }

  if (skill.cure) {
    lines.push(t('skillEffects.cure'))
  }

  for (const status of skill.statuses ?? []) {
    const turns = status.turns >= 2 ? status.turns + (upgrade.turns ?? 0) : status.turns
    const chance = Math.min(1, status.chance + (status.chance < 1 ? (upgrade.statusChance ?? 0) : 0))
    const name = t(`statuses.${status.type}`)

    lines.push(
      status.onSelf || (skill.target === TargetType.SELF && chance >= 1)
        ? t('skillEffects.statusSelf', { status: name, turns })
        : t('skillEffects.status', { status: name, chance: `${Math.round(chance * 100)}%`, turns })
    )
  }

  if (skill.shields) {
    lines.push(t('skillEffects.shields', { count: skill.shields }))
  }

  if (skill.critBonus) {
    lines.push(t('skillEffects.crit', { value: formatShare(skill.critBonus).slice(1) }))
  }

  if (skill.consumes) {
    lines.push(t(skill.consumes === 'fury' ? 'skillEffects.fury' : 'skillEffects.charges'))
  }

  if (skill.requires) {
    lines.push(t('skillEffects.stanceNeeds', { stances: stanceNames(t, skill.requires) }))
  }

  if (skill.stance) {
    lines.push(
      skill.stance === Stance.NONE
        ? t('skillEffects.stanceDrop')
        : t('skillEffects.stanceTo', { stance: stanceNames(t, [skill.stance]) })
    )
  }

  return lines
}

/** Stances as they go inside a sentence ("ofensiva / virtuosa"). */
export function stanceNames(t: Translator, stances: Stance[]): string {
  return stances.map((stance) => t(`battle.stances.${stance}`).toLowerCase()).join(' / ')
}

/** Focus a special costs at a level of the skill tree. */
export function skillCost(skillId: string, level = 1): number {
  const skill = getSkill(skillId)

  return Math.max(0, skill.cost - (level > 1 ? (getSkillLevelUpgrade(skillId, level).cost ?? 0) : 0))
}

/** What a level adds to a special, as a short list ("+12% power · −2 focus"). */
export function describeLevelGain(t: Translator, skillId: string, level: number): string {
  const now: SkillUpgrade = level > 1 ? getSkillLevelUpgrade(skillId, level - 1) : {}
  const next = getSkillLevelUpgrade(skillId, level)
  const parts: string[] = []
  const gain = (key: keyof SkillUpgrade) => (next[key] ?? 0) - (now[key] ?? 0)

  if (gain('power') > 0) {
    parts.push(t('skillEffects.power', { value: formatShare(gain('power')).slice(1) }))
  }

  if (gain('statusChance') > 0) {
    parts.push(t('skillEffects.chance', { value: formatShare(gain('statusChance')).slice(1) }))
  }

  if (gain('cost') > 0) {
    parts.push(t('skillEffects.cost', { value: gain('cost') }))
  }

  if (gain('turns') > 0) {
    parts.push(t('skillEffects.turns', { value: gain('turns') }))
  }

  return parts.join(' · ')
}

export function runeName(t: Translator, rune: Rune): string {
  return t(`runes.${rune.id}.name` as MessageKey)
}

/** The effect of a rune, and (equipped, not as an echo) its attribute shifts. */
export function describeRune(t: Translator, rune: Rune, withStats = true): string[] {
  return [t(`runes.${rune.id}.text` as MessageKey), ...(withStats ? describeBonuses(t, { stats: rune.stats }) : [])]
}

export function itemName(t: Translator, itemId: string): string {
  return t(`items.${itemId}.name` as MessageKey)
}
