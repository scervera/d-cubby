import { describe, expect, it } from 'vitest'

import type { Asset } from '@/lib/dam/types'
import { extractAssetFromApiPayload, formatFileSize, getAssetTags, withStreamToken, withUploaderId } from './assetUtils'

const base: Asset = { id: '1', type: 'asset', attributes: { name: 'a.png', file_type: 'image/png', file_size: 10, created_at: '2026-01-01' } }

describe('assetUtils', () => {
  it('resolves tag references against included, deduplicated', () => {
    const asset: Asset = {
      ...base,
      relationships: { tags: { data: [{ id: 5, type: 'tag' }, { id: 5, type: 'tag' }] } },
      included: [{ id: 5, type: 'tag', name: 'beach' }],
    }
    expect(getAssetTags(asset).map((t) => t.name)).toEqual(['beach'])
  })

  it('keeps flat tags as they are', () => {
    expect(getAssetTags({ ...base, relationships: { tags: { data: [{ id: 1, name: 'sky' }] } } })[0].name).toBe('sky')
    expect(getAssetTags(base)).toEqual([])
  })

  it('normalizes the flat show payload', () => {
    const asset = extractAssetFromApiPayload({ id: 7, name: 'x.jpg', content_type: 'image/jpeg', image_width: 4, image_height: 3, included: [] })
    expect(asset).toMatchObject({ id: '7', attributes: { name: 'x.jpg', file_type: 'image/jpeg', image_dimensions: { width: 4, height: 3 } } })
  })

  it('takes the uploader id from the serialized user', () => {
    expect(extractAssetFromApiPayload({ id: 1, name: 'a', user: { id: 9, name: 'Ed' } })?.attributes.user_id).toBe(9)
    expect(
      extractAssetFromApiPayload({ data: { id: 2, type: 'asset', attributes: { name: 'b' }, relationships: { user: { data: { id: 4 } } } } })
        ?.attributes.user_id,
    ).toBe(4)
  })

  it('normalizes a JSON:API payload', () => {
    const asset = extractAssetFromApiPayload({ data: { id: 8, type: 'asset', attributes: { name: 'y' } }, included: [{ id: 1 }] })
    expect(asset?.id).toBe('8')
    expect(asset?.included).toHaveLength(1)
  })

  it('fills user_id for list items from the user relationship', () => {
    expect(withUploaderId({ ...base, relationships: { user: { data: { id: '5' } } } }).attributes.user_id).toBe(5)
    expect(withUploaderId({ ...base, attributes: { ...base.attributes, user_id: 2 } }).attributes.user_id).toBe(2)
  })

  it('formats sizes', () => {
    expect(formatFileSize(0)).toBe('0 Bytes')
    expect(formatFileSize(1536)).toBe('1.5 KB')
  })

  it('only adds a token to stream URLs', () => {
    expect(withStreamToken('/rails/active_storage/blobs/proxy/x')).toBe('/rails/active_storage/blobs/proxy/x')
    expect(withStreamToken(undefined)).toBeUndefined()
  })
})
