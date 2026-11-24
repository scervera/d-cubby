import { api } from './api'
import { API_ENDPOINTS } from './config'


export interface ImageDerivativeRequest {
  name?: string
  description?: string
  copy_tags?: boolean
  derivative_kind?: string
  operations: {
    crop?: {
      x: number
      y: number
      width: number
      height: number
    }
    resize?: {
      width: number
      height: number
      mode?: 'limit' | 'fill' | 'exact'
    }
    rotate?: {
      degrees: number
    }
  }
  output?: {
    format?: 'keep' | 'jpg' | 'jpeg' | 'png' | 'webp'
    quality?: number
  }
}

export interface AssetLineageItem {
  id: string
  parent_asset_id?: string | null
  lineage_id: string
  derivative_kind?: string | null
  relation: 'ancestor' | 'sibling' | 'descendant' | 'relative'
  name: string
  file_type?: string | null
  created_at: string
  thumbnail_url?: string | null
  file_url?: string | null
}

export interface AssetLineageResponse {
  lineage_id: string
  root_asset_id: string
  current_asset_id: string
  ancestors: AssetLineageItem[]
  siblings: AssetLineageItem[]
  descendants: AssetLineageItem[]
  relatives: AssetLineageItem[]
}

export interface RecycleBinAsset {
  id: string
  type: string
  attributes: {
    name: string
    file_type?: string
    file_size?: number
    created_at?: string
    thumbnail_url?: string
    preview_url?: string
    deleted_at?: string | null
    purge_after?: string | null
    user_id?: number | null
  }
}

export interface RecycleBinAssetsResponse {
  data: RecycleBinAsset[]
  meta: {
    current_page: number
    total_pages: number
    total_count: number
    per_page: number
    has_next_page?: boolean
    has_prev_page?: boolean
  }
}

export const assetsApi = {
  getRecycleBin: async (params: { page?: number; per_page?: number } = {}): Promise<RecycleBinAssetsResponse> => {
    const response = await api.get(API_ENDPOINTS.ASSETS.RECYCLE_BIN, { params })
    const body = response.data as {
      data?: RecycleBinAsset[]
      meta?: RecycleBinAssetsResponse['meta']
    }
    const assets = body?.data ?? []
    const meta = body?.meta ?? {
      current_page: params.page ?? 1,
      total_pages: 1,
      total_count: assets.length,
      per_page: params.per_page ?? 20,
    }
    return { data: assets, meta }
  },

  restoreAsset: async (assetId: string): Promise<unknown> => {
    const response = await api.post(API_ENDPOINTS.ASSETS.RESTORE(assetId))
    return response.data.data || response.data
  },

  purgeAsset: async (assetId: string): Promise<unknown> => {
    const response = await api.delete(API_ENDPOINTS.ASSETS.PURGE(assetId))
    return response.data.data || response.data
  },

  createImageDerivative: async (assetId: string, payload: ImageDerivativeRequest): Promise<unknown> => {
    const response = await api.post(API_ENDPOINTS.ASSETS.DERIVATIVES(assetId), {
      derivative: payload
    })
    return response.data
  },

  getAssetLineage: async (assetId: string): Promise<AssetLineageResponse> => {
    const response = await api.get(API_ENDPOINTS.ASSETS.LINEAGE(assetId))
    return response.data.data || response.data
  }
}
