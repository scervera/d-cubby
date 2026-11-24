/**
 * Upload size limit. The server's limit (DAM_MAX_FILE_SIZE_GB in .env) reaches the browser
 * through GET /api/v1/config as max_file_size_gb; null or missing means no limit.
 */
export type MaxFileSizeGb = number | null | undefined

function validLimit(gb: MaxFileSizeGb): number | null {
  return typeof gb === 'number' && Number.isFinite(gb) && gb > 0 ? gb : null
}

export function damMaxFileSizeBytes(gb: MaxFileSizeGb): number | null {
  const limit = validLimit(gb)
  return limit === null ? null : limit * 1024 * 1024 * 1024
}

/** "2.5 GB", or null when there is no limit. */
export function formatDamMaxFileSizeLabel(gb: MaxFileSizeGb): string | null {
  const limit = validLimit(gb)
  if (limit === null) return null
  return `${Number.isInteger(limit) ? limit.toFixed(0) : limit.toFixed(1)} GB`
}

export function isDamFileTooLarge(byteSize: number, gb: MaxFileSizeGb): boolean {
  const max = damMaxFileSizeBytes(gb)
  return max !== null && byteSize > max
}
