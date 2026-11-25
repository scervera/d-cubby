'use client'

import { useEffect, useRef, useState, type DragEvent } from 'react'
import { useTranslations } from 'next-intl'
import { Edit, Eye, FileText, FolderIcon, LogOut, MoreVertical, Trash2, Users } from 'lucide-react'

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

const menuItemClass =
  'flex w-full items-center space-x-2 px-3 py-2 text-sm text-muted hover:bg-hover'

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
  const [showMenu, setShowMenu] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!showMenu) return
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [showMenu])

  const runMenu = (action: () => void) => {
    setShowMenu(false)
    action()
  }

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
        className={`flex h-80 w-full flex-col items-center rounded-control border-2 border-dashed bg-surface p-6 text-left transition-colors ${
          uploading
            ? 'border-success'
            : dragOver
              ? 'border-accent bg-accent-subtle'
              : 'border-line hover:border-accent'
        }`}
      >
        <div className="relative flex-shrink-0">
          <FolderIcon className="mb-3 h-16 w-16 text-accent-text" />
          {dropZone.file_count > 0 && (
            <div className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-accent px-1 text-xs text-on-accent">
              {dropZone.file_count}
            </div>
          )}
        </div>

        <h3 className="mb-2 w-full flex-shrink-0 truncate text-center font-medium text-fg">{dropZone.name}</h3>

        <div className="mb-3 flex h-10 flex-shrink-0 items-center justify-center">
          {dropZone.description && (
            <p className="line-clamp-2 text-center text-sm text-subtle">{dropZone.description}</p>
          )}
        </div>

        <div className="mb-3 flex flex-shrink-0 items-center space-x-4 text-xs text-subtle">
          <div className="flex items-center space-x-1">
            <FileText className="h-3 w-3" />
            <span>{t('folder.files', { count: dropZone.file_count })}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Users className="h-3 w-3" />
            <span>{t('folder.subscribers', { count: dropZone.subscriber_count })}</span>
          </div>
        </div>

        <div className="flex min-h-[4rem] flex-1 items-start justify-center">
          {dropZone.preset_tags.length > 0 && (
            <div className="flex max-w-full flex-wrap justify-center gap-1">
              {dropZone.preset_tags.slice(0, 4).map((tag) => (
                <span key={tag} className="inline-block rounded-full bg-accent-subtle px-2 py-1 text-xs text-accent-text">
                  {tag}
                </span>
              ))}
              {dropZone.preset_tags.length > 4 && (
                <span className="inline-block rounded-full bg-sunken px-2 py-1 text-xs text-muted">
                  +{dropZone.preset_tags.length - 4}
                </span>
              )}
            </div>
          )}
        </div>
        {!dropZone.is_active && (
          <span className="mt-2 rounded-full bg-sunken px-2 py-0.5 text-xs text-muted">
            {t('folder.inactive')}
          </span>
        )}
      </button>

      {uploading && (
        <div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-control border border-line bg-surface px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <span className="truncate text-xs text-muted">
              {t('folder.uploadingFiles', { count: uploadTotalFiles })}
            </span>
            <span className="text-xs font-medium tabular-nums text-fg">{percent}%</span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-sunken">
            <div className="h-2 rounded-full bg-success transition-all duration-200" style={{ width: `${percent}%` }} />
          </div>
        </div>
      )}

      <div ref={menuRef} className="absolute right-2 top-2">
        <button
          type="button"
          onClick={() => setShowMenu((open) => !open)}
          className="rounded-full bg-surface p-1 opacity-100 transition-opacity lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100"
          aria-label={t('folder.menuLabel', { name: dropZone.name })}
          aria-expanded={showMenu}
        >
          <MoreVertical className="h-4 w-4 text-subtle" />
        </button>

        {showMenu && (
          <div className="absolute right-0 top-8 z-10 min-w-[150px] rounded-control border border-line bg-surface py-1">
            <button type="button" onClick={() => runMenu(onOpen)} className={menuItemClass}>
              <Eye className="h-4 w-4" />
              <span>{t('folder.menuView')}</span>
            </button>
            {isOwner ? (
              <>
                <button type="button" onClick={() => runMenu(onEdit)} className={menuItemClass}>
                  <Edit className="h-4 w-4" />
                  <span>{t('folder.menuManage')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => runMenu(onDelete)}
                  className="flex w-full items-center space-x-2 px-3 py-2 text-sm text-danger-text hover:bg-danger-subtle"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>{t('folder.menuDelete')}</span>
                </button>
              </>
            ) : (
              <button type="button" onClick={() => runMenu(onUnsubscribe)} className={menuItemClass}>
                <LogOut className="h-4 w-4" />
                <span>{t('folder.menuUnsubscribe')}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
