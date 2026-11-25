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
import Badge from '@/components/ui/Badge'
import { Button, IconButton } from '@/components/ui/Button'
import { EmptyState, PageHeader } from '@/components/ui/Panel'
import { LoadingBlock } from '@/components/ui/Spinner'
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
    if (!folder.active) return { icon: <PauseIcon className="h-5 w-5 text-subtle" aria-hidden />, text: t('status.inactive'), tone: 'neutral' as const }
    if (!folder.can_scan)
      return { icon: <ExclamationTriangleIcon className="h-5 w-5 text-danger-text" aria-hidden />, text: t('status.inaccessible'), tone: 'danger' as const }
    return { icon: <CheckCircleIcon className="h-5 w-5 text-success-text" aria-hidden />, text: t('status.active'), tone: 'success' as const }
  }

  if (loading) return <LoadingBlock />

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        actions={
          <>
            <Button variant="secondary" onClick={loadFolders}>
              <ArrowPathIcon className="h-4 w-4" aria-hidden />
              {t('refresh')}
            </Button>
            <Button onClick={() => setFormFolder('new')}>
              <PlusIcon className="h-4 w-4" aria-hidden />
              {t('addFolder')}
            </Button>
          </>
        }
      />

      <div className="flex gap-3 rounded-card bg-accent-subtle p-4 text-sm text-fg">
        <InformationCircleIcon className="h-5 w-5 shrink-0 text-accent-text" aria-hidden />
        <p>{t('containerHint')}</p>
      </div>

      {folders.length === 0 ? (
        <EmptyState
          icon={<FolderIcon aria-hidden />}
          title={t('emptyTitle')}
          description={t('emptyBody')}
          action={<Button onClick={() => setFormFolder('new')}>{t('addFolder')}</Button>}
        />
      ) : (
        <ul className="space-y-3">
          {folders.map((folder) => {
            const s = status(folder)
            const isScanning = scanning.has(folder.id)
            return (
              <li key={folder.id} className="rounded-card border bg-surface p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {s.icon}
                      <h3 className="text-sm font-semibold text-fg">{folder.name}</h3>
                      <Badge tone={s.tone}>{s.text}</Badge>
                    </div>
                    <p className="mt-1 break-all font-mono text-xs text-muted">{folder.path}</p>
                    {folder.active && !folder.can_scan && <p className="mt-2 text-sm text-danger-text">{t('inaccessibleHint')}</p>}

                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 md:grid-cols-4">
                      <div>
                        <dt className="text-xs text-subtle">{t('stats.frequency')}</dt>
                        <dd className="text-meta !text-fg">{folder.scan_frequency_display}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-subtle">{t('stats.maxFileSize')}</dt>
                        <dd className="text-meta !text-fg">{folder.max_file_size_display}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-subtle">{t('stats.processed')}</dt>
                        <dd className="text-meta !text-fg">{folder.total_files_processed}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-subtle">{t('stats.errors')}</dt>
                        <dd className={`text-meta ${folder.total_errors > 0 ? '!text-danger-text' : '!text-fg'}`}>{folder.total_errors}</dd>
                      </div>
                    </dl>

                    {folder.auto_tag_names.length > 0 && (
                      <div className="mt-3 flex flex-wrap items-center gap-1">
                        <span className="mr-1 text-xs text-subtle">{t('stats.autoTags')}</span>
                        {folder.auto_tag_names.map((tag) => (
                          <Badge key={tag} tone="accent">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="text-meta mt-3 space-y-0.5">
                      {folder.last_scanned_at && <p>{t('lastScanned', { time: new Date(folder.last_scanned_at).toLocaleString() })}</p>}
                      {folder.active && folder.next_scan_at && <p>{t('nextScan', { time: new Date(folder.next_scan_at).toLocaleString() })}</p>}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1">
                    {folder.unread_notifications_count > 0 && (
                      <IconButton
                        size="sm"
                        onClick={() => setNotificationsFolder(folder)}
                        title={t('actions.notifications', { count: folder.unread_notifications_count })}
                        aria-label={t('actions.notifications', { count: folder.unread_notifications_count })}
                        className="relative"
                      >
                        <ExclamationTriangleIcon className="h-4 w-4" aria-hidden />
                        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 font-mono text-[10px] text-on-accent">
                          {folder.unread_notifications_count}
                        </span>
                      </IconButton>
                    )}
                    <IconButton size="sm" onClick={() => setHistoryFolder(folder)} title={t('actions.history')} aria-label={t('actions.history')}>
                      <ClockIcon className="h-4 w-4" aria-hidden />
                    </IconButton>
                    <IconButton
                      size="sm"
                      onClick={() => !isScanning && handleScanNow(folder)}
                      disabled={!folder.can_scan || isScanning}
                      title={isScanning ? t('actions.scanning') : t('actions.scanNow')}
                      aria-label={isScanning ? t('actions.scanning') : t('actions.scanNow')}
                    >
                      <ArrowPathIcon className={`h-4 w-4 ${isScanning ? 'animate-spin' : ''}`} aria-hidden />
                    </IconButton>
                    <IconButton size="sm" onClick={() => setFormFolder(folder)} title={t('actions.edit')} aria-label={t('actions.edit')}>
                      <Cog6ToothIcon className="h-4 w-4" aria-hidden />
                    </IconButton>
                    <IconButton
                      size="sm"
                      onClick={() => handleToggleActive(folder)}
                      title={folder.active ? t('actions.deactivate') : t('actions.activate')}
                      aria-label={folder.active ? t('actions.deactivate') : t('actions.activate')}
                    >
                      {folder.active ? <StopIcon className="h-4 w-4" aria-hidden /> : <PlayIcon className="h-4 w-4" aria-hidden />}
                    </IconButton>
                    <IconButton
                      size="sm"
                      variant="danger-ghost"
                      onClick={() => setDeletingFolder(folder)}
                      title={t('actions.delete')}
                      aria-label={t('actions.delete')}
                    >
                      <TrashIcon className="h-4 w-4" aria-hidden />
                    </IconButton>
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
