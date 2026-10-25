import { getVariantBase } from '@/app/(protected)/(engine)/data/enemies'
import { Combatant } from '@/app/(protected)/(engine)/models/Combatant'
import type { MessageKey } from '@/app/i18n/messages'
import type { Translator } from '@/app/i18n/translate'

/** Name of an enemy species (with the provisional champion and guardian variants). */
export function enemyName(t: Translator, speciesId: string, elite = false): string {
  const variant = getVariantBase(speciesId)
  const base = t(`enemies.${variant?.baseId ?? speciesId}` as MessageKey)
  const name = variant ? t(`battle.${variant.variant}`, { name: base }) : base

  return elite ? t('battle.elite', { name }) : name
}

/** Name of a fighter of a battle. */
export function combatantName(t: Translator, combatant: Combatant): string {
  return combatant.side === 'hero'
    ? t(`characters.${combatant.characterId}.name` as MessageKey)
    : enemyName(t, combatant.speciesId!, combatant.elite)
}
