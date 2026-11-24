import { describe, expect, it } from 'vitest'

import { fetchDamAssetPreviewUrl, getDamAssetPreviewUrl } from './damAssetPreview'

describe('damAssetPreview', () => {
  it('reads file_url from a JSON:API asset response', () => {
    expect(getDamAssetPreviewUrl({ data: { data: { attributes: { file_url: '/f.png', thumbnail_url: '/t.jpg' } } } })).toBe('/f.png')
  })

  it('falls back to preview and thumbnail URLs', () => {
    expect(getDamAssetPreviewUrl({ data: { data: { attributes: { thumbnail_url: '/t.jpg' } } } })).toBe('/t.jpg')
    expect(getDamAssetPreviewUrl({ data: {} })).toBeNull()
  })

  it('returns null without an id or when the fetch fails', async () => {
    expect(await fetchDamAssetPreviewUrl(null, async () => ({}))).toBeNull()
    expect(await fetchDamAssetPreviewUrl(1, async () => { throw new Error('nope') })).toBeNull()
  })
})
