/**
 * Asset shapes returned by the dam gem's API. List endpoints (GET /assets, smart folder
 * assets, add_tag/remove_tag) return JSON:API-style resources ({ id, type, attributes,
 * relationships }) with tags in `included`; GET /assets/:id returns a flat hash, which
 * extractAssetFromApiPayload normalizes into the same Asset shape.
 */

/** A tag: flat ({ id, name }) or a JSON:API resource ({ id, attributes: { name } }). */
export interface Tag {
  id: string | number
  type?: string
  name?: string
  attributes?: {
    name: string
    created_at?: string
    updated_at?: string
    asset_count?: number
  }
}

export interface ExifData {
  camera_make?: string
  camera_model?: string
  lens_model?: string
  aperture?: number
  shutter_speed?: number
  iso?: number
  focal_length?: number
  flash?: number
  white_balance?: number
  metering_mode?: number
  exposure_mode?: number
  date_taken?: string
  date_digitized?: string
  gps_latitude?: number
  gps_longitude?: number
  gps_altitude?: number
  software?: string
  artist?: string
  copyright?: string
  x_resolution?: number
  y_resolution?: number
  resolution_unit?: number
}

export interface Dimensions {
  width: number
  height: number
}

export interface AssetAttributes {
  name: string
  /** MIME type. */
  file_type: string
  file_size: number
  created_at: string
  user_id?: number | null
  thumbnail_url?: string
  file_url?: string
  preview_url?: string
  /** GET /assets/:id/stream (absolute URL); needs ?token= for <video>. */
  download_url?: string
  poster_frame_url?: string
  parent_asset_id?: string | null
  lineage_id?: string | null
  derivative_kind?: string | null
  is_derivative?: boolean
  image_dimensions?: Dimensions
  video_dimensions?: Dimensions
  exif_data?: ExifData
  deleted_at?: string | null
  purge_after?: string | null
}

export interface Asset {
  id: string
  type: string
  attributes: AssetAttributes
  relationships?: {
    tags?: { data: Tag[] | null } | null
    /** The uploader (list and tag endpoints); attributes.user_id is not always present. */
    user?: { data: { id: number | string } | null } | null
  }
  /** Tags inline (some responses). */
  tags?: Tag[]
  /** JSON:API `included` from the response the asset came from (tag objects). */
  included?: unknown[]
}

/** Library categories shown in the sidebar and filters. */
export type AssetCategory = 'all' | 'image' | 'video' | 'audio' | 'document'

export const ASSET_CATEGORIES: AssetCategory[] = ['all', 'image', 'video', 'audio', 'document']

export function isAssetCategory(value: unknown): value is AssetCategory {
  return typeof value === 'string' && (ASSET_CATEGORIES as string[]).includes(value)
}
