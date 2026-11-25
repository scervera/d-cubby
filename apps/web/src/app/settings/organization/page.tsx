'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'

import { Button, FormError, SelectField, TextField } from '@/components/forms/fields'
import SettingsPage, { Panel } from '@/components/settings/SettingsPage'
import { useAppConfig } from '@/hooks/useAppConfig'
import { localeNames, locales } from '@/i18n/config'
import { api, apiErrorMessage } from '@/lib/api'
import { API_ENDPOINTS } from '@/lib/config'
import { toast } from '@/lib/toast'

interface Organization {
  name: string
  default_locale: string
  logo_url: string | null
  retention_days: number
}

const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']

function OrganizationSettingsPageContent() {
  const t = useTranslations('settings.organization')
  const { reload } = useAppConfig()
  const [org, setOrg] = useState<Organization | null>(null)
  const [name, setName] = useState('')
  const [locale, setLocale] = useState('en')
  const [retention, setRetention] = useState(30)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [logoBusy, setLogoBusy] = useState(false)

  useEffect(() => {
    api.get(API_ENDPOINTS.ORGANIZATION).then(({ data }) => {
      setOrg(data.organization)
      setName(data.organization.name)
      setLocale(data.organization.default_locale)
      setRetention(data.organization.retention_days)
    })
  }, [])

  const applied = async (data: { organization: Organization }) => {
    setOrg(data.organization)
    await reload()
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const { data } = await api.patch(API_ENDPOINTS.ORGANIZATION, {
        organization: { name, default_locale: locale, retention_days: retention },
      })
      await applied(data)
      toast.success(t('saved'))
    } catch (err) {
      setError(apiErrorMessage(err, t('saveFailed')))
    } finally {
      setSaving(false)
    }
  }

  const uploadLogo = async (file: File | undefined) => {
    if (!file) return
    if (!LOGO_TYPES.includes(file.type)) return toast.error(t('logoType'))
    setLogoBusy(true)
    try {
      const form = new FormData()
      form.append('organization[logo]', file)
      await applied((await api.patch(API_ENDPOINTS.ORGANIZATION, form)).data)
      toast.success(t('logoSaved'))
    } catch (err) {
      toast.error(apiErrorMessage(err, t('saveFailed')))
    } finally {
      setLogoBusy(false)
    }
  }

  const removeLogo = async () => {
    setLogoBusy(true)
    try {
      await applied((await api.patch(API_ENDPOINTS.ORGANIZATION, { organization: { remove_logo: true } })).data)
    } catch (err) {
      toast.error(apiErrorMessage(err, t('saveFailed')))
    } finally {
      setLogoBusy(false)
    }
  }

  return (
    <>
      {org && (
        <>
          <Panel title={t('details')}>
            <form onSubmit={onSubmit} className="max-w-lg space-y-4">
              <FormError message={error} />
              <TextField label={t('name')} name="name" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
              <SelectField label={t('defaultLanguage')} name="default_locale" value={locale} onChange={(e) => setLocale(e.target.value)} hint={t('defaultLanguageHint')}>
                {locales.map((l) => (
                  <option key={l} value={l}>{localeNames[l]}</option>
                ))}
              </SelectField>
              <TextField label={t('retentionDays')} name="retention_days" type="number" min={1} max={3650} required value={retention} onChange={(e) => setRetention(Number(e.target.value))} hint={t('retentionHint')} />
              <Button type="submit" loading={saving}>{t('save')}</Button>
            </form>
          </Panel>

          <Panel title={t('logo')}>
            <div className="flex flex-wrap items-center gap-4">
              {org.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={org.logo_url} alt={t('currentLogo')} className="h-16 w-16 rounded-control border border-line object-contain p-1" />
              ) : (
                <span className="text-sm text-subtle">{t('noLogo')}</span>
              )}
              <label className={`inline-flex cursor-pointer items-center rounded-control border border-line bg-raised px-4 py-2 text-sm font-semibold text-fg ${logoBusy ? 'pointer-events-none opacity-60' : ''}`}>
                {t('uploadLogo')}
                <input type="file" accept={LOGO_TYPES.join(',')} className="sr-only" onChange={(e) => uploadLogo(e.target.files?.[0])} />
              </label>
              {org.logo_url && (
                <Button variant="secondary" onClick={removeLogo} disabled={logoBusy}>{t('removeLogo')}</Button>
              )}
            </div>
            <p className="mt-2 text-xs text-subtle">{t('logoHint')}</p>
          </Panel>
        </>
      )}
    </>
  )
}

export default function OrganizationSettingsPage() {
  const t = useTranslations('settings.organization')
  return (
    <SettingsPage title={t('title')} description={t('description')}>
      <OrganizationSettingsPageContent />
    </SettingsPage>
  )
}
