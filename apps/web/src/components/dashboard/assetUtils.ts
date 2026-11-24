import type { ComponentType } from 'react'
import { DocumentIcon, MusicalNoteIcon, PhotoIcon, VideoCameraIcon } from '@heroicons/react/24/outline'

import { getToken } from '@/lib/api'
import type { Asset, AssetAttributes, Dimensions, Tag } from '@/lib/dam/types'

export function isFileType(fileType: string | null | undefined, prefix: string): boolean {
  return fileType?.startsWith(prefix) ?? false
}

export const isImage = (asset: Asset) => isFileType(asset.attributes.file_type, 'image/')
export const isVideo = (asset: Asset) => isFileType(asset.attributes.file_type, 'video/')
export const isAudio = (asset: Asset) => isFileType(asset.attributes.file_type, 'audio/')

export function getFileIcon(fileType: string | null | undefined): ComponentType<{ className?: string }> {
  if (fileType?.startsWith('image/')) return PhotoIcon
  if (fileType?.startsWith('video/')) return VideoCameraIcon
  if (fileType?.startsWith('audio/')) return MusicalNoteIcon
  return DocumentIcon
}

export function getFileTypeColor(fileType: string | null | undefined): string {
  if (!fileType) return 'text-gray-600'
  if (fileType.startsWith('image/')) return 'text-blue-600'
  if (fileType.startsWith('video/')) return 'text-purple-600'
  if (fileType.startsWith('audio/')) return 'text-green-600'
  if (fileType.includes('pdf') || fileType.includes('document')) return 'text-red-600'
  return 'text-gray-600'
}

/** "JPEG", "MP4", ... from a MIME type. */
export function fileTypeLabel(fileType: string | null | undefined, fallback = 'FILE'): string {
  return fileType?.split('/')[1]?.toUpperCase() || fallback
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1)
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

export function formatDate(dateString: string | null | undefined): string {
  return dateString ? new Date(dateString).toLocaleDateString() : ''
}

export function tagName(tag: Tag): string {
  return tag.attributes?.name || tag.name || ''
}

/** The asset's tags, resolving JSON:API references against `included`, deduplicated by id. */
export function getAssetTags(asset: Asset): Tag[] {
  const refs: Tag[] = asset.tags || asset.relationships?.tags?.data || []
  const included = Array.isArray(asset.included) ? (asset.included as Tag[]) : []
  const resolved = refs.map((ref) => {
    if (tagName(ref)) return ref
    const full = included.find(
      (item) => item && String(item.id) === String(ref.id) && (item.type === 'tag' || item.type === 'tags' || item.type == null),
    )
    return full || ref
  })
  return Array.from(new Map(resolved.map((tag) => [String(tag.id), tag])).values())
}

/**
 * A list item with attributes.user_id filled in from relationships.user when the endpoint
 * (e.g. smart folder assets) leaves it out; permission checks compare it to the viewer.
 */
export function withUploaderId(asset: Asset, included?: unknown[]): Asset {
  const uploaderId = asset.attributes.user_id ?? asNumber(asset.relationships?.user?.data?.id) ?? null
  return { ...asset, attributes: { ...asset.attributes, user_id: uploaderId }, included: included ?? asset.included }
}

/** Best URL for viewing an image or video at full size. */
export function fullResolutionUrl(asset: Asset): string | null {
  const a = asset.attributes
  if (isImage(asset)) return a.preview_url || a.thumbnail_url || a.file_url || a.download_url || null
  return a.file_url || a.preview_url || a.download_url || null
}

/**
 * <video>/<audio> can't send an Authorization header, so the stream endpoint takes the
 * token in the query string. Active Storage proxy URLs are signed and need nothing.
 */
export function withStreamToken(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  if (!url.includes('/stream')) return url
  const token = getToken()
  return token ? `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}` : url
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : typeof value === 'number' ? String(value) : undefined

const asNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

function dimensions(value: unknown, width?: unknown, height?: unknown): Dimensions | undefined {
  const w = asNumber(isRecord(value) ? value.width : width)
  const h = asNumber(isRecord(value) ? value.height : height)
  return w && h ? { width: w, height: h } : undefined
}

/**
 * Normalizes an asset from any API response: JSON:API ({ data: { id, attributes } }) or the
 * flat hash GET /assets/:id returns. Keeps `included` so tags resolve.
 */
export function extractAssetFromApiPayload(payload: unknown): Asset | null {
  if (!isRecord(payload)) return null
  const first = isRecord(payload.data) ? payload.data : null
  const second = first && isRecord(first.data) ? first.data : null
  const candidates = [payload, first, second].filter(isRecord)
  const included =
    (Array.isArray(payload.included) && payload.included) ||
    (first && Array.isArray(first.included) && first.included) ||
    undefined

  const resource = candidates.find((entry) => isRecord(entry.attributes) && entry.id != null)
  if (resource) {
    const asset = resource as unknown as Asset
    const uploaderId = asNumber(asset.relationships?.user?.data?.id)
    return {
      ...asset,
      id: String(resource.id),
      attributes: { ...asset.attributes, user_id: asset.attributes.user_id ?? uploaderId ?? null },
      included: included || (resource.included as unknown[]),
    }
  }

  const flat = candidates.find(
    (entry) =>
      entry.id != null &&
      (entry.name !== undefined || entry.file_type !== undefined || entry.content_type !== undefined || entry.file_url !== undefined),
  )
  if (!flat) return null

  const attributes: AssetAttributes = {
    name: asString(flat.name) || '',
    file_type: asString(flat.file_type || flat.content_type) || '',
    file_size: asNumber(flat.file_size) || 0,
    created_at: asString(flat.created_at) || new Date().toISOString(),
    // GET /assets/:id has no user_id, only the serialized uploader.
    user_id: asNumber(flat.user_id) ?? asNumber(isRecord(flat.user) ? flat.user.id : undefined) ?? null,
    thumbnail_url: asString(flat.thumbnail_url),
    file_url: asString(flat.file_url),
    preview_url: asString(flat.preview_url),
    download_url: asString(flat.download_url),
    poster_frame_url: asString(flat.poster_frame_url),
    parent_asset_id: asString(flat.parent_asset_id) || null,
    lineage_id: asString(flat.lineage_id) || null,
    derivative_kind: asString(flat.derivative_kind) || null,
    is_derivative: Boolean(flat.is_derivative || flat.parent_asset_id),
    image_dimensions: dimensions(flat.image_dimensions, flat.image_width, flat.image_height),
    video_dimensions: dimensions(flat.video_dimensions),
    exif_data: isRecord(flat.exif_data) ? (flat.exif_data as AssetAttributes['exif_data']) : undefined,
    deleted_at: asString(flat.deleted_at) || null,
    purge_after: asString(flat.purge_after) || null,
  }

  return {
    id: String(flat.id),
    type: asString(flat.type) || 'asset',
    attributes,
    tags: Array.isArray(flat.tags) ? (flat.tags as Tag[]) : undefined,
    relationships: isRecord(flat.relationships) ? (flat.relationships as Asset['relationships']) : undefined,
    included,
  }
}

export function extractAssetIdFromApiPayload(payload: unknown): string | null {
  if (!isRecord(payload)) return null
  const first = isRecord(payload.data) ? payload.data : null
  const second = first && isRecord(first.data) ? first.data : null
  for (const candidate of [payload, first, second]) {
    if (isRecord(candidate) && candidate.id != null) return String(candidate.id)
  }
  return null
}
