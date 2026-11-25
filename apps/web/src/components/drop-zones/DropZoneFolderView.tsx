'use client'

import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArrowLeftIcon, CloudArrowUpIcon, DocumentIcon, FolderIcon } from '@heroicons/react/24/outline'

import Badge from '@/components/ui/Badge'
import { Button, IconButton } from '@/components/ui/Button'
import { EmptyState, PageHeader } from '@/components/ui/Panel'
import { LoadingBlock } from '@/components/ui/Spinner'

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

  if (loading) return <LoadingBlock label={t('loadingSingle')} />

  if (error || !dropZone) {
    return (
      <EmptyState
        icon={<FolderIcon aria-hidden />}
        title={t('detail.notFoundTitle')}
        description={error ?? t('detail.notFoundBody')}
        action={<Button onClick={() => router.push('/drop-zones')}>{t('detail.backToList')}</Button>}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2">
        <IconButton aria-label={t('detail.backToList')} onClick={() => router.push('/drop-zones')} className="-ml-2 shrink-0">
          <ArrowLeftIcon className="h-5 w-5" aria-hidden />
        </IconButton>
        <div className="min-w-0 flex-1">
          <PageHeader title={dropZone.name} description={dropZone.description}>
            <p className="text-meta mt-2 flex flex-wrap items-center gap-x-3">
              <span>{t('detail.filesUploadedStat', { count: dropZone.file_count })}</span>
              <span aria-hidden="true">·</span>
              <span>{t('folder.subscribers', { count: dropZone.subscriber_count })}</span>
            </p>
          </PageHeader>
        </div>
      </div>

      <div className="space-y-3 rounded-card bg-accent-subtle p-4">
        <div>
          <h2 className="text-sm font-semibold text-accent-text">{t('detail.uploadPortalTitle')}</h2>
          <p className="mt-1 text-sm text-fg">{t('detail.uploadPortalBody')}</p>
        </div>
        {dropZone.preset_tags.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs text-muted">{t('detail.autoAppliedTags')}</p>
            <div className="flex flex-wrap gap-1">
              {dropZone.preset_tags.map((tag) => (
                <Badge key={tag} tone="accent">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {dropZone.accepted_file_types.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs text-muted">{t('detail.acceptedFileTypes')}</p>
            <div className="flex flex-wrap gap-1">
              {dropZone.accepted_file_types.map((type) => (
                <Badge key={type} tone="accent">
                  {fileTypeLabels[type] ?? type}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {canUpload ? (
        <div
          className={`flex min-h-72 items-center justify-center rounded-card border-2 border-dashed transition-colors duration-150 ${
            dragOver ? 'border-accent bg-accent-subtle' : 'border-line-strong'
          }`}
          {...dropHandlers}
        >
          <div className="px-6 py-12 text-center">
            {uploading ? (
              <div role="status" aria-live="polite">
                <h2 className="text-sm font-semibold text-fg">{t('detail.uploadingTitle')}</h2>
                <div className="mx-auto mt-4 w-64 max-w-full">
                  <div className="h-1 w-full overflow-hidden rounded-full bg-sunken">
                    <div className="h-1 rounded-full bg-accent transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <p className="mt-2 font-mono text-xs tabular-nums text-muted">{uploadProgress}%</p>
                </div>
              </div>
            ) : (
              <>
                <CloudArrowUpIcon className={`mx-auto mb-4 h-10 w-10 transition-colors ${dragOver ? 'text-accent-text' : 'text-subtle'}`} aria-hidden />
                <h2 className="text-base font-semibold text-fg">{dragOver ? t('detail.dropFilesHere') : t('detail.dragDropTitle')}</h2>
                <p className="mt-1 text-sm text-muted">{t('detail.dragDropBody')}</p>
                <Button variant="secondary" className="mt-5" onClick={() => inputRef.current?.click()}>
                  <CloudArrowUpIcon className="h-4 w-4" aria-hidden />
                  {t('detail.browseButton')}
                </Button>
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
                <p className="mt-5 text-xs text-subtle">{t('detail.uploadedHint')}</p>
              </>
            )}
          </div>
        </div>
      ) : (
        <p className="rounded-card bg-sunken p-4 text-sm text-muted">
          {dropZone.is_active ? t('detail.readOnly') : t('detail.inactive')}
        </p>
      )}

      {files && files.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-fg">{t('detail.recentUploads')}</h2>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {files.map((file) => (
              <li key={file.id}>
                <div className="flex aspect-square items-center justify-center overflow-hidden rounded-thumb bg-sunken">
                  {file.asset.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={file.asset.thumbnail_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <DocumentIcon className="h-8 w-8 text-subtle" aria-hidden />
                  )}
                </div>
                <p className="mt-1.5 truncate text-sm text-fg" title={file.asset.name}>
                  {file.asset.name}
                </p>
                <p className="text-meta truncate">
                  {file.uploaded_by.email} · {new Date(file.uploaded_at).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
