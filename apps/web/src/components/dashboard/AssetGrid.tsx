'use client'

import { useCallback, useEffect, useState, type MouseEvent } from 'react'
import { useTranslations } from 'next-intl'
import {
  ArrowDownTrayIcon,
  CheckCircleIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  PhotoIcon,
  PlayIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'

import ConfirmDialog from '@/components/shared/ConfirmDialog'
import AudioThumbnail from '@/components/ui/AudioThumbnail'
import { sizeConfig } from '@/components/ui/ThumbnailSizeSelector'
import { useThumbnailSize } from '@/contexts/ThumbnailSizeContext'
import type { User } from '@/hooks/useAuth'
import { useDownloadSettings } from '@/hooks/useDownloadSettings'
import { useIsTouchDevice } from '@/hooks/useIsTouchDevice'
import { api, apiErrorMessage } from '@/lib/api'
import { canRestoreAsset } from '@/lib/auth/permissions'
import { API_ENDPOINTS } from '@/lib/config'
import type { Asset } from '@/lib/dam/types'
import toast from '@/lib/toast'

import AssetDetailModal from './AssetDetailModal'
import { fileTypeLabel, formatDate, formatFileSize, getAssetTags, getFileIcon, getFileTypeColor, isAudio, isVideo, tagName } from './assetUtils'

/** Fired by the Dashboard's "Bulk delete" button. */
export const TOGGLE_BULK_DELETE_EVENT = 'toggleBulkDelete'

interface AssetGridProps {
  assets: Asset[]
  /** Current library category ("all", "image", ... or "smart_folder_<id>"); used for headings. */
  category: string
  viewMode?: 'grid' | 'list'
  onAssetsChange?: () => void
  user?: User | null
  /** Picker mode: clicking an asset calls onSelectAsset instead of opening details. */
  selectionMode?: boolean
  onSelectAsset?: (asset: Asset) => void
  /** Hide the per-asset menu (download/delete). */
  hideActions?: boolean
  selectedAssetIds?: Set<string> | string[]
}

type PendingDelete = { kind: 'single'; asset: Asset; resolve: (deleted: boolean) => void } | { kind: 'bulk' }

export default function AssetGrid({
  assets,
  category,
  viewMode = 'grid',
  onAssetsChange,
  user,
  selectionMode = false,
  onSelectAsset,
  hideActions = false,
  selectedAssetIds,
}: AssetGridProps) {
  const tAssets = useTranslations('assets')
  const tCommon = useTranslations('common')
  const { downloadFile } = useDownloadSettings()
  const isTouchDevice = useIsTouchDevice()
  const { thumbnailSize } = useThumbnailSize()
  const size = sizeConfig[thumbnailSize || 'medium']

  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false)
  const [bulkSelection, setBulkSelection] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)
  const [failedThumbnailIds, setFailedThumbnailIds] = useState<Set<string>>(new Set())

  const safeAssets = Array.isArray(assets) ? assets : []
  const showMenu = !selectionMode && !hideActions

  // Retry failed thumbnails after the list changes (page, search, upload).
  const assetKey = safeAssets.map((a) => a.id).join(',')
  useEffect(() => setFailedThumbnailIds(new Set()), [assetKey])

  const handleThumbnailError = useCallback((assetId: string) => {
    setFailedThumbnailIds((prev) => (prev.has(assetId) ? prev : new Set(prev).add(assetId)))
  }, [])

  useEffect(() => {
    const toggle = () => {
      setBulkDeleteMode((on) => !on)
      setBulkSelection(new Set())
    }
    window.addEventListener(TOGGLE_BULK_DELETE_EVENT, toggle)
    return () => window.removeEventListener(TOGGLE_BULK_DELETE_EVENT, toggle)
  }, [])

  // Close the card menu on any outside click.
  useEffect(() => {
    if (!openMenuId) return
    const close = (e: globalThis.MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-asset-menu]')) setOpenMenuId(null)
    }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [openMenuId])

  const isSelected = (asset: Asset) => {
    if (!selectedAssetIds) return false
    const id = String(asset.id)
    return Array.isArray(selectedAssetIds) ? selectedAssetIds.includes(id) : selectedAssetIds.has(id)
  }

  const toggleBulkSelection = (assetId: string) => {
    setBulkSelection((prev) => {
      const next = new Set(prev)
      if (next.has(assetId)) next.delete(assetId)
      else next.add(assetId)
      return next
    })
  }

  // Assets this user may delete (admins: all; editors: their own uploads).
  const deletable = (asset: Asset) => canRestoreAsset(user, { user_id: asset.attributes.user_id })

  const deleteAsset = async (asset: Asset) => {
    setDeletingId(asset.id)
    try {
      await api.delete(API_ENDPOINTS.ASSETS.DELETE(asset.id))
      setOpenMenuId(null)
      onAssetsChange?.()
      return true
    } catch (error) {
      toast.error(apiErrorMessage(error, tAssets('grid.deleteFailed')))
      return false
    } finally {
      setDeletingId(null)
    }
  }

  /** Asks for confirmation, then moves the asset to the recycle bin. */
  const requestDelete = (asset: Asset) =>
    new Promise<boolean>((resolve) => {
      setOpenMenuId(null)
      setPendingDelete({ kind: 'single', asset, resolve })
    })

  const handleBulkDelete = async () => {
    const ids = Array.from(bulkSelection)
    setBulkDeleting(true)
    const results = await Promise.allSettled(ids.map((id) => api.delete(API_ENDPOINTS.ASSETS.DELETE(id))))
    setBulkDeleting(false)
    const failed = results.filter((r) => r.status === 'rejected').length
    const deleted = ids.length - failed
    if (deleted > 0) toast.success(tAssets('grid.bulk.deletedSuccess', { count: deleted }))
    if (failed > 0) toast.error(tAssets('grid.bulk.deleteFailed'))
    setBulkSelection(new Set())
    setBulkDeleteMode(false)
    onAssetsChange?.()
  }

  const handleDownload = async (asset: Asset) => {
    const url = asset.attributes.file_url || asset.attributes.download_url
    if (!url) {
      toast.error(tAssets('download.noUrl'))
      return
    }
    try {
      await downloadFile(url, asset.attributes.name)
    } catch (error) {
      toast.error(tAssets('download.failedWithError', { error: error instanceof Error ? error.message : tAssets('download.unknownError') }))
    }
  }

  /** Card click: bulk mode toggles, picker mode selects, touch opens; desktop opens on double-click. */
  const onThumbnailClick = (e: MouseEvent, asset: Asset) => {
    e.preventDefault()
    if (bulkDeleteMode) toggleBulkSelection(asset.id)
    else if (selectionMode && onSelectAsset) onSelectAsset(asset)
    else if (isTouchDevice) setSelectedAsset(asset)
  }

  const onThumbnailDoubleClick = (e: MouseEvent, asset: Asset) => {
    e.preventDefault()
    if (bulkDeleteMode || selectionMode || isTouchDevice) return
    setSelectedAsset(asset)
  }

  const categoryLabel = (() => {
    switch (category) {
      case 'image':
        return tAssets('filters.categories.images')
      case 'video':
        return tAssets('filters.categories.videos')
      case 'audio':
        return tAssets('filters.categories.audio')
      case 'document':
        return tAssets('filters.categories.documents')
      default:
        return ''
    }
  })()

  const confirmDialog = (
    <ConfirmDialog
      open={pendingDelete !== null}
      title={pendingDelete?.kind === 'bulk' ? tAssets('grid.bulk.confirmTitle') : tAssets('grid.confirmDeleteTitle')}
      body={
        pendingDelete?.kind === 'bulk'
          ? tAssets('grid.bulk.confirmBulkDelete', { count: bulkSelection.size })
          : tAssets('grid.confirmDeleteAsset')
      }
      confirmLabel={tAssets('details.actions.delete')}
      cancelLabel={tCommon('cancel')}
      loading={bulkDeleting}
      onConfirm={async () => {
        const pending = pendingDelete
        setPendingDelete(null)
        if (pending?.kind === 'single') pending.resolve(await deleteAsset(pending.asset))
        else if (pending?.kind === 'bulk') await handleBulkDelete()
      }}
      onCancel={() => {
        if (pendingDelete?.kind === 'single') pendingDelete.resolve(false)
        setPendingDelete(null)
      }}
    />
  )

  const detailModal = selectedAsset && (
    <AssetDetailModal
      key={selectedAsset.id}
      asset={selectedAsset}
      user={user}
      onClose={() => {
        setSelectedAsset(null)
        onAssetsChange?.()
      }}
      onAssetsChange={onAssetsChange}
      onDownload={handleDownload}
      onDelete={requestDelete}
      deletingAssetId={deletingId}
    />
  )

  if (safeAssets.length === 0) {
    return (
      <div className="flex justify-center px-2 py-4 sm:px-4 sm:py-10">
        <div className="glass-panel-soft w-full max-w-md rounded-3xl border border-white/25 p-4 text-center sm:p-8 dark:border-white/10">
          <PhotoIcon className="mx-auto h-8 w-8 text-indigo-400 sm:h-12 sm:w-12" />
          <h3 className="mt-3 text-sm font-semibold text-slate-900 sm:mt-4 sm:text-base dark:text-[#E3E1CE]">{tAssets('grid.emptyTitle')}</h3>
          <p className="mt-2 text-xs text-slate-600 sm:text-sm dark:text-slate-300">
            {categoryLabel ? tAssets('grid.emptyCategoryHint', { category: categoryLabel }) : tAssets('grid.emptyAllHint')}
          </p>
        </div>
      </div>
    )
  }

  const renderMenu = (asset: Asset, compact: boolean) => (
    <div className={`absolute z-50 ${compact ? 'right-1 top-1' : 'right-2 top-2'}`} data-asset-menu>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpenMenuId(openMenuId === asset.id ? null : asset.id)
        }}
        onDoubleClick={(e) => e.stopPropagation()}
        aria-label={tAssets('grid.actionsMenu', { name: asset.attributes.name })}
        aria-expanded={openMenuId === asset.id}
        className="rounded-full border border-white/50 bg-white/80 p-1 shadow-sm transition-all duration-200 hover:border-white/80 hover:bg-white/95 dark:border-white/20 dark:bg-slate-900/70"
      >
        <EllipsisVerticalIcon className={`${compact ? 'h-4 w-4' : size.fileIconSize} text-gray-600 dark:text-slate-300`} />
      </button>
      {openMenuId === asset.id && (
        <div
          className="absolute right-0 top-8 z-[100] min-w-[140px] rounded-xl border border-white/40 bg-white/80 py-1 shadow-xl backdrop-blur-lg dark:border-white/10 dark:bg-slate-900/80"
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              setSelectedAsset(asset)
              setOpenMenuId(null)
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-600 transition-colors hover:bg-white/50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-slate-100"
          >
            <EyeIcon className="h-4 w-4" />
            {tAssets('details.actions.view')}
          </button>
          <button
            onClick={() => {
              handleDownload(asset)
              setOpenMenuId(null)
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-indigo-500 transition-colors hover:bg-indigo-50/60 dark:hover:bg-indigo-500/20"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            {tAssets('details.actions.download')}
          </button>
          {deletable(asset) && (
            <button
              onClick={() => requestDelete(asset)}
              disabled={deletingId === asset.id}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-500 transition-colors hover:bg-rose-50/60 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-rose-500/20"
            >
              <TrashIcon className="h-4 w-4" />
              {deletingId === asset.id ? tAssets('grid.bulk.deleting') : tAssets('details.actions.delete')}
            </button>
          )}
        </div>
      )}
    </div>
  )

  const renderBulkCheckbox = (asset: Asset, compact: boolean) => (
    <div className={`pointer-events-none absolute z-50 ${compact ? 'left-1 top-1' : 'left-2 top-2'}`}>
      <div className="rounded-full border border-white/50 bg-white/80 p-1 shadow-sm backdrop-blur-sm dark:border-white/20 dark:bg-slate-900/70">
        <input
          type="checkbox"
          checked={bulkSelection.has(asset.id)}
          onChange={() => toggleBulkSelection(asset.id)}
          onClick={(e) => e.stopPropagation()}
          aria-label={asset.attributes.name}
          className={`${compact || thumbnailSize === 'small' ? 'h-3 w-3' : 'h-4 w-4'} pointer-events-auto rounded border-slate-300 text-indigo-500 focus:ring-2 focus:ring-indigo-500`}
        />
      </div>
    </div>
  )

  const renderSelectedBadge = (asset: Asset, compact: boolean) =>
    selectionMode && isSelected(asset) ? (
      <div className="absolute left-2 top-2 z-20 rounded-full bg-green-500 p-1 shadow-lg">
        <CheckCircleIcon className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} text-white`} />
      </div>
    ) : null

  const renderTags = (asset: Asset, tagClass: string) => {
    const tags = getAssetTags(asset)
    if (tags.length === 0) return null
    return (
      <div className="mt-2 flex flex-wrap gap-1">
        {tags.slice(0, 3).map((tag) => (
          <span
            key={String(tag.id)}
            className={`inline-flex max-w-full items-center truncate rounded-full bg-indigo-100/70 px-2 py-0.5 font-medium text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-200 ${tagClass}`}
          >
            {tagName(tag) || tAssets('details.tags.unknownTag')}
          </span>
        ))}
        {tags.length > 3 && (
          <span className={`inline-flex items-center rounded-full bg-white/50 px-1.5 py-0.5 font-medium text-slate-600 dark:bg-slate-700/60 dark:text-slate-200 ${tagClass}`}>
            +{tags.length - 3}
          </span>
        )}
      </div>
    )
  }

  const thumbnailTitle = isTouchDevice ? tAssets('grid.tooltips.tapToViewDetails') : tAssets('grid.tooltips.doubleClickToViewDetails')

  return (
    <div className="p-2 sm:p-4 lg:p-6">
      {!category.startsWith('smart_folder_') && (
        <div className="mb-6">
          {categoryLabel && <h2 className="text-2xl font-bold text-slate-900 dark:text-[#E3E1CE]">{categoryLabel}</h2>}
          <p className="mt-1 text-slate-400 dark:text-slate-400">{tAssets('grid.assetCount', { count: safeAssets.length })}</p>
        </div>
      )}

      {!selectionMode && bulkDeleteMode && (
        <div className="mb-5 rounded-2xl border border-rose-200/60 bg-rose-500/10 p-4 shadow-sm backdrop-blur-sm dark:border-rose-500/30 dark:bg-rose-500/15">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <span className="text-sm font-semibold text-rose-600 dark:text-rose-300">{tAssets('grid.bulk.selected', { count: bulkSelection.size })}</span>
              <div className="flex gap-3 text-xs font-semibold text-rose-500 dark:text-rose-300">
                <button
                  onClick={() => setBulkSelection(new Set(safeAssets.filter(deletable).map((a) => a.id)))}
                  className="transition-colors hover:text-rose-700 dark:hover:text-rose-200"
                >
                  {tAssets('grid.bulk.selectAll')}
                </button>
                <button onClick={() => setBulkSelection(new Set())} className="transition-colors hover:text-rose-700 dark:hover:text-rose-200">
                  {tAssets('grid.bulk.clearSelection')}
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setBulkDeleteMode(false)
                  setBulkSelection(new Set())
                }}
                className="rounded-xl border border-rose-300/60 px-3 py-1.5 text-sm font-medium text-rose-500 transition-colors hover:border-rose-400 hover:text-rose-700 dark:border-rose-500/30 dark:text-rose-300 dark:hover:border-rose-400 dark:hover:text-rose-200"
              >
                {tCommon('cancel')}
              </button>
              <button
                onClick={() => setPendingDelete({ kind: 'bulk' })}
                disabled={bulkSelection.size === 0 || bulkDeleting}
                className="rounded-xl bg-gradient-to-r from-rose-500 to-red-500 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {bulkDeleting ? tAssets('grid.bulk.deleting') : tAssets('grid.bulk.deleteCount', { count: bulkSelection.size })}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'list' ? (
        <div className="space-y-2 overflow-x-hidden">
          {safeAssets.map((asset) => {
            const Icon = getFileIcon(asset.attributes.file_type)
            const iconColor = getFileTypeColor(asset.attributes.file_type)
            return (
              <div
                key={asset.id}
                className={`glass-card group relative flex items-center gap-2 overflow-hidden border border-white/25 p-2 sm:gap-4 sm:p-3 dark:border-white/10 ${
                  bulkDeleteMode ? 'ring-1 ring-red-300/40 dark:ring-red-500/30' : ''
                }`}
              >
                {renderSelectedBadge(asset, true)}
                <div
                  className={`asset-thumbnail h-16 w-16 flex-shrink-0 transition-all duration-300 sm:h-20 sm:w-20 ${bulkDeleteMode ? 'cursor-default' : 'cursor-pointer'}`}
                  onClick={(e) => onThumbnailClick(e, asset)}
                  onDoubleClick={(e) => onThumbnailDoubleClick(e, asset)}
                  style={{ touchAction: 'manipulation' }}
                  title={thumbnailTitle}
                >
                  <div className="asset-thumbnail-inner">
                    {isAudio(asset) ? (
                      <AudioThumbnail className="absolute inset-0" size="small" />
                    ) : asset.attributes.thumbnail_url && !failedThumbnailIds.has(asset.id) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={asset.attributes.thumbnail_url}
                        alt={asset.attributes.name}
                        className="pointer-events-none block h-full w-full object-cover"
                        onError={() => handleThumbnailError(asset.id)}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Icon className="pointer-events-none h-6 w-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                  {isVideo(asset) && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className="rounded-full bg-black/50 p-1">
                        <PlayIcon className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  )}
                  {bulkDeleteMode && deletable(asset) && renderBulkCheckbox(asset, true)}
                  {showMenu && !bulkDeleteMode && renderMenu(asset, true)}
                </div>

                <div className="min-w-0 flex-1 overflow-hidden">
                  <h3 className="truncate text-sm font-medium text-slate-900 sm:text-base dark:text-[#E3E1CE]" title={asset.attributes.name}>
                    {asset.attributes.name}
                  </h3>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 sm:gap-4 sm:text-sm dark:text-slate-300">
                    <span className="flex items-center gap-1 whitespace-nowrap">
                      <Icon className={`h-3 w-3 sm:h-4 sm:w-4 ${iconColor}`} />
                      {fileTypeLabel(asset.attributes.file_type)}
                    </span>
                    <span className="whitespace-nowrap">{formatFileSize(asset.attributes.file_size)}</span>
                    <span className="whitespace-nowrap">{formatDate(asset.attributes.created_at)}</span>
                  </div>
                  {renderTags(asset, 'text-xs')}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className={`grid ${size.gridCols} ${size.gridGap}`}>
          {safeAssets.map((asset) => {
            const Icon = getFileIcon(asset.attributes.file_type)
            const iconColor = getFileTypeColor(asset.attributes.file_type)
            const audioSize = thumbnailSize === 'full' ? 'xlarge' : thumbnailSize || 'medium'
            return (
              <div
                key={asset.id}
                className={`glass-card group relative overflow-hidden border border-white/25 dark:border-white/10 ${
                  bulkDeleteMode ? 'ring-1 ring-red-300/40 dark:ring-red-500/30' : ''
                }`}
              >
                {renderSelectedBadge(asset, false)}
                <div
                  className={`asset-thumbnail ${size.thumbnailSize} transition-all duration-300 ${bulkDeleteMode ? 'cursor-default' : 'cursor-pointer'}`}
                  onClick={(e) => onThumbnailClick(e, asset)}
                  onDoubleClick={(e) => onThumbnailDoubleClick(e, asset)}
                  style={{ touchAction: 'manipulation' }}
                  title={thumbnailTitle}
                >
                  <div className="asset-thumbnail-inner">
                    {isAudio(asset) ? (
                      <AudioThumbnail className="absolute inset-0" size={audioSize} />
                    ) : asset.attributes.thumbnail_url && !failedThumbnailIds.has(asset.id) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={asset.attributes.thumbnail_url}
                        alt={asset.attributes.name}
                        className={`pointer-events-none block h-full w-full ${thumbnailSize === 'full' ? 'object-contain' : 'object-cover'}`}
                        onError={() => handleThumbnailError(asset.id)}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Icon className={`${size.iconSize} ${iconColor} pointer-events-none`} />
                      </div>
                    )}
                  </div>

                  {isVideo(asset) && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className={`rounded-full bg-black/50 ${thumbnailSize === 'small' ? 'p-1' : thumbnailSize === 'medium' ? 'p-2' : 'p-3'}`}>
                        <PlayIcon className={`${thumbnailSize === 'small' ? 'h-4 w-4' : thumbnailSize === 'medium' ? 'h-6 w-6' : 'h-8 w-8'} text-white`} />
                      </div>
                    </div>
                  )}

                  {!bulkDeleteMode && !selectionMode && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div
                        className={`rounded-full bg-white/90 opacity-0 shadow-sm transition-opacity duration-200 group-hover:opacity-100 dark:bg-gray-800/90 ${
                          thumbnailSize === 'small' ? 'p-1' : 'p-2'
                        }`}
                      >
                        <EyeIcon className={`${thumbnailSize === 'small' ? 'h-3 w-3' : 'h-4 w-4'} text-gray-600 dark:text-slate-300`} />
                      </div>
                    </div>
                  )}

                  {bulkDeleteMode && deletable(asset) && renderBulkCheckbox(asset, false)}
                  {showMenu && !bulkDeleteMode && renderMenu(asset, false)}
                </div>

                <div className={size.padding}>
                  <h3 className={`truncate font-medium text-slate-900 dark:text-[#E3E1CE] ${size.titleSize}`} title={asset.attributes.name}>
                    {asset.attributes.name}
                  </h3>
                  {!size.showMinimal && (
                    <>
                      <div className={`mt-2 flex items-center justify-between ${size.infoSize} text-slate-500 dark:text-slate-300`}>
                        <span className="flex items-center">
                          <Icon className={`${size.fileIconSize} ${iconColor} mr-1`} />
                          {fileTypeLabel(asset.attributes.file_type)}
                        </span>
                        <span>{formatFileSize(asset.attributes.file_size)}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400 dark:text-slate-400">{formatDate(asset.attributes.created_at)}</p>
                      {renderTags(asset, size.tagSize)}
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {detailModal}
      {confirmDialog}
    </div>
  )
}
