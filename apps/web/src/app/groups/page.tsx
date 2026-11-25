'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { PencilIcon, PlusIcon, TrashIcon, UserGroupIcon, UserPlusIcon } from '@heroicons/react/24/outline'

import GroupFormModal from '@/components/groups/GroupFormModal'
import GroupMembersModal from '@/components/groups/GroupMembersModal'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import SharedLayout from '@/components/shared/SharedLayout'
import PageSpinner from '@/components/ui/PageSpinner'
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
      <div className="mb-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
          <p className="mt-1 text-muted">{admin ? t('subtitle') : t('subtitleReadOnly')}</p>
        </div>
        {admin && (
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="flex items-center justify-center space-x-2 rounded-control bg-accent px-4 py-2 font-medium text-on-accent hover:bg-accent-hover"
          >
            <PlusIcon className="h-5 w-5" />
            <span>{t('createButton')}</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-accent" />
        </div>
      ) : groups.length === 0 ? (
        <div className="py-12 text-center">
          <UserGroupIcon className="mx-auto h-12 w-12 text-subtle" />
          <h3 className="mt-2 text-sm font-medium text-fg">{t('emptyTitle')}</h3>
          <p className="mt-1 text-sm text-subtle">{admin ? t('emptyBody') : t('emptyBodyReadOnly')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => (
            <div key={group.id} className="rounded-card border bg-surface rounded-card border border-line p-6">
              <div className="mb-4 flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="mb-1 truncate text-lg font-semibold text-fg">{group.name}</h3>
                  {group.description && <p className="text-sm text-muted">{group.description}</p>}
                </div>
                {admin && (
                  <div className="flex space-x-1">
                    <button
                      type="button"
                      onClick={() => setEditingGroup(group)}
                      className="p-1 text-subtle hover:text-accent-text"
                      title={t('tooltips.editGroup')}
                      aria-label={t('tooltips.editGroup')}
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingGroup(group)}
                      className="p-1 text-subtle hover:text-danger-text"
                      title={t('tooltips.deleteGroup')}
                      aria-label={t('tooltips.deleteGroup')}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-line pt-4">
                <span className="text-sm text-muted">{t('memberCount', { count: group.member_count })}</span>
                <button
                  type="button"
                  onClick={() => setManagingGroup(group)}
                  className="flex items-center text-sm font-medium text-accent-text hover:text-accent-text"
                >
                  <UserPlusIcon className="mr-1 h-4 w-4" />
                  {admin ? t('manageMembers') : t('viewMembers')}
                </button>
              </div>
            </div>
          ))}
        </div>
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
