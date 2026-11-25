'use client'

import type { ReactNode } from 'react'

import SharedLayout from '@/components/shared/SharedLayout'
import PageSpinner from '@/components/ui/PageSpinner'
import { PageHeader } from '@/components/ui/Panel'
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
      <PageHeader title={title} description={description} />
      {children}
    </SharedLayout>
  )
}

export { Panel } from '@/components/ui/Panel'
