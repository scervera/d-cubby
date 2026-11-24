import { api } from './api'
import { API_ENDPOINTS } from './config'

export type ScanFrequencyUnit = 'minutes' | 'hours' | 'days'

export interface WatchedFolder {
  id: number
  name: string
  path: string
  scan_frequency_value: number
  scan_frequency_unit: ScanFrequencyUnit
  scan_frequency_display: string
  active: boolean
  max_file_size_bytes: number
  max_file_size_display: string
  auto_tags: string | null
  auto_tag_names: string[]
  last_scanned_at: string | null
  next_scan_at: string | null
  total_files_found: number
  total_files_processed: number
  total_errors: number
  unread_notifications_count: number
  /** Active, and the path exists and is readable inside the API container. */
  can_scan: boolean
  created_at: string
  updated_at: string
}

export interface FolderScan {
  id: number
  started_at: string
  completed_at: string | null
  files_found: number
  files_processed: number
  files_skipped: number
  errors_count: number
  status: 'running' | 'completed' | 'failed'
  duration: number | null
  error_details: string | null
}

export interface WatchFolderNotification {
  id: number
  type: string
  title: string
  message: string
  file_path: string | null
  status: 'unread' | 'read' | 'dismissed'
  time_ago: string
  created_at: string
}

export interface WatchedFolderInput {
  name: string
  path: string
  scan_frequency_value: number
  scan_frequency_unit: ScanFrequencyUnit
  max_file_size_bytes: number
  auto_tags: string
  active: boolean
}

/** Validation errors come back as `{ errors: [...] }`; other failures as `{ error }`. */
export function watchedFolderErrors(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data
  return data?.errors?.join(', ') || data?.error || fallback
}

export const watchedFoldersApi = {
  list: async (): Promise<WatchedFolder[]> => {
    const { data } = await api.get<WatchedFolder[]>(API_ENDPOINTS.WATCHED_FOLDERS.LIST)
    return data
  },

  create: async (input: WatchedFolderInput): Promise<WatchedFolder> => {
    const { data } = await api.post<WatchedFolder>(API_ENDPOINTS.WATCHED_FOLDERS.CREATE, { watched_folder: input })
    return data
  },

  update: async (id: number, input: Partial<WatchedFolderInput>): Promise<WatchedFolder> => {
    const { data } = await api.patch<WatchedFolder>(API_ENDPOINTS.WATCHED_FOLDERS.UPDATE(id), { watched_folder: input })
    return data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(API_ENDPOINTS.WATCHED_FOLDERS.DELETE(id))
  },

  scanNow: async (id: number): Promise<{ message: string }> => {
    const { data } = await api.post<{ message: string }>(API_ENDPOINTS.WATCHED_FOLDERS.SCAN_NOW(id))
    return data
  },

  scanHistory: async (id: number): Promise<FolderScan[]> => {
    const { data } = await api.get<unknown>(API_ENDPOINTS.WATCHED_FOLDERS.SCAN_HISTORY(id))
    return Array.isArray(data) ? (data as FolderScan[]) : []
  },

  notifications: async (id: number): Promise<{ notifications: WatchFolderNotification[]; unread_count: number }> => {
    const { data } = await api.get(API_ENDPOINTS.WATCHED_FOLDERS.NOTIFICATIONS(id))
    return data
  },
}
