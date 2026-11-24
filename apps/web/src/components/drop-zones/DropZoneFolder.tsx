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
  'flex w-full items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'

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
        className={`flex h-80 w-full flex-col items-center rounded-lg border-2 border-dashed bg-white p-6 text-left transition-colors dark:bg-gray-800 ${
          uploading
            ? 'border-green-400 dark:border-green-500'
            : dragOver
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
              : 'border-gray-300 hover:border-blue-400 dark:border-gray-600 dark:hover:border-blue-500'
        }`}
      >
        <div className="relative flex-shrink-0">
          <FolderIcon className="mb-3 h-16 w-16 text-blue-500 dark:text-blue-400" />
          {dropZone.file_count > 0 && (
            <div className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-blue-600 px-1 text-xs text-white">
              {dropZone.file_count}
            </div>
          )}
        </div>

        <h3 className="mb-2 w-full flex-shrink-0 truncate text-center font-medium text-gray-900 dark:text-white">{dropZone.name}</h3>

        <div className="mb-3 flex h-10 flex-shrink-0 items-center justify-center">
          {dropZone.description && (
            <p className="line-clamp-2 text-center text-sm text-gray-500 dark:text-gray-400">{dropZone.description}</p>
          )}
        </div>

        <div className="mb-3 flex flex-shrink-0 items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
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
                <span key={tag} className="inline-block rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                  {tag}
                </span>
              ))}
              {dropZone.preset_tags.length > 4 && (
                <span className="inline-block rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                  +{dropZone.preset_tags.length - 4}
                </span>
              )}
            </div>
          )}
        </div>
        {!dropZone.is_active && (
          <span className="mt-2 rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">
            {t('folder.inactive')}
          </span>
        )}
      </button>

      {uploading && (
        <div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-lg border border-gray-200 bg-white/90 px-3 py-2 backdrop-blur dark:border-gray-700 dark:bg-gray-900/85">
          <div className="flex items-center justify-between gap-3">
            <span className="truncate text-xs text-gray-700 dark:text-gray-200">
              {t('folder.uploadingFiles', { count: uploadTotalFiles })}
            </span>
            <span className="text-xs font-medium tabular-nums text-gray-800 dark:text-gray-100">{percent}%</span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div className="h-2 rounded-full bg-green-500 transition-all duration-200" style={{ width: `${percent}%` }} />
          </div>
        </div>
      )}

      <div ref={menuRef} className="absolute right-2 top-2">
        <button
          type="button"
          onClick={() => setShowMenu((open) => !open)}
          className="rounded-full bg-white p-1 opacity-100 shadow-md transition-opacity dark:bg-gray-800 lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100"
          aria-label={t('folder.menuLabel', { name: dropZone.name })}
          aria-expanded={showMenu}
        >
          <MoreVertical className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        </button>

        {showMenu && (
          <div className="absolute right-0 top-8 z-10 min-w-[150px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
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
                  className="flex w-full items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
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
