'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useFormatter, useTranslations } from 'next-intl'
import { ArrowPathIcon, TrashIcon } from '@heroicons/react/24/outline'

import { getFileIcon } from '@/components/dashboard/assetUtils'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Pagination from '@/components/shared/Pagination'
import type { RecycleBinAsset } from '@/lib/assetsApi'

interface RecycleBinTableProps {
  assets: RecycleBinAsset[]
  loading: boolean
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  onItemsPerPageChange: (perPage: number) => void
  onRestore: (id: string) => void
  onPurge: (id: string) => void
  canRestore: (asset: RecycleBinAsset) => boolean
  canPurge: (asset: RecycleBinAsset) => boolean
  actingId: string | null
}

type PendingAction = { kind: 'restore' | 'purge'; asset: RecycleBinAsset }

/** Deleted assets with their removal dates, and restore / delete-permanently actions. */
export default function RecycleBinTable({
  assets,
  loading,
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  onRestore,
  onPurge,
  canRestore,
  canPurge,
  actingId,
}: RecycleBinTableProps) {
  const t = useTranslations('recycleBin')
  const tCommon = useTranslations('common')
  const format = useFormatter()
  const [pending, setPending] = useState<PendingAction | null>(null)

  const formatDate = (iso?: string | null) =>
    iso ? format.dateTime(new Date(iso), { dateStyle: 'medium', timeStyle: 'short' }) : '—'

  if (loading && assets.length === 0) {
    return <div className="flex h-64 items-center justify-center text-subtle">{t('loading')}</div>
  }

  if (!loading && assets.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-card border border-line bg-surface px-6 text-center">
        <TrashIcon className="mb-4 h-12 w-12 text-subtle" />
        <p className="text-lg font-medium text-muted">{t('emptyTitle')}</p>
        <p className="mt-2 max-w-md text-sm text-subtle">{t('emptyBody')}</p>
        <Link href="/assets" className="mt-4 text-sm font-medium text-accent-text hover:text-accent-text">
          {t('backToLibrary')}
        </Link>
      </div>
    )
  }

  const pendingName = pending?.asset.attributes.name ?? ''

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-card border border-line bg-surface">
        <table className="min-w-full divide-y divide-line">
          <thead className="bg-sunken">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-subtle">{t('columns.item')}</th>
              <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-subtle sm:table-cell">
                {t('columns.deletedAt')}
              </th>
              <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-subtle md:table-cell">
                {t('columns.purgeAfter')}
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-subtle">{t('columns.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {assets.map((asset) => {
              const attrs = asset.attributes
              const thumb = attrs.thumbnail_url || attrs.preview_url
              const Icon = getFileIcon(attrs.file_type)
              const busy = actingId === asset.id
              const restoreAllowed = canRestore(asset)
              return (
                <tr key={asset.id} className="hover:bg-hover">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-control bg-sunken">
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumb} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Icon className="h-6 w-6 text-subtle" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-fg">{attrs.name}</p>
                        <p className="text-xs text-subtle sm:hidden">
                          {t('columns.deletedAt')}: {formatDate(attrs.deleted_at)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-sm text-muted sm:table-cell">{formatDate(attrs.deleted_at)}</td>
                  <td className="hidden px-4 py-3 text-sm text-muted md:table-cell">{formatDate(attrs.purge_after)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        disabled={!restoreAllowed || busy}
                        onClick={() => setPending({ kind: 'restore', asset })}
                        className="inline-flex items-center gap-1 rounded-control border border-accent bg-accent-subtle px-3 py-1.5 text-sm font-medium text-accent-text hover:bg-accent-subtle disabled:cursor-not-allowed disabled:opacity-50"
                        title={!restoreAllowed ? t('noPermissionRestore') : undefined}
                      >
                        <ArrowPathIcon className="h-4 w-4" />
                        {busy ? t('restoring') : t('restore')}
                      </button>
                      {canPurge(asset) && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setPending({ kind: 'purge', asset })}
                          className="inline-flex items-center gap-1 rounded-control border border-danger bg-danger-subtle px-3 py-1.5 text-sm font-medium text-danger-text hover:bg-danger-subtle disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <TrashIcon className="h-4 w-4" />
                          {busy ? t('purging') : t('purge')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {totalItems > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={onPageChange}
          onItemsPerPageChange={onItemsPerPageChange}
          loading={loading}
        />
      )}

      <ConfirmDialog
        open={pending !== null}
        title={pending?.kind === 'purge' ? t('purge') : t('restore')}
        body={pending?.kind === 'purge' ? t('confirmPurge', { name: pendingName }) : t('confirmRestore', { name: pendingName })}
        confirmLabel={pending?.kind === 'purge' ? t('purge') : t('restore')}
        cancelLabel={tCommon('cancel')}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending?.kind === 'purge') onPurge(pending.asset.id)
          else if (pending) onRestore(pending.asset.id)
          setPending(null)
        }}
      />
    </div>
  )
}
