import type { AxiosProgressEvent } from 'axios'

import { api } from './api'
import { API_ENDPOINTS } from './config'

export type DropZoneFileType = 'image' | 'video' | 'audio' | 'document'
export const DROP_ZONE_FILE_TYPES: DropZoneFileType[] = ['image', 'video', 'audio', 'document']

export interface DropZone {
  id: number
  name: string
  description: string | null
  owner: { id: number; email: string }
  preset_tags: string[]
  accepted_file_types: DropZoneFileType[]
  is_active: boolean
  settings: Record<string, unknown>
  file_count: number
  subscriber_count: number
  created_at: string
  updated_at: string
}

export interface DropZoneFile {
  id: number
  asset: {
    id: number
    name: string
    filename: string
    file_size: number
    file_size_formatted: string
    content_type: string
    file_type: string
    download_url: string
    thumbnail_url: string | null
  }
  uploaded_by: { id: number; email: string }
  uploaded_at: string
}

export interface DropZoneInput {
  name: string
  description: string
  preset_tags: string[]
  accepted_file_types: DropZoneFileType[]
  is_active: boolean
}

export interface DropZoneFilesPage {
  files: DropZoneFile[]
  meta: { total: number; page: number; per_page: number; total_pages: number }
}

export interface DropZoneUploadResult {
  uploaded_files: DropZoneFile[]
  errors: string[]
}

/** API errors for drop zones come as `{ errors: [...] }` or `{ error: "..." }`. */
export function dropZoneErrors(error: unknown, fallback: string): string[] {
  const data = (error as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data
  if (data?.errors?.length) return data.errors
  if (data?.error) return [data.error]
  return [fallback]
}

export const dropZonesApi = {
  /** Drop zones the current user owns or subscribes to. */
  list: async (): Promise<DropZone[]> => {
    const { data } = await api.get<{ drop_zones: DropZone[] }>(API_ENDPOINTS.DROP_ZONES.LIST)
    return data.drop_zones
  },

  get: async (id: number | string): Promise<DropZone> => {
    try {
      const { data } = await api.get<{ drop_zone: DropZone }>(API_ENDPOINTS.DROP_ZONES.SHOW(id))
      return data.drop_zone
    } catch (error) {
      // dam 0.3.0's show endpoint fails (500) once a drop zone has files, because its file
      // serializer calls a host route the app does not define. The list has the same fields.
      const status = (error as { response?: { status?: number } })?.response?.status
      if (status !== 500) throw error
      const match = (await dropZonesApi.list()).find((dz) => String(dz.id) === String(id))
      if (!match) throw error
      return match
    }
  },

  create: async (input: DropZoneInput): Promise<DropZone> => {
    const { data } = await api.post<{ drop_zone: DropZone }>(API_ENDPOINTS.DROP_ZONES.CREATE, { drop_zone: input })
    return data.drop_zone
  },

  update: async (id: number, input: Partial<DropZoneInput>): Promise<DropZone> => {
    const { data } = await api.patch<{ drop_zone: DropZone }>(API_ENDPOINTS.DROP_ZONES.UPDATE(id), { drop_zone: input })
    return data.drop_zone
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(API_ENDPOINTS.DROP_ZONES.DELETE(id))
  },

  unsubscribe: async (id: number): Promise<void> => {
    await api.delete(API_ENDPOINTS.DROP_ZONES.UNSUBSCRIBE(id))
  },

  files: async (id: number | string, page = 1, perPage = 24): Promise<DropZoneFilesPage> => {
    const { data } = await api.get<DropZoneFilesPage>(API_ENDPOINTS.DROP_ZONES.FILES(id), {
      params: { page, per_page: perPage },
    })
    return data
  },

  /**
   * Uploads one file. The API answers 200 when at least one file was stored and 422 when
   * none was (e.g. a file type the drop zone does not accept).
   */
  upload: async (
    id: number | string,
    file: File,
    onProgress?: (event: AxiosProgressEvent) => void,
  ): Promise<DropZoneUploadResult> => {
    const form = new FormData()
    form.append('file', file)
    const { data } = await api.post<DropZoneUploadResult>(API_ENDPOINTS.DROP_ZONES.UPLOAD(id), form, {
      onUploadProgress: onProgress,
    })
    return { uploaded_files: data.uploaded_files ?? [], errors: data.errors ?? [] }
  },
}

/**
 * Uploads files one after another, reporting overall progress (0-100). Returns how many
 * were stored and the error messages for those that were not.
 */
export async function uploadToDropZone(
  id: number | string,
  files: File[],
  onProgress: (percent: number) => void,
  fallbackError: string,
): Promise<{ uploaded: number; errors: string[] }> {
  let uploaded = 0
  const errors: string[] = []
  for (const [index, file] of files.entries()) {
    try {
      const result = await dropZonesApi.upload(id, file, (event) => {
        if (!event.total) return
        onProgress(Math.round(((index + event.loaded / event.total) / files.length) * 100))
      })
      uploaded += result.uploaded_files.length
      errors.push(...result.errors)
    } catch (error) {
      errors.push(...dropZoneErrors(error, `${file.name}: ${fallbackError}`))
    }
    onProgress(Math.round(((index + 1) / files.length) * 100))
  }
  return { uploaded, errors }
}
