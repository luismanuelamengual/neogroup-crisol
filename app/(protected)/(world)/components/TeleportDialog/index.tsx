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
      <List sx={{ pb: 2 }}>
        {camps.map((camp) => (
          <ListItemButton key={camp.nodeId} onClick={() => onSelect(camp.nodeId)}>
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
