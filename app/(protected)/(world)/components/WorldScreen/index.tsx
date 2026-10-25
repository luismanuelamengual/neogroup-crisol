'use client'

import './index.scss'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import BattleScreen from '@/app/(protected)/(battle)/components/BattleScreen'
import { getRune } from '@/app/(protected)/(engine)/data/runes'
import { SEALS_TO_OPEN_ABYSS } from '@/app/(protected)/(engine)/data/world'
import { BattleState } from '@/app/(protected)/(engine)/models/BattleState'
import { Encounter } from '@/app/(protected)/(engine)/models/Encounter'
import { NodeType } from '@/app/(protected)/(engine)/models/NodeType'
import { Reward } from '@/app/(protected)/(engine)/models/Reward'
import { World } from '@/app/(protected)/(engine)/models/World'
import { applyBattleResult } from '@/app/(protected)/(engine)/utils/battleResult'
import { getMerchantHere } from '@/app/(protected)/(engine)/utils/shop'
import {
  arriveAt,
  canStartNextCycle,
  countDefeatedSeals,
  drinkFlask,
  getEncounter,
  getFlask,
  getRevealedNodeIds,
  indexWorld,
  isAtOpenCamp,
  planRoute,
  rest,
  startNextCycle,
  teleport,
  WorldIndex
} from '@/app/(protected)/(engine)/utils/worldMap'
import PartyScreen from '@/app/(protected)/(party)/components/PartyScreen'
import ShopDialog from '@/app/(protected)/(party)/components/ShopDialog'
import { itemName, runeName } from '@/app/(protected)/(party)/utils/describe'
import MapHud from '@/app/(protected)/(world)/components/MapHud'
import NextCycleDialog from '@/app/(protected)/(world)/components/NextCycleDialog'
import PartyPanel from '@/app/(protected)/(world)/components/PartyPanel'
import PointPanel from '@/app/(protected)/(world)/components/PointPanel'
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
export default function WorldScreen() {
  const t = useT()
  const { showSuccessMessage, showWarningMessage } = useNotifications()
  const { status, update, upload } = useGameSession()
  const save = useGameStore((store) => store.save)
  const sync = useGameStore((store) => store.sync)
  const [index, setIndex] = useState<WorldIndex | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [walking, setWalking] = useState(false)
  const [pending, setPending] = useState<PendingEncounter | null>(null)
  const [teleporting, setTeleporting] = useState(false)
  const [partyOpen, setPartyOpen] = useState(false)
  const [shopOpen, setShopOpen] = useState(false)
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

  const cleared = useMemo(() => new Set(state?.clearedNodeIds), [state?.clearedNodeIds])
  const respawned = useMemo(() => new Set(state?.respawnedNodeIds), [state?.respawnedNodeIds])
  const openCamps = useMemo(() => new Set(state?.openCampIds), [state?.openCampIds])
  const revealed = useMemo(
    () => (index && state ? getRevealedNodeIds(index, state) : new Set<string>()),
    // The revealed points only change with the cleared ones.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [index, state?.clearedNodeIds]
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
            openCamps,
            positionNodeId: state.positionNodeId,
            selectedNodeId,
            route
          }
        : null,
    [cleared, openCamps, respawned, revealed, route, selectedNodeId, state]
  )
  const showRewards = useCallback(
    (rewards: Reward[]) => {
      for (const reward of rewards) {
        switch (reward.type) {
          case 'camp':
            showSuccessMessage(t('world.rewards.camp', { name: campName(t, index!.nodes.get(reward.nodeId)!) }))
            break
          case 'character':
            showSuccessMessage(
              t('world.rewards.character', {
                name: t(`characters.${reward.characterId}.name` as MessageKey),
                level: reward.level
              })
            )
            break
          case 'flaskCharge':
            showSuccessMessage(t('world.rewards.flaskCharge', { max: reward.maxCharges }))
            break
          case 'flaskPotency':
            showSuccessMessage(t('world.rewards.flaskPotency', { potency: reward.potency }))
            break
          case 'rune':
            showSuccessMessage(
              t('world.rewards.rune', {
                name: runeName(t, getRune(reward.runeIndex)),
                tier: t(`world.runeTiers.${reward.tier}`)
              })
            )
            break
          case 'item':
            showSuccessMessage(t('world.rewards.item', { count: reward.count, name: itemName(t, reward.itemId) }))
            break
          case 'echoes':
            showSuccessMessage(t('world.rewards.echoes', { count: reward.count }))
            break
          case 'tear':
            showSuccessMessage(t('world.rewards.tear'))
            break
          case 'gold':
            showSuccessMessage(t('world.rewards.gold', { amount: reward.amount }))
            break
          case 'abyssOpen':
            showSuccessMessage(t('world.rewards.abyssOpen'), 8000)
            break
          case 'crisolDefeated':
            showSuccessMessage(t('world.rewards.crisol'), 10000)
            break
        }
      }
    },
    [index, showSuccessMessage, t]
  )
  const go = useCallback(async () => {
    if (!index || !state || !route || walking) {
      return
    }

    setWalking(true)
    setSelectedNodeId(null)
    await map.current?.walk(route)
    setWalking(false)

    const target = route[route.length - 1]
    const arrival = arriveAt(index, useGameStore.getState().save!.state, target)

    update(arrival.state)
    showRewards(arrival.rewards)

    if (arrival.encounter) {
      setPending({ encounter: arrival.encounter, fromNodeId: route[route.length - 2] })
    }
  }, [index, route, showRewards, state, update, walking])
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
  const nameOf = (nodeId: string) => pointName(t, index.nodes.get(nodeId)!, cleared.has(nodeId), openCamps.has(nodeId))
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
    showRewards(result.rewards)

    for (const levelUp of result.levelUps) {
      showSuccessMessage(
        t('battle.levelUp', { name: t(`characters.${levelUp.characterId}.name` as MessageKey), level: levelUp.level })
      )
    }

    if (battle.outcome === 'defeat') {
      showWarningMessage(
        t('world.rewards.defeat', { camp: campName(t, index.nodes.get(result.state.positionNodeId)!) }),
        6000
      )
      map.current?.centerOn(result.state.positionNodeId)
    }

    if (battle.outcome === 'defeat' || result.rewards.some((reward) => reward.type === 'camp')) {
      void upload()
    }
  }

  const handleRest = () => {
    update(rest(index, state))
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

  const handleDrink = () => update(drinkFlask(index, state))
  const otherCamps = state.openCampIds
    .filter((id) => id !== state.positionNodeId)
    .map((id) => {
      const node = index.nodes.get(id)!

      return { nodeId: id, name: campName(t, node), biome: t(`world.biomes.${node.biome}` as MessageKey) }
    })

  return (
    <div className="world-screen">
      <WorldMap ref={map} world={index.world} view={view} onTap={handleTap} />
      <MapHud
        location={nameOf(position.id)}
        biome={t(`world.biomes.${position.biome}` as MessageKey)}
        gold={state.gold}
        cycle={state.cycle}
        sync={sync}
        onRecenter={() => map.current?.centerOn(state.positionNodeId)}
      />
      <div className="bottom">
        {selected && (
          <PointPanel
            name={nameOf(selected.id)}
            detail={detailOf(selected.id)}
            reach={selected.id === state.positionNodeId ? 'here' : route ? 'route' : 'none'}
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
        <PartyPanel
          characters={state.characters}
          flask={flask}
          disabled={busy}
          echoes={state.echoes}
          onDrink={handleDrink}
          onOpenParty={() => setPartyOpen(true)}
        />
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
      {partyOpen && (
        <PartyScreen
          open
          state={state}
          atCamp={isAtOpenCamp(state)}
          onChange={update}
          onClose={() => setPartyOpen(false)}
        />
      )}
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
      <TeleportDialog
        open={teleporting}
        camps={otherCamps}
        onSelect={handleTeleport}
        onClose={() => setTeleporting(false)}
      />
    </div>
  )
}
