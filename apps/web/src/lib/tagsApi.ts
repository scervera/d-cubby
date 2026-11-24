import { api } from './api'
import { API_ENDPOINTS } from './config'

export interface Tag {
  id: number
  name: string
  created_at?: string
  updated_at?: string
}

interface TagPage {
  data: Tag[]
  meta?: { total_pages?: number }
}

export const tagsApi = {
  /** Every tag in the organization, alphabetically (the API pages them). */
  listAll: async (): Promise<Tag[]> => {
    const tags: Tag[] = []
    let page = 1
    let totalPages = 1
    do {
      const { data } = await api.get<TagPage>(API_ENDPOINTS.TAGS.LIST, { params: { page, per_page: 100 } })
      tags.push(...(data.data ?? []))
      totalPages = data.meta?.total_pages ?? 1
      page += 1
    } while (page <= totalPages)
    return tags
  },

  /** Creates the tag, or returns the existing one with that name (names are lowercased). */
  create: async (name: string): Promise<Tag> => {
    const { data } = await api.post<Tag | { data: Tag }>(API_ENDPOINTS.TAGS.CREATE, { tag: { name } })
    return 'data' in data ? data.data : data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(API_ENDPOINTS.TAGS.DELETE(id))
  },
}
