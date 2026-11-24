'use client'

import type { ReactNode } from 'react'

import SharedLayout from '@/components/shared/SharedLayout'
import PageSpinner from '@/components/ui/PageSpinner'
import { useRequireAuth } from '@/hooks/useRequireAuth'

/** Signed-in page with a title. `admin` pages redirect non-admins to the library. */
export default function SettingsPage({
  title,
  description,
  admin = true,
  currentPage = 'settings',
  children,
}: {
  title: string
  description?: ReactNode
  admin?: boolean
  currentPage?: 'settings' | 'account'
  children: ReactNode
}) {
  const { ready } = useRequireAuth({ admin })
  if (!ready) return <PageSpinner />
  return (
    <SharedLayout currentPage={currentPage} showAssetCategories={false}>
      <header>
        <h1 className="font-heading text-2xl font-semibold text-[#2C3A47] dark:text-[#E3E1CE]">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{description}</p>}
      </header>
      {children}
    </SharedLayout>
  )
}

export function Panel({ title, children, actions }: { title?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="glass-panel rounded-2xl p-4 sm:p-6">
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="font-heading text-lg font-semibold text-[#2C3A47] dark:text-[#E3E1CE]">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  )
}
