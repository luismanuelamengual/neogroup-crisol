'use client'

import './index.scss'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { playMusic, playSfx } from '@/app/(protected)/(art)/utils/sound'
import BattleScreen from '@/app/(protected)/(battle)/components/BattleScreen'
import { getRune } from '@/app/(protected)/(engine)/data/runes'
import { SEALS_TO_OPEN_ABYSS } from '@/app/(protected)/(engine)/data/world'
import { BattleState } from '@/app/(protected)/(engine)/models/BattleState'
import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'
import { Encounter } from '@/app/(protected)/(engine)/models/Encounter'
import { GameState } from '@/app/(protected)/(engine)/models/GameState'
import { NodeType } from '@/app/(protected)/(engine)/models/NodeType'
import { Reward } from '@/app/(protected)/(engine)/models/Reward'
import { World } from '@/app/(protected)/(engine)/models/World'
import { applyBattleResult, getLostXpAt, totalLostXp } from '@/app/(protected)/(engine)/utils/battleResult'
import { canSwapWeapons, spendTear } from '@/app/(protected)/(engine)/utils/heroes'
import { getMerchantHere } from '@/app/(protected)/(engine)/utils/shop'
import {
  arriveAt,
  canStartNextCycle,
  countDefeatedSeals,
  drinkFlask,
  getEncounter,
  getFlask,
  getMissingOwner,
  getReachableNodeIds,
  getRevealedNodeIds,
  indexWorld,
  isAtOpenCamp,
  planRoute,
  rest,
  startNextCycle,
  teleport,
  WorldIndex
} from '@/app/(protected)/(engine)/utils/worldMap'
import BestiaryScreen from '@/app/(protected)/(party)/components/BestiaryScreen'
import HeroScreen from '@/app/(protected)/(party)/components/HeroScreen'
import InventoryScreen from '@/app/(protected)/(party)/components/InventoryScreen'
import ShopDialog from '@/app/(protected)/(party)/components/ShopDialog'
import { itemName, runeName } from '@/app/(protected)/(party)/utils/describe'
import MapHud from '@/app/(protected)/(world)/components/MapHud'
import MapMenu from '@/app/(protected)/(world)/components/MapMenu'
import NextCycleDialog from '@/app/(protected)/(world)/components/NextCycleDialog'
import PartyPanel from '@/app/(protected)/(world)/components/PartyPanel'
import PointPanel from '@/app/(protected)/(world)/components/PointPanel'
import RewardsDialog, { RewardView } from '@/app/(protected)/(world)/components/RewardsDialog'
import TeleportDialog from '@/app/(protected)/(world)/components/TeleportDialog'
import WorldMap, { WorldMapHandle } from '@/app/(protected)/(world)/components/WorldMap'
import { useGameSession } from '@/app/(protected)/(world)/hooks/useGameSession'
import { useGameStore } from '@/app/(protected)/(world)/stores/game'
import { campName, pointName } from '@/app/(protected)/(world)/utils/pointNames'
import type { MapView } from '@/app/(protected)/(world)/utils/worldRenderer'
import GameButton from '@/app/components/GameButton'
import GamePanel from '@/app/components/GamePanel'
import Loading from '@/app/components/Loading'
import { useNotifications } from '@/app/hooks/useNotifications'
import { useT } from '@/app/i18n/I18nProvider'
import type { MessageKey } from '@/app/i18n/messages'

/** A fight in progress and the point the party came from (where a retreat goes back to). */
interface PendingEncounter {
  encounter: Encounter
  fromNodeId: string
}

/**
 * The world (/world): the map of Aurenya with the party on it. Tap a point to
 * see it and tap "Go" (or tap it again) to walk there through the cleared
 * trails; a fight opens the battle screen over the map.
 */
export default function WorldScreen({ test }: { test?: GameState } = {}) {
  const t = useT()
  const { showSuccessMessage } = useNotifications()
  const { status, update, upload } = useGameSession(test)
  const save = useGameStore((store) => store.save)
  const sync = useGameStore((store) => store.sync)
  const [index, setIndex] = useState<WorldIndex | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [walking, setWalking] = useState(false)
  const [pending, setPending] = useState<PendingEncounter | null>(null)
  const [teleporting, setTeleporting] = useState(false)
  /** The hero whose page is open. */
  const [heroId, setHeroId] = useState<CharacterId | null>(null)
  const [inventoryOpen, setInventoryOpen] = useState(false)
  const [bestiaryOpen, setBestiaryOpen] = useState(false)
  const [shopOpen, setShopOpen] = useState(false)
  /** What the point just won gives, shown in the middle of the screen until the player closes it. */
  const [pointRewards, setPointRewards] = useState<RewardView[]>([])
  const [confirmingCycle, setConfirmingCycle] = useState(false)
  const map = useRef<WorldMapHandle>(null)
  const state = save?.state ?? null

  useEffect(() => {
    fetch('/world/world.json')
      .then((response) => response.json())
      .then((world: World) => setIndex(indexWorld(world)))
  }, [])

  // A game closed in the middle of a fight goes back to it.
  useEffect(() => {
    if (!index || !state || pending) {
      return
    }

    const encounter = getEncounter(index, state, state.positionNodeId)

    if (encounter) {
      const fromNodeId =
        index.adjacency.get(state.positionNodeId)!.find((id) => state.clearedNodeIds.includes(id)) ??
        state.lastRestCampId

      setPending({ encounter, fromNodeId })
    }
    // Only when the game is loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, status])

  // The theme of the biome where the party stands, while there is no battle.
  const biomeHere = index && state ? index.nodes.get(state.positionNodeId)?.biome : undefined

  useEffect(() => {
    if (biomeHere && !pending) {
      void playMusic(`map-${biomeHere}`)
    }
  }, [biomeHere, pending])

  const cleared = useMemo(() => new Set(state?.clearedNodeIds), [state?.clearedNodeIds])
  const respawned = useMemo(() => new Set(state?.respawnedNodeIds), [state?.respawnedNodeIds])
  const openCamps = useMemo(() => new Set(state?.openCampIds), [state?.openCampIds])
  const revealed = useMemo(
    () => (index && state ? getRevealedNodeIds(index, state) : new Set<string>()),
    // The revealed points only change with the cleared ones.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [index, state?.clearedNodeIds]
  )
  const reachable = useMemo(
    () => (index && state ? getReachableNodeIds(index, state) : new Set<string>()),
    // Where the party can go only changes with where it stands and what it cleared.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [index, state?.positionNodeId, state?.clearedNodeIds, state?.respawnedNodeIds]
  )
  const route = useMemo(
    () => (index && state && selectedNodeId && !walking ? planRoute(index, state, selectedNodeId) : null),
    [index, state, selectedNodeId, walking]
  )
  const view = useMemo<MapView | null>(
    () =>
      state
        ? {
            cleared,
            revealed,
            respawned,
            reachable,
            openCamps,
            positionNodeId: state.positionNodeId,
            selectedNodeId,
            route,
            lostXpNodeId: state.lostXp?.nodeId ?? null
          }
        : null,
    [cleared, openCamps, reachable, respawned, revealed, route, selectedNodeId, state]
  )
  /** What a reward says (with its picture, if it has one) and the sound it makes. */
  const describeReward = useCallback(
    (reward: Reward): RewardView & { sfx?: Parameters<typeof playSfx>[0] } => {
      switch (reward.type) {
        case 'camp':
          return { text: t('world.rewards.camp', { name: campName(t, index!.nodes.get(reward.nodeId)!) }) }
        case 'character':
          return {
            text: t('world.rewards.character', {
              name: t(`characters.${reward.characterId}.name` as MessageKey),
              level: reward.level
            })
          }
        case 'flaskCharge':
          return { text: t('world.rewards.flaskCharge', { max: reward.maxCharges }), icon: { type: 'flask' } }
        case 'flaskPotency':
          return { text: t('world.rewards.flaskPotency', { potency: reward.potency }), icon: { type: 'flask' } }
        case 'rune':
          return {
            text: t('world.rewards.rune', {
              name: runeName(t, getRune(reward.runeIndex)),
              tier: t(`world.runeTiers.${reward.tier}`)
            }),
            icon: { type: 'rune', index: reward.runeIndex },
            sfx: 'rune'
          }
        case 'item':
          return {
            text: t('world.rewards.item', { count: reward.count, name: itemName(t, reward.itemId) }),
            icon: { type: 'item', id: reward.itemId },
            loot: { amount: `×${reward.count}`, name: itemName(t, reward.itemId) }
          }
        case 'echoes':
          return {
            text: t('world.rewards.echoes', { count: reward.count }),
            icon: { type: 'echo' },
            loot: { amount: `×${reward.count}`, name: t('world.rewards.echoesName', { count: reward.count }) }
          }
        case 'tear':
          return { text: t('world.rewards.tear'), icon: { type: 'tear' } }
        case 'weapon':
          return {
            text: t('world.rewards.weapon', {
              name: t(`characters.${reward.characterId}.name` as MessageKey),
              weapon: t(`weapons.${reward.weaponId}.name` as MessageKey)
            }),
            icon: { type: 'weapon', id: reward.weaponId },
            sfx: 'rune'
          }
        case 'gold':
          return {
            text: t('world.rewards.gold', { amount: reward.amount }),
            icon: { type: 'gold' },
            loot: { amount: `+${reward.amount}`, name: t('world.rewards.goldName') },
            sfx: 'chest'
          }
        case 'abyssOpen':
          return { text: t('world.rewards.abyssOpen') }
        case 'crisolDefeated':
          return { text: t('world.rewards.crisol') }
      }
    },
    [index, t]
  )
  /** Opens the rewards window with what was gained, playing the sound of each kind once. */
  const showRewardsWindow = useCallback(
    (rewards: Reward[]) => {
      if (rewards.length === 0) {
        return
      }

      const views = rewards.map(describeReward)

      for (const sfx of new Set(views.map((view) => view.sfx))) {
        if (sfx) {
          playSfx(sfx)
        }
      }

      setPointRewards(views.map(({ text, icon, loot }) => ({ text, icon, loot })))
    },
    [describeReward]
  )
  const go = useCallback(async () => {
    if (!index || !state || !route || walking) {
      return
    }

    setWalking(true)
    setSelectedNodeId(null)
    playSfx('step')
    await map.current?.walk(route)
    setWalking(false)

    const target = route[route.length - 1]
    const arrival = arriveAt(index, useGameStore.getState().save!.state, target)

    update(arrival.state)
    // Only chests give something on arrival: their content gets the window, with the picture of each thing.
    showRewardsWindow(arrival.rewards)

    if (arrival.encounter) {
      setPending({ encounter: arrival.encounter, fromNodeId: route[route.length - 2] })
    }
  }, [index, route, showRewardsWindow, state, update, walking])
  const handleTap = useCallback(
    (nodeId: string | null) => {
      if (walking || pending) {
        return
      }

      if (nodeId && nodeId === selectedNodeId && route) {
        void go()
      } else {
        setSelectedNodeId(nodeId)
      }
    },
    [go, pending, route, selectedNodeId, walking]
  )

  if (status === 'loading' || (status === 'ready' && (!index || !state || !view))) {
    return <Loading />
  }

  if (status !== 'ready' || !index || !state || !view) {
    return (
      <div className="world-screen-message">
        <GamePanel title={t('world.title')}>
          <p>{t(status === 'offline' ? 'world.offlineNoCopy' : 'world.missing')}</p>
          <GameButton color="ghost" fullWidth href="/menu">
            {t('world.backToMenu')}
          </GameButton>
        </GamePanel>
      </div>
    )
  }

  const position = index.nodes.get(state.positionNodeId)!
  const flask = getFlask(index, state)
  const selected = selectedNodeId ? index.nodes.get(selectedNodeId)! : null
  // An enemy that came back after resting is named again like a fight not won yet.
  const nameOf = (nodeId: string) =>
    pointName(t, index.nodes.get(nodeId)!, cleared.has(nodeId) && !respawned.has(nodeId), openCamps.has(nodeId))
  const busy = walking || !!pending
  const merchantHere = getMerchantHere(index, state)

  const detailOf = (nodeId: string): string | null => {
    const node = index.nodes.get(nodeId)!
    const encounter = getEncounter(index, state, nodeId)

    if (node.type === NodeType.ABYSS_GATE && !cleared.has(nodeId)) {
      const left = SEALS_TO_OPEN_ABYSS - countDefeatedSeals(index, state)

      if (left > 0) {
        return t('world.points.gateSealed', { count: left })
      }
    }

    const missingOwner = getMissingOwner(state, node)

    if (missingOwner && !cleared.has(nodeId)) {
      return t('world.points.reliquaryLocked', { name: t(`characters.${missingOwner}.name` as MessageKey) })
    }

    if (!encounter) {
      return t(`world.biomes.${node.biome}` as MessageKey)
    }

    const kind = t(`world.encounters.${encounter.kind}`)
    const level = t('world.levelShort', { level: encounter.level })

    return respawned.has(nodeId) ? `${t('world.points.respawned')} · ${level}` : `${kind} · ${level}`
  }

  const handleBattleEnd = (battle: BattleState) => {
    const result = applyBattleResult(index, state, battle, pending!.fromNodeId)

    setPending(null)
    update(result.state)

    // The battle's own spoils (experience, levels, gold, loot and Echoes) are already on the result panel;
    // what the point gives gets a window of its own, in the middle of the screen.
    showRewardsWindow(result.pointRewards)

    if (result.levelUps.length > 0) {
      playSfx('level-up')
    }

    if (battle.outcome === 'defeat') {
      map.current?.centerOn(result.state.positionNodeId)
    }

    if (battle.outcome === 'defeat' || result.rewards.some((reward) => reward.type === 'camp')) {
      void upload()
    }
  }

  const handleRest = () => {
    update(rest(index, state))
    playSfx('rest')
    showSuccessMessage(t('world.panel.rested'))
    void upload()
  }

  const handleTeleport = (campId: string) => {
    setTeleporting(false)
    setSelectedNodeId(null)
    update(teleport(state, campId))
    map.current?.centerOn(campId)
  }

  const handleNextCycle = () => {
    const next = startNextCycle(index, state)

    setConfirmingCycle(false)
    setSelectedNodeId(null)
    update(next)
    map.current?.centerOn(next.positionNodeId)
    showSuccessMessage(t('world.nextCycle.started', { cycle: next.cycle }), 8000)
    void upload()
  }

  const handleDrink = () => {
    update(drinkFlask(index, state))
    playSfx('flask')
  }

  const handleSpendTear = (characterId: CharacterId) => {
    update(spendTear(state, characterId))
    playSfx('rune')
  }

  const otherCamps = state.openCampIds
    .filter((id) => id !== state.positionNodeId)
    .map((id) => {
      const node = index.nodes.get(id)!

      return { nodeId: id, name: campName(t, node), biome: t(`world.biomes.${node.biome}` as MessageKey) }
    })

  return (
    <div className="world-screen">
      <WorldMap
        ref={map}
        world={index.world}
        view={view}
        onTap={handleTap}
        paused={Boolean(pending || heroId || inventoryOpen || bestiaryOpen)}
      />
      <MapHud
        location={nameOf(position.id)}
        biome={t(`world.biomes.${position.biome}` as MessageKey)}
        gold={state.gold}
        cycle={state.cycle}
        sync={test ? 'synced' : sync}
        onRecenter={() => map.current?.centerOn(state.positionNodeId)}
      />
      <div className="bottom">
        {selected && (
          <PointPanel
            name={nameOf(selected.id)}
            detail={detailOf(selected.id)}
            lostXp={totalLostXp(getLostXpAt(state, selected.id))}
            reach={
              selected.id === state.positionNodeId
                ? 'here'
                : route
                  ? 'route'
                  : getMissingOwner(state, selected) && !cleared.has(selected.id)
                    ? 'shut'
                    : 'none'
            }
            steps={route ? route.length - 1 : 0}
            openCamp={selected.id === state.positionNodeId && isAtOpenCamp(state)}
            merchant={selected.type === NodeType.MERCHANT}
            canTeleport={otherCamps.length > 0}
            nextCycle={selected.id === state.positionNodeId && canStartNextCycle(index, state) ? state.cycle + 1 : null}
            onNextCycle={() => setConfirmingCycle(true)}
            busy={busy}
            onGo={() => void go()}
            onRest={handleRest}
            onTeleport={() => setTeleporting(true)}
            onShop={() => setShopOpen(true)}
            onClose={() => setSelectedNodeId(null)}
          />
        )}
        <div className="dock">
          <PartyPanel
            characters={state.characters}
            flask={flask}
            disabled={busy}
            echoes={state.echoes}
            onDrink={handleDrink}
            onOpenHero={setHeroId}
          />
          <MapMenu
            disabled={busy}
            onInventory={() => setInventoryOpen(true)}
            onBestiary={() => setBestiaryOpen(true)}
          />
        </div>
      </div>
      {pending && (
        <BattleScreen
          key={`${pending.encounter.nodeId}-${state.positionNodeId}`}
          game={state}
          node={index.nodes.get(pending.encounter.nodeId)!}
          encounter={pending.encounter}
          onFinish={handleBattleEnd}
        />
      )}
      {heroId && (
        <HeroScreen
          state={state}
          characterId={heroId}
          atCamp={isAtOpenCamp(state)}
          canSwap={canSwapWeapons(state)}
          onChange={update}
          onClose={() => setHeroId(null)}
        />
      )}
      {inventoryOpen && (
        <InventoryScreen state={state} onSpendTear={handleSpendTear} onClose={() => setInventoryOpen(false)} />
      )}
      {bestiaryOpen && <BestiaryScreen kills={state.kills} onClose={() => setBestiaryOpen(false)} />}
      {merchantHere && (
        <ShopDialog
          open={shopOpen}
          index={index}
          state={state}
          merchant={merchantHere}
          onChange={update}
          onClose={() => setShopOpen(false)}
        />
      )}
      <NextCycleDialog
        open={confirmingCycle}
        cycle={state.cycle + 1}
        onCancel={() => setConfirmingCycle(false)}
        onConfirm={handleNextCycle}
      />
      <RewardsDialog rewards={pointRewards} onClose={() => setPointRewards([])} />
      <TeleportDialog
        open={teleporting}
        camps={otherCamps}
        onSelect={handleTeleport}
        onClose={() => setTeleporting(false)}
      />
    </div>
  )
}
