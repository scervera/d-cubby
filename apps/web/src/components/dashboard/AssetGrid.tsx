'use client'

import { useCallback, useEffect, useState, type MouseEvent } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowDownTrayIcon, EllipsisHorizontalIcon, EyeIcon, PhotoIcon, TrashIcon } from '@heroicons/react/24/outline'
import { CheckIcon, PlayIcon } from '@heroicons/react/20/solid'

import ConfirmDialog from '@/components/shared/ConfirmDialog'
import AudioThumbnail from '@/components/ui/AudioThumbnail'
import Badge from '@/components/ui/Badge'
import { Button, buttonClass } from '@/components/ui/Button'
import { Menu, MenuItem } from '@/components/ui/Menu'
import { EmptyState } from '@/components/ui/Panel'
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
import { fileTypeLabel, formatDate, formatFileSize, getAssetTags, getFileIcon, isAudio, isVideo, tagName } from './assetUtils'

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
      <EmptyState
        icon={<PhotoIcon aria-hidden />}
        title={tAssets('grid.emptyTitle')}
        description={categoryLabel ? tAssets('grid.emptyCategoryHint', { category: categoryLabel }) : tAssets('grid.emptyAllHint')}
      />
    )
  }

  // Controls drawn over a thumbnail sit on a neutral scrim so they read on any image.
  const overlayChip = 'flex h-7 w-7 items-center justify-center rounded-control bg-scrim text-on-scrim'

  const renderMenu = (asset: Asset, buttonClassName: string) => (
    <Menu
      label={tAssets('grid.actionsMenu', { name: asset.attributes.name })}
      button={<EllipsisHorizontalIcon className="h-4 w-4" aria-hidden />}
      buttonClassName={buttonClassName}
    >
      <MenuItem icon={<EyeIcon aria-hidden />} onClick={() => setSelectedAsset(asset)}>
        {tAssets('details.actions.view')}
      </MenuItem>
      <MenuItem icon={<ArrowDownTrayIcon aria-hidden />} onClick={() => handleDownload(asset)}>
        {tAssets('details.actions.download')}
      </MenuItem>
      {deletable(asset) && (
        <MenuItem icon={<TrashIcon aria-hidden />} danger disabled={deletingId === asset.id} onClick={() => requestDelete(asset)}>
          {deletingId === asset.id ? tAssets('grid.bulk.deleting') : tAssets('details.actions.delete')}
        </MenuItem>
      )}
    </Menu>
  )

  /** Marked in bulk-delete mode or, in picker mode, when chosen. */
  const isMarked = (asset: Asset) => (bulkDeleteMode ? bulkSelection.has(asset.id) : selectionMode && isSelected(asset))

  const renderMark = (asset: Asset) => {
    if (bulkDeleteMode && deletable(asset)) {
      return (
        <span className="absolute top-1.5 left-1.5 flex h-6 w-6 items-center justify-center rounded-control bg-scrim">
          <input
            type="checkbox"
            checked={bulkSelection.has(asset.id)}
            onChange={() => toggleBulkSelection(asset.id)}
            onClick={(e) => e.stopPropagation()}
            aria-label={asset.attributes.name}
            className="h-4 w-4"
          />
        </span>
      )
    }
    if (selectionMode && isSelected(asset)) {
      return (
        <span className="absolute top-1.5 left-1.5 flex h-6 w-6 items-center justify-center rounded-control bg-accent text-on-accent">
          <CheckIcon className="h-4 w-4" aria-hidden />
        </span>
      )
    }
    return null
  }

  // The outline is offset so the accent never sits directly on the image.
  const markClass = (asset: Asset) => (isMarked(asset) ? 'outline-2 outline-offset-2 outline-accent' : '')

  const renderTags = (asset: Asset) => {
    const tags = getAssetTags(asset)
    if (tags.length === 0) return null
    return (
      <div className="mt-1.5 flex flex-wrap gap-1">
        {tags.slice(0, 3).map((tag) => (
          <Badge key={String(tag.id)}>{tagName(tag) || tAssets('details.tags.unknownTag')}</Badge>
        ))}
        {tags.length > 3 && <Badge>+{tags.length - 3}</Badge>}
      </div>
    )
  }

  const renderThumbnailContent = (asset: Asset, audioSize: 'small' | 'medium' | 'large' | 'xlarge', iconSize: string, fit: string) => {
    const Icon = getFileIcon(asset.attributes.file_type)
    if (isAudio(asset)) return <AudioThumbnail className="absolute inset-0" size={audioSize} />
    if (asset.attributes.thumbnail_url && !failedThumbnailIds.has(asset.id)) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={asset.attributes.thumbnail_url}
          alt={asset.attributes.name}
          className={`pointer-events-none ${fit}`}
          onError={() => handleThumbnailError(asset.id)}
        />
      )
    }
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
        <Icon className={`pointer-events-none text-subtle ${iconSize}`} />
        {iconSize !== 'h-5 w-5' && <span className="text-meta">{fileTypeLabel(asset.attributes.file_type)}</span>}
      </div>
    )
  }

  const thumbnailTitle = isTouchDevice ? tAssets('grid.tooltips.tapToViewDetails') : tAssets('grid.tooltips.doubleClickToViewDetails')
  const metaLine = (asset: Asset) => `${fileTypeLabel(asset.attributes.file_type)} · ${formatFileSize(asset.attributes.file_size)}`

  return (
    <div>
      {!category.startsWith('smart_folder_') && (
        <p className="text-meta mb-3">
          {categoryLabel && <span className="font-sans text-muted">{categoryLabel} · </span>}
          {tAssets('grid.assetCount', { count: safeAssets.length })}
        </p>
      )}

      {!selectionMode && bulkDeleteMode && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-card bg-danger-subtle py-2 pr-2 pl-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-sm font-medium text-danger-text">{tAssets('grid.bulk.selected', { count: bulkSelection.size })}</span>
            <Button variant="ghost" size="sm" onClick={() => setBulkSelection(new Set(safeAssets.filter(deletable).map((a) => a.id)))}>
              {tAssets('grid.bulk.selectAll')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setBulkSelection(new Set())}>
              {tAssets('grid.bulk.clearSelection')}
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setBulkDeleteMode(false)
                setBulkSelection(new Set())
              }}
            >
              {tCommon('cancel')}
            </Button>
            <Button variant="danger" size="sm" onClick={() => setPendingDelete({ kind: 'bulk' })} disabled={bulkSelection.size === 0 || bulkDeleting}>
              {bulkDeleting ? tAssets('grid.bulk.deleting') : tAssets('grid.bulk.deleteCount', { count: bulkSelection.size })}
            </Button>
          </div>
        </div>
      )}

      {viewMode === 'list' ? (
        <ul className="divide-y divide-line border-y">
          {safeAssets.map((asset) => (
            <li key={asset.id} className="flex items-center gap-3 py-2 hover:bg-hover sm:px-2">
              <div
                className={`asset-thumbnail h-12 w-12 shrink-0 rounded-thumb bg-sunken ${markClass(asset)} ${bulkDeleteMode ? 'cursor-default' : 'cursor-pointer'}`}
                onClick={(e) => onThumbnailClick(e, asset)}
                onDoubleClick={(e) => onThumbnailDoubleClick(e, asset)}
                title={thumbnailTitle}
              >
                <div className="asset-thumbnail-inner">{renderThumbnailContent(asset, 'small', 'h-5 w-5', '')}</div>
                {isVideo(asset) && (
                  <span className="pointer-events-none absolute right-0.5 bottom-0.5 flex h-4 w-4 items-center justify-center rounded-thumb bg-scrim text-on-scrim">
                    <PlayIcon className="h-3 w-3" aria-hidden />
                  </span>
                )}
                {renderMark(asset)}
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-medium text-fg" title={asset.attributes.name}>
                  {asset.attributes.name}
                </h3>
                <p className="text-meta truncate">
                  {metaLine(asset)} · {formatDate(asset.attributes.created_at)}
                </p>
              </div>

              <div className="hidden max-w-[40%] shrink-0 md:block">{renderTags(asset)}</div>

              {showMenu && !bulkDeleteMode && renderMenu(asset, buttonClass({ variant: 'ghost', icon: true }))}
            </li>
          ))}
        </ul>
      ) : (
        <div className={`grid ${size.gridCols} ${size.gridGap}`}>
          {safeAssets.map((asset) => {
            const audioSize = thumbnailSize === 'full' ? 'xlarge' : thumbnailSize || 'medium'
            return (
              <div key={asset.id} className="group min-w-0">
                <div
                  className={`asset-thumbnail ${size.aspect} w-full rounded-thumb bg-sunken ${markClass(asset)} ${bulkDeleteMode ? 'cursor-default' : 'cursor-pointer'}`}
                  onClick={(e) => onThumbnailClick(e, asset)}
                  onDoubleClick={(e) => onThumbnailDoubleClick(e, asset)}
                  title={thumbnailTitle}
                >
                  <div className="asset-thumbnail-inner">
                    {renderThumbnailContent(asset, audioSize, size.iconSize, thumbnailSize === 'full' ? '!object-contain' : '')}
                  </div>

                  {isVideo(asset) && (
                    <span className="pointer-events-none absolute bottom-1.5 left-1.5 flex h-6 w-6 items-center justify-center rounded-control bg-scrim text-on-scrim">
                      <PlayIcon className="h-3.5 w-3.5" aria-hidden />
                    </span>
                  )}

                  {renderMark(asset)}
                  {showMenu && !bulkDeleteMode && (
                    // Shown on hover and keyboard focus; always shown where there is no hover (touch).
                    <div className="absolute top-1.5 right-1.5 opacity-0 transition-opacity duration-100 group-focus-within:opacity-100 group-hover:opacity-100 has-[[data-open]]:opacity-100 [@media(hover:none)]:opacity-100">
                      {renderMenu(asset, overlayChip)}
                    </div>
                  )}
                </div>

                <div className="mt-1.5 min-w-0">
                  <h3 className={`truncate text-fg ${size.detail === 'name' ? 'text-xs' : 'text-sm'}`} title={asset.attributes.name}>
                    {asset.attributes.name}
                  </h3>
                  {size.detail !== 'name' && <p className="text-meta truncate">{metaLine(asset)}</p>}
                  {size.detail === 'full' && renderTags(asset)}
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
