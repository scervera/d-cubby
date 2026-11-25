import { request, type APIRequestContext } from '@playwright/test'

import { SAMPLE_FILES } from './fixtures'

/**
 * Signs in and adds sample data for the screenshot run. Everything it creates is named
 * "shots-…" and is created only when missing, so it is safe to run again and again.
 */

const BASE_URL = process.env.SHOTS_BASE_URL || 'http://localhost:4080'

interface Resource {
  id: string | number
  name?: string
  attributes?: { name?: string }
}

const nameOf = (r: Resource) => r.attributes?.name ?? r.name ?? ''

async function list(api: APIRequestContext, path: string, key = 'data'): Promise<Resource[]> {
  const response = await api.get(path)
  if (!response.ok()) return []
  const body = await response.json()
  return (body?.[key] ?? []) as Resource[]
}

async function token(): Promise<string> {
  if (process.env.SHOTS_TOKEN) return process.env.SHOTS_TOKEN
  const { SHOTS_EMAIL: email, SHOTS_PASSWORD: password } = process.env
  if (!email || !password) {
    throw new Error(
      'Set SHOTS_TOKEN, or SHOTS_EMAIL and SHOTS_PASSWORD, for an owner or admin account. In development: ' +
        `SHOTS_TOKEN=$(cd ../api && bin/rails runner 'puts AuthToken.issue(User.find_by(role: "owner"))')`,
    )
  }
  const anonymous = await request.newContext({ baseURL: BASE_URL })
  const response = await anonymous.post('/api/v1/auth/login', { data: { email, password } })
  if (!response.ok()) throw new Error(`Sign-in failed (${response.status()})`)
  const body = await response.json()
  await anonymous.dispose()
  return (body.token ?? body.data?.token) as string
}

async function seed(api: APIRequestContext) {
  const existing = new Set((await list(api, '/api/v1/assets?q=shots-&per_page=100')).map(nameOf))
  const deleted = new Set((await list(api, '/api/v1/assets/recycle_bin?per_page=100')).map(nameOf))

  for (const file of SAMPLE_FILES) {
    if (existing.has(file.name) || deleted.has(file.name)) continue
    const form = new FormData()
    form.append('asset[file]', new File([new Uint8Array(file.build())], file.filename, { type: file.mimeType }))
    form.append('asset[name]', file.name)
    form.append('asset[description]', 'Sample file for interface screenshots')
    for (const tag of file.tags) form.append('asset[tag_names][]', tag)
    const response = await api.post('/api/v1/assets', { multipart: form })
    if (!response.ok()) {
      console.warn(`seed: ${file.name} was not uploaded (${response.status()})`)
      continue
    }
    if (file.name === 'shots-deleted') {
      const body = await response.json()
      const id = body?.data?.id ?? body?.id
      if (id) await api.delete(`/api/v1/assets/${id}`)
    }
  }

  const folders = (await list(api, '/api/v1/smart_folders')).map(nameOf)
  if (!folders.includes('shots-warm colours')) {
    await api.post('/api/v1/smart_folders', {
      data: { smart_folder: { name: 'shots-warm colours', tag_criteria: 'shots-warm', pinned_to_sidebar: true } },
    })
  }

  const groups = (await list(api, '/api/v1/groups')).map(nameOf)
  if (!groups.includes('shots-design team')) {
    await api.post('/api/v1/groups', {
      data: { group: { name: 'shots-design team', description: 'Sample group for interface screenshots' } },
    })
  }

  const zones = (await list(api, '/api/v1/drop_zones', 'drop_zones')).map(nameOf)
  if (!zones.includes('shots-incoming')) {
    await api.post('/api/v1/drop_zones', {
      data: {
        drop_zone: {
          name: 'shots-incoming',
          description: 'Sample drop zone for interface screenshots',
          preset_tags: ['shots-neutral'],
          accepted_file_types: ['image', 'document'],
          is_active: true,
        },
      },
    })
  }
}

export default async function globalSetup() {
  const authToken = await token()
  process.env.SHOTS_TOKEN = authToken

  const api = await request.newContext({
    baseURL: BASE_URL,
    extraHTTPHeaders: { Authorization: `Bearer ${authToken}`, Accept: 'application/json' },
  })
  const me = await api.get('/api/v1/users/me')
  if (!me.ok()) throw new Error(`The screenshot account could not be loaded (${me.status()}). Is bin/dev running?`)

  if (process.env.SHOTS_SEED !== '0') await seed(api)

  const zones = await list(api, '/api/v1/drop_zones', 'drop_zones')
  process.env.SHOTS_DROP_ZONE_ID = String(zones[0]?.id ?? '')
  await api.dispose()
}
