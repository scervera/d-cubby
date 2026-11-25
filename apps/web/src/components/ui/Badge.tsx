import type { ReactNode } from 'react'
import { XMarkIcon } from '@heroicons/react/20/solid'

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger'

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-sunken text-muted',
  accent: 'bg-accent-subtle text-accent-text',
  success: 'bg-success-subtle text-success-text',
  warning: 'bg-warning-subtle text-warning-text',
  danger: 'bg-danger-subtle text-danger-text',
}

/** A short label: a tag, a status, a count. */
export default function Badge({
  tone = 'neutral',
  children,
  onRemove,
  removeLabel,
  className = '',
}: {
  tone?: BadgeTone
  children: ReactNode
  onRemove?: () => void
  /** Required with onRemove: what the remove button does, e.g. "Remove tag sunset". */
  removeLabel?: string
  className?: string
}) {
  return (
    <span className={`inline-flex max-w-full items-center gap-1 rounded-thumb px-1.5 py-0.5 text-xs font-medium ${TONES[tone]} ${className}`}>
      <span className="truncate">{children}</span>
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={removeLabel} className="-mr-0.5 rounded-thumb opacity-70 hover:opacity-100">
          <XMarkIcon className="h-3.5 w-3.5" aria-hidden />
        </button>
      )}
    </span>
  )
}
