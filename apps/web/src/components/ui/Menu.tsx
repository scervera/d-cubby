'use client'

import type { ReactNode } from 'react'
import { Menu as HeadlessMenu, MenuButton, MenuItem as HeadlessMenuItem, MenuItems } from '@headlessui/react'

/**
 * A dropdown of actions. Opens with click, Enter or Space, moves with the arrow keys and
 * renders outside its parent, so a card with clipped overflow cannot cut it off.
 */
export function Menu({
  label,
  button,
  buttonClassName,
  children,
  align = 'end',
}: {
  /** Accessible name of the trigger, e.g. "Actions for sunset.jpg". */
  label: string
  button: ReactNode
  buttonClassName: string
  children: ReactNode
  align?: 'start' | 'end'
}) {
  return (
    <HeadlessMenu>
      <MenuButton
        aria-label={label}
        className={buttonClassName}
        onClick={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
      >
        {button}
      </MenuButton>
      <MenuItems
        anchor={{ to: align === 'end' ? 'bottom end' : 'bottom start', gap: 4 }}
        className="z-dropdown min-w-44 rounded-card border bg-raised p-1 shadow-overlay outline-none"
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </MenuItems>
    </HeadlessMenu>
  )
}

export function MenuItem({
  onClick,
  icon,
  danger = false,
  disabled = false,
  children,
}: {
  onClick: () => void
  icon?: ReactNode
  danger?: boolean
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <HeadlessMenuItem disabled={disabled}>
      <button
        type="button"
        onClick={onClick}
        className={`flex w-full items-center gap-2 rounded-thumb px-2 py-1.5 text-left text-sm data-focus:bg-hover data-disabled:opacity-50 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0 ${
          danger ? 'text-danger-text' : 'text-fg'
        }`}
      >
        {icon}
        {children}
      </button>
    </HeadlessMenuItem>
  )
}
