'use client'

import SharedLayout from '@/components/shared/SharedLayout'
import PageSpinner from '@/components/ui/PageSpinner'
import WatchedFolders from '@/components/watched-folders/WatchedFolders'
import { useRequireAuth } from '@/hooks/useRequireAuth'

export default function WatchedFoldersPage() {
  const { ready } = useRequireAuth({ admin: true })
  if (!ready) return <PageSpinner />

  return (
    <SharedLayout currentPage="settings">
      <WatchedFolders />
    </SharedLayout>
  )
}
