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
    return <div className="flex h-64 items-center justify-center text-slate-500 dark:text-slate-400">{t('loading')}</div>
  }

  if (!loading && assets.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-white/20 bg-white/15 px-6 text-center backdrop-blur dark:border-white/10 dark:bg-slate-800/50">
        <TrashIcon className="mb-4 h-12 w-12 text-slate-400 dark:text-slate-500" />
        <p className="text-lg font-medium text-slate-700 dark:text-slate-300">{t('emptyTitle')}</p>
        <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">{t('emptyBody')}</p>
        <Link href="/assets" className="mt-4 text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
          {t('backToLibrary')}
        </Link>
      </div>
    )
  }

  const pendingName = pending?.asset.attributes.name ?? ''

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-2xl border border-white/20 bg-white/15 backdrop-blur dark:border-white/10 dark:bg-slate-800/50">
        <table className="min-w-full divide-y divide-slate-200/60 dark:divide-slate-700/60">
          <thead className="bg-slate-50/80 dark:bg-slate-900/40">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('columns.item')}</th>
              <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 sm:table-cell dark:text-slate-400">
                {t('columns.deletedAt')}
              </th>
              <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 md:table-cell dark:text-slate-400">
                {t('columns.purgeAfter')}
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('columns.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/60 dark:divide-slate-700/60">
            {assets.map((asset) => {
              const attrs = asset.attributes
              const thumb = attrs.thumbnail_url || attrs.preview_url
              const Icon = getFileIcon(attrs.file_type)
              const busy = actingId === asset.id
              const restoreAllowed = canRestore(asset)
              return (
                <tr key={asset.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-200 dark:bg-slate-700">
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumb} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Icon className="h-6 w-6 text-slate-400" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900 dark:text-slate-100">{attrs.name}</p>
                        <p className="text-xs text-slate-500 sm:hidden dark:text-slate-400">
                          {t('columns.deletedAt')}: {formatDate(attrs.deleted_at)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-sm text-slate-600 sm:table-cell dark:text-slate-300">{formatDate(attrs.deleted_at)}</td>
                  <td className="hidden px-4 py-3 text-sm text-slate-600 md:table-cell dark:text-slate-300">{formatDate(attrs.purge_after)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        disabled={!restoreAllowed || busy}
                        onClick={() => setPending({ kind: 'restore', asset })}
                        className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300"
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
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400"
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
