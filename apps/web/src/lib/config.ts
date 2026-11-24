/**
 * API endpoints, relative to the api client's base URL (/api/v1). Never prefix them with
 * /api/v1 again.
 */
export const API_ENDPOINTS = {
  // Host app (D-cubby)
  CONFIG: '/config',
  SETUP: '/setup',
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    FORGOT_PASSWORD: '/auth/password/forgot',
    RESET_PASSWORD: '/auth/password/reset',
    ACCEPT_INVITATION: '/auth/invitation/accept',
  },
  USERS: {
    ME: '/users/me',
    LIST: '/users',
    CREATE: '/users',
    UPDATE: (id: number | string) => `/users/${id}`,
    RESET_PASSWORD: (id: number | string) => `/users/${id}/reset_password`,
  },
  ORGANIZATION: '/organization',
  DASHBOARD_STATS: '/dashboard/stats',
  SYSTEM: {
    STATUS: '/system/status',
    CHECK: (name: string) => `/system/checks/${name}`,
  },

  // DAM (the dam gem)
  ASSETS: {
    LIST: '/assets',
    CREATE: '/assets',
    SHOW: (id: string | number) => `/assets/${id}`,
    UPDATE: (id: string | number) => `/assets/${id}`,
    DELETE: (id: string | number) => `/assets/${id}`,
    RECYCLE_BIN: '/assets/recycle_bin',
    RESTORE: (id: string | number) => `/assets/${id}/restore`,
    PURGE: (id: string | number) => `/assets/${id}/purge`,
    ADD_TAG: (id: string | number) => `/assets/${id}/add_tag`,
    REMOVE_TAG: (id: string | number) => `/assets/${id}/remove_tag`,
    AUTO_TAG: (id: string | number) => `/assets/${id}/auto_tag`,
    DETECT_FACES: (id: string | number) => `/assets/${id}/detect_faces`,
    FACES: (id: string | number) => `/assets/${id}/faces`,
    SEARCH: '/assets/search',
    DERIVATIVES: (id: string | number) => `/assets/${id}/derivatives`,
    LINEAGE: (id: string | number) => `/assets/${id}/lineage`,
    STREAM: (id: string | number) => `/assets/${id}/stream`,
    POSTER_FRAME: (id: string | number) => `/assets/${id}/generate_poster_frame`,
  },
  COLLECTIONS: {
    LIST: '/collections',
    CREATE: '/collections',
    SHOW: (id: string | number) => `/collections/${id}`,
    UPDATE: (id: string | number) => `/collections/${id}`,
    DELETE: (id: string | number) => `/collections/${id}`,
    ADD_ASSET: (id: string | number) => `/collections/${id}/add_asset`,
    REMOVE_ASSET: (id: string | number) => `/collections/${id}/remove_asset`,
    PUBLIC: '/collections/public_collections',
  },
  WATCHED_FOLDERS: {
    LIST: '/watched_folders',
    CREATE: '/watched_folders',
    SHOW: (id: string | number) => `/watched_folders/${id}`,
    UPDATE: (id: string | number) => `/watched_folders/${id}`,
    DELETE: (id: string | number) => `/watched_folders/${id}`,
    SCAN_NOW: (id: string | number) => `/watched_folders/${id}/scan_now`,
    SCAN_HISTORY: (id: string | number) => `/watched_folders/${id}/scan_history`,
    NOTIFICATIONS: (id: string | number) => `/watched_folders/${id}/notifications`,
  },
  SMART_FOLDERS: {
    LIST: '/smart_folders',
    CREATE: '/smart_folders',
    SHOW: (id: string | number) => `/smart_folders/${id}`,
    UPDATE: (id: string | number) => `/smart_folders/${id}`,
    DELETE: (id: string | number) => `/smart_folders/${id}`,
    ASSETS: (id: string | number) => `/smart_folders/${id}/assets`,
    PIN: (id: string | number) => `/smart_folders/${id}/pin`,
    UNPIN: (id: string | number) => `/smart_folders/${id}/unpin`,
    SIDEBAR: '/smart_folders/sidebar',
  },
  FACE_PEOPLE: {
    LIST: '/face_people',
    CREATE: '/face_people',
    SHOW: (id: string | number) => `/face_people/${id}`,
    UPDATE: (id: string | number) => `/face_people/${id}`,
    DELETE: (id: string | number) => `/face_people/${id}`,
  },
  FACE_DETECTIONS: {
    IDENTIFY: (id: string | number) => `/face_detections/${id}/identify`,
  },
  TAGS: {
    LIST: '/tags',
    CREATE: '/tags',
    SHOW: (id: string | number) => `/tags/${id}`,
    UPDATE: (id: string | number) => `/tags/${id}`,
    DELETE: (id: string | number) => `/tags/${id}`,
    POPULAR: '/tags/popular',
    SEARCH: '/tags/search',
  },
  GROUPS: {
    LIST: '/groups',
    CREATE: '/groups',
    SHOW: (id: string | number) => `/groups/${id}`,
    UPDATE: (id: string | number) => `/groups/${id}`,
    DELETE: (id: string | number) => `/groups/${id}`,
    ADD_MEMBER: (id: string | number) => `/groups/${id}/add_member`,
    REMOVE_MEMBER: (id: string | number) => `/groups/${id}/remove_member`,
  },
  DROP_ZONES: {
    LIST: '/drop_zones',
    CREATE: '/drop_zones',
    SHOW: (id: string | number) => `/drop_zones/${id}`,
    UPDATE: (id: string | number) => `/drop_zones/${id}`,
    DELETE: (id: string | number) => `/drop_zones/${id}`,
    SUBSCRIBE: (id: string | number) => `/drop_zones/${id}/subscribe`,
    UNSUBSCRIBE: (id: string | number) => `/drop_zones/${id}/unsubscribe`,
    FILES: (id: string | number) => `/drop_zones/${id}/files`,
    UPLOAD: (id: string | number) => `/drop_zones/${id}/upload`,
  },
} as const

export interface AssetListFilters {
  search: string
  category: string
  tagIds?: number[]
}

/** Asset list URL for the current context (all assets, a drop zone or a smart folder). */
export const buildContextualAssetUrl = (
  context: { type: 'all' | 'drop_zone' | 'smart_folder'; id?: string },
  filters: AssetListFilters,
  pagination?: { page: number; per_page: number },
): string => {
  let baseUrl: string = API_ENDPOINTS.ASSETS.LIST
  if (context.type === 'drop_zone' && context.id) baseUrl = API_ENDPOINTS.DROP_ZONES.FILES(context.id)
  if (context.type === 'smart_folder' && context.id) baseUrl = API_ENDPOINTS.SMART_FOLDERS.ASSETS(context.id)

  const params = new URLSearchParams()
  if (filters.search.trim()) params.append('q', filters.search.trim())
  if (filters.category && filters.category !== 'all') params.append('category', filters.category)
  filters.tagIds?.forEach((id) => params.append('tag_ids[]', String(id)))
  if (pagination) {
    params.append('page', String(pagination.page))
    params.append('per_page', String(pagination.per_page))
  }
  return params.toString() ? `${baseUrl}?${params}` : baseUrl
}
