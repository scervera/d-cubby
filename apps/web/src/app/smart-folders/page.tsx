'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { EllipsisHorizontalIcon, FolderIcon, PencilIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { BookmarkIcon as BookmarkIconOutline } from '@heroicons/react/24/outline'
import { BookmarkIcon as BookmarkIconSolid } from '@heroicons/react/24/solid'

import ConfirmDialog from '@/components/shared/ConfirmDialog'
import SharedLayout from '@/components/shared/SharedLayout'
import { SMART_FOLDERS_CHANGED_EVENT } from '@/components/shared/SharedSidebar'
import SmartFolderForm from '@/components/smart-folders/SmartFolderForm'
import SmartFolderIcon from '@/components/smart-folders/SmartFolderIcon'
import Badge from '@/components/ui/Badge'
import { Button, IconButton, buttonClass } from '@/components/ui/Button'
import { Menu, MenuItem } from '@/components/ui/Menu'
import { EmptyState, PageHeader } from '@/components/ui/Panel'
import PageSpinner from '@/components/ui/PageSpinner'
import { LoadingBlock } from '@/components/ui/Spinner'
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
      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        actions={
          writer && (
            <Button onClick={() => setShowCreateForm(true)}>
              <PlusIcon className="h-4 w-4" aria-hidden />
              {t('createButton')}
            </Button>
          )
        }
      />

      {loading ? (
        <LoadingBlock />
      ) : smartFolders.length === 0 ? (
        <EmptyState
          icon={<FolderIcon />}
          title={t('emptyTitle')}
          description={writer ? t('emptyBody') : t('emptyBodyReadOnly')}
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {smartFolders.map((folder) => (
            <li key={folder.id} className="group relative flex flex-col rounded-card border bg-surface transition-colors duration-100 hover:bg-hover">
              <button
                type="button"
                className="flex w-full flex-1 flex-col gap-3 rounded-card p-4 text-left"
                onClick={() => router.push(`/assets?smart_folder=${folder.id}`)}
              >
                <div className="flex items-center gap-3 pr-16">
                  <span className="shrink-0 text-subtle" style={folder.color ? { color: folder.color } : undefined}>
                    <SmartFolderIcon className="h-9 w-9" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-fg">{folder.name}</h3>
                    <p className="text-meta">{t('assetCount', { count: folder.asset_count })}</p>
                  </div>
                </div>
                {folder.tag_names.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {folder.tag_names.slice(0, 3).map((tag) => (
                      <Badge key={tag} tone="accent">
                        {tag}
                      </Badge>
                    ))}
                    {folder.tag_names.length > 3 && <Badge>+{folder.tag_names.length - 3}</Badge>}
                  </div>
                )}
              </button>

              {writer && (
                <div className="absolute right-2 top-2 flex items-center">
                  <IconButton
                    size="sm"
                    onClick={() => handleTogglePin(folder)}
                    className={folder.pinned_to_sidebar ? 'text-accent-text' : ''}
                    title={folder.pinned_to_sidebar ? t('unpinFromSidebar') : t('pinToSidebar')}
                    aria-label={folder.pinned_to_sidebar ? t('unpinFromSidebar') : t('pinToSidebar')}
                    aria-pressed={!!folder.pinned_to_sidebar}
                  >
                    {folder.pinned_to_sidebar ? <BookmarkIconSolid className="h-4 w-4" /> : <BookmarkIconOutline className="h-4 w-4" />}
                  </IconButton>
                  {canManage(folder) && (
                    <Menu
                      label={folder.name}
                      buttonClassName={buttonClass({ variant: 'ghost', size: 'sm', icon: true })}
                      button={<EllipsisHorizontalIcon className="h-4 w-4" aria-hidden />}
                    >
                      <MenuItem icon={<PencilIcon />} onClick={() => setEditingFolder(folder)}>
                        {t('editFolder')}
                      </MenuItem>
                      <MenuItem icon={<TrashIcon />} danger onClick={() => setDeletingFolder(folder)}>
                        {t('deleteFolder')}
                      </MenuItem>
                    </Menu>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
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
