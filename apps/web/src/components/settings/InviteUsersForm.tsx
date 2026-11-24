'use client'

import { useState, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'
import { ClipboardDocumentIcon } from '@heroicons/react/24/outline'

import { Button, FormError, SelectField, TextField } from '@/components/forms/fields'
import { useAuth, type Role, type User } from '@/hooks/useAuth'
import { api, apiErrorMessage } from '@/lib/api'
import { API_ENDPOINTS } from '@/lib/config'
import { toast } from '@/lib/toast'

interface Invited {
  user: { id: number; name: string; email: string; role: Role }
  invitation_sent: boolean
  temporary_password?: string
}

/**
 * Add a user. With email set up, they get an invitation link; otherwise the admin sees a
 * one-time temporary password to pass on (the user must change it at first sign-in).
 */
export default function InviteUsersForm({ smtpEnabled, onInvited }: { smtpEnabled: boolean; onInvited?: (user: User) => void }) {
  const t = useTranslations('settings.users')
  const { user } = useAuth()
  const roles = user?.permissions.assignable_roles ?? []
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>(roles.includes('editor') ? 'editor' : roles[0] ?? 'viewer')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [invited, setInvited] = useState<Invited[]>([])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const { data } = await api.post<Invited>(API_ENDPOINTS.USERS.CREATE, { user: { name, email, role } })
      setInvited((list) => [data, ...list])
      onInvited?.(data.user as unknown as User)
      setName('')
      setEmail('')
    } catch (err) {
      setError(apiErrorMessage(err, t('inviteFailed')))
    } finally {
      setSubmitting(false)
    }
  }

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(t('copied'))
    } catch {
      toast.error(t('copyFailed'))
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-[1fr_1fr_10rem_auto] sm:items-end">
        <TextField label={t('name')} name="invite_name" required value={name} onChange={(e) => setName(e.target.value)} />
        <TextField label={t('email')} name="invite_email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <SelectField label={t('role')} name="invite_role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
          {roles.map((r) => (
            <option key={r} value={r}>{t(`roles.${r}`)}</option>
          ))}
        </SelectField>
        <Button type="submit" loading={submitting}>{t('invite')}</Button>
      </form>
      <p className="text-xs text-slate-500 dark:text-slate-400">{smtpEnabled ? t('inviteByEmailHint') : t('inviteNoEmailHint')}</p>
      <FormError message={error} />

      {invited.length > 0 && (
        <ul className="space-y-2">
          {invited.map(({ user: u, invitation_sent, temporary_password }) => (
            <li key={u.id} className="rounded-xl border border-[#B8C5D1] bg-white/50 p-3 text-sm dark:border-[#263541] dark:bg-[#0d171d]/60">
              <div className="font-medium text-[#2C3A47] dark:text-[#E3E1CE]">
                {u.name} · {u.email} · {t(`roles.${u.role}`)}
              </div>
              {invitation_sent ? (
                <p className="text-slate-600 dark:text-slate-400">{t('invitationSent')}</p>
              ) : (
                temporary_password && (
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="text-slate-600 dark:text-slate-400">{t('temporaryPassword')}</span>
                    <code className="rounded bg-slate-200 px-2 py-0.5 font-mono dark:bg-slate-800">{temporary_password}</code>
                    <button type="button" onClick={() => copy(temporary_password)} className="inline-flex items-center gap-1 text-xs font-medium text-[#2C3A47] hover:underline dark:text-[#F6DAA9]">
                      <ClipboardDocumentIcon className="h-4 w-4" /> {t('copy')}
                    </button>
                    <span className="w-full text-xs text-amber-700 dark:text-amber-400">{t('temporaryPasswordOnce')}</span>
                  </div>
                )
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
