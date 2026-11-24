'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'

import AuthCard from '@/components/auth/AuthCard'
import { Button, FormError, TextField } from '@/components/forms/fields'
import PageSpinner from '@/components/ui/PageSpinner'
import { useAppConfig } from '@/hooks/useAppConfig'
import { useAuth } from '@/hooks/useAuth'
import { apiErrorMessage } from '@/lib/api'
import { safeNext } from '@/lib/auth/safeNext'

function LoginForm() {
  const t = useTranslations('auth')
  const router = useRouter()
  const params = useSearchParams()
  const { config, loading: configLoading, reload } = useAppConfig()
  const { user, loading, login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const next = safeNext(params.get('next'))

  useEffect(() => {
    if (config?.setup_needed) router.replace('/setup')
    else if (!loading && user) router.replace(user.password_change_required ? '/account/password' : next)
  }, [config, loading, user, next, router])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const signedIn = await login(email, password)
      await reload()
      router.replace(signedIn.password_change_required ? '/account/password' : next)
    } catch (err) {
      setError(apiErrorMessage(err, t('loginFailed')))
      setSubmitting(false)
    }
  }

  if (configLoading || loading || user || config?.setup_needed) return <PageSpinner />

  return (
    <AuthCard title={t('signInTitle')} subtitle={t('signInSubtitle')}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormError message={error} />
        <TextField label={t('email')} name="email" type="email" autoComplete="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField label={t('password')} name="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <Button type="submit" loading={submitting} className="w-full">
          {t('signIn')}
        </Button>
        <p className="text-center text-sm">
          {config?.password_reset_by_email ? (
            <Link href="/forgot-password" className="font-medium text-[#2C3A47] underline-offset-2 hover:underline dark:text-[#F6DAA9]">
              {t('forgotPassword')}
            </Link>
          ) : (
            <span className="text-slate-500 dark:text-slate-400">{t('forgotPasswordAskAdmin')}</span>
          )}
        </p>
      </form>
    </AuthCard>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <LoginForm />
    </Suspense>
  )
}
