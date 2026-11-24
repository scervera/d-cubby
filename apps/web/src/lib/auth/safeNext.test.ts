import { describe, expect, it } from 'vitest'

import { safeNext } from './safeNext'

describe('safeNext', () => {
  it('keeps same-site paths', () => {
    expect(safeNext('/tags?x=1')).toBe('/tags?x=1')
  })

  it('rejects other sites and empty values', () => {
    expect(safeNext('//evil.example/x')).toBe('/assets')
    expect(safeNext('https://evil.example')).toBe('/assets')
    expect(safeNext(null)).toBe('/assets')
  })
})
