'use client'

import Link from 'next/link'
import { Bars3Icon } from '@heroicons/react/24/outline'
import { useTranslations } from 'next-intl'

import ThemeToggle from '@/components/ui/ThemeToggle'
import { useAppConfig } from '@/hooks/useAppConfig'
import { useAuth } from '@/hooks/useAuth'

/** Fixed top bar (h-16). SharedLayout offsets its content and the mobile sidebar below it. */
export default function AppHeader() {
  const t = useTranslations('nav')
  const { config } = useAppConfig()
  const { user } = useAuth()
  const org = config?.organization

  return (
    <header className="glass-surface shell-nav fixed inset-x-0 top-0 z-[80] h-16 border-b border-[#B8C5D1] dark:border-[#263541]">
      <div className="flex h-full items-center gap-3 px-3 sm:px-4 lg:px-10">
        <button
          id="hamburger-menu-button"
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#B8C5D1] bg-[#D8DFE6] text-[#2C3A47] lg:hidden dark:border-[#263541] dark:bg-[#121F27] dark:text-[#E3E1CE]"
          aria-label={t('toggleMenu')}
          onClick={() => window.dispatchEvent(new Event('toggleSidebar'))}
        >
          <Bars3Icon className="h-5 w-5" />
        </button>

        <Link href="/assets" className="flex min-w-0 items-center gap-3">
          {org?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={org.logo_url} alt="" className="h-9 w-9 shrink-0 rounded-lg object-contain" />
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#2C3A47] font-heading text-sm font-bold text-[#F6DAA9] dark:bg-[#F6DAA9] dark:text-[#121F27]">
              D³
            </span>
          )}
          <span className="min-w-0">
            <span className="block truncate font-heading text-sm font-semibold text-[#2C3A47] dark:text-[#E3E1CE]">
              {org?.name ?? 'D-cubby'}
            </span>
            <span className="block text-[0.65rem] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              {t('assetLibrary')}
            </span>
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-2">
          {user && (
            <Link
              href="/account"
              className="hidden max-w-[16rem] truncate rounded-xl border border-[#B8C5D1] bg-[#D8DFE6] px-3 py-2 text-sm font-medium text-[#2C3A47] sm:block dark:border-[#263541] dark:bg-[#121F27] dark:text-[#E3E1CE]"
            >
              {user.name}
            </Link>
          )}
          <div className="hidden lg:block">
            <ThemeToggle variant="toolbar" />
          </div>
        </div>
      </div>
    </header>
  )
}
