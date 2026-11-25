'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

import ModalShell from '@/components/groups/ModalShell'
import {
  watchedFoldersApi,
  watchedFolderErrors,
  type WatchFolderNotification,
  type WatchedFolder,
} from '@/lib/watchedFoldersApi'

const typeClass: Record<string, string> = {
  error: 'text-danger-text',
  warning: 'text-warning-text',
  info: 'text-accent-text',
  scan_completed: 'text-success-text',
}

/** The last 50 notifications (import errors, warnings) of a folder. */
export default function NotificationsModal({ folder, onClose }: { folder: WatchedFolder; onClose: () => void }) {
  const t = useTranslations('watchedFolders')
  const [notifications, setNotifications] = useState<WatchFolderNotification[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    watchedFoldersApi
      .notifications(folder.id)
      .then((data) => setNotifications(data.notifications))
      .catch((err) => setError(watchedFolderErrors(err, t('toasts.notificationsFailed'))))
  }, [folder.id, t])

  return (
    <ModalShell title={`${t('notifications.title')} — ${folder.name}`} onClose={onClose} wide>
      <div className="p-6">
        <div className="max-h-96 overflow-y-auto rounded-control bg-sunken p-4 font-mono text-sm">
          {error ? (
            <p className="text-danger-text">{error}</p>
          ) : notifications === null ? (
            <p className="text-subtle">…</p>
          ) : notifications.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-subtle">{t('notifications.empty')}</p>
              <p className="mt-2 text-xs text-subtle">{t('notifications.emptyHint')}</p>
            </div>
          ) : (
            notifications.map((n) => {
              const unread = n.status === 'unread'
              return (
                <div key={n.id} className={`mb-3 ${unread ? '' : 'opacity-60'}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-subtle">{new Date(n.created_at).toLocaleString()}</span>
                    <span className={typeClass[n.type] ?? 'text-on-accent'}>[{n.type.toUpperCase()}]</span>
                    <span className="text-subtle">{n.title}</span>
                    {unread && <span className="text-xs text-warning-text">{t('notifications.unread')}</span>}
                  </div>
                  <div className="ml-4 text-xs text-subtle">{n.message}</div>
                  {n.file_path && <div className="ml-4 mt-1 break-all text-xs text-accent-text">{n.file_path}</div>}
                </div>
              )
            })
          )}
        </div>
      </div>
    </ModalShell>
  )
}
