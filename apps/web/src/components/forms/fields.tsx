'use client'

import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'

export { Button } from '@/components/ui/Button'

/** Every text input, select and textarea. Controls get the stronger border so their edge is visible. */
export const inputClass =
  'block w-full rounded-control border border-line-strong bg-surface px-3 py-2 text-sm text-fg placeholder:text-subtle disabled:cursor-not-allowed disabled:opacity-60'

/** Compact variant for dense toolbars and number fields. */
export const inputClassSm =
  'block w-full rounded-control border border-line-strong bg-surface px-2 py-1 text-xs text-fg placeholder:text-subtle disabled:cursor-not-allowed disabled:opacity-60'

export const labelClass = 'mb-1 block text-sm font-medium text-fg'
export const hintClass = 'mt-1 text-xs text-subtle'

interface FieldProps {
  label: string
  hint?: ReactNode
  error?: string | null
}

export const TextField = forwardRef<
  HTMLInputElement,
  FieldProps & InputHTMLAttributes<HTMLInputElement> & { /** Monospace, for paths and identifiers. */ mono?: boolean }
>(
  function TextField({ label, hint, error, id, className, mono, ...props }, ref) {
    const inputId = id ?? props.name
    return (
      <div className={className}>
        <label htmlFor={inputId} className={labelClass}>
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          className={mono ? `${inputClass} font-mono` : inputClass}
          aria-invalid={error ? true : undefined}
          aria-describedby={hint || error ? `${inputId}-help` : undefined}
          {...props}
        />
        {(error || hint) && (
          <p id={`${inputId}-help`} className={`mt-1 text-xs ${error ? 'text-danger-text' : 'text-subtle'}`}>
            {error || hint}
          </p>
        )}
      </div>
    )
  },
)

export const TextAreaField = forwardRef<HTMLTextAreaElement, FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function TextAreaField({ label, hint, error, id, className, rows = 3, ...props }, ref) {
    const inputId = id ?? props.name
    return (
      <div className={className}>
        <label htmlFor={inputId} className={labelClass}>
          {label}
        </label>
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          className={inputClass}
          aria-invalid={error ? true : undefined}
          aria-describedby={hint || error ? `${inputId}-help` : undefined}
          {...props}
        />
        {(error || hint) && (
          <p id={`${inputId}-help`} className={`mt-1 text-xs ${error ? 'text-danger-text' : 'text-subtle'}`}>
            {error || hint}
          </p>
        )}
      </div>
    )
  },
)

/** A checkbox or radio with its label. */
export function CheckField({
  label,
  hint,
  className = '',
  type = 'checkbox',
  ...props
}: { label: ReactNode; hint?: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={`flex items-start gap-2 text-sm text-fg ${props.disabled ? 'opacity-60' : 'cursor-pointer'} ${className}`}>
      <input type={type} className="mt-0.5 h-4 w-4 shrink-0" {...props} />
      <span className="min-w-0">
        {label}
        {hint && <span className="block text-xs text-subtle">{hint}</span>}
      </span>
    </label>
  )
}

export function SelectField({
  label,
  hint,
  id,
  className,
  children,
  ...props
}: FieldProps & SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  const selectId = id ?? props.name
  return (
    <div className={className}>
      <label htmlFor={selectId} className={labelClass}>
        {label}
      </label>
      <select id={selectId} className={inputClass} {...props}>
        {children}
      </select>
      {hint && <p className={hintClass}>{hint}</p>}
    </div>
  )
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null
  return (
    <div role="alert" className="rounded-control bg-danger-subtle px-3 py-2 text-sm text-danger-text">
      {message}
    </div>
  )
}

/** Rough strength score 0-4 for the meter (length and character variety). */
export function passwordStrength(password: string): number {
  if (!password) return 0
  let score = 0
  if (password.length >= 10) score++
  if (password.length >= 14) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++
  return Math.min(score, 4)
}

export function PasswordStrengthMeter({ password, labels }: { password: string; labels: string[] }) {
  const score = passwordStrength(password)
  const colors = ['bg-danger', 'bg-warning', 'bg-warning', 'bg-success', 'bg-success']
  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i < score ? colors[score] : 'bg-sunken'}`} />
        ))}
      </div>
      {password && <p className="mt-1 text-xs text-subtle">{labels[score]}</p>}
    </div>
  )
}

export const MIN_PASSWORD_LENGTH = 10
