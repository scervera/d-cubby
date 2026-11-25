'use client'

import type { ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'

import { IconButton } from './Button'

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'

const SIZES: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-5xl',
  full: 'max-w-[1320px]',
}

interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
  /** Render-controlled by default: mount it to open, unmount to close. */
  open?: boolean
  size?: ModalSize
  /** Use "alertdialog" for confirmations that interrupt the user. */
  role?: 'dialog' | 'alertdialog'
  /** False while an action is running: Escape, backdrop and the X do nothing. */
  dismissable?: boolean
  /** Controls shown in the header, left of the close button. */
  headerActions?: ReactNode
  /** Pinned below the scrolling body, for the form's buttons. */
  footer?: ReactNode
  /** No panel, header or padding: the children fill the screen (full-screen viewer). */
  bare?: boolean
  /** Replaces the body's default padding and scrolling. */
  bodyClassName?: string
}

/**
 * The one dialog. It traps focus, returns it on close, locks page scroll and closes on
 * Escape or a backdrop click. Dialogs opened from inside a dialog stack in open order.
 */
export default function Modal({
  title,
  onClose,
  children,
  open = true,
  size = 'md',
  role = 'dialog',
  dismissable = true,
  headerActions,
  footer,
  bare = false,
  bodyClassName = 'overflow-y-auto p-5',
}: ModalProps) {
  const tCommon = useTranslations('common')
  const close = () => {
    if (dismissable) onClose()
  }

  if (bare) {
    return (
      <Dialog open={open} onClose={close} role={role} aria-label={title} className="relative z-modal">
        <DialogPanel className="fixed inset-0">{children}</DialogPanel>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onClose={close} role={role} className="relative z-modal">
      <DialogBackdrop className="fixed inset-0 bg-backdrop" />
      <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-4">
        <DialogPanel
          className={`flex max-h-full w-full flex-col overflow-hidden rounded-dialog border bg-raised shadow-overlay ${SIZES[size]} ${size === 'full' ? 'h-full' : ''}`}
        >
          <div className="flex shrink-0 items-center gap-2 border-b py-2.5 pr-2.5 pl-5">
            <DialogTitle className="min-w-0 flex-1 truncate text-base font-semibold text-fg">{title}</DialogTitle>
            {headerActions}
            <IconButton aria-label={tCommon('close')} onClick={close} disabled={!dismissable}>
              <XMarkIcon className="h-5 w-5" aria-hidden />
            </IconButton>
          </div>
          <div className={`min-h-0 flex-1 ${bodyClassName}`}>{children}</div>
          {footer && <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t px-5 py-3">{footer}</div>}
        </DialogPanel>
      </div>
    </Dialog>
  )
}
