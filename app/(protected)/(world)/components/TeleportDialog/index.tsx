'use client'

import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import { useT } from '@/app/i18n/I18nProvider'

export interface TeleportTarget {
  nodeId: string
  name: string
  biome: string
}

interface TeleportDialogProps {
  open: boolean
  camps: TeleportTarget[]
  onSelect: (nodeId: string) => void
  onClose: () => void
}

/** The open camps the party can travel to from the one where it stands. */
export default function TeleportDialog({ open, camps, onSelect, onClose }: TeleportDialogProps) {
  const t = useT()

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t('world.panel.teleportTitle')}</DialogTitle>
      {/* The paper of the dialogs lets its corners stick out (overflow visible): the list scrolls by itself, so the many
          camps of the map do not spill out of the frame (on a phone held sideways only a few rows fit). */}
      <List sx={{ pb: 2, overflowY: 'auto', minHeight: 0 }}>
        {camps.map((camp) => (
          <ListItemButton key={camp.nodeId} onClick={() => onSelect(camp.nodeId)} sx={{ py: { xs: 0.25, sm: 0.5 } }}>
            <ListItemIcon sx={{ color: 'var(--color-gold)' }}>
              <LocalFireDepartmentIcon />
            </ListItemIcon>
            <ListItemText primary={camp.name} secondary={camp.biome} />
          </ListItemButton>
        ))}
      </List>
    </Dialog>
  )
}
