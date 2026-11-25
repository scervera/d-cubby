'use client'

import { useState } from 'react'
import { useFormatter, useTranslations } from 'next-intl'
import { ArrowPathIcon, TrashIcon } from '@heroicons/react/24/outline'

import { getFileIcon } from '@/components/dashboard/assetUtils'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Pagination from '@/components/shared/Pagination'
import { Button, ButtonLink } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/Panel'
import { LoadingBlock } from '@/components/ui/Spinner'
import { TABLE } from '@/components/ui/table'
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
    return <LoadingBlock label={t('loading')} />
  }

  if (!loading && assets.length === 0) {
    return (
      <EmptyState
        icon={<TrashIcon />}
        title={t('emptyTitle')}
        description={t('emptyBody')}
        action={
          <ButtonLink href="/assets" variant="secondary">
            {t('backToLibrary')}
          </ButtonLink>
        }
      />
    )
  }

  const pendingName = pending?.asset.attributes.name ?? ''

  return (
    <div className="space-y-4">
      <div className={TABLE.wrap}>
        <table className={TABLE.table}>
          <thead className={TABLE.head}>
            <tr>
              <th className={TABLE.th}>{t('columns.item')}</th>
              <th className={`${TABLE.th} hidden sm:table-cell`}>{t('columns.deletedAt')}</th>
              <th className={`${TABLE.th} hidden md:table-cell`}>{t('columns.purgeAfter')}</th>
              <th className={`${TABLE.th} text-right`}>{t('columns.actions')}</th>
            </tr>
          </thead>
          <tbody className={TABLE.body}>
            {assets.map((asset) => {
              const attrs = asset.attributes
              const thumb = attrs.thumbnail_url || attrs.preview_url
              const Icon = getFileIcon(attrs.file_type)
              const busy = actingId === asset.id
              const restoreAllowed = canRestore(asset)
              return (
                <tr key={asset.id} className={TABLE.row}>
                  <td className={TABLE.td}>
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-thumb bg-sunken">
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumb} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Icon className="h-5 w-5 text-subtle" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-fg">{attrs.name}</p>
                        <p className="text-meta sm:hidden">
                          {t('columns.deletedAt')}: {formatDate(attrs.deleted_at)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className={`${TABLE.tdMeta} hidden sm:table-cell`}>{formatDate(attrs.deleted_at)}</td>
                  <td className={`${TABLE.tdMeta} hidden md:table-cell`}>{formatDate(attrs.purge_after)}</td>
                  <td className={TABLE.td}>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={!restoreAllowed || busy}
                        onClick={() => setPending({ kind: 'restore', asset })}
                        title={!restoreAllowed ? t('noPermissionRestore') : undefined}
                      >
                        <ArrowPathIcon className="h-4 w-4" aria-hidden />
                        {busy ? t('restoring') : t('restore')}
                      </Button>
                      {canPurge(asset) && (
                        <Button variant="danger-ghost" size="sm" disabled={busy} onClick={() => setPending({ kind: 'purge', asset })}>
                          <TrashIcon className="h-4 w-4" aria-hidden />
                          {busy ? t('purging') : t('purge')}
                        </Button>
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
