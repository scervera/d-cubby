'use client'

import { useState, type DragEvent } from 'react'
import { useTranslations } from 'next-intl'
import {
  ArrowRightOnRectangleIcon,
  DocumentIcon,
  EllipsisHorizontalIcon,
  EyeIcon,
  FolderIcon,
  PencilSquareIcon,
  TrashIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'

import Badge from '@/components/ui/Badge'
import { Menu, MenuItem } from '@/components/ui/Menu'
import type { DropZone } from '@/lib/dropZonesApi'

interface DropZoneFolderProps {
  dropZone: DropZone
  isOwner: boolean
  /** Files can be dropped onto the card. */
  canUpload: boolean
  onOpen: () => void
  onEdit: () => void
  onDelete: () => void
  onUnsubscribe: () => void
  onDropFiles: (files: File[]) => void
  uploading?: boolean
  uploadProgress?: number
  uploadTotalFiles?: number
}

export default function DropZoneFolder({
  dropZone,
  isOwner,
  canUpload,
  onOpen,
  onEdit,
  onDelete,
  onUnsubscribe,
  onDropFiles,
  uploading = false,
  uploadProgress = 0,
  uploadTotalFiles = 0,
}: DropZoneFolderProps) {
  const t = useTranslations('dropZones')
  const [dragOver, setDragOver] = useState(false)

  const dropHandlers = canUpload
    ? {
        onDragOver: (e: DragEvent) => {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'copy'
          setDragOver(true)
        },
        onDragLeave: () => setDragOver(false),
        onDrop: (e: DragEvent) => {
          e.preventDefault()
          setDragOver(false)
          const files = Array.from(e.dataTransfer.files)
          if (files.length > 0) onDropFiles(files)
        },
      }
    : {}

  const percent = Math.max(0, Math.min(100, uploadProgress))

  return (
    <div className="group relative" {...dropHandlers}>
      <button
        type="button"
        onClick={onOpen}
        className={`flex h-full min-h-44 w-full flex-col items-start gap-3 rounded-card border bg-surface p-4 pr-12 text-left transition-colors ${
          dragOver ? 'border-accent bg-accent-subtle' : 'hover:bg-hover'
        }`}
      >
        <FolderIcon className="h-8 w-8 shrink-0 text-subtle" aria-hidden />

        <div className="w-full min-w-0">
          <h3 className="truncate text-sm font-semibold text-fg">{dropZone.name}</h3>
          {dropZone.description && <p className="mt-0.5 line-clamp-2 text-sm text-muted">{dropZone.description}</p>}
        </div>

        <div className="text-meta flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="flex items-center gap-1">
            <DocumentIcon className="h-3.5 w-3.5" aria-hidden />
            {t('folder.files', { count: dropZone.file_count })}
          </span>
          <span className="flex items-center gap-1">
            <UsersIcon className="h-3.5 w-3.5" aria-hidden />
            {t('folder.subscribers', { count: dropZone.subscriber_count })}
          </span>
        </div>

        {(dropZone.preset_tags.length > 0 || !dropZone.is_active) && (
          <div className="flex flex-wrap gap-1">
            {!dropZone.is_active && <Badge>{t('folder.inactive')}</Badge>}
            {dropZone.preset_tags.slice(0, 4).map((tag) => (
              <Badge key={tag} tone="accent">
                {tag}
              </Badge>
            ))}
            {dropZone.preset_tags.length > 4 && <Badge>+{dropZone.preset_tags.length - 4}</Badge>}
          </div>
        )}
      </button>

      {uploading && (
        <div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-control border bg-raised px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <span className="truncate text-xs text-muted">{t('folder.uploadingFiles', { count: uploadTotalFiles })}</span>
            <span className="font-mono text-xs tabular-nums text-fg">{percent}%</span>
          </div>
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-sunken">
            <div className="h-1 rounded-full bg-accent transition-all duration-200" style={{ width: `${percent}%` }} />
          </div>
        </div>
      )}

      <div className="absolute right-2 top-2">
        <Menu
          label={t('folder.menuLabel', { name: dropZone.name })}
          button={<EllipsisHorizontalIcon className="h-5 w-5" aria-hidden />}
          buttonClassName="flex h-8 w-8 items-center justify-center rounded-control text-muted hover:bg-hover hover:text-fg"
        >
          <MenuItem icon={<EyeIcon aria-hidden />} onClick={onOpen}>
            {t('folder.menuView')}
          </MenuItem>
          {isOwner ? (
            <>
              <MenuItem icon={<PencilSquareIcon aria-hidden />} onClick={onEdit}>
                {t('folder.menuManage')}
              </MenuItem>
              <MenuItem icon={<TrashIcon aria-hidden />} danger onClick={onDelete}>
                {t('folder.menuDelete')}
              </MenuItem>
            </>
          ) : (
            <MenuItem icon={<ArrowRightOnRectangleIcon aria-hidden />} onClick={onUnsubscribe}>
              {t('folder.menuUnsubscribe')}
            </MenuItem>
          )}
        </Menu>
      </div>
    </div>
  )
}
