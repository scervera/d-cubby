'use client'

import { Suspense } from 'react'
import { useTranslations } from 'next-intl'

import SetPasswordPage from '@/components/auth/SetPasswordPage'
import PageSpinner from '@/components/ui/PageSpinner'
import { API_ENDPOINTS } from '@/lib/config'

export default function AcceptInvitePage() {
  const t = useTranslations('auth')
  return (
    <Suspense fallback={<PageSpinner />}>
      <SetPasswordPage endpoint={API_ENDPOINTS.AUTH.ACCEPT_INVITATION} title={t('inviteTitle')} subtitle={t('inviteSubtitle')} />
    </Suspense>
  )
}
