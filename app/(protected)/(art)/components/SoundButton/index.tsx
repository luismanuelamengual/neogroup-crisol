'use client'

import './index.scss'
import MusicNoteIcon from '@mui/icons-material/MusicNote'
import SpeakerIcon from '@mui/icons-material/Speaker'
import VolumeOffIcon from '@mui/icons-material/VolumeOff'
import VolumeUpIcon from '@mui/icons-material/VolumeUp'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import Slider from '@mui/material/Slider'
import Switch from '@mui/material/Switch'
import { useEffect, useState } from 'react'
import {
  getSoundSettings,
  onSoundSettings,
  playSfx,
  setSoundSettings,
  SoundSettings
} from '@/app/(protected)/(art)/utils/sound'
import GameButton from '@/app/components/GameButton'
import { useT } from '@/app/i18n/I18nProvider'

/** A speaker button that opens the music and effects volumes. */
export default function SoundButton({ className }: { className?: string }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [settings, setSettings] = useState<SoundSettings>(getSoundSettings)

  useEffect(() => onSoundSettings(setSettings), [])

  const Icon = settings.muted ? VolumeOffIcon : VolumeUpIcon

  return (
    <>
      <IconButton className={className} size="small" onClick={() => setOpen(true)} aria-label={t('sound.title')}>
        <Icon fontSize="small" />
      </IconButton>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{t('sound.title')}</DialogTitle>
        <DialogContent className="sound-settings">
          <label className="volume">
            <MusicNoteIcon fontSize="small" />
            <span>{t('sound.music')}</span>
            <Slider
              size="small"
              min={0}
              max={1}
              step={0.05}
              value={settings.music}
              disabled={settings.muted}
              onChange={(_, value) => setSoundSettings({ music: value as number })}
              aria-label={t('sound.music')}
            />
          </label>
          <label className="volume">
            <SpeakerIcon fontSize="small" />
            <span>{t('sound.effects')}</span>
            <Slider
              size="small"
              min={0}
              max={1}
              step={0.05}
              value={settings.sfx}
              disabled={settings.muted}
              onChange={(_, value) => setSoundSettings({ sfx: value as number })}
              onChangeCommitted={() => playSfx('button')}
              aria-label={t('sound.effects')}
            />
          </label>
          <FormControlLabel
            control={
              <Switch
                checked={settings.muted}
                onChange={(event) => setSoundSettings({ muted: event.target.checked })}
              />
            }
            label={t('sound.mute')}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <GameButton size="small" onClick={() => setOpen(false)}>
            {t('common.close')}
          </GameButton>
        </DialogActions>
      </Dialog>
    </>
  )
}
