'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

import AuthCard from '@/components/auth/AuthCard'
import ChangePasswordForm from '@/components/settings/ChangePasswordForm'
import PageSpinner from '@/components/ui/PageSpinner'
import { useRequireAuth } from '@/hooks/useRequireAuth'

/** Forced after signing in with a temporary password. */
export default function RequiredPasswordChangePage() {
  const t = useTranslations('settings.account')
  const router = useRouter()
  const { ready } = useRequireAuth()
  if (!ready) return <PageSpinner />
  return (
    <AuthCard title={t('setNewPasswordTitle')} subtitle={t('setNewPasswordSubtitle')}>
      <ChangePasswordForm currentLabel={t('temporaryPassword')} onChanged={() => router.replace('/assets')} />
    </AuthCard>
  )
}
