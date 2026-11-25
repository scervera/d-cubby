import { api } from './api'
import { API_ENDPOINTS } from './config'

/** Colour of a new smart folder: the interface accent. Folder colours are user data. */
export const DEFAULT_SMART_FOLDER_COLOR = '#2460DB' // palette-ok

export type SmartFolderVisibility = 'personal' | 'group' | 'global'

export interface SmartFolder {
  id: number
  name: string
  description: string | null
  tag_criteria: string
  tag_names: string[]
  active: boolean
  sort_order: number
  asset_count: number
  visibility_level: SmartFolderVisibility
  match_logic: 'any' | 'all'
  color: string
  pinned_to_sidebar: boolean
  shared_user_ids: number[]
  group_id: number | null
  user_id: number | null
  created_at: string
  updated_at: string
}

export interface CreateSmartFolderData {
  name: string
  description?: string
  tag_criteria: string
  active?: boolean
  sort_order?: number
  visibility_level?: SmartFolderVisibility
  match_logic?: 'any' | 'all'
  color?: string
  pinned_to_sidebar?: boolean
  shared_user_ids?: number[]
  group_id?: number | null
}

export type UpdateSmartFolderData = Partial<CreateSmartFolderData>

/** A smart folder as the API returns it: `{ id, attributes: {...} }`. */
interface SmartFolderResource {
  id: number
  attributes: Omit<SmartFolder, 'id'>
}

function toSmartFolder(item: SmartFolderResource): SmartFolder {
  const a = item.attributes
  return {
    id: item.id,
    name: a.name,
    description: a.description,
    tag_criteria: a.tag_criteria,
    tag_names: a.tag_names || [],
    active: a.active,
    sort_order: a.sort_order,
    asset_count: a.asset_count ?? 0,
    visibility_level: a.visibility_level,
    match_logic: a.match_logic,
    color: a.color,
    pinned_to_sidebar: !!a.pinned_to_sidebar,
    shared_user_ids: a.shared_user_ids || [],
    group_id: a.group_id ?? null,
    user_id: a.user_id ?? null,
    created_at: a.created_at,
    updated_at: a.updated_at,
  }
}

export const smartFoldersApi = {
  getAll: async (): Promise<SmartFolder[]> => {
    const response = await api.get(API_ENDPOINTS.SMART_FOLDERS.LIST)
    return (response.data.data as SmartFolderResource[]).map(toSmartFolder)
  },

  /**
   * Folders pinned to the sidebar. (The API's /smart_folders/sidebar returns the five most
   * recently updated folders, not the pinned ones, so filter the full list instead.)
   */
  getSidebar: async (): Promise<SmartFolder[]> => {
    const folders = await smartFoldersApi.getAll()
    return folders.filter((folder) => folder.pinned_to_sidebar)
  },

  getById: async (id: number): Promise<SmartFolder> => {
    const response = await api.get(API_ENDPOINTS.SMART_FOLDERS.SHOW(id))
    return toSmartFolder(response.data.data)
  },

  create: async (data: CreateSmartFolderData): Promise<SmartFolder> => {
    const response = await api.post(API_ENDPOINTS.SMART_FOLDERS.CREATE, { smart_folder: data })
    return toSmartFolder(response.data.data)
  },

  update: async (id: number, data: UpdateSmartFolderData): Promise<SmartFolder> => {
    const response = await api.patch(API_ENDPOINTS.SMART_FOLDERS.UPDATE(id), { smart_folder: data })
    return toSmartFolder(response.data.data)
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(API_ENDPOINTS.SMART_FOLDERS.DELETE(id))
  },

  pin: async (id: number): Promise<SmartFolder> => {
    const response = await api.post(API_ENDPOINTS.SMART_FOLDERS.PIN(id))
    return toSmartFolder(response.data.data)
  },

  unpin: async (id: number): Promise<SmartFolder> => {
    const response = await api.post(API_ENDPOINTS.SMART_FOLDERS.UNPIN(id))
    return toSmartFolder(response.data.data)
  },

  getAssets: async (id: number): Promise<unknown> => {
    const response = await api.get(API_ENDPOINTS.SMART_FOLDERS.ASSETS(id))
    return response.data
  },
}
