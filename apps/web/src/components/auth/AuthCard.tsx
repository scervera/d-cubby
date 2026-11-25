'use client'

import type { ReactNode } from 'react'

import ThemeToggle from '@/components/ui/ThemeToggle'
import { useAppConfig } from '@/hooks/useAppConfig'

/** Centered panel for signed-out pages (sign-in, password reset, setup). */
export default function AuthCard({ title, subtitle, children, wide }: { title: string; subtitle?: ReactNode; children: ReactNode; wide?: boolean }) {
  const { config } = useAppConfig()
  const org = config?.organization
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="fixed right-4 top-4">
        <ThemeToggle variant="toolbar" />
      </div>
      <div className={`rounded-card border bg-surface w-full ${wide ? 'max-w-2xl' : 'max-w-md'} rounded-card p-6 sm:p-8`}>
        <div className="mb-6 flex items-center gap-3">
          {org?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={org.logo_url} alt="" className="h-11 w-11 rounded-control object-contain" />
          ) : (
            <span className="flex h-11 w-11 items-center justify-center rounded-control bg-accent font-bold text-accent-text">
              D³
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold uppercase tracking-[0.2em] text-subtle">
              {org?.name ?? 'D-cubby'}
            </p>
            <h1 className="text-xl font-semibold text-fg">{title}</h1>
          </div>
        </div>
        {subtitle && <div className="mb-5 text-sm text-muted">{subtitle}</div>}
        {children}
      </div>
    </div>
  )
}
