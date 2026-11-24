'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { CheckCircleIcon, ExclamationTriangleIcon, MinusCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'

import { Button } from '@/components/forms/fields'
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

  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
  if (!status) return <p className="text-sm text-slate-500">{t('loading')}</p>

  const optional = (name: IntegrationName) => name !== 'storage'

  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {ORDER.map((name) => {
          const item = status[name]
          const result = results[name]
          // Details describe a configured service (or why it isn't working), not leftovers.
          const details = DETAILS[name]
            .filter((key) => item.configured || key === 'error')
            .map((key) => [key, item[key]] as const)
            .filter(([, value]) => value !== null && value !== undefined && value !== '')
          return (
            <li key={name} className="rounded-2xl border border-[#B8C5D1] bg-white/50 p-4 dark:border-[#263541] dark:bg-[#0d171d]/60">
              <div className="flex flex-wrap items-start gap-3">
                {item.configured ? (
                  <CheckCircleIcon className="h-6 w-6 shrink-0 text-green-600" aria-hidden />
                ) : optional(name) ? (
                  <MinusCircleIcon className="h-6 w-6 shrink-0 text-slate-400" aria-hidden />
                ) : (
                  <ExclamationTriangleIcon className="h-6 w-6 shrink-0 text-amber-500" aria-hidden />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-[#2C3A47] dark:text-[#E3E1CE]">{t(`${name}.title`)}</h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        item.configured
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {item.configured ? t('configured') : optional(name) ? t('notConfiguredOptional') : t('notConfigured')}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t(`${name}.description`)}</p>
                  {details.length > 0 && (
                    <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
                      {details.map(([key, value]) => (
                        <div key={key} className="contents">
                          <dt className="text-slate-500 dark:text-slate-400">{t(`fields.${key}`)}</dt>
                          <dd className="break-all font-mono text-[#2C3A47] dark:text-[#E3E1CE]">{String(value)}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  {result && (
                    <p
                      role="status"
                      className={`mt-2 flex items-start gap-1.5 text-sm ${result.ok ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}
                    >
                      {result.ok ? <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0" /> : <XCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />}
                      <span className="break-words">{result.message}</span>
                    </p>
                  )}
                </div>
                <Button
                  variant="secondary"
                  onClick={() => runCheck(name)}
                  loading={testing === name}
                  disabled={!item.configured || (testing !== null && testing !== name)}
                  title={item.configured ? undefined : t('notConfiguredHint')}
                >
                  {name === 'smtp' ? t('sendTestEmail') : t('test')}
                </Button>
              </div>
            </li>
          )
        })}
      </ul>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {t.rich('reconfigureHint', { code: (chunks) => <code className="rounded bg-slate-200 px-1 dark:bg-slate-800">{chunks}</code> })}
        {version && <span className="ml-1">· {t('version', { version })}</span>}
      </p>
    </div>
  )
}
