'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

import { useAppConfig } from '@/hooks/useAppConfig'
import { useAuth } from '@/hooks/useAuth'

/**
 * Guard for signed-in pages. Sends visitors to /setup before first-run setup, to /login
 * when signed out, to /account/password when a temporary password must be changed, and
 * (with `admin: true`) away from admin-only pages. Render nothing until `ready`.
 */
export function useRequireAuth(options: { admin?: boolean } = {}) {
  const { user, loading } = useAuth()
  const { config, loading: configLoading, reload } = useAppConfig()
  const router = useRouter()
  const pathname = usePathname()

  // Feature flags in /config depend on being signed in; refetch once the user is known.
  useEffect(() => {
    if (user && config && config.ai_tagging_enabled === undefined) reload()
  }, [user, config, reload])

  const settled = !loading && !configLoading
  let redirect: string | null = null
  if (settled) {
    if (config?.setup_needed) redirect = '/setup'
    else if (!user) redirect = `/login?next=${encodeURIComponent(pathname)}`
    else if (user.password_change_required && pathname !== '/account/password') redirect = '/account/password'
    else if (options.admin && !user.permissions.admin) redirect = '/assets'
  }

  useEffect(() => {
    if (redirect) router.replace(redirect)
  }, [redirect, router])

  return { user, loading: !settled, ready: settled && !redirect && !!user }
}
