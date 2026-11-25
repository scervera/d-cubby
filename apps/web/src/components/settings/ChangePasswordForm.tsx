'use client'

import { useState, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'

import { FormError, MIN_PASSWORD_LENGTH, PasswordStrengthMeter, TextField } from '@/components/forms/fields'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { api, apiErrorMessage } from '@/lib/api'
import { API_ENDPOINTS } from '@/lib/config'

/** Change your own password. The API revokes old tokens and returns a new one. */
export default function ChangePasswordForm({ onChanged, currentLabel }: { onChanged?: () => void; currentLabel?: string }) {
  const t = useTranslations('auth')
  const { signIn } = useAuth()
  const [current, setCurrent] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (password.length < MIN_PASSWORD_LENGTH) return setError(t('passwordTooShort', { min: MIN_PASSWORD_LENGTH }))
    if (password !== confirm) return setError(t('passwordsDontMatch'))
    setError(null)
    setSaving(true)
    try {
      const { data } = await api.patch(API_ENDPOINTS.USERS.ME, { user: { password }, current_password: current })
      await signIn(data.token, data.user)
      setCurrent('')
      setPassword('')
      setConfirm('')
      onChanged?.()
    } catch (err) {
      setError(apiErrorMessage(err, t('genericError')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-lg space-y-4">
      <FormError message={error} />
      <TextField label={currentLabel ?? t('currentPassword')} name="current_password" type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
      <div>
        <TextField label={t('newPassword')} name="new_password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} hint={t('passwordHint', { min: MIN_PASSWORD_LENGTH })} />
        <PasswordStrengthMeter password={password} labels={[t('strength0'), t('strength1'), t('strength2'), t('strength3'), t('strength4')]} />
      </div>
      <TextField label={t('confirmPassword')} name="confirm_password" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      <Button type="submit" loading={saving}>{t('savePassword')}</Button>
    </form>
  )
}
