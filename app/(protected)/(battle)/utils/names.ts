import { Combatant } from '@/app/(protected)/(engine)/models/Combatant'
import type { MessageKey } from '@/app/i18n/messages'
import type { Translator } from '@/app/i18n/translate'

/** Name of an enemy species (and of its elite variant). */
export function enemyName(t: Translator, speciesId: string, elite = false): string {
  const name = t(`enemies.${speciesId}` as MessageKey)

  return elite ? t('battle.elite', { name }) : name
}

/** Name of a fighter of a battle. */
export function combatantName(t: Translator, combatant: Combatant): string {
  return combatant.side === 'hero'
    ? t(`characters.${combatant.characterId}.name` as MessageKey)
    : enemyName(t, combatant.speciesId!, combatant.elite)
}
