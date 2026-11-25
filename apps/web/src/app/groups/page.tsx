'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { PencilIcon, PlusIcon, TrashIcon, UserGroupIcon, UserPlusIcon } from '@heroicons/react/24/outline'

import GroupFormModal from '@/components/groups/GroupFormModal'
import GroupMembersModal from '@/components/groups/GroupMembersModal'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import SharedLayout from '@/components/shared/SharedLayout'
import Badge from '@/components/ui/Badge'
import { Button, IconButton } from '@/components/ui/Button'
import { EmptyState, PageHeader } from '@/components/ui/Panel'
import PageSpinner from '@/components/ui/PageSpinner'
import { LoadingBlock } from '@/components/ui/Spinner'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { apiErrorMessage } from '@/lib/api'
import { isAdmin } from '@/lib/auth/permissions'
import { groupsApi, type Group, type GroupInput } from '@/lib/groupsApi'
import { toast } from '@/lib/toast'

export default function GroupsPage() {
  const { ready, user } = useRequireAuth()
  const t = useTranslations('groups')
  const tCommon = useTranslations('common')
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)
  const [managingGroup, setManagingGroup] = useState<Group | null>(null)
  const [deletingGroup, setDeletingGroup] = useState<Group | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Everyone can see groups (they decide who sees group smart folders and drop zones);
  // only owners and admins change them.
  const admin = isAdmin(user)

  const fetchGroups = useCallback(async () => {
    try {
      setGroups(await groupsApi.list())
    } catch (error) {
      toast.error(apiErrorMessage(error, t('toasts.loadFailed')))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    if (ready) fetchGroups()
  }, [ready, fetchGroups])

  const handleSave = async (input: GroupInput) => {
    try {
      if (editingGroup) {
        await groupsApi.update(editingGroup.id, input)
        toast.success(t('toasts.updated'))
      } else {
        await groupsApi.create(input)
        toast.success(t('toasts.created'))
      }
      setShowCreateForm(false)
      setEditingGroup(null)
      await fetchGroups()
    } catch (error) {
      toast.error(apiErrorMessage(error, t('toasts.saveFailed')))
    }
  }

  const handleDelete = async () => {
    if (!deletingGroup) return
    setDeleting(true)
    try {
      await groupsApi.delete(deletingGroup.id)
      toast.success(t('toasts.deleted'))
      setDeletingGroup(null)
      await fetchGroups()
    } catch (error) {
      toast.error(apiErrorMessage(error, t('toasts.deleteFailed')))
    } finally {
      setDeleting(false)
    }
  }

  if (!ready) return <PageSpinner />

  return (
    <SharedLayout currentPage="groups">
      <PageHeader
        title={t('title')}
        description={admin ? t('subtitle') : t('subtitleReadOnly')}
        actions={
          admin && (
            <Button onClick={() => setShowCreateForm(true)}>
              <PlusIcon className="h-4 w-4" aria-hidden />
              {t('createButton')}
            </Button>
          )
        }
      />

      {loading ? (
        <LoadingBlock />
      ) : groups.length === 0 ? (
        <EmptyState icon={<UserGroupIcon />} title={t('emptyTitle')} description={admin ? t('emptyBody') : t('emptyBodyReadOnly')} />
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => (
            <li key={group.id} className="flex flex-col rounded-card border bg-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-fg">{group.name}</h3>
                    <Badge tone={group.active ? 'success' : 'neutral'}>
                      {group.active ? t('form.activeLabel') : t('form.inactiveLabel')}
                    </Badge>
                  </div>
                  {group.description && <p className="mt-1 text-sm text-muted">{group.description}</p>}
                </div>
                {admin && (
                  <div className="-mr-1 -mt-1 flex shrink-0">
                    <IconButton
                      size="sm"
                      onClick={() => setEditingGroup(group)}
                      title={t('tooltips.editGroup')}
                      aria-label={t('tooltips.editGroup')}
                    >
                      <PencilIcon className="h-4 w-4" aria-hidden />
                    </IconButton>
                    <IconButton
                      size="sm"
                      variant="danger-ghost"
                      onClick={() => setDeletingGroup(group)}
                      title={t('tooltips.deleteGroup')}
                      aria-label={t('tooltips.deleteGroup')}
                    >
                      <TrashIcon className="h-4 w-4" aria-hidden />
                    </IconButton>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between gap-2 border-t pt-3">
                <span className="text-meta">{t('memberCount', { count: group.member_count })}</span>
                <Button variant="secondary" size="sm" onClick={() => setManagingGroup(group)}>
                  <UserPlusIcon className="h-4 w-4" aria-hidden />
                  {admin ? t('manageMembers') : t('viewMembers')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {(showCreateForm || editingGroup) && (
        <GroupFormModal
          group={editingGroup}
          onSubmit={handleSave}
          onClose={() => {
            setShowCreateForm(false)
            setEditingGroup(null)
          }}
        />
      )}

      {managingGroup && (
        <GroupMembersModal
          group={managingGroup}
          canEdit={admin}
          onChanged={fetchGroups}
          onClose={() => setManagingGroup(null)}
        />
      )}

      <ConfirmDialog
        open={!!deletingGroup}
        title={t('tooltips.deleteGroup')}
        body={t('confirmDeleteGroup')}
        cancelLabel={tCommon('cancel')}
        confirmLabel={t('tooltips.deleteGroup')}
        loading={deleting}
        onCancel={() => setDeletingGroup(null)}
        onConfirm={handleDelete}
      />
    </SharedLayout>
  )
}
