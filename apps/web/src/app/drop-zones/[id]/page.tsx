'use client'

import { useParams } from 'next/navigation'

import DropZoneFolderView from '@/components/drop-zones/DropZoneFolderView'
import SharedLayout from '@/components/shared/SharedLayout'
import PageSpinner from '@/components/ui/PageSpinner'
import { useRequireAuth } from '@/hooks/useRequireAuth'

export default function DropZonePage() {
  const { ready } = useRequireAuth()
  const { id } = useParams<{ id: string }>()
  if (!ready) return <PageSpinner />

  return (
    <SharedLayout currentPage="drop-zones">
      <DropZoneFolderView dropZoneId={id} />
    </SharedLayout>
  )
}
