'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { CheckIcon } from '@heroicons/react/24/outline'

import AuthCard from '@/components/auth/AuthCard'
import { Button, FormError, MIN_PASSWORD_LENGTH, PasswordStrengthMeter, SelectField, TextField } from '@/components/forms/fields'
import IntegrationStatusList from '@/components/settings/IntegrationStatusList'
import InviteUsersForm from '@/components/settings/InviteUsersForm'
import PageSpinner from '@/components/ui/PageSpinner'
import { useAppConfig } from '@/hooks/useAppConfig'
import { useAuth } from '@/hooks/useAuth'
import { localeNames, locales, type Locale } from '@/i18n/config'
import { api, apiErrorMessage } from '@/lib/api'
import { API_ENDPOINTS } from '@/lib/config'
import { setCookie } from '@/lib/cookies'

// Steps 0-3 are collected locally and submitted together; 4-6 run signed in as the owner.
const STEPS = ['token', 'organization', 'owner', 'retention', 'integrations', 'invite', 'done'] as const
type Step = (typeof STEPS)[number]

const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
const MAX_LOGO_BYTES = 2 * 1024 * 1024

export default function SetupPage() {
  const t = useTranslations('setup')
  const ta = useTranslations('auth')
  const router = useRouter()
  const { config, loading: configLoading, reload } = useAppConfig()
  const { user, signIn } = useAuth()

  const [step, setStep] = useState<Step>('token')
  const [setupToken, setSetupToken] = useState('')
  const [orgName, setOrgName] = useState('')
  const [locale, setLocale] = useState<Locale>('en')
  const [logo, setLogo] = useState<File | null>(null)
  const [ownerName, setOwnerName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [retentionDays, setRetentionDays] = useState(30)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  // Set once this browser completed setup, so the "already set up" redirect doesn't fire mid-wizard.
  const [finishedHere, setFinishedHere] = useState(false)

  useEffect(() => {
    if (!configLoading && config && !config.setup_needed && !finishedHere) {
      router.replace(user ? '/assets' : '/login')
    }
  }, [config, configLoading, finishedHere, user, router])

  if (configLoading || (config && !config.setup_needed && !finishedHere)) return <PageSpinner />

  const index = STEPS.indexOf(step)
  const go = (next: Step) => {
    setError(null)
    setStep(next)
  }

  const chooseLanguage = (value: Locale) => {
    setLocale(value)
    // Show the rest of the wizard in that language.
    setCookie('NEXT_LOCALE', value)
    router.refresh()
  }

  const onLogo = (file: File | null) => {
    setError(null)
    if (file && !LOGO_TYPES.includes(file.type)) return setError(t('logoType'))
    if (file && file.size > MAX_LOGO_BYTES) return setError(t('logoSize'))
    setLogo(file)
  }

  const submitSetup = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const { data } = await api.post(API_ENDPOINTS.SETUP, {
        setup_token: setupToken.trim(),
        organization: { name: orgName.trim(), default_locale: locale, retention_days: retentionDays },
        user: { name: ownerName.trim(), email: email.trim(), password },
      })
      setFinishedHere(true)
      await signIn(data.token, data.user)
      if (logo) {
        const form = new FormData()
        form.append('organization[logo]', logo)
        try {
          await api.patch(API_ENDPOINTS.ORGANIZATION, form)
        } catch {
          // Not fatal: the logo can be added later in Settings → Organization.
        }
      }
      await reload()
      go('integrations')
    } catch (err) {
      const status = (err as { response?: { status?: number } }).response?.status
      setError(apiErrorMessage(err, t('setupFailed')))
      if (status === 403) setStep('token')
    } finally {
      setSubmitting(false)
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    switch (step) {
      case 'token':
        return setupToken.trim() ? go('organization') : setError(t('tokenRequired'))
      case 'organization':
        return orgName.trim() ? go('owner') : setError(t('orgNameRequired'))
      case 'owner':
        if (!ownerName.trim() || !email.trim()) return setError(t('ownerRequired'))
        if (password.length < MIN_PASSWORD_LENGTH) return setError(ta('passwordTooShort', { min: MIN_PASSWORD_LENGTH }))
        if (password !== confirm) return setError(ta('passwordsDontMatch'))
        return go('retention')
      case 'retention':
        return submitSetup()
    }
  }

  const back = (target: Step) => (
    <Button type="button" variant="secondary" onClick={() => go(target)}>
      {t('back')}
    </Button>
  )

  let body: ReactNode
  switch (step) {
    case 'token':
      body = (
        <>
          <p className="text-sm text-muted">{t('tokenHelp')}</p>
          <TextField label={t('tokenLabel')} name="setup_token" autoComplete="off" autoFocus required value={setupToken} onChange={(e) => setSetupToken(e.target.value)} className="font-mono" />
          <SelectField label={t('language')} name="language" value={locale} onChange={(e) => chooseLanguage(e.target.value as Locale)}>
            {locales.map((l) => (
              <option key={l} value={l}>{localeNames[l]}</option>
            ))}
          </SelectField>
          <div className="flex justify-end"><Button type="submit">{t('next')}</Button></div>
        </>
      )
      break
    case 'organization':
      body = (
        <>
          <TextField label={t('orgName')} name="org_name" autoFocus required maxLength={120} value={orgName} onChange={(e) => setOrgName(e.target.value)} />
          <SelectField label={t('defaultLanguage')} name="default_locale" value={locale} onChange={(e) => chooseLanguage(e.target.value as Locale)} hint={t('defaultLanguageHint')}>
            {locales.map((l) => (
              <option key={l} value={l}>{localeNames[l]}</option>
            ))}
          </SelectField>
          <div>
            <label htmlFor="logo" className="mb-1 block text-sm font-medium text-fg">{t('logo')}</label>
            <input id="logo" type="file" accept={LOGO_TYPES.join(',')} onChange={(e) => onLogo(e.target.files?.[0] ?? null)} className="block w-full text-sm text-muted file:mr-3 file:rounded-control file:border-0 file:bg-raised file:px-3 file:py-2 file:text-sm file:font-medium" />
            <p className="mt-1 text-xs text-subtle">{t('logoHint')}</p>
          </div>
          <div className="flex justify-between">{back('token')}<Button type="submit">{t('next')}</Button></div>
        </>
      )
      break
    case 'owner':
      body = (
        <>
          <p className="text-sm text-muted">{t('ownerHelp')}</p>
          <TextField label={t('yourName')} name="name" autoComplete="name" autoFocus required value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
          <TextField label={ta('email')} name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <div>
            <TextField label={ta('password')} name="password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} hint={ta('passwordHint', { min: MIN_PASSWORD_LENGTH })} />
            <PasswordStrengthMeter password={password} labels={[ta('strength0'), ta('strength1'), ta('strength2'), ta('strength3'), ta('strength4')]} />
          </div>
          <TextField label={ta('confirmPassword')} name="confirm" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          <div className="flex justify-between">{back('organization')}<Button type="submit">{t('next')}</Button></div>
        </>
      )
      break
    case 'retention':
      body = (
        <>
          <p className="text-sm text-muted">{t('retentionHelp')}</p>
          <TextField label={t('retentionDays')} name="retention_days" type="number" min={1} max={3650} required value={retentionDays} onChange={(e) => setRetentionDays(Number(e.target.value))} />
          <div className="flex justify-between">{back('owner')}<Button type="submit" loading={submitting}>{t('createOrganization')}</Button></div>
        </>
      )
      break
    case 'integrations':
      body = (
        <>
          <p className="text-sm text-muted">{t('integrationsHelp')}</p>
          <IntegrationStatusList />
          <div className="flex justify-end"><Button type="button" onClick={() => go('invite')}>{t('next')}</Button></div>
        </>
      )
      break
    case 'invite':
      body = (
        <>
          <p className="text-sm text-muted">{t('inviteHelp')}</p>
          <InviteUsersForm smtpEnabled={!!config?.smtp_enabled} />
          <div className="flex justify-end"><Button type="button" onClick={() => go('done')}>{t('finishInvites')}</Button></div>
        </>
      )
      break
    case 'done':
      body = (
        <div className="space-y-4 text-center">
          <CheckIcon className="mx-auto h-12 w-12 rounded-full bg-success-subtle p-2 text-success-text" />
          <p className="text-sm text-muted">{t('doneHelp')}</p>
          <Button type="button" onClick={() => router.replace('/assets')}>{t('openLibrary')}</Button>
        </div>
      )
      break
  }

  return (
    <AuthCard title={t(`steps.${step}`)} wide={step === 'integrations' || step === 'invite'}>
      <ol className="mb-6 flex gap-1.5" aria-label={t('progress', { current: index + 1, total: STEPS.length })}>
        {STEPS.map((s, i) => (
          <li key={s} className={`h-1.5 flex-1 rounded-full ${i <= index ? 'bg-accent' : 'bg-sunken'}`} aria-current={i === index ? 'step' : undefined} />
        ))}
      </ol>
      {index <= STEPS.indexOf('retention') ? (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <FormError message={error} />
          {body}
        </form>
      ) : (
        <div className="space-y-4">{body}</div>
      )}
    </AuthCard>
  )
}
