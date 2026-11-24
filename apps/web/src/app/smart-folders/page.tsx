'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { FolderIcon, PencilIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { BookmarkIcon as BookmarkIconOutline } from '@heroicons/react/24/outline'
import { BookmarkIcon as BookmarkIconSolid } from '@heroicons/react/24/solid'

import ConfirmDialog from '@/components/shared/ConfirmDialog'
import SharedLayout from '@/components/shared/SharedLayout'
import { SMART_FOLDERS_CHANGED_EVENT } from '@/components/shared/SharedSidebar'
import SmartFolderForm from '@/components/smart-folders/SmartFolderForm'
import SmartFolderIcon from '@/components/smart-folders/SmartFolderIcon'
import PageSpinner from '@/components/ui/PageSpinner'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { apiErrorMessage } from '@/lib/api'
import { canWrite, isAdmin } from '@/lib/auth/permissions'
import { smartFoldersApi, type CreateSmartFolderData, type SmartFolder } from '@/lib/smartFoldersApi'
import { toast } from '@/lib/toast'

function notifySidebar() {
  window.dispatchEvent(new Event(SMART_FOLDERS_CHANGED_EVENT))
}

export default function SmartFoldersPage() {
  const { ready, user } = useRequireAuth()
  const t = useTranslations('smartFolders')
  const tc = useTranslations('common')
  const router = useRouter()
  const [smartFolders, setSmartFolders] = useState<SmartFolder[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingFolder, setEditingFolder] = useState<SmartFolder | null>(null)
  const [deletingFolder, setDeletingFolder] = useState<SmartFolder | null>(null)
  const [deleting, setDeleting] = useState(false)

  const writer = canWrite(user)
  // Mirrors the API: admins manage any folder; editors manage the folders they created.
  const canManage = (folder: SmartFolder) => isAdmin(user) || (writer && folder.user_id === user?.id)

  const fetchSmartFolders = useCallback(async () => {
    try {
      setSmartFolders(await smartFoldersApi.getAll())
    } catch (error) {
      toast.error(apiErrorMessage(error, t('loadFailed')))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    if (ready) fetchSmartFolders()
  }, [ready, fetchSmartFolders])

  const handleSubmit = async (data: CreateSmartFolderData) => {
    try {
      if (editingFolder) {
        await smartFoldersApi.update(editingFolder.id, data)
        toast.success(t('updated'))
      } else {
        await smartFoldersApi.create(data)
        toast.success(t('created'))
      }
      setShowCreateForm(false)
      setEditingFolder(null)
      await fetchSmartFolders()
      notifySidebar()
    } catch (error) {
      toast.error(apiErrorMessage(error, t('saveFailed')))
    }
  }

  const handleDelete = async () => {
    if (!deletingFolder) return
    setDeleting(true)
    try {
      await smartFoldersApi.delete(deletingFolder.id)
      toast.success(t('deleted'))
      setDeletingFolder(null)
      await fetchSmartFolders()
      notifySidebar()
    } catch (error) {
      toast.error(apiErrorMessage(error, t('deleteFailed')))
    } finally {
      setDeleting(false)
    }
  }

  const handleTogglePin = async (folder: SmartFolder) => {
    try {
      if (folder.pinned_to_sidebar) await smartFoldersApi.unpin(folder.id)
      else await smartFoldersApi.pin(folder.id)
      await fetchSmartFolders()
      notifySidebar()
    } catch (error) {
      toast.error(apiErrorMessage(error, t('pinFailed')))
    }
  }

  if (!ready) return <PageSpinner />

  return (
    <SharedLayout currentPage="smart-folders">
      <div className="glass-panel-soft rounded-2xl border border-white/30 p-6 dark:border-white/10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t('title')}</h1>
            <p className="mt-1 text-slate-600 dark:text-slate-200">{t('subtitle')}</p>
          </div>
          {writer && (
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="flex w-full items-center justify-center rounded-xl bg-[#2E7CF6] px-4 py-2 text-sm text-white transition-colors hover:bg-[#2563eb] sm:w-auto sm:text-base"
            >
              <PlusIcon className="mr-2 h-5 w-5" />
              {t('createButton')}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#2E7CF6]" />
        </div>
      ) : smartFolders.length === 0 ? (
        <div className="py-12 text-center">
          <FolderIcon className="mx-auto mb-4 h-16 w-16 text-slate-400 dark:text-slate-300" />
          <h3 className="mb-2 text-lg font-medium text-slate-900 dark:text-slate-100">{t('emptyTitle')}</h3>
          <p className="text-slate-600 dark:text-slate-200">{writer ? t('emptyBody') : t('emptyBodyReadOnly')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {smartFolders.map((folder) => (
            <div key={folder.id} className="group relative">
              <button
                type="button"
                className="block w-full text-center"
                onClick={() => router.push(`/assets?smart_folder=${folder.id}`)}
              >
                <div className="relative mx-auto mb-4 h-24 w-32 rotate-3 transform transition-transform duration-200 group-hover:rotate-0">
                  <SmartFolderIcon />
                </div>
                <h3 className="mb-1 text-lg font-semibold text-slate-900 transition-colors group-hover:text-purple-700 dark:text-slate-100 dark:group-hover:text-purple-300">
                  {folder.name}
                </h3>
                <p className="mb-3 text-sm text-slate-500 dark:text-slate-200">{t('assetCount', { count: folder.asset_count })}</p>
                {folder.tag_names.length > 0 && (
                  <div className="mb-3 flex flex-wrap justify-center gap-1">
                    {folder.tag_names.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-200"
                      >
                        {tag}
                      </span>
                    ))}
                    {folder.tag_names.length > 3 && (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-200">
                        +{folder.tag_names.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </button>

              {writer && (
                <div className="flex justify-center space-x-2 opacity-100 transition-opacity lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => handleTogglePin(folder)}
                    className={`p-1 transition-colors ${
                      folder.pinned_to_sidebar
                        ? 'text-purple-600 hover:text-purple-700 dark:text-purple-300 dark:hover:text-purple-200'
                        : 'text-slate-400 hover:text-purple-600 dark:text-slate-300 dark:hover:text-purple-300'
                    }`}
                    title={folder.pinned_to_sidebar ? t('unpinFromSidebar') : t('pinToSidebar')}
                    aria-label={folder.pinned_to_sidebar ? t('unpinFromSidebar') : t('pinToSidebar')}
                  >
                    {folder.pinned_to_sidebar ? <BookmarkIconSolid className="h-4 w-4" /> : <BookmarkIconOutline className="h-4 w-4" />}
                  </button>
                  {canManage(folder) && (
                    <>
                      <button
                        type="button"
                        onClick={() => setEditingFolder(folder)}
                        className="p-1 text-slate-400 transition-colors hover:text-purple-600 dark:text-slate-300 dark:hover:text-purple-300"
                        title={t('editFolder')}
                        aria-label={t('editFolder')}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingFolder(folder)}
                        className="p-1 text-slate-400 transition-colors hover:text-red-600 dark:text-slate-300 dark:hover:text-red-300"
                        title={t('deleteFolder')}
                        aria-label={t('deleteFolder')}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {(showCreateForm || editingFolder) && (
        <SmartFolderForm
          folder={editingFolder}
          onSubmit={handleSubmit}
          onClose={() => {
            setShowCreateForm(false)
            setEditingFolder(null)
          }}
        />
      )}

      <ConfirmDialog
        open={!!deletingFolder}
        title={t('deleteFolder')}
        body={t('confirmDelete')}
        cancelLabel={tc('cancel')}
        confirmLabel={t('deleteFolder')}
        loading={deleting}
        onCancel={() => setDeletingFolder(null)}
        onConfirm={handleDelete}
      />
    </SharedLayout>
  )
}
