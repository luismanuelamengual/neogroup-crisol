'use client'

import './index.scss'
import classNames from 'classnames'
import { useEffect, useState } from 'react'
import SoundButton from '@/app/(protected)/(art)/components/SoundButton'
import { MUSIC, MusicId, SFX, SfxId } from '@/app/(protected)/(art)/data/audio'
import { loadArtManifest } from '@/app/(protected)/(art)/utils/art'
import { audioFile, playMusic, playSfx, stopMusic } from '@/app/(protected)/(art)/utils/sound'

const GROUPS: { title: string; ids: SfxId[] }[] = [
  { title: 'Armas', ids: ['slash', 'pierce', 'blunt', 'critical', 'miss', 'block', 'hurt'] },
  { title: 'Elementos', ids: ['fire', 'ice', 'lightning', 'earth', 'light', 'darkness'] },
  {
    title: 'Apoyo y estados',
    ids: ['heal', 'revive', 'buff', 'debuff', 'poison', 'stun', 'stance', 'shield', 'focus']
  },
  { title: 'Enemigos', ids: ['enemy-fall', 'boss-bar', 'boss-roar', 'phase'] },
  { title: 'Fin de la batalla', ids: ['victory-sting', 'defeat-sting'] },
  { title: 'Mapa', ids: ['step', 'chest', 'coin', 'rest', 'flask', 'level-up', 'rune'] },
  { title: 'Menús', ids: ['button', 'cursor', 'menu-open', 'menu-close'] }
]

/**
 * Every sound effect (synthesized unless it has a file) and every theme
 * (with whether its file is there and which one plays), to hear them one by
 * one on a computer or a phone.
 */
export default function SoundsPreview() {
  const [files, setFiles] = useState<{ music: string[]; sfx: string[] } | null>(null)
  const [playing, setPlaying] = useState<MusicId | null>(null)

  useEffect(() => {
    void loadArtManifest().then(({ music, sfx }) => setFiles({ music, sfx }))

    return () => stopMusic()
  }, [])

  const missing = SFX.filter((id) => !GROUPS.some((group) => group.ids.includes(id)))

  return (
    <div className="sounds-preview" data-silent>
      <header>
        <h1>Sonidos</h1>
        <SoundButton />
      </header>

      {[...GROUPS, ...(missing.length ? [{ title: 'Otros', ids: missing }] : [])].map((group) => (
        <section key={group.title}>
          <h2>{group.title}</h2>
          <div className="grid">
            {group.ids.map((id) => (
              <button key={id} type="button" onClick={() => playSfx(id)}>
                {id}
                {files && audioFile('sfx', id, files.sfx) && <small>archivo</small>}
              </button>
            ))}
          </div>
        </section>
      ))}

      <section>
        <h2>Música</h2>
        <div className="grid">
          {MUSIC.map((id) => {
            const src = files ? audioFile('music', id, files.music) : null

            return (
              <button
                key={id}
                type="button"
                className={classNames({ active: playing === id, missing: !src })}
                onClick={() => {
                  if (playing === id) {
                    stopMusic()
                    setPlaying(null)
                  } else {
                    void playMusic(id)
                    setPlaying(id)
                  }
                }}
              >
                {id}
                <small>{src ? src.split('/').pop() : 'falta'}</small>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
