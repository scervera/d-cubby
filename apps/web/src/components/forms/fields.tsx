'use client'

import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'

const inputClass =
  'block w-full rounded-xl border border-[#B8C5D1] bg-white/80 px-3 py-2 text-sm text-[#2C3A47] shadow-sm placeholder:text-slate-400 focus:border-[#D4A574] focus:outline-none focus:ring-2 focus:ring-[#D4A574]/40 disabled:opacity-60 dark:border-[#263541] dark:bg-[#0d171d] dark:text-[#E3E1CE] dark:focus:border-[#F6DAA9] dark:focus:ring-[#F6DAA9]/30'

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
        <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-[#2C3A47] dark:text-[#E3E1CE]">
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
          <p id={`${inputId}-help`} className={`mt-1 text-xs ${error ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
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
      <label htmlFor={selectId} className="mb-1 block text-sm font-medium text-[#2C3A47] dark:text-[#E3E1CE]">
        {label}
      </label>
      <select id={selectId} className={inputClass} {...props}>
        {children}
      </select>
      {hint && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
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
      'bg-[#2C3A47] text-white hover:bg-[#1E2B33] dark:bg-[#F6DAA9] dark:text-[#121F27] dark:hover:bg-[#ecc98a]',
    secondary:
      'border border-[#B8C5D1] bg-[#D8DFE6] text-[#2C3A47] hover:bg-[#ccd7e0] dark:border-[#263541] dark:bg-[#121F27] dark:text-[#E3E1CE] dark:hover:bg-[#1a2832]',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  }[variant]
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${styles} ${className}`}
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
    <div role="alert" className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
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
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-600']
  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i < score ? colors[score] : 'bg-slate-200 dark:bg-slate-700'}`} />
        ))}
      </div>
      {password && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{labels[score]}</p>}
    </div>
  )
}

export const MIN_PASSWORD_LENGTH = 10
