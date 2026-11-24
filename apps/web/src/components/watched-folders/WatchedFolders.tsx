'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon,
  FolderIcon,
  InformationCircleIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  StopIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'

import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { toast } from '@/lib/toast'
import {
  watchedFolderErrors,
  watchedFoldersApi,
  type WatchedFolder,
  type WatchedFolderInput,
} from '@/lib/watchedFoldersApi'
import NotificationsModal from './NotificationsModal'
import ScanHistoryModal from './ScanHistoryModal'
import WatchedFolderForm from './WatchedFolderForm'

const iconButton = 'rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700'

/**
 * Folders on the server that D-cubby scans for new files to import. The API container sees
 * the host folder set as WATCHED_FOLDERS_PATH at /watched, so paths start with /watched.
 */
export default function WatchedFolders() {
  const t = useTranslations('watchedFolders')
  const tCommon = useTranslations('common')
  const [folders, setFolders] = useState<WatchedFolder[]>([])
  const [loading, setLoading] = useState(true)
  const [formFolder, setFormFolder] = useState<WatchedFolder | 'new' | null>(null)
  const [historyFolder, setHistoryFolder] = useState<WatchedFolder | null>(null)
  const [notificationsFolder, setNotificationsFolder] = useState<WatchedFolder | null>(null)
  const [deletingFolder, setDeletingFolder] = useState<WatchedFolder | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [scanning, setScanning] = useState<Set<number>>(new Set())

  const loadFolders = useCallback(async () => {
    try {
      setFolders(await watchedFoldersApi.list())
    } catch (error) {
      toast.error(watchedFolderErrors(error, t('toasts.loadFailed')))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    loadFolders()
  }, [loadFolders])

  const handleSave = async (input: WatchedFolderInput) => {
    const editing = formFolder !== 'new' ? formFolder : null
    try {
      if (editing) {
        await watchedFoldersApi.update(editing.id, input)
        toast.success(t('toasts.updated'))
      } else {
        await watchedFoldersApi.create(input)
        toast.success(t('toasts.created'))
      }
      setFormFolder(null)
      await loadFolders()
    } catch (error) {
      toast.error(watchedFolderErrors(error, editing ? t('toasts.updateFailed') : t('toasts.createFailed')))
    }
  }

  const handleDelete = async () => {
    if (!deletingFolder) return
    setDeleting(true)
    try {
      await watchedFoldersApi.delete(deletingFolder.id)
      toast.success(t('toasts.deleted'))
      setDeletingFolder(null)
      await loadFolders()
    } catch (error) {
      toast.error(watchedFolderErrors(error, t('toasts.deleteFailed')))
    } finally {
      setDeleting(false)
    }
  }

  const handleScanNow = async (folder: WatchedFolder) => {
    setScanning((prev) => new Set(prev).add(folder.id))
    try {
      await watchedFoldersApi.scanNow(folder.id)
      toast.success(t('toasts.scanStarted'))
      // The scan runs in the background; refresh the counters shortly after.
      setTimeout(loadFolders, 3000)
    } catch (error) {
      toast.error(watchedFolderErrors(error, t('toasts.scanFailed')))
    } finally {
      setTimeout(
        () =>
          setScanning((prev) => {
            const next = new Set(prev)
            next.delete(folder.id)
            return next
          }),
        3000,
      )
    }
  }

  const handleToggleActive = async (folder: WatchedFolder) => {
    try {
      await watchedFoldersApi.update(folder.id, { active: !folder.active })
      toast.success(folder.active ? t('toasts.deactivated') : t('toasts.activated'))
      await loadFolders()
    } catch (error) {
      toast.error(watchedFolderErrors(error, t('toasts.updateFailed')))
    }
  }

  const status = (folder: WatchedFolder) => {
    if (!folder.active) return { icon: <PauseIcon className="h-5 w-5 text-gray-400" />, text: t('status.inactive'), className: 'text-gray-500' }
    if (!folder.can_scan)
      return { icon: <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />, text: t('status.inaccessible'), className: 'text-red-500' }
    return { icon: <CheckCircleIcon className="h-5 w-5 text-green-500" />, text: t('status.active'), className: 'text-green-500' }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel-soft rounded-2xl border border-white/30 p-6 dark:border-white/10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t('title')}</h1>
            <p className="text-slate-600 dark:text-slate-200">{t('subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadFolders}
              className="flex items-center gap-2 rounded-lg bg-gray-600 px-4 py-2 text-white transition-colors hover:bg-gray-700"
            >
              <ArrowPathIcon className="h-5 w-5" />
              {t('refresh')}
            </button>
            <button
              type="button"
              onClick={() => setFormFolder('new')}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
            >
              <PlusIcon className="h-5 w-5" />
              {t('addFolder')}
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
        <InformationCircleIcon className="h-5 w-5 shrink-0" />
        <p>{t('containerHint')}</p>
      </div>

      {folders.length === 0 ? (
        <div className="py-12 text-center">
          <FolderIcon className="mx-auto mb-4 h-12 w-12 text-slate-400 dark:text-slate-300" />
          <h3 className="mb-2 text-lg font-medium text-slate-900 dark:text-slate-100">{t('emptyTitle')}</h3>
          <p className="mb-4 text-slate-600 dark:text-slate-200">{t('emptyBody')}</p>
          <button
            type="button"
            onClick={() => setFormFolder('new')}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
          >
            {t('addFolder')}
          </button>
        </div>
      ) : (
        <ul className="space-y-4">
          {folders.map((folder) => {
            const s = status(folder)
            const isScanning = scanning.has(folder.id)
            return (
              <li key={folder.id} className="glass-panel-soft rounded-xl border border-white/30 p-6 dark:border-white/10">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-3">
                      <FolderIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{folder.name}</h3>
                      <span className="flex items-center gap-1">
                        {s.icon}
                        <span className={`text-sm font-medium ${s.className}`}>{s.text}</span>
                      </span>
                    </div>
                    <p className="mb-3 break-all font-mono text-sm text-slate-600 dark:text-slate-200">{folder.path}</p>
                    {folder.active && !folder.can_scan && (
                      <p className="mb-3 text-sm text-red-600 dark:text-red-400">{t('inaccessibleHint')}</p>
                    )}

                    <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                      <div>
                        <dt className="text-slate-500 dark:text-slate-400">{t('stats.frequency')}</dt>
                        <dd className="font-medium text-slate-900 dark:text-slate-100">{folder.scan_frequency_display}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500 dark:text-slate-400">{t('stats.maxFileSize')}</dt>
                        <dd className="font-medium text-slate-900 dark:text-slate-100">{folder.max_file_size_display}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500 dark:text-slate-400">{t('stats.processed')}</dt>
                        <dd className="font-medium text-slate-900 dark:text-slate-100">{folder.total_files_processed}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500 dark:text-slate-400">{t('stats.errors')}</dt>
                        <dd className="font-medium text-red-600 dark:text-red-400">{folder.total_errors}</dd>
                      </div>
                    </dl>

                    {folder.auto_tag_names.length > 0 && (
                      <div className="mt-3">
                        <span className="text-sm text-slate-500 dark:text-slate-400">{t('stats.autoTags')}</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {folder.auto_tag_names.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-3 space-y-0.5 text-sm text-gray-500 dark:text-gray-400">
                      {folder.last_scanned_at && <p>{t('lastScanned', { time: new Date(folder.last_scanned_at).toLocaleString() })}</p>}
                      {folder.active && folder.next_scan_at && (
                        <p>{t('nextScan', { time: new Date(folder.next_scan_at).toLocaleString() })}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1">
                    {folder.unread_notifications_count > 0 && (
                      <button
                        type="button"
                        onClick={() => setNotificationsFolder(folder)}
                        className={`${iconButton} relative hover:text-red-600`}
                        title={t('actions.notifications', { count: folder.unread_notifications_count })}
                        aria-label={t('actions.notifications', { count: folder.unread_notifications_count })}
                      >
                        <ExclamationTriangleIcon className="h-5 w-5" />
                        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs text-white">
                          {folder.unread_notifications_count}
                        </span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setHistoryFolder(folder)}
                      className={`${iconButton} hover:text-blue-600`}
                      title={t('actions.history')}
                      aria-label={t('actions.history')}
                    >
                      <ClockIcon className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => !isScanning && handleScanNow(folder)}
                      disabled={!folder.can_scan || isScanning}
                      className={`${iconButton} hover:text-green-600 disabled:cursor-not-allowed disabled:opacity-50`}
                      title={isScanning ? t('actions.scanning') : t('actions.scanNow')}
                      aria-label={isScanning ? t('actions.scanning') : t('actions.scanNow')}
                    >
                      <ArrowPathIcon className={`h-5 w-5 ${isScanning ? 'animate-spin text-green-600' : ''}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormFolder(folder)}
                      className={`${iconButton} hover:text-blue-600`}
                      title={t('actions.edit')}
                      aria-label={t('actions.edit')}
                    >
                      <Cog6ToothIcon className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(folder)}
                      className={`${iconButton} ${folder.active ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}
                      title={folder.active ? t('actions.deactivate') : t('actions.activate')}
                      aria-label={folder.active ? t('actions.deactivate') : t('actions.activate')}
                    >
                      {folder.active ? <StopIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingFolder(folder)}
                      className={`${iconButton} hover:text-red-600`}
                      title={t('actions.delete')}
                      aria-label={t('actions.delete')}
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {formFolder && (
        <WatchedFolderForm folder={formFolder === 'new' ? null : formFolder} onSubmit={handleSave} onClose={() => setFormFolder(null)} />
      )}
      {historyFolder && <ScanHistoryModal folder={historyFolder} onClose={() => setHistoryFolder(null)} />}
      {notificationsFolder && <NotificationsModal folder={notificationsFolder} onClose={() => setNotificationsFolder(null)} />}

      <ConfirmDialog
        open={!!deletingFolder}
        title={t('actions.delete')}
        body={t('confirmDelete')}
        cancelLabel={tCommon('cancel')}
        confirmLabel={t('actions.delete')}
        loading={deleting}
        onCancel={() => setDeletingFolder(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
