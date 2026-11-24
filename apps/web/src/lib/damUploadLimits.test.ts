import { describe, expect, it } from 'vitest'

import { damMaxFileSizeBytes, formatDamMaxFileSizeLabel, isDamFileTooLarge } from './damUploadLimits'

describe('damUploadLimits', () => {
  it('has no limit when the server sets none', () => {
    expect(damMaxFileSizeBytes(null)).toBeNull()
    expect(damMaxFileSizeBytes(undefined)).toBeNull()
    expect(formatDamMaxFileSizeLabel(null)).toBeNull()
    expect(isDamFileTooLarge(10 * 1024 ** 4, null)).toBe(false)
  })

  it('converts the configured GB to bytes and a label', () => {
    expect(damMaxFileSizeBytes(3)).toBe(3 * 1024 ** 3)
    expect(formatDamMaxFileSizeLabel(3)).toBe('3 GB')
    expect(formatDamMaxFileSizeLabel(2.5)).toBe('2.5 GB')
  })

  it('detects files larger than the limit', () => {
    const limit = damMaxFileSizeBytes(1)!
    expect(isDamFileTooLarge(limit, 1)).toBe(false)
    expect(isDamFileTooLarge(limit + 1, 1)).toBe(true)
  })

  it('ignores invalid limits', () => {
    expect(damMaxFileSizeBytes(0)).toBeNull()
    expect(damMaxFileSizeBytes(-1)).toBeNull()
    expect(damMaxFileSizeBytes(Number.NaN)).toBeNull()
  })
})
