'use client'

import './index.scss'
import { useSaves } from '@/app/(protected)/(saves)/hooks/useSaves'
import GameButton from '@/app/components/GameButton'
import GamePanel from '@/app/components/GamePanel'
import Loading from '@/app/components/Loading'
import { useLoadingData } from '@/app/hooks/useLoadingData'
import { useT } from '@/app/i18n/I18nProvider'
import type { MessageKey } from '@/app/i18n/messages'

/**
 * The world (/world): loads the saved game. For now it only shows where the
 * party is and who is in it; the map arrives in the next phase.
 */
export default function WorldScreen() {
  const t = useT()
  const { loadGame } = useSaves()
  const { data: save, loading } = useLoadingData(loadGame, [])

  if (loading) {
    return <Loading />
  }

  return (
    <div className="world-screen">
      <GamePanel title={t('world.title')}>
        {save ? (
          <div className="world-content">
            <p className="location">{t(`world.camps.${save.state.positionNodeId}` as MessageKey)}</p>
            <ul className="party">
              {save.state.characters.map((character) => (
                <li key={character.id}>
                  <span className="name">{t(`characters.${character.id}.name` as MessageKey)}</span>
                  <span className="level">{t('world.level', { level: character.level })}</span>
                </li>
              ))}
            </ul>
            <p className="coming-soon">{t('world.comingSoon')}</p>
          </div>
        ) : (
          <p className="coming-soon">{t('errors.saveNotFound')}</p>
        )}
        <GameButton color="ghost" fullWidth href="/menu">
          {t('world.backToMenu')}
        </GameButton>
      </GamePanel>
    </div>
  )
}
