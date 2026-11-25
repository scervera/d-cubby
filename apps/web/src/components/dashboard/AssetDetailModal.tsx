'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  ArrowDownTrayIcon,
  EyeIcon,
  PhotoIcon,
  PlusIcon,
  ScissorsIcon,
  SparklesIcon,
  Squares2X2Icon,
  TagIcon,
  TrashIcon,
  UserCircleIcon,
  VideoCameraIcon,
} from '@heroicons/react/24/outline'

import { CheckField, inputClass } from '@/components/forms/fields'
import AudioThumbnail from '@/components/ui/AudioThumbnail'
import Badge from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { useAppConfig } from '@/hooks/useAppConfig'
import type { User } from '@/hooks/useAuth'
import { api, apiErrorMessage } from '@/lib/api'
import { assetsApi, type AssetLineageResponse, type ImageDerivativeRequest } from '@/lib/assetsApi'
import { canRestoreAsset, canWrite } from '@/lib/auth/permissions'
import { API_ENDPOINTS } from '@/lib/config'
import type { Asset, Tag } from '@/lib/dam/types'
import toast from '@/lib/toast'

import FaceNamePopover from './FaceNamePopover'
import FaceOverlay, { type FaceDetectionData } from './FaceOverlay'
import ImageEditorModal from './ImageEditorModal'
import PosterFrameSelector from './PosterFrameSelector'
import {
  extractAssetFromApiPayload,
  extractAssetIdFromApiPayload,
  fileTypeLabel,
  formatDate,
  formatFileSize,
  fullResolutionUrl,
  getAssetTags,
  getFileIcon,
  isAudio,
  isImage,
  isVideo,
  tagName,
  withStreamToken,
} from './assetUtils'

interface AssetDetailModalProps {
  /** The asset to open. Related assets (lineage) and edits replace it inside the modal. */
  asset: Asset
  user: User | null | undefined
  onClose: () => void
  /** The grid should reload (tags, thumbnails or derivatives changed). */
  onAssetsChange?: () => void
  onDownload: (asset: Asset) => void
  /** Moves the asset to the recycle bin; resolves true when it was deleted. */
  onDelete: (asset: Asset) => Promise<boolean>
  deletingAssetId?: string | null
}

interface FacePerson {
  id: number
  name: string
  face_count?: number
}

const OVERLAY_CHIP =
  'flex items-center gap-1.5 rounded-control bg-scrim px-2.5 py-1.5 text-xs font-medium text-on-scrim transition-opacity hover:opacity-80'
const OVERLAY_CHIP_ACTIVE =
  'flex items-center gap-1.5 rounded-control bg-on-scrim px-2.5 py-1.5 text-xs font-medium text-scrim transition-opacity hover:opacity-80'

/** Asset details: preview, metadata, tags, EXIF, lineage and actions. */
export default function AssetDetailModal({
  asset: initialAsset,
  user,
  onClose,
  onAssetsChange,
  onDownload,
  onDelete,
  deletingAssetId,
}: AssetDetailModalProps) {
  const tAssets = useTranslations('assets')
  const tCommon = useTranslations('common')
  const { config } = useAppConfig()

  const [asset, setAsset] = useState<Asset>(initialAsset)
  const [isMounted, setIsMounted] = useState(false)
  const [fullScreenUrl, setFullScreenUrl] = useState<string | null>(null)
  const [imageBackgroundColor, setImageBackgroundColor] = useState<'white' | 'black'>('white')
  const mainVideoRef = useRef<HTMLVideoElement | null>(null)
  const imageClickCountRef = useRef(0)
  const imageClickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Tags
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [isAddingTag, setIsAddingTag] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [addingTag, setAddingTag] = useState(false)
  const [selectedTagsToAdd, setSelectedTagsToAdd] = useState<string[]>([])
  const [tagSuggestions, setTagSuggestions] = useState<{ id: number; name: string }[]>([])
  const [showTagSuggestions, setShowTagSuggestions] = useState(false)
  const [tagInputFocused, setTagInputFocused] = useState(false)
  const tagInputRef = useRef<HTMLInputElement | null>(null)
  const [autoTagging, setAutoTagging] = useState(false)

  // Faces
  const [showFaces, setShowFaces] = useState(false)
  const [faceDetections, setFaceDetections] = useState<FaceDetectionData[]>([])
  const [selectedFaceId, setSelectedFaceId] = useState<number | null>(null)
  const [facePeople, setFacePeople] = useState<FacePerson[]>([])
  const [detectingFaces, setDetectingFaces] = useState(false)
  const [popoverFace, setPopoverFace] = useState<FaceDetectionData | null>(null)

  // Lineage, image editor, poster frame
  const [lineage, setLineage] = useState<AssetLineageResponse | null>(null)
  const [loadingLineage, setLoadingLineage] = useState(false)
  const [loadingRelatedAssetId, setLoadingRelatedAssetId] = useState<string | null>(null)
  const [showImageEditor, setShowImageEditor] = useState(false)
  const [savingDerivative, setSavingDerivative] = useState(false)
  const [showPosterFrameSelector, setShowPosterFrameSelector] = useState(false)

  const attrs = asset.attributes
  const assetTags = getAssetTags(asset)
  const mayTag = canWrite(user)
  const mayEditAsset = canRestoreAsset(user, { user_id: attrs.user_id })
  const aiTaggingEnabled = !!config?.ai_tagging_enabled
  const faceDetectionEnabled = !!config?.face_detection_enabled

  useEffect(() => {
    setIsMounted(true)
    try {
      const saved = localStorage.getItem('imageBackgroundColor')
      if (saved === 'white' || saved === 'black') setImageBackgroundColor(saved)
    } catch {
      // Storage unavailable; keep the default.
    }
  }, [])

  const loadAvailableTags = useCallback(async () => {
    try {
      const response = await api.get(API_ENDPOINTS.TAGS.LIST)
      setAvailableTags(Array.isArray(response.data?.data) ? response.data.data : [])
    } catch {
      toast.error(tAssets('details.tags.failedToLoadTags'))
    }
  }, [tAssets])

  useEffect(() => {
    if (mayTag) loadAvailableTags()
  }, [mayTag, loadAvailableTags])

  // Lineage for images
  useEffect(() => {
    if (!isImage(asset)) {
      setLineage(null)
      return
    }
    let cancelled = false
    setLoadingLineage(true)
    assetsApi
      .getAssetLineage(asset.id)
      .then((data) => !cancelled && setLineage(data))
      .catch(() => !cancelled && setLineage(null))
      .finally(() => !cancelled && setLoadingLineage(false))
    return () => {
      cancelled = true
    }
  }, [asset])

  // Faces for images, when shown
  useEffect(() => {
    setPopoverFace(null)
    setSelectedFaceId(null)
    if (!faceDetectionEnabled || !showFaces || !isImage(asset)) {
      setFaceDetections([])
      return
    }
    let cancelled = false
    api
      .get(API_ENDPOINTS.ASSETS.FACES(asset.id))
      .then((res) => !cancelled && setFaceDetections(Array.isArray(res.data?.faces) ? res.data.faces : []))
      .catch(() => !cancelled && setFaceDetections([]))
    api
      .get(API_ENDPOINTS.FACE_PEOPLE.LIST)
      .then((res) => !cancelled && setFacePeople(Array.isArray(res.data?.data) ? res.data.data : []))
      .catch(() => !cancelled && setFacePeople([]))
    return () => {
      cancelled = true
    }
  }, [asset, showFaces, faceDetectionEnabled])

  // Tag autocomplete
  useEffect(() => {
    const query = newTagName.trim()
    if (!isAddingTag || !query) {
      setTagSuggestions([])
      setShowTagSuggestions(false)
      return
    }
    const timeoutId = setTimeout(async () => {
      try {
        const response = await api.get(API_ENDPOINTS.TAGS.SEARCH, { params: { q: query, limit: 10 } })
        const existing = new Set(assetTags.map((tag) => tagName(tag).toLowerCase()))
        const tags = (Array.isArray(response.data?.data) ? response.data.data : [])
          .map((tag: { id: number; name?: string; attributes?: { name: string } }) => ({
            id: tag.id,
            name: tag.attributes?.name || tag.name || '',
          }))
          .filter((tag: { name: string }) => tag.name && !existing.has(tag.name.toLowerCase()))
        setTagSuggestions(tags)
        setShowTagSuggestions(tags.length > 0 && tagInputFocused)
      } catch {
        setTagSuggestions([])
      }
    }, 300)
    return () => clearTimeout(timeoutId)
    // assetTags is derived from asset
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newTagName, asset, isAddingTag, tagInputFocused])

  // Keyboard: F opens the full-screen viewer. Escape is handled by the dialogs.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const typing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || !!target?.isContentEditable
      if ((e.key === 'f' || e.key === 'F') && !e.metaKey && !e.ctrlKey && !e.altKey && !typing && !fullScreenUrl && (isImage(asset) || isVideo(asset))) {
        const url = fullResolutionUrl(asset)
        if (url) setFullScreenUrl(url)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [asset, fullScreenUrl])

  /** Show a newer copy of an asset; keeps the uploader when a response omits it. */
  const applyAssetResponse = (payload: unknown) => {
    const next = extractAssetFromApiPayload(payload)
    if (!next) return
    setAsset((prev) =>
      next.id === prev.id && next.attributes.user_id == null
        ? { ...next, attributes: { ...next.attributes, user_id: prev.attributes.user_id } }
        : next,
    )
  }

  const reloadAsset = async (assetId: string) => {
    const response = await api.get(API_ENDPOINTS.ASSETS.SHOW(assetId))
    applyAssetResponse(response.data)
    return extractAssetFromApiPayload(response.data)
  }

  const addTag = async (name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return false
    setAddingTag(true)
    try {
      const response = await api.post(API_ENDPOINTS.ASSETS.ADD_TAG(asset.id), { tag_name: trimmed })
      applyAssetResponse(response.data)
      return true
    } catch {
      toast.error(tAssets('details.tags.addTagFailed'))
      return false
    } finally {
      setAddingTag(false)
    }
  }

  const handleAddTag = async () => {
    if (!newTagName.trim() || addingTag) return
    const name = newTagName.trim()
    if (await addTag(name)) {
      toast.success(tAssets('details.tags.addedTag', { name }))
      setNewTagName('')
      setIsAddingTag(false)
      setShowTagSuggestions(false)
    }
  }

  const handleAddSelectedTags = async () => {
    const names = selectedTagsToAdd
      .map((id) => availableTags.find((tag) => String(tag.id) === id))
      .filter((tag): tag is Tag => !!tag)
      .map(tagName)
    let added = 0
    for (const name of names) if (await addTag(name)) added += 1
    setSelectedTagsToAdd([])
    if (added > 0) toast.success(tAssets('details.tags.addedTags', { count: added }))
  }

  const removeTag = async (tag: Tag) => {
    try {
      const response = await api.delete(API_ENDPOINTS.ASSETS.REMOVE_TAG(asset.id), { data: { tag_id: tag.id } })
      applyAssetResponse(response.data)
      toast.success(tAssets('details.tags.removedTag'))
    } catch {
      toast.error(tAssets('details.tags.removeTagFailed'))
    }
  }

  const handleTagSuggestionClick = (name: string) => {
    setNewTagName(name)
    setShowTagSuggestions(false)
    setTimeout(() => {
      tagInputRef.current?.focus()
      tagInputRef.current?.setSelectionRange(name.length, name.length)
    }, 0)
  }

  /** Starts AI tagging (a background job), then polls until new tags show up. */
  const handleAutoTag = async () => {
    if (autoTagging) return
    const assetId = asset.id
    const initialCount = assetTags.length
    setAutoTagging(true)
    try {
      await api.post(API_ENDPOINTS.ASSETS.AUTO_TAG(assetId))
      toast.success(tAssets('details.actions.autoTagStarted'))
      for (let attempt = 0; attempt < 10; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 2000))
        try {
          const next = await reloadAsset(assetId)
          if (next && getAssetTags(next).length > initialCount) break
        } catch {
          // Keep polling.
        }
      }
      onAssetsChange?.()
    } catch (error) {
      toast.error(apiErrorMessage(error, tAssets('details.actions.autoTagFailed')))
    } finally {
      setAutoTagging(false)
    }
  }

  const handleDetectFaces = async () => {
    if (detectingFaces) return
    const assetId = asset.id
    setDetectingFaces(true)
    try {
      await api.post(API_ENDPOINTS.ASSETS.DETECT_FACES(assetId))
      toast.success(tAssets('faces.detectionStarted'))
      setShowFaces(true)
      for (const delay of [2000, 5000, 8000]) {
        await new Promise((resolve) => setTimeout(resolve, delay))
        try {
          const res = await api.get(API_ENDPOINTS.ASSETS.FACES(assetId))
          const faces = res.data?.faces ?? []
          setFaceDetections(faces)
          if (faces.length > 0) break
        } catch {
          // Still processing.
        }
      }
    } catch (error) {
      toast.error(apiErrorMessage(error, tAssets('faces.detectionFailed')))
    } finally {
      setDetectingFaces(false)
    }
  }

  const handleFaceIdentify = async (personId: number) => {
    if (!popoverFace) return
    try {
      await api.put(API_ENDPOINTS.FACE_DETECTIONS.IDENTIFY(popoverFace.id), { person_id: personId })
      const res = await api.get(API_ENDPOINTS.ASSETS.FACES(asset.id))
      setFaceDetections(res.data?.faces ?? [])
      setPopoverFace(null)
      setSelectedFaceId(null)
      await reloadAsset(asset.id)
      onAssetsChange?.()
      toast.success(tAssets('faces.tagged'))
    } catch {
      toast.error(tAssets('faces.tagFailed'))
    }
  }

  const handleFaceCreateAndSave = async (name: string) => {
    if (!popoverFace) return
    try {
      const res = await api.post(API_ENDPOINTS.FACE_PEOPLE.CREATE, { name: name.trim() })
      const personId = res.data?.id ?? res.data?.data?.id
      if (personId == null) throw new Error('No person id returned')
      await handleFaceIdentify(personId)
    } catch {
      toast.error(tAssets('faces.createFailed'))
    }
  }

  const handleOpenRelatedAsset = async (assetId: string) => {
    if (assetId === asset.id) return
    setLoadingRelatedAssetId(assetId)
    try {
      if (!(await reloadAsset(assetId))) toast.error(tAssets('lineage.failedToLoad'))
    } catch {
      toast.error(tAssets('lineage.failedToLoad'))
    } finally {
      setLoadingRelatedAssetId(null)
    }
  }

  const handleSaveImageDerivative = async (payload: ImageDerivativeRequest) => {
    setSavingDerivative(true)
    try {
      const result = await assetsApi.createImageDerivative(asset.id, payload)
      const derivative = extractAssetFromApiPayload(result)
      if (derivative) setAsset(derivative)
      else {
        const id = extractAssetIdFromApiPayload(result)
        if (id) await reloadAsset(id)
      }
      setShowImageEditor(false)
      toast.success(tAssets('editor.savedSuccess'))
      onAssetsChange?.()
    } catch (error) {
      toast.error(apiErrorMessage(error, tAssets('editor.saveFailed')))
    } finally {
      setSavingDerivative(false)
    }
  }

  const handlePosterFrameGenerated = (payload: unknown) => {
    if (extractAssetFromApiPayload(payload)) applyAssetResponse(payload)
    else reloadAsset(asset.id).catch(() => undefined)
    setShowPosterFrameSelector(false)
    // Make the main player pick up the new poster.
    setTimeout(() => mainVideoRef.current?.load(), 100)
    onAssetsChange?.()
  }

  const handleDelete = async () => {
    if (await onDelete(asset)) onClose()
  }

  const toggleBackground = () => {
    const next = imageBackgroundColor === 'white' ? 'black' : 'white'
    setImageBackgroundColor(next)
    try {
      localStorage.setItem('imageBackgroundColor', next)
    } catch {
      // Not persisted.
    }
  }

  const openFullScreen = () => {
    const url = fullResolutionUrl(asset)
    if (url) setFullScreenUrl(url)
  }

  if (!isMounted) return null

  const resolution = (() => {
    const exif = attrs.exif_data
    if (isImage(asset) && attrs.image_dimensions) {
      const dpi = exif?.resolution_unit === 2 && (exif?.x_resolution ?? exif?.y_resolution)
      const dpiStr = typeof dpi === 'number' && Number.isFinite(dpi) ? ` · ${Math.round(dpi)} ${tAssets('details.exif.dpi')}` : ''
      return {
        label: tAssets('details.exif.imageResolution'),
        value: `${attrs.image_dimensions.width} × ${attrs.image_dimensions.height} ${tAssets('details.exif.pixels')}${dpiStr}`,
      }
    }
    if (isVideo(asset) && attrs.video_dimensions) {
      const { width, height } = attrs.video_dimensions
      const quality = height >= 2160 ? '4K' : height >= 1080 ? '1080p' : height >= 720 ? '720p' : height >= 480 ? '480p' : height >= 360 ? '360p' : null
      return { label: tAssets('details.exif.videoResolution'), value: quality ? `${width} × ${height} (${quality})` : `${width} × ${height}` }
    }
    return null
  })()

  const exif = attrs.exif_data
  const imageSrc = attrs.preview_url || attrs.thumbnail_url || attrs.file_url

  const sectionTitle = 'flex items-center gap-1.5 text-sm font-semibold text-fg'
  const metaLabel = 'text-xs text-subtle'
  const metaValue = 'break-all font-mono text-sm tabular-nums text-fg'
  const showPreviewTools = isImage(asset) || isVideo(asset)

  const footer = (
    <>
      {isVideo(asset) && mayEditAsset && (
        <Button variant="secondary" onClick={() => setShowPosterFrameSelector(true)} title={tAssets('details.actions.setPosterFrameTooltip')}>
          <VideoCameraIcon className="h-4 w-4" aria-hidden />
          {tAssets('details.actions.setPosterFrame')}
        </Button>
      )}
      {isImage(asset) && mayTag && (
        <Button variant="secondary" onClick={() => setShowImageEditor(true)} title={tAssets('details.actions.editImageTooltip')}>
          <ScissorsIcon className="h-4 w-4" aria-hidden />
          {tAssets('details.actions.editImage')}
        </Button>
      )}
      {isImage(asset) && mayTag && aiTaggingEnabled && (
        <Button variant="secondary" onClick={handleAutoTag} disabled={autoTagging} title={tAssets('details.actions.autoTagTooltip')}>
          <SparklesIcon className="h-4 w-4" aria-hidden />
          {autoTagging ? tAssets('details.actions.autoTagging') : tAssets('details.actions.autoTag')}
        </Button>
      )}
      <Button variant="secondary" onClick={() => onDownload(asset)} title={tAssets('details.actions.downloadTooltip')}>
        <ArrowDownTrayIcon className="h-4 w-4" aria-hidden />
        {tAssets('details.actions.download')}
      </Button>
      {mayEditAsset && (
        <Button
          variant="danger-ghost"
          onClick={handleDelete}
          disabled={deletingAssetId === asset.id}
          title={tAssets('details.actions.deleteTooltip')}
        >
          <TrashIcon className="h-4 w-4" aria-hidden />
          {deletingAssetId === asset.id ? tAssets('grid.bulk.deleting') : tAssets('details.actions.deleteAsset')}
        </Button>
      )}
    </>
  )

  return (
    <>
      <Modal title={attrs.name} onClose={onClose} size="xl" footer={footer}>
        <div className="space-y-6">
          {/* Preview */}
          <div
            className={`relative flex items-center justify-center overflow-hidden rounded-card border bg-sunken ${
              isImage(asset) ? 'p-0' : 'p-4'
            } ${showPreviewTools ? 'min-h-[320px]' : 'aspect-video'}`}
          >
            <div className="absolute top-3 right-3 z-10 flex flex-wrap items-center justify-end gap-2">
              {showPreviewTools && (
                <button type="button" onClick={openFullScreen} className={OVERLAY_CHIP} title={tAssets('viewer.fullScreenHint')}>
                  <EyeIcon className="h-4 w-4" aria-hidden />
                  <span>{tAssets('viewer.fullScreen')}</span>
                </button>
              )}
              {isImage(asset) && (
                <button
                  type="button"
                  onClick={toggleBackground}
                  className={OVERLAY_CHIP}
                  title={tAssets('viewer.backgroundToggle', {
                    color: imageBackgroundColor === 'white' ? tAssets('viewer.colors.white') : tAssets('viewer.colors.black'),
                  })}
                >
                  <Squares2X2Icon className="h-4 w-4" aria-hidden />
                  <span>{imageBackgroundColor === 'white' ? tAssets('viewer.colors.white') : tAssets('viewer.colors.black')}</span>
                </button>
              )}
              {isImage(asset) && faceDetectionEnabled && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowFaces(!showFaces)}
                    aria-pressed={showFaces}
                    className={showFaces ? OVERLAY_CHIP_ACTIVE : OVERLAY_CHIP}
                    title={tAssets('faces.show')}
                  >
                    <UserCircleIcon className="h-4 w-4" aria-hidden />
                    <span>{tAssets('faces.show')}</span>
                  </button>
                  {showFaces && mayTag && (
                    <button
                      type="button"
                      onClick={handleDetectFaces}
                      disabled={detectingFaces}
                      className={`${OVERLAY_CHIP} disabled:opacity-50`}
                      title={tAssets('faces.detectHint')}
                    >
                      <SparklesIcon className="h-4 w-4" aria-hidden />
                      <span>{detectingFaces ? tAssets('faces.detecting') : tAssets('faces.detect')}</span>
                    </button>
                  )}
                </>
              )}
            </div>

            {isVideo(asset) ? (
              <div
                className="w-full cursor-pointer"
                onDoubleClick={(e) => {
                  e.preventDefault()
                  openFullScreen()
                }}
                title={tAssets('grid.tooltips.doubleClickToViewFullSize')}
              >
                <video
                  ref={mainVideoRef}
                  controls
                  className="h-auto max-h-[60vh] w-full object-contain"
                  poster={attrs.poster_frame_url || attrs.thumbnail_url}
                  key={`video-${asset.id}-${attrs.poster_frame_url || attrs.thumbnail_url || ''}`}
                  preload="metadata"
                  src={withStreamToken(attrs.file_url || attrs.download_url)}
                  onClick={(e) => e.stopPropagation()}
                  onDoubleClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  onError={(e) => {
                    // Fall back to the stream endpoint (range requests, token auth).
                    const video = e.currentTarget
                    const stream = withStreamToken(attrs.download_url)
                    if (stream && !video.dataset.fallback) {
                      video.dataset.fallback = 'true'
                      video.src = stream
                      video.load()
                    }
                  }}
                >
                  {tAssets('viewer.videoNotSupported')}
                </video>
              </div>
            ) : isAudio(asset) ? (
              <div className="flex h-full w-full flex-col items-center justify-center p-6">
                <div className="mb-5 h-40 w-40 overflow-hidden rounded-card">
                  <AudioThumbnail size="xlarge" />
                </div>
                <div className="w-full max-w-md rounded-card border bg-surface p-3">
                  <audio controls className="w-full" preload="metadata">
                    <source src={withStreamToken(attrs.file_url || attrs.download_url)} type={attrs.file_type} />
                    {tAssets('viewer.audioNotSupported')}
                  </audio>
                </div>
                <div className="mt-4 text-center">
                  <p className="text-sm font-medium text-fg">{attrs.name}</p>
                  <p className="mt-1 font-mono text-xs text-subtle">
                    {fileTypeLabel(attrs.file_type, 'AUDIO')} • {formatFileSize(attrs.file_size)}
                  </p>
                </div>
              </div>
            ) : isImage(asset) && imageSrc ? (
              <div
                className="relative flex h-full w-full items-center justify-center p-4"
                style={{ backgroundColor: imageBackgroundColor === 'white' ? '#ffffff' : '#000000' }} // palette-ok: content preview backdrop, not theme
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={`${asset.id}-${imageSrc}`}
                  src={imageSrc}
                  alt={attrs.name}
                  className="block max-h-[60vh] max-w-full cursor-pointer object-contain"
                  onMouseDown={(e) => {
                    // Manual double-click detection (the native event is unreliable over overlays).
                    imageClickCountRef.current += 1
                    if (imageClickTimeoutRef.current) clearTimeout(imageClickTimeoutRef.current)
                    if (imageClickCountRef.current === 2) {
                      e.preventDefault()
                      imageClickCountRef.current = 0
                      openFullScreen()
                    } else {
                      imageClickTimeoutRef.current = setTimeout(() => {
                        imageClickCountRef.current = 0
                      }, 300)
                    }
                  }}
                  title={tAssets('grid.tooltips.doubleClickToViewFullSize')}
                />
                {showFaces && (
                  <FaceOverlay
                    faces={faceDetections}
                    selectedFaceId={selectedFaceId}
                    onFaceClick={(face) => {
                      if (!mayTag) return
                      setSelectedFaceId(face.id)
                      setPopoverFace(face)
                    }}
                  />
                )}
                {popoverFace && (
                  <div className="absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
                    <FaceNamePopover
                      face={popoverFace}
                      suggestedMatches={popoverFace.suggested_matches ?? []}
                      existingPeople={facePeople}
                      onSave={handleFaceIdentify}
                      onCreateAndSave={handleFaceCreateAndSave}
                      onClose={() => {
                        setPopoverFace(null)
                        setSelectedFaceId(null)
                      }}
                    />
                  </div>
                )}
              </div>
            ) : attrs.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={attrs.thumbnail_url} alt={attrs.name} className="h-auto max-h-[60vh] w-full object-contain" />
            ) : (
              (() => {
                const Icon = getFileIcon(attrs.file_type)
                return <Icon className="h-16 w-16 text-subtle" aria-hidden />
              })()
            )}
          </div>

          {/* Metadata */}
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            <div className="min-w-0">
              <dt className={metaLabel}>{tAssets('details.fileType')}</dt>
              <dd className={metaValue}>{attrs.file_type}</dd>
            </div>
            <div className="min-w-0">
              <dt className={metaLabel}>{tAssets('details.fileSize')}</dt>
              <dd className={metaValue}>{formatFileSize(attrs.file_size)}</dd>
            </div>
            <div className="min-w-0">
              <dt className={metaLabel}>{tAssets('details.created')}</dt>
              <dd className={metaValue}>{formatDate(attrs.created_at)}</dd>
            </div>
            <div className="min-w-0">
              <dt className={metaLabel}>{tAssets('details.assetId')}</dt>
              <dd className={metaValue}>{asset.id}</dd>
            </div>
            {resolution && (
              <div className="col-span-2 min-w-0 sm:col-span-4">
                <dt className={metaLabel}>{resolution.label}</dt>
                <dd className={metaValue}>{resolution.value}</dd>
              </div>
            )}
          </dl>

          {/* Tags */}
          <section>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h4 className={sectionTitle}>
                <TagIcon className="h-4 w-4 text-subtle" aria-hidden />
                {tAssets('details.tags.title')}
              </h4>
              {mayTag && !isAddingTag && (
                <Button variant="ghost" size="sm" onClick={() => setIsAddingTag(true)}>
                  <PlusIcon className="h-4 w-4" aria-hidden />
                  {tAssets('details.tags.addTag')}
                </Button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {assetTags.map((tag) => (
                <Badge
                  key={String(tag.id)}
                  tone="accent"
                  onRemove={mayTag ? () => removeTag(tag) : undefined}
                  removeLabel={mayTag ? tAssets('details.tags.removeTagLabel', { name: tagName(tag) }) : undefined}
                >
                  {tagName(tag) || tAssets('details.tags.unknownTag')}
                </Badge>
              ))}
              {assetTags.length === 0 && <span className="text-sm text-subtle">{tAssets('details.tags.noneAssigned')}</span>}
            </div>

            {mayTag && isAddingTag && (
              <div className="relative mt-3 flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    ref={tagInputRef}
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onFocus={() => setTagInputFocused(true)}
                    onBlur={() =>
                      setTimeout(() => {
                        setTagInputFocused(false)
                        setShowTagSuggestions(false)
                      }, 200)
                    }
                    placeholder={tAssets('details.tags.enterTagName')}
                    aria-label={tAssets('details.tags.enterTagName')}
                    className={inputClass}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddTag()
                      } else if (e.key === 'Escape') {
                        // Consumed here: must not reach the dialog, which would close.
                        e.preventDefault()
                        e.stopPropagation()
                        e.nativeEvent.stopImmediatePropagation()
                        setShowTagSuggestions(false)
                        setIsAddingTag(false)
                        setNewTagName('')
                      } else if (e.key === 'ArrowDown' && showTagSuggestions && tagSuggestions.length > 0) {
                        e.preventDefault()
                        ;(document.querySelector('.tag-suggestion-item') as HTMLElement | null)?.focus()
                      }
                    }}
                    autoFocus
                  />
                  {showTagSuggestions && tagSuggestions.length > 0 && (
                    <div className="absolute z-dropdown mt-1 max-h-60 w-full overflow-y-auto rounded-card border bg-raised p-1 shadow-overlay">
                      {tagSuggestions.map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          className="tag-suggestion-item w-full rounded-thumb px-2 py-1.5 text-left text-sm text-fg hover:bg-hover focus:bg-hover"
                          onClick={() => handleTagSuggestionClick(tag.name)}
                          onMouseDown={(e) => e.preventDefault()}
                        >
                          {tag.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button onClick={handleAddTag} disabled={!newTagName.trim()} loading={addingTag}>
                  {addingTag ? tAssets('details.tags.adding') : tAssets('details.tags.add')}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIsAddingTag(false)
                    setNewTagName('')
                  }}
                >
                  {tCommon('cancel')}
                </Button>
              </div>
            )}

            {mayTag && availableTags.length > 0 && (
              <div className="mt-3 rounded-card border bg-surface p-3">
                <div className="mb-2 flex min-h-8 items-center justify-between gap-2">
                  <p className="text-xs text-subtle">{tAssets('details.tags.availableTags')}</p>
                  {selectedTagsToAdd.length > 0 && (
                    <Button variant="secondary" size="sm" onClick={handleAddSelectedTags}>
                      {tAssets('details.tags.addSelected', { count: selectedTagsToAdd.length })}
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {availableTags
                    .filter((tag) => !assetTags.some((assetTag) => String(assetTag.id) === String(tag.id)))
                    .slice(0, 10)
                    .map((tag) => {
                      const id = String(tag.id)
                      const checked = selectedTagsToAdd.includes(id)
                      return (
                        <CheckField
                          key={id}
                          checked={checked}
                          onChange={() => setSelectedTagsToAdd((prev) => (checked ? prev.filter((x) => x !== id) : [...prev, id]))}
                          label={tagName(tag) || tAssets('details.tags.unknownTag')}
                        />
                      )
                    })}
                </div>
                <p className="mt-2 text-xs text-subtle">{tAssets('details.tags.multiSelectHint')}</p>
              </div>
            )}
          </section>

          {/* EXIF */}
          {isImage(asset) && exif && (
            <section>
              <h4 className={`${sectionTitle} mb-2`}>{tAssets('details.exif.exifInformation')}</h4>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-card border bg-surface p-3 sm:grid-cols-4">
                {(exif.camera_make || exif.camera_model) && (
                  <ExifRow
                    wide
                    label={tAssets('details.exif.camera')}
                    value={[exif.camera_make, exif.camera_model].filter(Boolean).join(' ')}
                  />
                )}
                {exif.lens_model && <ExifRow wide label={tAssets('details.exif.lens')} value={exif.lens_model} />}
                {exif.aperture ? <ExifRow label={tAssets('details.exif.aperture')} value={`f/${exif.aperture}`} /> : null}
                {exif.shutter_speed ? (
                  <ExifRow label={tAssets('details.exif.shutter')} value={`1/${Math.round(1 / exif.shutter_speed)}s`} />
                ) : null}
                {exif.iso ? <ExifRow label={tAssets('details.exif.iso')} value={String(exif.iso)} /> : null}
                {exif.focal_length ? <ExifRow label={tAssets('details.exif.focalLength')} value={`${exif.focal_length}mm`} /> : null}
                {exif.date_taken && <ExifRow wide label={tAssets('details.exif.dateTaken')} value={new Date(exif.date_taken).toLocaleString()} />}
                {exif.gps_latitude && exif.gps_longitude ? (
                  <ExifRow wide label={tAssets('details.exif.location')} value={`${exif.gps_latitude.toFixed(6)}, ${exif.gps_longitude.toFixed(6)}`} />
                ) : null}
                {exif.software && <ExifRow wide label={tAssets('details.exif.software')} value={exif.software} />}
              </dl>
            </section>
          )}

          {/* Lineage (versions) */}
          {isImage(asset) && (
            <section>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h4 className="text-sm font-semibold text-fg">{tAssets('lineage.title')}</h4>
                {lineage && <span className="font-mono text-xs text-subtle">{tAssets('lineage.summary', { count: lineage.relatives.length })}</span>}
              </div>
              {loadingLineage ? (
                <p className="text-sm text-muted">{tAssets('lineage.loading')}</p>
              ) : lineage && lineage.relatives.length > 0 ? (
                <ul className="divide-y divide-line rounded-card border bg-surface">
                  {lineage.relatives.map((relative) => (
                    <li key={relative.id}>
                      <button
                        type="button"
                        onClick={() => handleOpenRelatedAsset(String(relative.id))}
                        disabled={loadingRelatedAssetId === String(relative.id)}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {relative.thumbnail_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={relative.thumbnail_url} alt={relative.name} className="h-10 w-10 rounded-thumb bg-sunken object-cover" />
                        ) : (
                          <span className="flex h-10 w-10 items-center justify-center rounded-thumb bg-sunken">
                            <PhotoIcon className="h-5 w-5 text-subtle" aria-hidden />
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-fg">{relative.name}</span>
                          <span className="block font-mono text-xs text-subtle">
                            {tAssets(`lineage.relations.${relative.relation}`)} · {formatDate(relative.created_at)}
                          </span>
                        </span>
                        <span className="text-xs text-accent-text">
                          {loadingRelatedAssetId === String(relative.id) ? tAssets('lineage.opening') : tAssets('lineage.open')}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">{tAssets('lineage.none')}</p>
              )}
            </section>
          )}
        </div>
      </Modal>

      {fullScreenUrl && (
        <Modal bare title={attrs.name} onClose={() => setFullScreenUrl(null)}>
          <div className="flex h-full w-full items-center justify-center bg-sunken p-4" onClick={(e) => e.target === e.currentTarget && setFullScreenUrl(null)}>
            {isVideo(asset) ? (
              <video controls autoPlay preload="metadata" className="max-h-[88vh] max-w-full object-contain">
                <source src={withStreamToken(fullScreenUrl)} type={attrs.file_type} />
                {tAssets('viewer.videoNotSupported')}
              </video>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fullScreenUrl} alt={tAssets('viewer.fullSizePreviewAlt')} className="max-h-[88vh] max-w-full object-contain" />
            )}
            <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-scrim px-4 py-2 text-sm text-on-scrim">
              {tAssets('viewer.closeHint')}
            </div>
          </div>
        </Modal>
      )}

      {showPosterFrameSelector && (
        <PosterFrameSelector asset={asset} onClose={() => setShowPosterFrameSelector(false)} onGenerated={handlePosterFrameGenerated} />
      )}

      {isImage(asset) && (
        <ImageEditorModal
          asset={asset}
          isOpen={showImageEditor}
          isSaving={savingDerivative}
          onClose={() => setShowImageEditor(false)}
          onSave={handleSaveImageDerivative}
        />
      )}
    </>
  )
}

function ExifRow({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`min-w-0 ${wide ? 'col-span-2' : ''}`}>
      <dt className="text-xs text-subtle">{label}</dt>
      <dd className="break-words font-mono text-sm tabular-nums text-fg">{value}</dd>
    </div>
  )
}
