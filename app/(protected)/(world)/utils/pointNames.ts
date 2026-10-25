import { BossKind } from '@/app/(protected)/(engine)/models/BossKind'
import { NodeType } from '@/app/(protected)/(engine)/models/NodeType'
import { WorldNode } from '@/app/(protected)/(engine)/models/WorldNode'
import type { MessageKey } from '@/app/i18n/messages'
import type { Translator } from '@/app/i18n/translate'

/** Name of a camp (open or still held by its boss). */
export function campName(t: Translator, node: WorldNode): string {
  if (node.type === NodeType.START) {
    return t('world.camps.start')
  }

  if (node.bossKind === BossKind.MINIBOSS) {
    const number = node.bossId?.split('-').pop() ?? '1'

    return t('world.camps.miniboss', { biome: t(`world.biomes.${node.biome}` as MessageKey), number })
  }

  return t('world.camps.lair', { name: t(`world.bosses.${node.bossId}.name` as MessageKey) })
}

/** What the player reads about a point of the map. */
export function pointName(t: Translator, node: WorldNode, cleared: boolean, openCamp: boolean): string {
  if (openCamp) {
    return campName(t, node)
  }

  switch (node.type) {
    case NodeType.CAMP_BOSS:
      return node.bossKind === BossKind.MINIBOSS
        ? t('world.points.miniboss', { biome: t(`world.biomes.${node.biome}` as MessageKey) })
        : t(`world.bosses.${node.bossId}.title` as MessageKey)
    case NodeType.SANCTUARY:
      return t(cleared ? 'world.points.sanctuaryTaken' : 'world.points.sanctuary')
    case NodeType.MERCHANT:
      return t(`world.merchants.${node.merchant}` as MessageKey)
    case NodeType.TEAR:
      return t(cleared ? 'world.points.tearTaken' : 'world.points.tear')
    case NodeType.CHEST:
      return t(cleared ? 'world.points.chestOpened' : 'world.points.chest')
    case NodeType.ABYSS_GATE:
      return t('world.points.gate')
    case NodeType.FINAL_BOSS:
      return t('world.points.crisol')
    default:
      return t(cleared ? 'world.points.cleared' : 'world.points.combat')
  }
}
