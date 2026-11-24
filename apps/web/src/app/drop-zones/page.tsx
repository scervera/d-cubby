'use client'

import DropZonesList from '@/components/drop-zones/DropZonesList'
import SharedLayout from '@/components/shared/SharedLayout'
import PageSpinner from '@/components/ui/PageSpinner'
import { useRequireAuth } from '@/hooks/useRequireAuth'

export default function DropZonesPage() {
  const { ready } = useRequireAuth()
  if (!ready) return <PageSpinner />

  return (
    <SharedLayout currentPage="drop-zones">
      <DropZonesList />
    </SharedLayout>
  )
}
