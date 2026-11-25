'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'

import Badge from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { LoadingBlock } from '@/components/ui/Spinner'
import { api, apiErrorMessage } from '@/lib/api'
import { API_ENDPOINTS } from '@/lib/config'

type IntegrationName = 'storage' | 'smtp' | 'ai' | 'faces'

interface IntegrationStatus {
  configured: boolean
  [detail: string]: unknown
}

interface CheckResult {
  ok: boolean
  message: string
}

const ORDER: IntegrationName[] = ['storage', 'smtp', 'ai', 'faces']
// Details shown per integration (never secrets; the API doesn't send any).
const DETAILS: Record<IntegrationName, string[]> = {
  storage: ['provider', 'bucket', 'endpoint', 'region'],
  smtp: ['host', 'port', 'from'],
  ai: ['provider', 'model', 'error'],
  faces: ['provider', 'region'],
}

/**
 * Read-only status of the .env integrations with a live Test button each. Settings are
 * changed by re-running install.sh, never here.
 */
export default function IntegrationStatusList() {
  const t = useTranslations('settings.system')
  const [status, setStatus] = useState<Record<IntegrationName, IntegrationStatus> | null>(null)
  const [version, setVersion] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [testing, setTesting] = useState<IntegrationName | null>(null)
  const [results, setResults] = useState<Partial<Record<IntegrationName, CheckResult>>>({})

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(API_ENDPOINTS.SYSTEM.STATUS)
      setStatus(data.integrations)
      setVersion(data.app_version)
    } catch (err) {
      setError(apiErrorMessage(err, t('loadFailed')))
    }
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  const runCheck = async (name: IntegrationName) => {
    setTesting(name)
    try {
      const { data } = await api.post(API_ENDPOINTS.SYSTEM.CHECK(name))
      setResults((r) => ({ ...r, [name]: data.result }))
    } catch (err) {
      setResults((r) => ({ ...r, [name]: { ok: false, message: apiErrorMessage(err, t('checkFailed')) } }))
    } finally {
      setTesting(null)
    }
  }

  if (error) return <p className="text-sm text-danger-text">{error}</p>
  if (!status) return <LoadingBlock label={t('loading')} />

  const optional = (name: IntegrationName) => name !== 'storage'

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-line">
        {ORDER.map((name) => {
          const item = status[name]
          const result = results[name]
          // Details describe a configured service (or why it isn't working), not leftovers.
          const details = DETAILS[name]
            .filter((key) => item.configured || key === 'error')
            .map((key) => [key, item[key]] as const)
            .filter(([, value]) => value !== null && value !== undefined && value !== '')
          return (
            <li key={name} className="flex flex-wrap items-start gap-x-4 gap-y-2 py-4 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1 basis-64">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-fg">{t(`${name}.title`)}</h3>
                  <Badge tone={item.configured ? 'success' : optional(name) ? 'neutral' : 'warning'}>
                    {item.configured ? t('configured') : optional(name) ? t('notConfiguredOptional') : t('notConfigured')}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted">{t(`${name}.description`)}</p>
                {details.length > 0 && (
                  <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
                    {details.map(([key, value]) => (
                      <div key={key} className="contents">
                        <dt className="text-subtle">{t(`fields.${key}`)}</dt>
                        <dd className="break-all font-mono text-muted">{String(value)}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {result && (
                  <p role="status" className={`mt-2 flex items-start gap-1.5 text-sm ${result.ok ? 'text-muted' : 'text-danger-text'}`}>
                    {result.ok ? (
                      <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-success-text" aria-hidden />
                    ) : (
                      <XCircleIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    )}
                    <span className="break-words">{result.message}</span>
                  </p>
                )}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => runCheck(name)}
                loading={testing === name}
                disabled={!item.configured || (testing !== null && testing !== name)}
                title={item.configured ? undefined : t('notConfiguredHint')}
              >
                {name === 'smtp' ? t('sendTestEmail') : t('test')}
              </Button>
            </li>
          )
        })}
      </ul>
      <p className="text-xs text-subtle">
        {t.rich('reconfigureHint', { code: (chunks) => <code className="rounded-thumb bg-sunken px-1 font-mono">{chunks}</code> })}
        {version && <span className="ml-1 font-mono">· {t('version', { version })}</span>}
      </p>
    </div>
  )
}
