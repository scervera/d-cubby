'use client'

import { useEffect, useId, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { XMarkIcon } from '@heroicons/react/24/outline'

/** Centered dialog above the app header, closed by Escape, backdrop click or the X. */
export default function ModalShell({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  const tCommon = useTranslations('common')
  const titleId = useId()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center bg-backdrop p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`flex max-h-[85vh] w-full flex-col overflow-hidden rounded-control bg-surface ${wide ? 'max-w-2xl' : 'max-w-md'}`}
      >
        <div className="flex items-center justify-between border-b border-line p-6">
          <h2 id={titleId} className="text-xl font-semibold text-fg">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-subtle hover:text-muted"
            aria-label={tCommon('close')}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
