'use client'

import { Suspense } from 'react'
import { useTranslations } from 'next-intl'

import SetPasswordPage from '@/components/auth/SetPasswordPage'
import PageSpinner from '@/components/ui/PageSpinner'
import { API_ENDPOINTS } from '@/lib/config'

export default function ResetPasswordPage() {
  const t = useTranslations('auth')
  return (
    <Suspense fallback={<PageSpinner />}>
      <SetPasswordPage endpoint={API_ENDPOINTS.AUTH.RESET_PASSWORD} title={t('resetTitle')} subtitle={t('resetSubtitle')} />
    </Suspense>
  )
}
