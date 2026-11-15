'use client'

import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import ListSubheader from '@mui/material/ListSubheader'
import { Fragment } from 'react'
import { useT } from '@/app/i18n/I18nProvider'

export interface TeleportTarget {
  nodeId: string
  name: string
  /** The name of the biome of the camp, already translated: the header of its group. */
  biome: string
}

interface TeleportDialogProps {
  open: boolean
  /** The camps, already sorted so the ones of a same biome come together. */
  camps: TeleportTarget[]
  onSelect: (nodeId: string) => void
  onClose: () => void
}

/** The open camps the party can travel to from the one where it stands, grouped by biome. */
export default function TeleportDialog({ open, camps, onSelect, onClose }: TeleportDialogProps) {
  const t = useT()

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t('world.panel.teleportTitle')}</DialogTitle>
      {/* The paper of the dialogs lets its corners stick out (overflow visible): the list scrolls by itself, so the many
          camps of the map do not spill out of the frame (on a phone held sideways only a few rows fit). */}
      <List sx={{ pb: 2, pt: 0, overflowY: 'auto', minHeight: 0 }}>
        {camps.map((camp, i) => (
          <Fragment key={camp.nodeId}>
            {(i === 0 || camps[i - 1].biome !== camp.biome) && (
              // The header of the biome stays on top while its camps scroll under it.
              <ListSubheader
                disableGutters
                sx={{
                  px: 2,
                  lineHeight: { xs: '28px', sm: '36px' },
                  color: 'var(--color-gold)',
                  // Opaque (the paper is a gradient) so the rows scrolling under it do not show through.
                  backgroundColor: '#2e3286',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontSize: { xs: '0.7rem', sm: '0.75rem' },
                  borderBottom: '1px solid rgba(255, 201, 60, 0.35)'
                }}
              >
                {camp.biome}
              </ListSubheader>
            )}
            <ListItemButton onClick={() => onSelect(camp.nodeId)} sx={{ py: { xs: 0.25, sm: 0.5 } }}>
              <ListItemIcon sx={{ color: 'var(--color-gold)' }}>
                <LocalFireDepartmentIcon />
              </ListItemIcon>
              <ListItemText primary={camp.name} />
            </ListItemButton>
          </Fragment>
        ))}
      </List>
    </Dialog>
  )
}
