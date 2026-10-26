'use client'

import './index.scss'
import ButtonBase, { ButtonBaseProps } from '@mui/material/ButtonBase'
import CircularProgress from '@mui/material/CircularProgress'
import classNames from 'classnames'
import Link from 'next/link'
import { ReactNode } from 'react'

export type GameButtonColor = 'gold' | 'cyan' | 'magenta' | 'lime' | 'ghost'
export type GameButtonSize = 'small' | 'medium' | 'large'

interface GameButtonProps extends Omit<ButtonBaseProps, 'color'> {
  color?: GameButtonColor
  size?: GameButtonSize
  fullWidth?: boolean
  loading?: boolean
  startIcon?: ReactNode
  endIcon?: ReactNode
  /** When set, the button renders as a Next.js link. */
  href?: string
}

/**
 * Game button: a metal plaque (gold, blue, ember, green or dark leather) with a
 * bronze ring that glows when hovered or focused. The main call to action of
 * every game screen.
 */
export default function GameButton({
  color = 'gold',
  size = 'medium',
  fullWidth,
  loading,
  startIcon,
  endIcon,
  href,
  disabled,
  className,
  children,
  ...props
}: GameButtonProps) {
  const classes = classNames('game-button', `color-${color}`, `size-${size}`, className, {
    'full-width': fullWidth,
    loading
  })
  const content = (
    <>
      {loading ? <CircularProgress size="1.1em" color="inherit" className="icon" /> : startIcon}
      <span className="label">{children}</span>
      {!loading && endIcon}
    </>
  )

  if (href) {
    return (
      <ButtonBase component={Link} href={href} className={classes} disabled={disabled || loading} {...props}>
        {content}
      </ButtonBase>
    )
  }

  return (
    <ButtonBase className={classes} disabled={disabled || loading} {...props}>
      {content}
    </ButtonBase>
  )
}
