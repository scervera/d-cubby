'use client'

import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArrowLeftIcon, CloudArrowUpIcon, DocumentIcon, FolderIcon } from '@heroicons/react/24/outline'

import { useAuth } from '@/hooks/useAuth'
import { canWrite } from '@/lib/auth/permissions'
import {
  dropZoneErrors,
  dropZonesApi,
  uploadToDropZone,
  type DropZone,
  type DropZoneFile,
  type DropZoneFileType,
} from '@/lib/dropZonesApi'
import { toast } from '@/lib/toast'

/** One drop zone: details, a large upload area and the latest uploads. */
export default function DropZoneFolderView({ dropZoneId }: { dropZoneId: string }) {
  const t = useTranslations('dropZones')
  const router = useRouter()
  const { user } = useAuth()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [dropZone, setDropZone] = useState<DropZone | null>(null)
  const [files, setFiles] = useState<DropZoneFile[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const canUpload = canWrite(user) && !!dropZone?.is_active

  const fileTypeLabels: Record<DropZoneFileType, string> = {
    image: t('modal.fileTypeImages'),
    video: t('modal.fileTypeVideos'),
    audio: t('modal.fileTypeAudio'),
    document: t('modal.fileTypeDocuments'),
  }

  const loadFiles = useCallback(async () => {
    try {
      setFiles((await dropZonesApi.files(dropZoneId, 1, 12)).files)
    } catch {
      // The list is a convenience; the upload area works without it.
      setFiles(null)
    }
  }, [dropZoneId])

  const fetchDropZone = useCallback(async () => {
    try {
      setDropZone(await dropZonesApi.get(dropZoneId))
      setError(null)
    } catch (err) {
      setError(dropZoneErrors(err, t('errors.fetchFailed'))[0])
    } finally {
      setLoading(false)
    }
  }, [dropZoneId, t])

  useEffect(() => {
    fetchDropZone()
    loadFiles()
  }, [fetchDropZone, loadFiles])

  const upload = async (selected: File[]) => {
    if (selected.length === 0 || !canUpload) return
    setUploading(true)
    setUploadProgress(0)
    const { uploaded, errors } = await uploadToDropZone(dropZoneId, selected, setUploadProgress, t('errors.uploadFailedGeneric'))
    if (uploaded > 0) toast.success(t('uploadedSuccessWithHint', { count: uploaded }))
    errors.forEach((message) => toast.error(message))
    setUploading(false)
    setUploadProgress(0)
    await Promise.all([fetchDropZone(), loadFiles()])
  }

  const dropHandlers = canUpload
    ? {
        onDragOver: (e: DragEvent) => {
          e.preventDefault()
          setDragOver(true)
        },
        onDragLeave: (e: DragEvent) => {
          e.preventDefault()
          setDragOver(false)
        },
        onDrop: (e: DragEvent) => {
          e.preventDefault()
          setDragOver(false)
          upload(Array.from(e.dataTransfer.files))
        },
      }
    : {}

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-accent" />
        <span className="ml-2 text-muted">{t('loadingSingle')}</span>
      </div>
    )
  }

  if (error || !dropZone) {
    return (
      <div className="py-12 text-center">
        <FolderIcon className="mx-auto mb-4 h-16 w-16 text-subtle" />
        <h3 className="mb-2 text-lg font-medium text-fg">{t('detail.notFoundTitle')}</h3>
        <p className="mb-6 text-muted">{error ?? t('detail.notFoundBody')}</p>
        <button
          type="button"
          onClick={() => router.push('/drop-zones')}
          className="rounded-control bg-accent px-4 py-2 text-on-accent transition-colors hover:bg-accent-hover"
        >
          {t('detail.backToList')}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-4">
          <button
            type="button"
            onClick={() => router.push('/drop-zones')}
            className="rounded-control p-2 transition-colors hover:bg-hover"
            aria-label={t('detail.backToList')}
          >
            <ArrowLeftIcon className="h-5 w-5 text-muted" />
          </button>
          <div className="min-w-0">
            <h1 className="flex items-center space-x-2 text-2xl font-bold text-fg">
              <FolderIcon className="h-8 w-8 shrink-0 text-accent-text" />
              <span className="truncate">{dropZone.name}</span>
            </h1>
            {dropZone.description && <p className="mt-1 text-muted">{dropZone.description}</p>}
          </div>
        </div>
        <div className="flex items-center space-x-4 text-sm text-subtle">
          <span>{t('detail.filesUploadedStat', { count: dropZone.file_count })}</span>
          <span aria-hidden="true">•</span>
          <span>{t('folder.subscribers', { count: dropZone.subscriber_count })}</span>
        </div>
      </div>

      <div className="rounded-control border border-accent bg-accent-subtle p-4">
        <h3 className="mb-2 text-sm font-medium text-accent-text">{t('detail.uploadPortalTitle')}</h3>
        <p className="mb-3 text-sm text-accent-text">{t('detail.uploadPortalBody')}</p>
        {dropZone.preset_tags.length > 0 && (
          <div>
            <p className="mb-2 text-xs text-accent-text">{t('detail.autoAppliedTags')}</p>
            <div className="flex flex-wrap gap-2">
              {dropZone.preset_tags.map((tag) => (
                <span key={tag} className="inline-block rounded-full bg-accent-subtle px-2 py-1 text-xs text-accent-text">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
        {dropZone.accepted_file_types.length > 0 && (
          <div className="mt-3">
            <p className="mb-2 text-xs text-accent-text">{t('detail.acceptedFileTypes')}</p>
            <div className="flex flex-wrap gap-2">
              {dropZone.accepted_file_types.map((type) => (
                <span key={type} className="inline-block rounded-full bg-accent-subtle px-2 py-1 text-xs text-accent-text">
                  {fileTypeLabels[type] ?? type}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {canUpload ? (
        <div
          className={`relative flex min-h-[360px] items-center justify-center rounded-control border-4 border-dashed transition-all duration-200 ${
            dragOver
              ? 'scale-[1.01] border-accent bg-accent-subtle'
              : uploading
                ? 'border-success bg-success-subtle'
                : 'border-line hover:border-accent hover:bg-hover'
          }`}
          {...dropHandlers}
        >
          <div className="px-6 py-12 text-center">
            {uploading ? (
              <>
                <div className="mx-auto mb-6 h-20 w-20 animate-spin rounded-full border-b-4 border-success" />
                <h3 className="mb-3 text-2xl font-bold text-fg">{t('detail.uploadingTitle')}</h3>
                <div className="mx-auto mt-4 max-w-md">
                  <div className="h-3 w-full overflow-hidden rounded-full bg-sunken">
                    <div className="h-3 rounded-full bg-success transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <p className="mt-2 text-sm text-muted">{uploadProgress}%</p>
                </div>
              </>
            ) : (
              <>
                <CloudArrowUpIcon className={`mx-auto mb-6 h-24 w-24 transition-colors ${dragOver ? 'text-accent-text' : 'text-subtle'}`} />
                <h3 className="mb-3 text-2xl font-bold text-fg">
                  {dragOver ? t('detail.dropFilesHere') : t('detail.dragDropTitle')}
                </h3>
                <p className="mb-6 text-lg text-muted">{t('detail.dragDropBody')}</p>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="inline-flex items-center rounded-control bg-accent px-6 py-3 font-medium text-on-accent transition-colors hover:bg-accent-hover"
                >
                  <CloudArrowUpIcon className="mr-2 h-5 w-5" />
                  {t('detail.browseButton')}
                </button>
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const selected = Array.from(e.target.files ?? [])
                    e.target.value = ''
                    upload(selected)
                  }}
                />
                <p className="mt-6 text-sm text-subtle">{t('detail.uploadedHint')}</p>
              </>
            )}
          </div>
        </div>
      ) : (
        <p className="rounded-control border border-line bg-sunken p-4 text-sm text-muted">
          {dropZone.is_active ? t('detail.readOnly') : t('detail.inactive')}
        </p>
      )}

      {files && files.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-fg">{t('detail.recentUploads')}</h2>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {files.map((file) => (
              <li key={file.id} className="overflow-hidden rounded-control border border-line bg-surface">
                <div className="flex aspect-square items-center justify-center bg-sunken">
                  {file.asset.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={file.asset.thumbnail_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <DocumentIcon className="h-10 w-10 text-subtle" />
                  )}
                </div>
                <div className="p-2">
                  <p className="truncate text-xs font-medium text-fg" title={file.asset.name}>
                    {file.asset.name}
                  </p>
                  <p className="truncate text-[0.7rem] text-subtle">
                    {file.uploaded_by.email} · {new Date(file.uploaded_at).toLocaleDateString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
