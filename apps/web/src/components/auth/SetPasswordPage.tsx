'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'

import AuthCard from '@/components/auth/AuthCard'
import { FormError, MIN_PASSWORD_LENGTH, PasswordStrengthMeter, TextField } from '@/components/forms/fields'
import { Button } from '@/components/ui/Button'
import { useAppConfig } from '@/hooks/useAppConfig'
import { useAuth } from '@/hooks/useAuth'
import { api, apiErrorMessage } from '@/lib/api'

/** Choose a password from an emailed link (?token=): password reset or invitation. */
export default function SetPasswordPage({ endpoint, title, subtitle }: { endpoint: string; title: string; subtitle: string }) {
  const t = useTranslations('auth')
  const router = useRouter()
  const token = useSearchParams().get('token') ?? ''
  const { signIn } = useAuth()
  const { reload } = useAppConfig()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (password.length < MIN_PASSWORD_LENGTH) return setError(t('passwordTooShort', { min: MIN_PASSWORD_LENGTH }))
    if (password !== confirm) return setError(t('passwordsDontMatch'))
    setError(null)
    setSubmitting(true)
    try {
      const { data } = await api.post(endpoint, { token, password })
      await signIn(data.token, data.user)
      await reload()
      router.replace('/assets')
    } catch (err) {
      setError(apiErrorMessage(err, t('genericError')))
      setSubmitting(false)
    }
  }

  if (!token) {
    return (
      <AuthCard title={title}>
        <FormError message={t('linkMissingToken')} />
        <p className="mt-4 text-center text-sm">
          <Link href="/login" className="font-medium text-fg underline-offset-2 hover:underline">{t('backToSignIn')}</Link>
        </p>
      </AuthCard>
    )
  }

  return (
    <AuthCard title={title} subtitle={subtitle}>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormError message={error} />
        <div>
          <TextField label={t('newPassword')} name="password" type="password" autoComplete="new-password" required autoFocus value={password} onChange={(e) => setPassword(e.target.value)} hint={t('passwordHint', { min: MIN_PASSWORD_LENGTH })} />
          <PasswordStrengthMeter password={password} labels={[t('strength0'), t('strength1'), t('strength2'), t('strength3'), t('strength4')]} />
        </div>
        <TextField label={t('confirmPassword')} name="confirm" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <Button type="submit" loading={submitting} className="w-full">
          {t('savePassword')}
        </Button>
      </form>
    </AuthCard>
  )
}
