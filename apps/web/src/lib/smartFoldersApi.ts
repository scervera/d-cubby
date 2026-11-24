import { api } from './api';
import { API_ENDPOINTS } from './config';

export interface SmartFolder {
  id: number;
  name: string;
  description: string | null;
  tag_criteria: string;
  tag_names: string[];
  active: boolean;
  sort_order: number;
  asset_count: number;
  visibility_level: 'personal' | 'group' | 'global';
  match_logic: 'any' | 'all';
  color: string;
  pinned_to_sidebar: boolean;
  shared_user_ids: number[];
  group_id: number | null;
  created_at: string;
  updated_at: string;
}

/** A smart folder as the API returns it (JSON:API resource). */
interface SmartFolderResource {
  id: number;
  attributes: Omit<SmartFolder, 'id'>;
}

export interface CreateSmartFolderData {
  name: string;
  description?: string;
  tag_criteria: string;
  active?: boolean;
  sort_order?: number;
  visibility_level?: 'personal' | 'group' | 'global';
  match_logic?: 'any' | 'all';
  color?: string;
  pinned_to_sidebar?: boolean;
  shared_user_ids?: number[];
  group_id?: number | null;
}

export interface UpdateSmartFolderData {
  name?: string;
  description?: string;
  tag_criteria?: string;
  active?: boolean;
  sort_order?: number;
  visibility_level?: 'personal' | 'group' | 'global';
  match_logic?: 'any' | 'all';
  color?: string;
  pinned_to_sidebar?: boolean;
  shared_user_ids?: number[];
  group_id?: number | null;
}

export const smartFoldersApi = {
  // Get all smart folders
  getAll: async (): Promise<SmartFolder[]> => {
    const response = await api.get(API_ENDPOINTS.SMART_FOLDERS.LIST);
    return response.data.data.map((item: SmartFolderResource) => ({
      id: item.id,
      name: item.attributes.name,
      description: item.attributes.description,
      tag_criteria: item.attributes.tag_criteria,
      tag_names: item.attributes.tag_names,
      active: item.attributes.active,
      sort_order: item.attributes.sort_order,
      asset_count: item.attributes.asset_count,
      visibility_level: item.attributes.visibility_level,
      match_logic: item.attributes.match_logic,
      color: item.attributes.color,
      pinned_to_sidebar: item.attributes.pinned_to_sidebar,
      shared_user_ids: item.attributes.shared_user_ids || [],
      group_id: item.attributes.group_id,
      created_at: item.attributes.created_at,
      updated_at: item.attributes.updated_at
    }));
  },

  // Get smart folders for sidebar (limited to 5)
  getSidebar: async (): Promise<SmartFolder[]> => {
    const response = await api.get(API_ENDPOINTS.SMART_FOLDERS.SIDEBAR);
    return response.data.data.map((item: SmartFolderResource) => ({
      id: item.id,
      name: item.attributes.name,
      description: item.attributes.description,
      tag_criteria: item.attributes.tag_criteria,
      tag_names: item.attributes.tag_names,
      active: item.attributes.active,
      sort_order: item.attributes.sort_order,
      asset_count: item.attributes.asset_count,
      visibility_level: item.attributes.visibility_level,
      match_logic: item.attributes.match_logic,
      color: item.attributes.color,
      pinned_to_sidebar: item.attributes.pinned_to_sidebar,
      shared_user_ids: item.attributes.shared_user_ids || [],
      group_id: item.attributes.group_id,
      created_at: item.attributes.created_at,
      updated_at: item.attributes.updated_at
    }));
  },

  // Get a specific smart folder
  getById: async (id: number): Promise<SmartFolder> => {
    const response = await api.get(`/smart_folders/${id}`);
    const item = response.data.data;
    return {
      id: item.id,
      name: item.attributes.name,
      description: item.attributes.description,
      tag_criteria: item.attributes.tag_criteria,
      tag_names: item.attributes.tag_names,
      active: item.attributes.active,
      sort_order: item.attributes.sort_order,
      asset_count: item.attributes.asset_count,
      visibility_level: item.attributes.visibility_level,
      match_logic: item.attributes.match_logic,
      color: item.attributes.color,
      pinned_to_sidebar: item.attributes.pinned_to_sidebar,
      shared_user_ids: item.attributes.shared_user_ids || [],
      group_id: item.attributes.group_id,
      created_at: item.attributes.created_at,
      updated_at: item.attributes.updated_at
    };
  },

  // Create a new smart folder
  create: async (data: CreateSmartFolderData): Promise<SmartFolder> => {
    const response = await api.post(API_ENDPOINTS.SMART_FOLDERS.CREATE, { smart_folder: data });
    const item = response.data.data;
    return {
      id: item.id,
      name: item.attributes.name,
      description: item.attributes.description,
      tag_criteria: item.attributes.tag_criteria,
      tag_names: item.attributes.tag_names,
      active: item.attributes.active,
      sort_order: item.attributes.sort_order,
      asset_count: item.attributes.asset_count,
      visibility_level: item.attributes.visibility_level,
      match_logic: item.attributes.match_logic,
      color: item.attributes.color,
      pinned_to_sidebar: item.attributes.pinned_to_sidebar,
      shared_user_ids: item.attributes.shared_user_ids || [],
      group_id: item.attributes.group_id,
      created_at: item.attributes.created_at,
      updated_at: item.attributes.updated_at
    };
  },

  // Update a smart folder
  update: async (id: number, data: UpdateSmartFolderData): Promise<SmartFolder> => {
    const response = await api.patch(`/smart_folders/${id}`, { smart_folder: data });
    const item = response.data.data;
    return {
      id: item.id,
      name: item.attributes.name,
      description: item.attributes.description,
      tag_criteria: item.attributes.tag_criteria,
      tag_names: item.attributes.tag_names,
      active: item.attributes.active,
      sort_order: item.attributes.sort_order,
      asset_count: item.attributes.asset_count,
      visibility_level: item.attributes.visibility_level,
      match_logic: item.attributes.match_logic,
      color: item.attributes.color,
      pinned_to_sidebar: item.attributes.pinned_to_sidebar,
      shared_user_ids: item.attributes.shared_user_ids || [],
      group_id: item.attributes.group_id,
      created_at: item.attributes.created_at,
      updated_at: item.attributes.updated_at
    };
  },

  // Delete a smart folder
  delete: async (id: number): Promise<void> => {
    await api.delete(`/smart_folders/${id}`);
  },

  // Pin a smart folder to sidebar
  pin: async (id: number): Promise<SmartFolder> => {
    const response = await api.post(`/smart_folders/${id}/pin`);
    const item = response.data.data;
    return {
      id: item.id,
      name: item.attributes.name,
      description: item.attributes.description,
      tag_criteria: item.attributes.tag_criteria,
      tag_names: item.attributes.tag_names,
      active: item.attributes.active,
      sort_order: item.attributes.sort_order,
      asset_count: item.attributes.asset_count,
      visibility_level: item.attributes.visibility_level,
      match_logic: item.attributes.match_logic,
      color: item.attributes.color,
      pinned_to_sidebar: item.attributes.pinned_to_sidebar,
      shared_user_ids: item.attributes.shared_user_ids || [],
      group_id: item.attributes.group_id,
      created_at: item.attributes.created_at,
      updated_at: item.attributes.updated_at
    };
  },

  // Unpin a smart folder from sidebar
  unpin: async (id: number): Promise<SmartFolder> => {
    const response = await api.post(`/smart_folders/${id}/unpin`);
    const item = response.data.data;
    return {
      id: item.id,
      name: item.attributes.name,
      description: item.attributes.description,
      tag_criteria: item.attributes.tag_criteria,
      tag_names: item.attributes.tag_names,
      active: item.attributes.active,
      sort_order: item.attributes.sort_order,
      asset_count: item.attributes.asset_count,
      visibility_level: item.attributes.visibility_level,
      match_logic: item.attributes.match_logic,
      color: item.attributes.color,
      pinned_to_sidebar: item.attributes.pinned_to_sidebar,
      shared_user_ids: item.attributes.shared_user_ids || [],
      group_id: item.attributes.group_id,
      created_at: item.attributes.created_at,
      updated_at: item.attributes.updated_at
    };
  },

  // Get assets for a smart folder
  getAssets: async (id: number): Promise<unknown> => {
    const response = await api.get(API_ENDPOINTS.SMART_FOLDERS.ASSETS(id));
    return response.data;
  },
};
