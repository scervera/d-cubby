import { describe, expect, it } from 'vitest'
import {
  filterExcludedTags,
  normalizeTagName,
  normalizeTagSearchResults,
} from '@/components/shared/useTagSearch'

describe('useTagSearch helpers', () => {
  it('normalizes tag search API responses', () => {
    const results = normalizeTagSearchResults([
      { id: 1, attributes: { name: 'sermon' } },
      { id: 2, name: 'worship' },
      { id: 3, attributes: { name: '' } },
    ])

    expect(results).toEqual([
      { id: 1, name: 'sermon' },
      { id: 2, name: 'worship' },
    ])
  })

  it('filters out tags already selected', () => {
    const suggestions = [
      { id: 1, name: 'sermon' },
      { id: 2, name: 'worship' },
    ]

    expect(filterExcludedTags(suggestions, ['Sermon'])).toEqual([
      { id: 2, name: 'worship' },
    ])
  })

  it('normalizes tag names for storage', () => {
    expect(normalizeTagName('  Sermon ')).toBe('sermon')
  })
})
