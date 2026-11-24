'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { FolderOpen } from 'lucide-react'
import { PlusIcon } from '@heroicons/react/24/outline'

import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { useAuth } from '@/hooks/useAuth'
import { canWrite } from '@/lib/auth/permissions'
import { dropZoneErrors, dropZonesApi, uploadToDropZone, type DropZone, type DropZoneInput } from '@/lib/dropZonesApi'
import { toast } from '@/lib/toast'
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
        <span className="ml-2 text-gray-600 dark:text-gray-300">{t('loadingList')}</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button type="button" onClick={fetchDropZones} className="mt-2 text-sm text-red-600 hover:underline dark:text-red-400">
          {t('tryAgain')}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel-soft rounded-2xl border border-white/30 p-6 dark:border-white/10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t('title')}</h1>
            <p className="mt-1 text-slate-600 dark:text-slate-200">{t('subtitle')}</p>
          </div>
          {writer && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700 sm:w-auto sm:text-base"
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              {t('createButton')}
            </button>
          )}
        </div>
      </div>

      {dropZones.length === 0 ? (
        <div className="py-12 text-center">
          <FolderOpen className="mx-auto mb-4 h-16 w-16 text-slate-400 dark:text-slate-300" />
          <h3 className="mb-2 text-lg font-medium text-slate-900 dark:text-slate-100">{t('emptyTitle')}</h3>
          <p className="text-slate-600 dark:text-slate-200">{writer ? t('emptyBody') : t('emptyBodyReadOnly')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
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
