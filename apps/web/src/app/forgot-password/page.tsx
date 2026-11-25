'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'

import AuthCard from '@/components/auth/AuthCard'
import { FormError, TextField } from '@/components/forms/fields'
import { Button } from '@/components/ui/Button'
import { api, apiErrorMessage } from '@/lib/api'
import { API_ENDPOINTS } from '@/lib/config'

export default function ForgotPasswordPage() {
  const t = useTranslations('auth')
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await api.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, { email })
      setSent(true)
    } catch (err) {
      setError(apiErrorMessage(err, t('genericError')))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthCard title={t('forgotTitle')} subtitle={sent ? undefined : t('forgotSubtitle')}>
      {sent ? (
        <p className="text-sm text-muted" role="status">{t('forgotSent', { email })}</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <FormError message={error} />
          <TextField label={t('email')} name="email" type="email" autoComplete="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" loading={submitting} className="w-full">
            {t('sendResetLink')}
          </Button>
        </form>
      )}
      <p className="mt-4 text-center text-sm">
        <Link href="/login" className="font-medium text-fg underline-offset-2 hover:underline">
          {t('backToSignIn')}
        </Link>
      </p>
    </AuthCard>
  )
}
