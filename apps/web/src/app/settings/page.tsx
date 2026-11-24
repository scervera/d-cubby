'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

import SettingsPage, { Panel } from '@/components/settings/SettingsPage'
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
          <div key={tile.label} className="glass-panel rounded-2xl p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{tile.label}</div>
            <div className="mt-1 font-heading text-2xl font-semibold text-[#2C3A47] dark:text-[#E3E1CE]">{tile.value}</div>
          </div>
        ))}
      </div>

      {stats && (
        <Panel title={t('byType')}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <th className="py-1 font-medium">{t('type')}</th>
                <th className="py-1 text-right font-medium">{t('count')}</th>
                <th className="py-1 text-right font-medium">{t('size')}</th>
              </tr>
            </thead>
            <tbody>
              {CATEGORIES.map((c) => (
                <tr key={c} className="border-t border-[#B8C5D1]/60 dark:border-[#263541]">
                  <td className="py-2 text-[#2C3A47] dark:text-[#E3E1CE]">{t(`categories.${c}`)}</td>
                  <td className="py-2 text-right tabular-nums">{(stats.by_category[c]?.count ?? 0).toLocaleString()}</td>
                  <td className="py-2 text-right tabular-nums">{formatBytes(stats.by_category[c]?.bytes ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      <Panel title={t('manage')}>
        <ul className="grid gap-2 sm:grid-cols-2">
          {(['users', 'organization', 'watched-folders', 'system'] as const).map((key) => (
            <li key={key}>
              <Link href={`/settings/${key}`} className="block rounded-xl border border-[#B8C5D1] bg-white/50 p-3 hover:border-[#D4A574] dark:border-[#263541] dark:bg-[#0d171d]/60 dark:hover:border-[#F6DAA9]">
                <div className="font-semibold text-[#2C3A47] dark:text-[#E3E1CE]">{t(`links.${key}.title`)}</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">{t(`links.${key}.description`)}</div>
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
