'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

import ModalShell from '@/components/groups/ModalShell'
import { watchedFoldersApi, watchedFolderErrors, type FolderScan, type WatchedFolder } from '@/lib/watchedFoldersApi'

const statusClass: Record<FolderScan['status'], string> = {
  completed: 'text-success-text',
  failed: 'text-danger-text',
  running: 'text-warning-text',
}

function formatErrorDetails(details: string): string {
  try {
    return JSON.stringify(JSON.parse(details), null, 2)
  } catch {
    return details
  }
}

/** The last 50 scans of a folder. */
export default function ScanHistoryModal({ folder, onClose }: { folder: WatchedFolder; onClose: () => void }) {
  const t = useTranslations('watchedFolders')
  const [scans, setScans] = useState<FolderScan[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    watchedFoldersApi
      .scanHistory(folder.id)
      .then(setScans)
      .catch((err) => setError(watchedFolderErrors(err, t('toasts.historyFailed'))))
  }, [folder.id, t])

  const summary = (scan: FolderScan) => {
    if (scan.status === 'running') return t('history.running')
    if (scan.status === 'failed') return t('history.failed')
    if (scan.files_found === 0) return t('history.noNewFiles')
    if (scan.files_processed > 0) return t('history.processed', { count: scan.files_processed })
    if (scan.files_skipped > 0) return t('history.skipped', { count: scan.files_skipped })
    return t('history.completed')
  }

  return (
    <ModalShell title={`${t('history.title')} — ${folder.name}`} onClose={onClose} wide>
      <div className="p-6">
        <div className="max-h-96 overflow-y-auto rounded-control bg-sunken p-4 font-mono text-sm text-success-text">
          {error ? (
            <p className="text-danger-text">{error}</p>
          ) : scans === null ? (
            <p className="text-subtle">…</p>
          ) : scans.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-subtle">{t('history.empty')}</p>
              <p className="mt-2 text-xs text-subtle">{t('history.emptyHint')}</p>
            </div>
          ) : (
            scans.map((scan) => (
              <div key={scan.id} className="mb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-subtle">{new Date(scan.started_at).toLocaleString()}</span>
                  <span className={statusClass[scan.status] ?? 'text-on-accent'}>[{t(`history.status.${scan.status}`)}]</span>
                  <span className="text-subtle">{summary(scan)}</span>
                </div>
                <div className="ml-4 text-xs text-subtle">
                  {t('history.counts', {
                    found: scan.files_found,
                    processed: scan.files_processed,
                    skipped: scan.files_skipped,
                    errors: scan.errors_count,
                  })}
                  {scan.duration != null && ` · ${t('history.duration', { seconds: Math.round(scan.duration) })}`}
                </div>
                {scan.error_details && (
                  <pre className="ml-4 mt-1 whitespace-pre-wrap text-xs text-danger-text">{formatErrorDetails(scan.error_details)}</pre>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </ModalShell>
  )
}
