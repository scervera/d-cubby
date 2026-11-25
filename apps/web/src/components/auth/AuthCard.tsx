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
      <div className="fixed top-3 right-3">
        <ThemeToggle />
      </div>
      <div className={`w-full ${wide ? 'max-w-2xl' : 'max-w-sm'}`}>
        <div className="mb-6 flex items-center gap-2.5">
          {org?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={org.logo_url} alt="" className="h-7 w-7 rounded-thumb object-contain" />
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-thumb bg-fg text-xs font-semibold text-canvas">D³</span>
          )}
          <p className="truncate text-sm font-semibold text-fg">{org?.name ?? 'D-cubby'}</p>
        </div>
        <div className="rounded-dialog border bg-surface p-6 sm:p-7">
          <h1 className="text-xl font-semibold tracking-tight text-fg">{title}</h1>
          {subtitle && <div className="mt-1.5 text-sm text-muted">{subtitle}</div>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  )
}
