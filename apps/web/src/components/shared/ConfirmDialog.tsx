'use client'

import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  body: string
  cancelLabel: string
  confirmLabel: string
  onCancel: () => void
  onConfirm: () => void
  loading?: boolean
  /** Shown below the body when the last confirm action failed (e.g. rate limit). */
  error?: string | null
  /**
   * When set, the confirm button stays disabled until the user types this phrase
   * (trimmed, case-insensitive). Use for high-impact irreversible actions.
   */
  confirmText?: string
  /** Instruction shown above the acknowledgement input (e.g. "Type RECREATE to confirm"). */
  confirmPrompt?: string
}

/**
 * Standard destructive / confirmation modal (glass panel, backdrop dismiss).
 * Used for delete and other irreversible actions across the app.
 */
export default function ConfirmDialog({
  open,
  title,
  body,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
  loading = false,
  error = null,
  confirmText,
  confirmPrompt,
}: ConfirmDialogProps) {
  const inputId = useId()
  const [typedValue, setTypedValue] = useState('')
  const [mounted, setMounted] = useState(false)
  const requiresTypedAck = Boolean(confirmText?.trim())
  const phrase = confirmText?.trim() ?? ''
  const acknowledgementMatches =
    !requiresTypedAck || typedValue.trim().toLowerCase() === phrase.toLowerCase()
  const canConfirm = !loading && acknowledgementMatches

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) {
      setTypedValue('')
      return
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) onCancel()
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, onCancel, loading])

  if (!open || !mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-modal flex items-center justify-center bg-backdrop p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget && !loading) onCancel()
      }}
      role="presentation"
    >
      <div
        className="rounded-card border bg-surface mx-auto w-full max-w-md border border-line px-6 py-6"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-body"
      >
        <div className="mb-3 flex items-center gap-2">
          <ExclamationTriangleIcon className="h-5 w-5 shrink-0 text-warning-text" aria-hidden />
          <h3 id="confirm-dialog-title" className="text-lg font-semibold text-fg">
            {title}
          </h3>
        </div>
        <p id="confirm-dialog-body" className="text-sm text-muted whitespace-pre-line">
          {body}
        </p>
        {requiresTypedAck ? (
          <div className="mt-4 space-y-2">
            <label htmlFor={inputId} className="block text-sm font-medium text-muted">
              {confirmPrompt || `Type ${phrase} to confirm`}
            </label>
            <input
              id={inputId}
              type="text"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              value={typedValue}
              onChange={(event) => setTypedValue(event.target.value)}
              disabled={loading}
              placeholder={phrase}
              className="w-full rounded-control border border-line bg-surface px-3 py-2 text-sm text-fg placeholder:text-subtle disabled:opacity-50"
              onKeyDown={(event) => {
                if (event.key === 'Enter' && canConfirm) {
                  event.preventDefault()
                  onConfirm()
                }
              }}
            />
          </div>
        ) : null}
        {error ? (
          <p
            className="mt-3 rounded-control border border-danger bg-danger-subtle px-3 py-2 text-sm text-danger-text"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-control border border-line bg-surface px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-line-strong hover:bg-hover disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm}
            className="inline-flex items-center gap-2 rounded-control bg-danger px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-danger-hover disabled:opacity-50"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
