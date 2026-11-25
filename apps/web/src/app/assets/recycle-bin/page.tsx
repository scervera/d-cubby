'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

import RecycleBinTable from '@/components/recycle-bin/RecycleBinTable'
import SharedLayout from '@/components/shared/SharedLayout'
import PageSpinner from '@/components/ui/PageSpinner'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { apiErrorMessage } from '@/lib/api'
import { assetsApi, type RecycleBinAsset } from '@/lib/assetsApi'
import { canPurgeAsset, canRestoreAsset, canWrite } from '@/lib/auth/permissions'
import toast from '@/lib/toast'

const DEFAULT_PER_PAGE = 20

/** /assets/recycle-bin — deleted assets until their retention period ends. */
export default function AssetsRecycleBinPage() {
  const t = useTranslations('recycleBin')
  const { user, ready } = useRequireAuth()
  const [assets, setAssets] = useState<RecycleBinAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  // The API lets only owners, admins and editors open the recycle bin.
  const mayView = canWrite(user)

  const loadRecycleBin = useCallback(async () => {
    setLoading(true)
    try {
      const result = await assetsApi.getRecycleBin({ page, per_page: perPage })
      setAssets(result.data)
      setTotalPages(result.meta.total_pages || 1)
      setTotalItems(result.meta.total_count ?? result.data.length)
    } catch (error) {
      toast.error(apiErrorMessage(error, t('errors.loadFailed')))
      setAssets([])
    } finally {
      setLoading(false)
    }
  }, [page, perPage, t])

  useEffect(() => {
    if (ready && mayView) loadRecycleBin()
  }, [ready, mayView, loadRecycleBin])

  const act = async (assetId: string, action: (id: string) => Promise<unknown>, success: string, failure: string) => {
    setActingId(assetId)
    try {
      await action(assetId)
      toast.success(success)
      await loadRecycleBin()
    } catch (error) {
      toast.error(apiErrorMessage(error, failure))
    } finally {
      setActingId(null)
    }
  }

  if (!ready) return <PageSpinner />

  const rowPermissions = (asset: RecycleBinAsset) => ({ user_id: asset.attributes.user_id, purge_after: asset.attributes.purge_after })

  return (
    <SharedLayout currentPage="recycle-bin" showAssetCategories={false}>
      <div className="rounded-card border bg-surface border border-line p-4 md:p-6 lg:p-8">
        <div className="mb-6">
          <Link href="/assets" className="text-sm font-medium text-accent-text hover:text-accent-text">
            {t('backToLibrary')}
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-fg">{t('pageTitle')}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{t('subtitle')}</p>
        </div>

        {mayView ? (
          <RecycleBinTable
            assets={assets}
            loading={loading}
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={perPage}
            onPageChange={setPage}
            onItemsPerPageChange={(size) => {
              setPerPage(size)
              setPage(1)
            }}
            onRestore={(id) => act(id, assetsApi.restoreAsset, t('toasts.restored'), t('toasts.restoreFailed'))}
            onPurge={(id) => act(id, assetsApi.purgeAsset, t('toasts.purged'), t('toasts.purgeFailed'))}
            canRestore={(asset) => canRestoreAsset(user, rowPermissions(asset))}
            canPurge={(asset) => canPurgeAsset(user, rowPermissions(asset))}
            actingId={actingId}
          />
        ) : (
          <p className="text-sm text-muted">{t('viewersCannotOpen')}</p>
        )}
      </div>
    </SharedLayout>
  )
}
