'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/forms/fields'
import InviteUsersForm from '@/components/settings/InviteUsersForm'
import SettingsPage, { Panel } from '@/components/settings/SettingsPage'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { useAppConfig } from '@/hooks/useAppConfig'
import { useAuth, type Role } from '@/hooks/useAuth'
import { api, apiErrorMessage } from '@/lib/api'
import { API_ENDPOINTS } from '@/lib/config'
import { toast } from '@/lib/toast'

interface ManagedUser {
  id: number
  name: string
  email: string
  role: Role
  disabled: boolean
  last_sign_in_at: string | null
  password_change_required: boolean
}

/** Mirrors User#can_manage? on the API. */
function canManage(me: { id: number; role: Role }, other: ManagedUser) {
  if (other.id === me.id || other.role === 'owner') return false
  if (me.role === 'owner') return true
  return me.role === 'admin' && other.role !== 'admin'
}

function UsersSettingsPageContent() {
  const t = useTranslations('settings.users')
  const { user: me } = useAuth()
  const { config } = useAppConfig()
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [resetTarget, setResetTarget] = useState<ManagedUser | null>(null)
  const [resetResult, setResetResult] = useState<{ user: ManagedUser; password: string } | null>(null)

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(API_ENDPOINTS.USERS.LIST)
      setUsers(data.users)
    } catch (err) {
      toast.error(apiErrorMessage(err, t('loadFailed')))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  const update = async (target: ManagedUser, changes: { role?: Role; disabled?: boolean }) => {
    setBusyId(target.id)
    try {
      const { data } = await api.patch(API_ENDPOINTS.USERS.UPDATE(target.id), { user: changes })
      setUsers((list) => list.map((u) => (u.id === target.id ? data.user : u)))
      toast.success(t('saved'))
    } catch (err) {
      toast.error(apiErrorMessage(err, t('saveFailed')))
    } finally {
      setBusyId(null)
    }
  }

  const resetPassword = async () => {
    if (!resetTarget) return
    const target = resetTarget
    setResetTarget(null)
    setBusyId(target.id)
    try {
      const { data } = await api.post(API_ENDPOINTS.USERS.RESET_PASSWORD(target.id))
      setResetResult({ user: data.user, password: data.temporary_password })
      setUsers((list) => list.map((u) => (u.id === target.id ? data.user : u)))
    } catch (err) {
      toast.error(apiErrorMessage(err, t('saveFailed')))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <Panel title={t('addUser')}>
        <InviteUsersForm smtpEnabled={!!config?.smtp_enabled} onInvited={() => load()} />
      </Panel>

      <Panel title={t('people', { count: users.length })}>
        {loading ? (
          <p className="text-sm text-slate-500">{t('loading')}</p>
        ) : (
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <th className="px-2 py-1 font-medium">{t('name')}</th>
                  <th className="px-2 py-1 font-medium">{t('role')}</th>
                  <th className="px-2 py-1 font-medium">{t('status')}</th>
                  <th className="px-2 py-1 font-medium">{t('lastSignIn')}</th>
                  <th className="px-2 py-1" />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const manageable = !!me && canManage(me, u)
                  const roles = me?.permissions.assignable_roles ?? []
                  return (
                    <tr key={u.id} className="border-t border-[#B8C5D1]/60 align-middle dark:border-[#263541]">
                      <td className="px-2 py-2">
                        <div className="font-medium text-[#2C3A47] dark:text-[#E3E1CE]">
                          {u.name} {u.id === me?.id && <span className="text-xs text-slate-500">({t('you')})</span>}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{u.email}</div>
                      </td>
                      <td className="px-2 py-2">
                        {manageable ? (
                          <select
                            aria-label={t('roleFor', { name: u.name })}
                            value={u.role}
                            disabled={busyId === u.id}
                            onChange={(e) => update(u, { role: e.target.value as Role })}
                            className="rounded-lg border border-[#B8C5D1] bg-white/80 px-2 py-1 text-sm dark:border-[#263541] dark:bg-[#0d171d] dark:text-[#E3E1CE]"
                          >
                            {(roles.includes(u.role) ? roles : [u.role, ...roles]).map((r) => (
                              <option key={r} value={r}>{t(`roles.${r}`)}</option>
                            ))}
                          </select>
                        ) : (
                          t(`roles.${u.role}`)
                        )}
                      </td>
                      <td className="px-2 py-2">
                        {u.disabled ? (
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs dark:bg-slate-800">{t('disabled')}</span>
                        ) : u.password_change_required ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">{t('pendingPassword')}</span>
                        ) : (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800 dark:bg-green-900/40 dark:text-green-300">{t('active')}</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-xs text-slate-500 dark:text-slate-400">
                        {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : t('never')}
                      </td>
                      <td className="px-2 py-2">
                        {manageable && (
                          <div className="flex justify-end gap-2">
                            <Button variant="secondary" className="!px-2 !py-1 text-xs" disabled={busyId === u.id} onClick={() => setResetTarget(u)}>
                              {t('resetPassword')}
                            </Button>
                            <Button variant={u.disabled ? 'secondary' : 'danger'} className="!px-2 !py-1 text-xs" loading={busyId === u.id} onClick={() => update(u, { disabled: !u.disabled })}>
                              {u.disabled ? t('enable') : t('disable')}
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <ConfirmDialog
        open={!!resetTarget}
        title={t('resetPasswordTitle')}
        body={resetTarget ? t('resetPasswordConfirm', { name: resetTarget.name }) : ''}
        confirmLabel={t('resetPassword')}
        cancelLabel={t('cancel')}
        onConfirm={resetPassword}
        onCancel={() => setResetTarget(null)}
      />
      <ConfirmDialog
        open={!!resetResult}
        title={t('temporaryPassword')}
        body={resetResult ? t('resetPasswordDone', { name: resetResult.user.name, password: resetResult.password }) : ''}
        confirmLabel={t('done')}
        cancelLabel={t('close')}
        onConfirm={() => setResetResult(null)}
        onCancel={() => setResetResult(null)}
      />
    </>
  )
}

export default function UsersSettingsPage() {
  const t = useTranslations('settings.users')
  return (
    <SettingsPage title={t('title')} description={t('description')}>
      <UsersSettingsPageContent />
    </SettingsPage>
  )
}
