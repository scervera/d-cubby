'use client'

import { useEffect, useId, useState } from 'react'

import { FormError, inputClass, labelClass } from '@/components/forms/fields'
import { Button } from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'

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
 * Confirmation for delete and other irreversible actions. It cannot be dismissed while
 * the action is running.
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
  const phrase = confirmText?.trim() ?? ''
  const requiresTypedAck = phrase !== ''
  const acknowledgementMatches = !requiresTypedAck || typedValue.trim().toLowerCase() === phrase.toLowerCase()
  const canConfirm = !loading && acknowledgementMatches

  useEffect(() => {
    if (!open) setTypedValue('')
  }, [open])

  if (!open) return null

  return (
    <Modal
      title={title}
      onClose={onCancel}
      size="sm"
      role="alertdialog"
      dismissable={!loading}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={!canConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm whitespace-pre-line text-muted">{body}</p>
        {requiresTypedAck && (
          <div>
            <label htmlFor={inputId} className={labelClass}>
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
              className={inputClass}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && canConfirm) {
                  event.preventDefault()
                  onConfirm()
                }
              }}
            />
          </div>
        )}
        <FormError message={error} />
      </div>
    </Modal>
  )
}
