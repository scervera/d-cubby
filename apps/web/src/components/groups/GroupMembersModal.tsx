'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { TrashIcon } from '@heroicons/react/24/outline'

import { apiErrorMessage } from '@/lib/api'
import { groupsApi, listOrgUsers, type Group, type GroupMember, type OrgUser } from '@/lib/groupsApi'
import { toast } from '@/lib/toast'
import { Button, IconButton } from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { LoadingBlock } from '@/components/ui/Spinner'

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
    <Modal title={t('members.manageTitle', { name: group.name })} onClose={onClose} size="lg">
      {loading ? (
        <LoadingBlock />
      ) : (
        <div className="space-y-6">
          <section>
            <h3 className="mb-2 text-xs font-medium text-subtle">{t('members.currentTitle', { count: members.length })}</h3>
            {members.length === 0 ? (
              <p className="text-sm text-muted">{t('members.noneYet')}</p>
            ) : (
              <ul className="divide-y divide-line rounded-card border">
                {members.map((member) => (
                  <li key={member.id} className="flex items-center justify-between gap-3 py-2 pr-2 pl-3">
                    <div className="min-w-0">
                      {nameFor(member) && <p className="truncate text-sm font-medium text-fg">{nameFor(member)}</p>}
                      <p className="truncate text-xs text-subtle">{member.email}</p>
                    </div>
                    {canEdit && (
                      <IconButton
                        variant="danger-ghost"
                        size="sm"
                        onClick={() => change(member.id, 'remove')}
                        disabled={busyUserId === member.id}
                        aria-label={t('members.remove', { email: member.email })}
                        title={t('members.remove', { email: member.email })}
                      >
                        <TrashIcon className="h-4 w-4" aria-hidden />
                      </IconButton>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {canEdit && (
            <section>
              <h3 className="mb-2 text-xs font-medium text-subtle">{t('members.addTitle')}</h3>
              {candidates.length === 0 ? (
                <p className="text-sm text-muted">{t('members.everyoneAdded')}</p>
              ) : (
                <ul className="divide-y divide-line rounded-card border">
                  {candidates.map((person) => (
                    <li key={person.id} className="flex items-center justify-between gap-3 py-2 pr-2 pl-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-fg">{person.name}</p>
                        <p className="truncate text-xs text-subtle">{person.email}</p>
                      </div>
                      <Button variant="secondary" size="sm" onClick={() => change(person.id, 'add')} disabled={busyUserId === person.id}>
                        {t('members.add')}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      )}
    </Modal>
  )
}
