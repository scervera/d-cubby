import type { ReactNode } from 'react'

/** A bordered surface for a group of related content. */
export function Panel({
  title,
  description,
  actions,
  children,
  className = '',
  padded = true,
}: {
  title?: string
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  /** False for content that runs to the panel edge, such as a table. */
  padded?: boolean
}) {
  return (
    <section className={`rounded-card border bg-surface ${className}`}>
      {(title || actions) && (
        <div className={`flex flex-wrap items-center justify-between gap-2 ${padded ? 'px-5 pt-4' : 'border-b px-5 py-3'}`}>
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold text-fg">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={padded ? 'p-5' : ''}>{children}</div>
    </section>
  )
}

/** The title row at the top of a page: what this is, and the main thing you can do here. */
export function PageHeader({
  title,
  description,
  actions,
  children,
}: {
  title: string
  description?: ReactNode
  actions?: ReactNode
  /** Extra content under the title, such as counts. */
  children?: ReactNode
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-xl font-semibold tracking-tight text-fg">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        {children}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

/** What a list shows when there is nothing in it. */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed px-6 py-14 text-center">
      {icon && <div className="mb-3 text-subtle [&>svg]:h-8 [&>svg]:w-8">{icon}</div>}
      <p className="text-sm font-medium text-fg">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/** A label and a value shown as data (counts, sizes). */
export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="text-xs text-subtle">{label}</div>
      <div className="font-mono text-sm tabular-nums text-fg">{value}</div>
    </div>
  )
}
