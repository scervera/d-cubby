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
  error: 'text-red-400',
  warning: 'text-yellow-300',
  info: 'text-blue-300',
  scan_completed: 'text-green-400',
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
        <div className="max-h-96 overflow-y-auto rounded-lg bg-gray-900 p-4 font-mono text-sm">
          {error ? (
            <p className="text-red-400">{error}</p>
          ) : notifications === null ? (
            <p className="text-gray-400">…</p>
          ) : notifications.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-gray-400">{t('notifications.empty')}</p>
              <p className="mt-2 text-xs text-gray-500">{t('notifications.emptyHint')}</p>
            </div>
          ) : (
            notifications.map((n) => {
              const unread = n.status === 'unread'
              return (
                <div key={n.id} className={`mb-3 ${unread ? '' : 'opacity-60'}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-gray-500">{new Date(n.created_at).toLocaleString()}</span>
                    <span className={typeClass[n.type] ?? 'text-white'}>[{n.type.toUpperCase()}]</span>
                    <span className="text-gray-200">{n.title}</span>
                    {unread && <span className="text-xs text-yellow-400">{t('notifications.unread')}</span>}
                  </div>
                  <div className="ml-4 text-xs text-gray-300">{n.message}</div>
                  {n.file_path && <div className="ml-4 mt-1 break-all text-xs text-blue-300">{n.file_path}</div>}
                </div>
              )
            })
          )}
        </div>
      </div>
    </ModalShell>
  )
}
