'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

import Dashboard from '@/components/dashboard/Dashboard'
import PageSpinner from '@/components/ui/PageSpinner'
import { useRequireAuth } from '@/hooks/useRequireAuth'

function AssetsLibrary() {
  const { ready } = useRequireAuth()
  const params = useSearchParams()

  if (!ready) return <PageSpinner />

  const smartFolder = Number.parseInt(params.get('smart_folder') ?? '', 10)
  const tagIds = (params.get('tag_ids') ?? '')
    .split(',')
    .map((id) => Number.parseInt(id.trim(), 10))
    .filter((id) => !Number.isNaN(id))

  return (
    <Dashboard
      initial={{
        category: params.get('category'),
        smartFolderId: Number.isNaN(smartFolder) ? null : smartFolder,
        tagIds,
        search: tagIds.length ? params.get('q') : null,
      }}
    />
  )
}

/** /assets — the asset library (?category=image, ?smart_folder=ID, ?tag_ids=1,2&q=...). */
export default function AssetsPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <AssetsLibrary />
    </Suspense>
  )
}
