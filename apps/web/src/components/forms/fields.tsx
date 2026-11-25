'use client'

import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'

const inputClass =
  'block w-full rounded-control border border-line bg-surface px-3 py-2 text-sm text-fg placeholder:text-subtle disabled:opacity-60'

interface FieldProps {
  label: string
  hint?: ReactNode
  error?: string | null
}

export const TextField = forwardRef<HTMLInputElement, FieldProps & InputHTMLAttributes<HTMLInputElement>>(
  function TextField({ label, hint, error, id, className, ...props }, ref) {
    const inputId = id ?? props.name
    return (
      <div className={className}>
        <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-fg">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
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
      <label htmlFor={selectId} className="mb-1 block text-sm font-medium text-fg">
        {label}
      </label>
      <select id={selectId} className={inputClass} {...props}>
        {children}
      </select>
      {hint && <p className="mt-1 text-xs text-subtle">{hint}</p>}
    </div>
  )
}

export function Button({
  variant = 'primary',
  loading,
  children,
  className = '',
  disabled,
  type = 'button',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger'; loading?: boolean }) {
  const styles = {
    primary:
      'bg-accent text-on-accent hover:bg-accent-hover',
    secondary:
      'border border-line bg-raised text-fg hover:bg-hover',
    danger: 'bg-danger text-on-accent hover:bg-danger-hover',
  }[variant]
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-control px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${styles} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
      {children}
    </button>
  )
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null
  return (
    <div role="alert" className="rounded-control border border-danger bg-danger-subtle px-3 py-2 text-sm text-danger-text">
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
