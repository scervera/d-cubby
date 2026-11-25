import Link from 'next/link'
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-ghost'
export type ButtonSize = 'sm' | 'md'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover',
  secondary: 'border bg-surface text-fg hover:bg-hover',
  ghost: 'text-muted hover:bg-hover hover:text-fg',
  danger: 'bg-danger text-on-accent hover:bg-danger-hover',
  'danger-ghost': 'text-danger-text hover:bg-danger-subtle',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 gap-1.5 px-2.5 text-xs',
  md: 'h-9 gap-2 px-3.5 text-sm',
}

const ICON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 w-8',
  md: 'h-9 w-9',
}

const BASE =
  'inline-flex shrink-0 items-center justify-center rounded-control font-medium whitespace-nowrap transition-colors duration-100 disabled:cursor-not-allowed disabled:opacity-50'

/** The button look, for elements that are not a <button> (links, labels for file inputs). */
export function buttonClass({
  variant = 'secondary',
  size = 'md',
  icon = false,
  className = '',
}: { variant?: ButtonVariant; size?: ButtonSize; icon?: boolean; className?: string } = {}) {
  return `${BASE} ${VARIANTS[variant]} ${icon ? ICON_SIZES[size] : SIZES[size]} ${className}`.trim()
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

/** One primary button per view; everything else is secondary or ghost. */
export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  children,
  className = '',
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button type={type} className={buttonClass({ variant, size, className })} disabled={disabled || loading} {...props}>
      {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
      {children}
    </button>
  )
}

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  /** Icon-only buttons have no visible text, so the label is required. */
  'aria-label': string
  variant?: ButtonVariant
  size?: ButtonSize
  children: ReactNode
}

export function IconButton({ variant = 'ghost', size = 'md', className = '', type = 'button', children, ...props }: IconButtonProps) {
  return (
    <button type={type} className={buttonClass({ variant, size, icon: true, className })} {...props}>
      {children}
    </button>
  )
}

interface ButtonLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  href: string
  variant?: ButtonVariant
  size?: ButtonSize
}

export function ButtonLink({ href, variant = 'secondary', size = 'md', className = '', children, ...props }: ButtonLinkProps) {
  return (
    <Link href={href} className={buttonClass({ variant, size, className })} {...props}>
      {children}
    </Link>
  )
}
