'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { TrashIcon } from '@heroicons/react/24/outline'

import { apiErrorMessage } from '@/lib/api'
import { groupsApi, listOrgUsers, type Group, type GroupMember, type OrgUser } from '@/lib/groupsApi'
import { toast } from '@/lib/toast'
import ModalShell from './ModalShell'

export default function GroupMembersModal({
  group,
  canEdit,
  onChanged,
  onClose,
}: {
  group: Group
  canEdit: boolean
  onChanged: () => void
  onClose: () => void
}) {
  const t = useTranslations('groups')
  const [members, setMembers] = useState<GroupMember[]>([])
  const [users, setUsers] = useState<OrgUser[]>([])
  const [loading, setLoading] = useState(true)
  const [busyUserId, setBusyUserId] = useState<number | null>(null)

  const load = useCallback(async () => {
    try {
      const [detail, people] = await Promise.all([groupsApi.get(group.id), listOrgUsers()])
      setMembers(detail.members)
      setUsers(people)
    } catch (error) {
      toast.error(apiErrorMessage(error, t('toasts.membersLoadFailed')))
    } finally {
      setLoading(false)
    }
  }, [group.id, t])

  useEffect(() => {
    load()
  }, [load])

  const change = async (userId: number, action: 'add' | 'remove') => {
    setBusyUserId(userId)
    try {
      const updated =
        action === 'add' ? await groupsApi.addMember(group.id, userId) : await groupsApi.removeMember(group.id, userId)
      setMembers(updated.members)
      onChanged()
    } catch (error) {
      toast.error(apiErrorMessage(error, action === 'add' ? t('toasts.addMemberFailed') : t('toasts.removeMemberFailed')))
    } finally {
      setBusyUserId(null)
    }
  }

  const nameFor = (member: GroupMember) => users.find((u) => u.id === member.id)?.name
  const candidates = users.filter((u) => !members.some((m) => m.id === u.id))

  return (
    <ModalShell title={t('members.manageTitle', { name: group.name })} onClose={onClose} wide>
      <div className="p-6">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-purple-600" />
          </div>
        ) : (
          <>
            <section className="mb-6">
              <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t('members.currentTitle', { count: members.length })}
              </h3>
              {members.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('members.noneYet')}</p>
              ) : (
                <ul className="space-y-2">
                  {members.map((member) => (
                    <li key={member.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
                      <div className="min-w-0">
                        {nameFor(member) && (
                          <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{nameFor(member)}</p>
                        )}
                        <p className="truncate text-xs text-gray-500 dark:text-gray-400">{member.email}</p>
                      </div>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => change(member.id, 'remove')}
                          disabled={busyUserId === member.id}
                          className="text-red-600 hover:text-red-800 disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300"
                          aria-label={t('members.remove', { email: member.email })}
                          title={t('members.remove', { email: member.email })}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {canEdit && (
              <section>
                <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">{t('members.addTitle')}</h3>
                {candidates.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('members.everyoneAdded')}</p>
                ) : (
                  <ul className="space-y-2">
                    {candidates.map((person) => (
                      <li key={person.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{person.name}</p>
                          <p className="truncate text-xs text-gray-500 dark:text-gray-400">{person.email}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => change(person.id, 'add')}
                          disabled={busyUserId === person.id}
                          className="rounded bg-purple-600 px-3 py-1 text-xs text-white hover:bg-purple-700 disabled:opacity-50"
                        >
                          {t('members.add')}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </ModalShell>
  )
}
