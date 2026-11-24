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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">{admin ? t('subtitle') : t('subtitleReadOnly')}</p>
        </div>
        {admin && (
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="flex items-center justify-center space-x-2 rounded-lg bg-purple-600 px-4 py-2 font-medium text-white hover:bg-purple-700"
          >
            <PlusIcon className="h-5 w-5" />
            <span>{t('createButton')}</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-purple-600" />
        </div>
      ) : groups.length === 0 ? (
        <div className="py-12 text-center">
          <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">{t('emptyTitle')}</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{admin ? t('emptyBody') : t('emptyBodyReadOnly')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => (
            <div key={group.id} className="glass-panel-soft rounded-2xl border border-white/30 p-6 dark:border-white/10">
              <div className="mb-4 flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="mb-1 truncate text-lg font-semibold text-gray-900 dark:text-white">{group.name}</h3>
                  {group.description && <p className="text-sm text-gray-600 dark:text-gray-400">{group.description}</p>}
                </div>
                {admin && (
                  <div className="flex space-x-1">
                    <button
                      type="button"
                      onClick={() => setEditingGroup(group)}
                      className="p-1 text-gray-400 hover:text-purple-600 dark:text-gray-500 dark:hover:text-purple-400"
                      title={t('tooltips.editGroup')}
                      aria-label={t('tooltips.editGroup')}
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingGroup(group)}
                      className="p-1 text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400"
                      title={t('tooltips.deleteGroup')}
                      aria-label={t('tooltips.deleteGroup')}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-gray-200 pt-4 dark:border-gray-700">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('memberCount', { count: group.member_count })}</span>
                <button
                  type="button"
                  onClick={() => setManagingGroup(group)}
                  className="flex items-center text-sm font-medium text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
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
