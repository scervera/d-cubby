'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'

import { Button, FormError, SelectField, TextField } from '@/components/forms/fields'
import ChangePasswordForm from '@/components/settings/ChangePasswordForm'
import SettingsPage, { Panel } from '@/components/settings/SettingsPage'
import { useAppConfig } from '@/hooks/useAppConfig'
import { useAuth } from '@/hooks/useAuth'
import { LOCALE_COOKIE, localeNames, locales } from '@/i18n/config'
import { api, apiErrorMessage } from '@/lib/api'
import { API_ENDPOINTS } from '@/lib/config'
import { setCookie } from '@/lib/cookies'
import { toast } from '@/lib/toast'

function AccountPageContent() {
  const t = useTranslations('settings.account')
  const ta = useTranslations('auth')
  const router = useRouter()
  const { user, setUser } = useAuth()
  const { config } = useAppConfig()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [locale, setLocale] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) return
    setName(user.name)
    setEmail(user.email)
    setLocale(user.locale ?? '')
  }, [user])

  const emailChanged = !!user && email.trim().toLowerCase() !== user.email

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const { data } = await api.patch(API_ENDPOINTS.USERS.ME, {
        user: { name, locale: locale || null, ...(emailChanged ? { email } : {}) },
        ...(emailChanged ? { current_password: currentPassword } : {}),
      })
      setUser(data.user)
      setCookie(LOCALE_COOKIE, data.user.locale ?? config?.organization?.default_locale ?? 'en')
      setCurrentPassword('')
      toast.success(t('saved'))
      router.refresh()
    } catch (err) {
      setError(apiErrorMessage(err, t('saveFailed')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {user && (
        <>
          <Panel title={t('profile')}>
            <form onSubmit={onSubmit} className="max-w-lg space-y-4">
              <FormError message={error} />
              <TextField label={t('name')} name="name" required value={name} onChange={(e) => setName(e.target.value)} />
              <TextField label={ta('email')} name="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              {emailChanged && (
                <TextField label={ta('currentPassword')} name="current_password_email" type="password" autoComplete="current-password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} hint={t('emailNeedsPassword')} />
              )}
              <SelectField label={t('language')} name="locale" value={locale} onChange={(e) => setLocale(e.target.value)}>
                <option value="">{t('organizationDefault', { language: localeNames[(config?.organization?.default_locale as keyof typeof localeNames) ?? 'en'] ?? 'English' })}</option>
                {locales.map((l) => (
                  <option key={l} value={l}>{localeNames[l]}</option>
                ))}
              </SelectField>
              <p className="text-xs text-subtle">{t('role', { role: t(`roles.${user.role}`) })}</p>
              <Button type="submit" loading={saving}>{t('save')}</Button>
            </form>
          </Panel>
          <Panel title={t('changePassword')}>
            <ChangePasswordForm onChanged={() => toast.success(t('passwordChanged'))} />
          </Panel>
        </>
      )}
    </>
  )
}

export default function AccountPage() {
  const t = useTranslations('settings.account')
  return (
    <SettingsPage title={t('title')} admin={false} currentPage="account">
      <AccountPageContent />
    </SettingsPage>
  )
}
