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
    <header className="rounded-card border bg-surface fixed inset-x-0 top-0 z-header h-16 border-b border-line">
      <div className="flex h-full items-center gap-3 px-3 sm:px-4 lg:px-10">
        <button
          id="hamburger-menu-button"
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-control border border-line bg-raised text-fg lg:hidden"
          aria-label={t('toggleMenu')}
          onClick={() => window.dispatchEvent(new Event('toggleSidebar'))}
        >
          <Bars3Icon className="h-5 w-5" />
        </button>

        <Link href="/assets" className="flex min-w-0 items-center gap-3">
          {org?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={org.logo_url} alt="" className="h-9 w-9 shrink-0 rounded-control object-contain" />
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-accent text-sm font-bold text-accent-text">
              D³
            </span>
          )}
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-fg">
              {org?.name ?? 'D-cubby'}
            </span>
            <span className="block text-[0.65rem] uppercase tracking-[0.2em] text-subtle">
              {t('assetLibrary')}
            </span>
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-2">
          {user && (
            <Link
              href="/account"
              className="hidden max-w-[16rem] truncate rounded-control border border-line bg-raised px-3 py-2 text-sm font-medium text-fg sm:block"
            >
              {user.name}
            </Link>
          )}
          <div className="hidden lg:block">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  )
}
