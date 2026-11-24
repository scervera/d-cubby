import { api } from './api'
import { API_ENDPOINTS } from './config'

export interface GroupMember {
  id: number
  email: string
}

export interface Group {
  id: number
  name: string
  description: string | null
  active: boolean
  member_count: number
  owner_id: number | null
  members: GroupMember[]
  created_at: string
  updated_at: string
}

/** A person in the organization, for pickers (GET /users). */
export interface OrgUser {
  id: number
  name: string
  email: string
}

export interface GroupInput {
  name: string
  description?: string
  active?: boolean
}

interface JsonApiResource<T> {
  id: string | number
  type: string
  attributes: T
  relationships?: { members?: { data: { id: string | number }[] } }
}

interface JsonApiDocument<T> {
  data: JsonApiResource<T> | JsonApiResource<T>[]
  included?: JsonApiResource<{ email: string }>[]
}

type GroupAttributes = Omit<Group, 'id' | 'members'>

function toGroup(resource: JsonApiResource<GroupAttributes>, included: JsonApiDocument<GroupAttributes>['included']): Group {
  const memberIds = resource.relationships?.members?.data?.map((m) => String(m.id)) ?? []
  const members = (included ?? [])
    .filter((item) => item.type === 'user' && memberIds.includes(String(item.id)))
    .map((item) => ({ id: Number(item.id), email: item.attributes.email }))
  const a = resource.attributes
  return {
    id: Number(resource.id),
    name: a.name,
    description: a.description ?? null,
    active: a.active,
    member_count: a.member_count ?? members.length,
    owner_id: a.owner_id ?? null,
    members,
    created_at: a.created_at,
    updated_at: a.updated_at,
  }
}

function toGroups(doc: JsonApiDocument<GroupAttributes>): Group[] {
  const data = Array.isArray(doc.data) ? doc.data : [doc.data]
  return data.map((resource) => toGroup(resource, doc.included))
}

export const groupsApi = {
  list: async (): Promise<Group[]> => {
    const { data } = await api.get<JsonApiDocument<GroupAttributes>>(API_ENDPOINTS.GROUPS.LIST)
    return toGroups(data)
  },

  /** One group with its members. */
  get: async (id: number): Promise<Group> => {
    const { data } = await api.get<JsonApiDocument<GroupAttributes>>(API_ENDPOINTS.GROUPS.SHOW(id))
    return toGroups(data)[0]
  },

  create: async (input: GroupInput): Promise<Group> => {
    const { data } = await api.post<JsonApiDocument<GroupAttributes>>(API_ENDPOINTS.GROUPS.CREATE, { group: input })
    return toGroups(data)[0]
  },

  update: async (id: number, input: Partial<GroupInput>): Promise<Group> => {
    const { data } = await api.patch<JsonApiDocument<GroupAttributes>>(API_ENDPOINTS.GROUPS.UPDATE(id), { group: input })
    return toGroups(data)[0]
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(API_ENDPOINTS.GROUPS.DELETE(id))
  },

  addMember: async (id: number, userId: number): Promise<Group> => {
    const { data } = await api.post<JsonApiDocument<GroupAttributes>>(API_ENDPOINTS.GROUPS.ADD_MEMBER(id), { user_id: userId })
    return toGroups(data)[0]
  },

  removeMember: async (id: number, userId: number): Promise<Group> => {
    const { data } = await api.delete<JsonApiDocument<GroupAttributes>>(API_ENDPOINTS.GROUPS.REMOVE_MEMBER(id), {
      params: { user_id: userId },
    })
    return toGroups(data)[0]
  },
}

/** Active people in the organization (GET /users), for member and sharing pickers. */
export async function listOrgUsers(): Promise<OrgUser[]> {
  const { data } = await api.get<{ users: (OrgUser & { disabled?: boolean })[] }>(API_ENDPOINTS.USERS.LIST)
  return data.users.filter((u) => !u.disabled).map(({ id, name, email }) => ({ id, name, email }))
}
