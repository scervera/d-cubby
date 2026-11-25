'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

import SettingsPage, { Panel } from '@/components/settings/SettingsPage'
import { TABLE } from '@/components/ui/table'
import { api } from '@/lib/api'
import { API_ENDPOINTS } from '@/lib/config'
import { formatBytes } from '@/lib/format'

interface Stats {
  total_assets: number
  storage_bytes: number
  by_category: Record<string, { count: number; bytes: number }>
  users: number
}

const CATEGORIES = ['image', 'video', 'audio', 'pdf', 'document'] as const

function SettingsOverviewPageContent() {
  const t = useTranslations('settings.overview')
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    api.get<Stats>(API_ENDPOINTS.DASHBOARD_STATS).then(({ data }) => setStats(data)).catch(() => setStats(null))
  }, [])

  const tiles = stats
    ? [
        { label: t('assets'), value: stats.total_assets.toLocaleString() },
        { label: t('storage'), value: formatBytes(stats.storage_bytes) },
        { label: t('users'), value: stats.users.toLocaleString() },
      ]
    : []

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-card border bg-surface p-4">
            <div className="text-xs text-subtle">{tile.label}</div>
            <div className="mt-1 font-mono text-2xl tabular-nums text-fg">{tile.value}</div>
          </div>
        ))}
      </div>

      {stats && (
        <Panel title={t('byType')} padded={false}>
          <div className="overflow-x-auto">
            <table className={TABLE.table}>
              <thead className={TABLE.head}>
                <tr>
                  <th className={TABLE.th}>{t('type')}</th>
                  <th className={`${TABLE.th} text-right`}>{t('count')}</th>
                  <th className={`${TABLE.th} text-right`}>{t('size')}</th>
                </tr>
              </thead>
              <tbody className={TABLE.body}>
                {CATEGORIES.map((c) => (
                  <tr key={c} className={TABLE.row}>
                    <td className={TABLE.td}>{t(`categories.${c}`)}</td>
                    <td className={`${TABLE.tdMeta} text-right`}>{(stats.by_category[c]?.count ?? 0).toLocaleString()}</td>
                    <td className={`${TABLE.tdMeta} text-right`}>{formatBytes(stats.by_category[c]?.bytes ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      <Panel title={t('manage')}>
        <ul className="grid gap-2 sm:grid-cols-2">
          {(['users', 'organization', 'watched-folders', 'system'] as const).map((key) => (
            <li key={key}>
              <Link href={`/settings/${key}`} className="block rounded-card border p-3 transition-colors hover:bg-hover">
                <div className="text-sm font-medium text-fg">{t(`links.${key}.title`)}</div>
                <div className="mt-0.5 text-sm text-muted">{t(`links.${key}.description`)}</div>
              </Link>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  )
}

export default function SettingsOverviewPage() {
  const t = useTranslations('settings.overview')
  return (
    <SettingsPage title={t('title')} description={t('description')}>
      <SettingsOverviewPageContent />
    </SettingsPage>
  )
}
