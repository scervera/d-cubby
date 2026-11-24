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
      <div className={`glass-panel w-full ${wide ? 'max-w-2xl' : 'max-w-md'} rounded-3xl p-6 sm:p-8`}>
        <div className="mb-6 flex items-center gap-3">
          {org?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={org.logo_url} alt="" className="h-11 w-11 rounded-xl object-contain" />
          ) : (
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2C3A47] font-heading font-bold text-[#F6DAA9] dark:bg-[#F6DAA9] dark:text-[#121F27]">
              D³
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              {org?.name ?? 'D-cubby'}
            </p>
            <h1 className="font-heading text-xl font-semibold text-[#2C3A47] dark:text-[#E3E1CE]">{title}</h1>
          </div>
        </div>
        {subtitle && <div className="mb-5 text-sm text-slate-600 dark:text-slate-400">{subtitle}</div>}
        {children}
      </div>
    </div>
  )
}
