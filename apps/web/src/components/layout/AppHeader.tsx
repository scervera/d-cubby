'use client'

import Link from 'next/link'
import { Bars3Icon } from '@heroicons/react/24/outline'
import { useTranslations } from 'next-intl'

import { ButtonLink, IconButton } from '@/components/ui/Button'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { useAppConfig } from '@/hooks/useAppConfig'
import { useAuth } from '@/hooks/useAuth'

/** Fixed top bar (h-14). SharedLayout offsets its content and the sidebar below it. */
export default function AppHeader() {
  const t = useTranslations('nav')
  const { config } = useAppConfig()
  const { user } = useAuth()
  const org = config?.organization

  return (
    <header className="fixed inset-x-0 top-0 z-header h-14 border-b bg-surface">
      <div className="flex h-full items-center gap-2 px-2 sm:px-4">
        <IconButton
          id="hamburger-menu-button"
          className="lg:hidden"
          aria-label={t('toggleMenu')}
          onClick={() => window.dispatchEvent(new Event('toggleSidebar'))}
        >
          <Bars3Icon className="h-5 w-5" aria-hidden />
        </IconButton>

        <Link href="/assets" className="flex min-w-0 items-center gap-2.5 rounded-control px-1 py-1">
          {org?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={org.logo_url} alt="" className="h-7 w-7 shrink-0 rounded-thumb object-contain" />
          ) : (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-thumb bg-fg text-xs font-semibold text-canvas">D³</span>
          )}
          <span className="truncate text-sm font-semibold text-fg">{org?.name ?? 'D-cubby'}</span>
          <span className="hidden truncate text-sm text-subtle sm:inline">{t('assetLibrary')}</span>
        </Link>

        <div className="ml-auto flex items-center gap-1">
          {user && (
            <ButtonLink href="/account" variant="ghost" className="hidden max-w-[16rem] sm:inline-flex">
              <span className="truncate">{user.name}</span>
            </ButtonLink>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
