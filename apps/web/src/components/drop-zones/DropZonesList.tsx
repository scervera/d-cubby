'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { FolderOpenIcon, PlusIcon } from '@heroicons/react/24/outline'

import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { useAuth } from '@/hooks/useAuth'
import { canWrite } from '@/lib/auth/permissions'
import { dropZoneErrors, dropZonesApi, uploadToDropZone, type DropZone, type DropZoneInput } from '@/lib/dropZonesApi'
import { toast } from '@/lib/toast'
import { Button } from '@/components/ui/Button'
import { LoadingBlock } from '@/components/ui/Spinner'
import { EmptyState, PageHeader } from '@/components/ui/Panel'
import DropZoneFolder from './DropZoneFolder'
import DropZoneModal from './DropZoneModal'

type UploadState = { uploading: boolean; progress: number; totalFiles: number }

export default function DropZonesList() {
  const { user } = useAuth()
  const router = useRouter()
  const t = useTranslations('dropZones')
  const tCommon = useTranslations('common')
  const [dropZones, setDropZones] = useState<DropZone[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingDropZone, setEditingDropZone] = useState<DropZone | null>(null)
  const [deletingDropZone, setDeletingDropZone] = useState<DropZone | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [uploads, setUploads] = useState<Record<number, UploadState>>({})

  // Uploading creates assets, so it follows the same rule as the library: editors and up.
  const writer = canWrite(user)

  const fetchDropZones = useCallback(async () => {
    try {
      setDropZones(await dropZonesApi.list())
      setError(null)
    } catch (err) {
      setError(dropZoneErrors(err, t('errors.fetchFailed'))[0])
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchDropZones()
  }, [fetchDropZones])

  const handleSave = async (input: DropZoneInput): Promise<string[] | void> => {
    try {
      if (editingDropZone) {
        const updated = await dropZonesApi.update(editingDropZone.id, input)
        setDropZones((prev) => prev.map((dz) => (dz.id === updated.id ? updated : dz)))
        toast.success(t('toasts.updated'))
      } else {
        const created = await dropZonesApi.create(input)
        setDropZones((prev) => [created, ...prev])
        toast.success(t('toasts.created'))
      }
    } catch (err) {
      return dropZoneErrors(err, editingDropZone ? t('errors.updateFailed') : t('errors.createFailed'))
    }
  }

  const handleDelete = async () => {
    if (!deletingDropZone) return
    setDeleting(true)
    try {
      await dropZonesApi.delete(deletingDropZone.id)
      setDropZones((prev) => prev.filter((dz) => dz.id !== deletingDropZone.id))
      toast.success(t('toasts.deleted'))
      setDeletingDropZone(null)
    } catch (err) {
      toast.error(dropZoneErrors(err, t('errors.deleteFailed'))[0])
    } finally {
      setDeleting(false)
    }
  }

  const handleUnsubscribe = async (dropZone: DropZone) => {
    try {
      await dropZonesApi.unsubscribe(dropZone.id)
      setDropZones((prev) => prev.filter((dz) => dz.id !== dropZone.id))
      toast.success(t('toasts.unsubscribed', { name: dropZone.name }))
    } catch (err) {
      toast.error(dropZoneErrors(err, t('errors.unsubscribeFailed'))[0])
    }
  }

  const handleDropFiles = async (dropZoneId: number, files: File[]) => {
    const setUpload = (state: UploadState) => setUploads((prev) => ({ ...prev, [dropZoneId]: state }))
    setUpload({ uploading: true, progress: 0, totalFiles: files.length })
    const { uploaded, errors } = await uploadToDropZone(
      dropZoneId,
      files,
      (progress) => setUpload({ uploading: true, progress, totalFiles: files.length }),
      t('errors.uploadFailed'),
    )
    if (uploaded > 0) toast.success(t('uploadedSuccess', { count: uploaded }))
    errors.forEach((message) => toast.error(message))
    await fetchDropZones()
    // Let people see the finished bar briefly.
    setTimeout(() => setUpload({ uploading: false, progress: 0, totalFiles: 0 }), 800)
  }

  if (loading) return <LoadingBlock label={t('loadingList')} />

  if (error) {
    return (
      <div className="space-y-3 rounded-card bg-danger-subtle p-4">
        <p className="text-sm text-danger-text">{error}</p>
        <Button variant="secondary" size="sm" onClick={fetchDropZones}>
          {t('tryAgain')}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        actions={
          writer && (
            <Button onClick={() => setShowCreateModal(true)}>
              <PlusIcon className="h-4 w-4" aria-hidden />
              {t('createButton')}
            </Button>
          )
        }
      />

      {dropZones.length === 0 ? (
        <EmptyState
          icon={<FolderOpenIcon aria-hidden />}
          title={t('emptyTitle')}
          description={writer ? t('emptyBody') : t('emptyBodyReadOnly')}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {dropZones.map((dropZone) => (
            <DropZoneFolder
              key={dropZone.id}
              dropZone={dropZone}
              isOwner={dropZone.owner.id === user?.id}
              canUpload={writer && dropZone.is_active}
              onOpen={() => router.push(`/drop-zones/${dropZone.id}`)}
              onEdit={() => setEditingDropZone(dropZone)}
              onDelete={() => setDeletingDropZone(dropZone)}
              onUnsubscribe={() => handleUnsubscribe(dropZone)}
              onDropFiles={(files) => handleDropFiles(dropZone.id, files)}
              uploading={uploads[dropZone.id]?.uploading}
              uploadProgress={uploads[dropZone.id]?.progress}
              uploadTotalFiles={uploads[dropZone.id]?.totalFiles}
            />
          ))}
        </div>
      )}

      {(showCreateModal || editingDropZone) && (
        <DropZoneModal
          dropZone={editingDropZone}
          onClose={() => {
            setShowCreateModal(false)
            setEditingDropZone(null)
          }}
          onSave={handleSave}
        />
      )}

      <ConfirmDialog
        open={!!deletingDropZone}
        title={t('folder.menuDelete')}
        body={t('confirmDelete')}
        cancelLabel={tCommon('cancel')}
        confirmLabel={t('folder.menuDelete')}
        loading={deleting}
        onCancel={() => setDeletingDropZone(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
