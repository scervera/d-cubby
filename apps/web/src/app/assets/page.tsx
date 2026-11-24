'use client'

// Placeholder until the asset browser is ported (components/dashboard/Dashboard).
import SharedLayout from '@/components/shared/SharedLayout'
import PageSpinner from '@/components/ui/PageSpinner'
import { useRequireAuth } from '@/hooks/useRequireAuth'

export default function AssetsPage() {
  const { ready } = useRequireAuth()
  if (!ready) return <PageSpinner />
  return (
    <SharedLayout currentPage="assets">
      <div className="glass-panel rounded-2xl p-6">Assets</div>
    </SharedLayout>
  )
}
